// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IERC20V2 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title EscrowV2
/// @notice 大作业加分版：增加 Shipped 状态（卖家发货）和双仲裁人多签裁决。
contract EscrowV2 {
    enum Status {
        Created,
        Paid,
        Shipped,
        Completed,
        Refunded,
        Disputed
    }

    struct Order {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        uint256 deadline;
        Status status;
        string description;
    }

    address public arbiter1;
    address public arbiter2;
    uint256 public orderCount;
    mapping(uint256 => Order) private _orders;

    // 每个订单的两个仲裁人投票状态
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => bool) public voteSellerWins;
    mapping(uint256 => uint8) public voteCount;

    event OrderCreated(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 amount,
        uint256 deadline
    );
    event OrderPaid(uint256 indexed id);
    event OrderShipped(uint256 indexed id);
    event OrderCompleted(uint256 indexed id);
    event OrderRefunded(uint256 indexed id);
    event OrderDisputed(uint256 indexed id, address by);
    event ArbiterVoted(uint256 indexed id, address indexed arbiter, bool sellerWins, uint8 votes);
    event OrderResolved(uint256 indexed id, bool sellerWins);

    modifier onlyBuyer(uint256 id) {
        require(msg.sender == _orders[id].buyer, "EscrowV2: caller is not the buyer");
        _;
    }

    modifier onlySeller(uint256 id) {
        require(msg.sender == _orders[id].seller, "EscrowV2: caller is not the seller");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter1 || msg.sender == arbiter2, "EscrowV2: caller is not an arbiter");
        _;
    }

    modifier inStatus(uint256 id, Status s) {
        require(_orders[id].status == s, "EscrowV2: wrong status");
        _;
    }

    modifier inPaidOrShipped(uint256 id) {
        Status s = _orders[id].status;
        require(s == Status.Paid || s == Status.Shipped, "EscrowV2: wrong status");
        _;
    }

    constructor(address _arbiter1, address _arbiter2) {
        require(_arbiter1 != address(0), "EscrowV2: arbiter1 is zero");
        require(_arbiter2 != address(0), "EscrowV2: arbiter2 is zero");
        require(_arbiter1 != _arbiter2, "EscrowV2: arbiters must differ");
        arbiter1 = _arbiter1;
        arbiter2 = _arbiter2;
    }

    function isArbiter(address account) public view returns (bool) {
        return account == arbiter1 || account == arbiter2;
    }

    function getOrder(uint256 id) public view returns (Order memory) {
        require(id < orderCount, "EscrowV2: order does not exist");
        return _orders[id];
    }

    function createOrder(
        address seller,
        address token,
        uint256 amount,
        uint256 deadline,
        string memory description
    ) public returns (uint256) {
        require(seller != address(0), "EscrowV2: seller is zero");
        require(seller != msg.sender, "EscrowV2: seller cannot be buyer");
        require(amount > 0, "EscrowV2: amount is zero");
        require(deadline > block.timestamp, "EscrowV2: deadline in the past");

        uint256 id = orderCount;
        _orders[id] = Order({
            buyer: msg.sender,
            seller: seller,
            token: token,
            amount: amount,
            deadline: deadline,
            status: Status.Created,
            description: description
        });
        orderCount++;

        emit OrderCreated(id, msg.sender, seller, token, amount, deadline);
        return id;
    }

    function deposit(uint256 id) public onlyBuyer(id) inStatus(id, Status.Created) {
        Order storage o = _orders[id];
        // Checks-Effects-Interactions：先改状态，再外部调用
        o.status = Status.Paid;
        require(IERC20V2(o.token).transferFrom(o.buyer, address(this), o.amount), "EscrowV2: transferFrom failed");
        emit OrderPaid(id);
    }

    /// @notice 卖家发货；只有 Paid 状态可以发货。
    function markShipped(uint256 id) public onlySeller(id) inStatus(id, Status.Paid) {
        Order storage o = _orders[id];
        o.status = Status.Shipped;
        emit OrderShipped(id);
    }

    /// @notice 买家确认收货；Paid 或 Shipped 都可以确认。
    function confirm(uint256 id) public onlyBuyer(id) inPaidOrShipped(id) {
        Order storage o = _orders[id];
        o.status = Status.Completed;
        require(IERC20V2(o.token).transfer(o.seller, o.amount), "EscrowV2: transfer failed");
        emit OrderCompleted(id);
    }

    /// @notice 超期退款只在“已付款但未发货”时允许；已发货只能确认或争议。
    function refund(uint256 id) public onlyBuyer(id) inStatus(id, Status.Paid) {
        Order storage o = _orders[id];
        require(block.timestamp > o.deadline, "EscrowV2: deadline not reached");
        o.status = Status.Refunded;
        require(IERC20V2(o.token).transfer(o.buyer, o.amount), "EscrowV2: refund failed");
        emit OrderRefunded(id);
    }

    /// @notice 买家或卖家都可以在 Paid / Shipped 发起争议。
    function dispute(uint256 id) public inPaidOrShipped(id) {
        Order storage o = _orders[id];
        require(msg.sender == o.buyer || msg.sender == o.seller, "EscrowV2: only buyer or seller");
        o.status = Status.Disputed;
        emit OrderDisputed(id, msg.sender);
    }

    /// @notice 双仲裁人投票；两人意见一致且都投票后才执行转账。
    function resolve(uint256 id, bool sellerWins) public onlyArbiter inStatus(id, Status.Disputed) {
        require(!hasVoted[id][msg.sender], "EscrowV2: already voted");

        if (voteCount[id] == 0) {
            voteSellerWins[id] = sellerWins;
        } else {
            require(voteSellerWins[id] == sellerWins, "EscrowV2: arbiters disagree");
        }

        hasVoted[id][msg.sender] = true;
        voteCount[id] += 1;
        emit ArbiterVoted(id, msg.sender, sellerWins, voteCount[id]);

        if (voteCount[id] < 2) {
            return;
        }

        Order storage o = _orders[id];
        if (sellerWins) {
            o.status = Status.Completed;
            require(IERC20V2(o.token).transfer(o.seller, o.amount), "EscrowV2: transfer to seller failed");
        } else {
            o.status = Status.Refunded;
            require(IERC20V2(o.token).transfer(o.buyer, o.amount), "EscrowV2: refund to buyer failed");
        }
        emit OrderResolved(id, sellerWins);
    }
}
