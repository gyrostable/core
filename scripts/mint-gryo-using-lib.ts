import { BigNumber } from "ethers";
import hre from "hardhat";
import { ERC20__factory as ERC20Factory } from "../typechain/factories/ERC20__factory";
import { GyroFund__factory as GyroFundFactory } from "../typechain/factories/GyroFund__factory";
import { GyroLib__factory as GyroLibFactory } from "../typechain/factories/GyroLib__factory";
const { deployments, ethers } = hre;

const ONE = BigNumber.from(10).pow(18);

async function main() {
  const [account] = await ethers.getSigners();
  const wethDeployment = await deployments.get("WETHERC20");
  const daiDeployment = await deployments.get("DAIERC20");
  const gyroLibDeployment = await deployments.get("GyroLib");
  const gyroFundDeployment = await deployments.get("GyroFundV1");
  const gyroFund = GyroFundFactory.connect(gyroFundDeployment.address, account);
  const gyroLib = GyroLibFactory.connect(gyroLibDeployment.address, account);

  const tokens = [
    { name: "weth", address: wethDeployment.address, amount: ONE.mul(2) }, // 2 ETH
    { name: "dai", address: daiDeployment.address, amount: ONE.mul(2500) }, // 2500 DAI
  ];
  for (const { address, amount } of tokens) {
    const erc20 = ERC20Factory.connect(address, account);
    await erc20.approve(gyroLib.address, amount);
  }

  const tx = await gyroLib.mintFromUnderlyingTokens(
    tokens.map((t) => t.address),
    tokens.map((t) => t.amount),
    0
  );
  const receipt = await tx.wait();

  function notEmpty<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
  }

  const events = receipt.logs
    .map((v) => {
      try {
        return gyroFund.interface.parseLog(v);
      } catch (e) {
        return null;
      }
    })
    .filter(notEmpty);

  // const mintEvent = events.find((evt) => evt.name === "Mint")!!;
  // const minted = mintEvent.args.amount.div(ONE).toString();
  // console.log(`gas used: ${receipt.gasUsed}`);
  // console.log(`amount minted: ${minted}`);

  const gyroToken = { address: gyroFund.address, name: "gyro" };
  for (const { name, address } of [gyroToken].concat(tokens)) {
    const erc20 = ERC20Factory.connect(address, account);
    const balance = await erc20.balanceOf(account.address);
    console.log(`${name} balance: ${balance.div(ONE).toString()}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
