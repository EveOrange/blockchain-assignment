import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const AMOUNT = ethers.parseUnits("30", 18);
const ZERO = 0n;

async function deployFixture() {
  const [deployer, buyer, seller, arbiter1, arbiter2, stranger] = await ethers.getSigners();

  const token = await ethers.deployContract("LYToken");
  await token.waitForDeployment();
  await token.mint(buyer.address, ethers.parseUnits("100", 18));

  const escrow = await ethers.deployContract("EscrowV2", [arbiter1.address, arbiter2.address]);
  await escrow.waitForDeployment();

  const deadline = (await time.latest()) + 3600;
  const escrowAddress = await escrow.getAddress();
  const tokenAddress = await token.getAddress();

  async function createAndPay() {
    await escrow.connect(buyer).createOrder(seller.address, tokenAddress, AMOUNT, deadline, "V2 订单");
    await token.connect(buyer).approve(escrowAddress, AMOUNT);
    await escrow.connect(buyer).deposit(0);
  }

  return { token, escrow, deployer, buyer, seller, arbiter1, arbiter2, stranger, deadline, escrowAddress, tokenAddress, createAndPay };
}

describe("EscrowV2 - shipped + multisig", function () {
  it("买家付款后卖家可以 markShipped，状态变为 Shipped", async function () {
    const { escrow, seller, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    expect((await escrow.getOrder(0)).status).to.equal(1); // Paid
    await expect(escrow.connect(seller).markShipped(0)).to.emit(escrow, "OrderShipped").withArgs(0);
    expect((await escrow.getOrder(0)).status).to.equal(2); // Shipped
  });

  it("非卖家不能 markShipped；未付款也不能发货", async function () {
    const { escrow, buyer, stranger, seller, deadline, tokenAddress } = await loadFixture(deployFixture);
    await escrow.connect(buyer).createOrder(seller.address, tokenAddress, AMOUNT, deadline, "V2");
    await expect(escrow.connect(stranger).markShipped(0)).to.be.revertedWith("EscrowV2: caller is not the seller");
    await expect(escrow.connect(seller).markShipped(0)).to.be.revertedWith("EscrowV2: wrong status");
  });

  it("已发货后买家可以确认收货，卖家收到代币", async function () {
    const { escrow, token, buyer, seller, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    await escrow.connect(seller).markShipped(0);
    const before = await token.balanceOf(seller.address);
    await escrow.connect(buyer).confirm(0);
    expect(await token.balanceOf(seller.address)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(3); // Completed
  });

  it("已发货后即使超期也不能走 refund，只能 confirm 或 dispute", async function () {
    const { escrow, buyer, seller, deadline, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    await escrow.connect(seller).markShipped(0);
    await time.increaseTo(deadline + 1);
    await expect(escrow.connect(buyer).refund(0)).to.be.revertedWith("EscrowV2: wrong status");
  });

  it("未发货时，超期后买家可以退款", async function () {
    const { escrow, token, buyer, deadline, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    await expect(escrow.connect(buyer).refund(0)).to.be.revertedWith("EscrowV2: deadline not reached");
    await time.increaseTo(deadline + 1);
    const before = await token.balanceOf(buyer.address);
    await escrow.connect(buyer).refund(0);
    expect(await token.balanceOf(buyer.address)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(4); // Refunded
  });

  it("两个仲裁人意见一致时才执行 resolve，第一票不转账", async function () {
    const { escrow, token, buyer, seller, arbiter1, arbiter2, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    await escrow.connect(buyer).dispute(0);
    const escrowBefore = await token.balanceOf(await escrow.getAddress());
    const sellerBefore = await token.balanceOf(seller.address);

    await expect(escrow.connect(arbiter1).resolve(0, true))
      .to.emit(escrow, "ArbiterVoted")
      .withArgs(0, arbiter1.address, true, 1);
    expect(await token.balanceOf(await escrow.getAddress())).to.equal(escrowBefore);
    expect((await escrow.getOrder(0)).status).to.equal(5); // Disputed

    await expect(escrow.connect(arbiter2).resolve(0, false)).to.be.revertedWith("EscrowV2: arbiters disagree");
    await expect(escrow.connect(arbiter2).resolve(0, true)).to.emit(escrow, "OrderResolved").withArgs(0, true);
    expect(await token.balanceOf(seller.address)).to.equal(sellerBefore + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(3); // Completed
  });

  it("两个仲裁人都投 false 时退款给买家", async function () {
    const { escrow, token, buyer, seller, arbiter1, arbiter2, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    await escrow.connect(seller).dispute(0);
    await escrow.connect(arbiter1).resolve(0, false);
    const before = await token.balanceOf(buyer.address);
    await escrow.connect(arbiter2).resolve(0, false);
    expect(await token.balanceOf(buyer.address)).to.equal(before + AMOUNT);
    expect((await escrow.getOrder(0)).status).to.equal(4); // Refunded
  });

  it("非仲裁人不能投票，同一仲裁人不能重复投票", async function () {
    const { escrow, buyer, arbiter1, arbiter2, stranger, createAndPay } = await loadFixture(deployFixture);
    await createAndPay();
    await escrow.connect(buyer).dispute(0);
    await expect(escrow.connect(stranger).resolve(0, true)).to.be.revertedWith("EscrowV2: caller is not an arbiter");
    await escrow.connect(arbiter1).resolve(0, true);
    await expect(escrow.connect(arbiter1).resolve(0, true)).to.be.revertedWith("EscrowV2: already voted");
    await escrow.connect(arbiter2).resolve(0, true);
  });
});
