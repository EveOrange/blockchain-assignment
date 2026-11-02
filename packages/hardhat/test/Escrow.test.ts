import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const AMOUNT = ethers.parseUnits("30", 18);

async function deployFixture() {
  const [deployer, buyer, seller, arbiter, stranger] = await ethers.getSigners();

  // 部署你的代币合约（把 "ZSToken" 换成 "LYToken"）
  const token = await ethers.deployContract("LYToken");
  await token.waitForDeployment();

  // deployer 是 owner，mint 100 个给 buyer
  await token.mint(buyer.address, ethers.parseUnits("100", 18));

  // 部署 Escrow，arbiter 指定为 arbiter 账户
  const escrow = await ethers.deployContract("Escrow", [arbiter.address]);
  await escrow.waitForDeployment();

  const deadline = (await time.latest()) + 3600;
  return { token, escrow, deployer, buyer, seller, arbiter, stranger, deadline };
}

describe("Escrow", function () {
  it("createOrder 记录订单并发出事件", async function () {
    const { token, escrow, buyer, seller, deadline } = await loadFixture(deployFixture);

    await expect(
      escrow.connect(buyer).createOrder(
        seller.address,
        await token.getAddress(),
        AMOUNT,
        deadline,
        "一本书"
      )
    )
      .to.emit(escrow, "OrderCreated")
      .withArgs(0, buyer.address, seller.address, await token.getAddress(), AMOUNT, deadline);

    const order = await escrow.getOrder(0);
    expect(order.buyer).to.equal(buyer.address);
    expect(order.status).to.equal(0); // Created
    expect(await escrow.orderCount()).to.equal(1);
  });

  it("未 approve 时 deposit 失败", async function () {
    const { token, escrow, buyer, seller, deadline } = await loadFixture(deployFixture);

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );

    // 把报错文字换成你 LYToken 里实际的 transferFrom 报错
    await expect(escrow.connect(buyer).deposit(0)).to.be.revertedWith(
      "LYToken: transfer amount exceeds allowance"
    );
  });

  // ---------- TODO：补齐下面 6 个用例 ----------

  it("approve 后 deposit 成功，代币进入 Escrow，状态变为 Paid", async function () {
    const { token, escrow, buyer, seller, deadline } = await loadFixture(deployFixture);

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );

    // 买家 approve 给 Escrow 合约
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);

    const escrowAddr = await escrow.getAddress();
    const before = await token.balanceOf(escrowAddr);

    await escrow.connect(buyer).deposit(0);

    expect(await token.balanceOf(escrowAddr)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(1); // Paid
  });

  it("非买家调用 confirm 失败", async function () {
    const { token, escrow, buyer, seller, stranger, deadline } = await loadFixture(deployFixture);

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).deposit(0);

    // stranger 不是买家，调用 confirm 应失败
    await expect(escrow.connect(stranger).confirm(0)).to.be.revertedWith(
      "Escrow: caller is not the buyer"
    );
  });

  it("confirm 后卖家收到代币，状态变为 Completed", async function () {
    const { token, escrow, buyer, seller, deadline } = await loadFixture(deployFixture);

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).deposit(0);

    const before = await token.balanceOf(seller.address);

    await escrow.connect(buyer).confirm(0);

    expect(await token.balanceOf(seller.address)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(2); // Completed
  });

  it("deadline 之前 refund 失败，deadline 之后 refund 成功并退回买家", async function () {
    const { token, escrow, buyer, seller, deadline } = await loadFixture(deployFixture);

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).deposit(0);

    // 未到期，refund 应失败
    await expect(escrow.connect(buyer).refund(0)).to.be.revertedWith(
      "Escrow: deadline not reached"
    );

    // 时间前进到 deadline 之后
    await time.increaseTo(deadline + 1);

    const before = await token.balanceOf(buyer.address);

    await escrow.connect(buyer).refund(0);

    expect(await token.balanceOf(buyer.address)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(3); // Refunded
  });

  it("非仲裁人调用 resolve 失败", async function () {
    const { token, escrow, buyer, seller, arbiter, stranger, deadline } = await loadFixture(
      deployFixture
    );

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).deposit(0);

    // 买家发起争议
    await escrow.connect(buyer).dispute(0);

    // stranger 不是仲裁人，调用 resolve 应失败
    await expect(escrow.connect(stranger).resolve(0, true)).to.be.revertedWith(
      "Escrow: caller is not the arbiter"
    );

    // 仲裁人自己调用则成功（额外验证）
    await expect(escrow.connect(arbiter).resolve(0, true)).to.emit(escrow, "OrderResolved");
  });

  it("dispute 后仲裁人 resolve(false) 退款给买家，状态变为 Refunded", async function () {
    const { token, escrow, buyer, seller, arbiter, deadline } = await loadFixture(deployFixture);

    await escrow.connect(buyer).createOrder(
      seller.address,
      await token.getAddress(),
      AMOUNT,
      deadline,
      "一本书"
    );
    await token.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).deposit(0);

    // 卖家发起争议
    await escrow.connect(seller).dispute(0);
    expect((await escrow.getOrder(0)).status).to.equal(4); // Disputed

    const before = await token.balanceOf(buyer.address);

    // 仲裁人裁决：退款给买家
    await escrow.connect(arbiter).resolve(0, false);

    expect(await token.balanceOf(buyer.address)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(3); // Refunded
  });
});
