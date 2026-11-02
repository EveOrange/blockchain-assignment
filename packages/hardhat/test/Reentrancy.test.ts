import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

const VICTIM_DEPOSIT = ethers.parseEther("0.002");
const ATTACK_SEED = ethers.parseEther("0.001");

async function deployFixture() {
  const [deployer, victim, attackerEOA] = await ethers.getSigners();

  const vulnerable = await ethers.deployContract("VulnerableVault");
  await vulnerable.waitForDeployment();
  const vulnerableAttacker = await ethers.deployContract("Attacker", [await vulnerable.getAddress()]);
  await vulnerableAttacker.waitForDeployment();

  const fixed = await ethers.deployContract("FixedVault");
  await fixed.waitForDeployment();
  const fixedAttacker = await ethers.deployContract("Attacker", [await fixed.getAddress()]);
  await fixedAttacker.waitForDeployment();

  return { deployer, victim, attackerEOA, vulnerable, vulnerableAttacker, fixed, fixedAttacker };
}

describe("Reentrancy challenge", function () {
  it("VulnerableVault: attacker drains victim's 0.002 POT", async function () {
    const { victim, attackerEOA, vulnerable, vulnerableAttacker } = await loadFixture(deployFixture);

    await vulnerable.connect(victim).deposit({ value: VICTIM_DEPOSIT });
    await vulnerableAttacker.connect(attackerEOA).attack({ value: ATTACK_SEED });

    expect(await vulnerable.vaultBalance()).to.equal(0);
    expect(await ethers.provider.getBalance(await vulnerableAttacker.getAddress())).to.equal(
      VICTIM_DEPOSIT + ATTACK_SEED,
    );
    expect(await vulnerableAttacker.count()).to.equal(2);
  });

  it("FixedVault: same attack reverts and funds stay safe", async function () {
    const { victim, attackerEOA, fixed, fixedAttacker } = await loadFixture(deployFixture);

    await fixed.connect(victim).deposit({ value: VICTIM_DEPOSIT });
    await expect(fixedAttacker.connect(attackerEOA).attack({ value: ATTACK_SEED })).to.be.reverted;

    expect(await fixed.vaultBalance()).to.equal(VICTIM_DEPOSIT);
    expect(await ethers.provider.getBalance(await fixedAttacker.getAddress())).to.equal(0);
  });
});
