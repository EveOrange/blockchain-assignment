import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// 两个仲裁人地址：刘民强 + 李渝（可通过环境变量覆盖第二个）。
const ARBITER1 = "0x24e54D5AC0761c404c136aD5c79947857F7555e2";
const ARBITER2 = process.env.ARBITER2_ADDRESS || "0xA33E549d5FC06836fE91C41Fbbda3B5B1fAA677f";

const deployEscrowV2: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();

  // 没有注入私钥时，hardhat-deploy 只会报 “Cannot read properties of undefined (reading 'length')”，
  // 这里提前给出可操作的错误。
  if (!deployer) {
    throw new Error(
      "没有找到部署账户：请先在当前终端执行 export __RUNTIME_DEPLOYER_PRIVATE_KEY=0x...，再运行 yarn deploy --tags EscrowV2",
    );
  }

  await hre.deployments.deploy("EscrowV2", {
    from: deployer,
    args: [ARBITER1, ARBITER2],
    log: true,
    autoMine: true,
  });
};
export default deployEscrowV2;
deployEscrowV2.tags = ["EscrowV2"];
