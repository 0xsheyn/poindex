import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Seeds initial liquidity so swaps have a price. Reads addresses from
// deployments/<chainId>.json (run deploy.ts first).
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const file = path.join(__dirname, "..", "deployments", `${chainId}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment found at ${file}. Run deploy first.`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const c = dep.contracts;

  const router = await ethers.getContractAt("UniswapV2Router02", c.UniswapV2Router02);
  const deadline = Math.floor(Date.now() / 1000) + 1200;
  const MaxUint = ethers.MaxUint256;

  async function approve(tokenAddr: string) {
    const t = await ethers.getContractAt("MockERC20", tokenAddr);
    const tx = await t.approve(c.UniswapV2Router02, MaxUint);
    await tx.wait();
  }

  // mUSDC <> mUSDT  (1:1, both 6 decimals)
  await approve(c.mUSDC);
  await approve(c.mUSDT);
  console.log("Adding liquidity mUSDC/mUSDT ...");
  await (
    await router.addLiquidity(
      c.mUSDC,
      c.mUSDT,
      ethers.parseUnits("100000", 6),
      ethers.parseUnits("100000", 6),
      0,
      0,
      deployer.address,
      deadline
    )
  ).wait();

  // WOPN <> mUSDC  (price: 1 OPN = 2 mUSDC, via addLiquidityETH)
  console.log("Adding liquidity WOPN/mUSDC ...");
  await (
    await router.addLiquidityETH(
      c.mUSDC,
      ethers.parseUnits("80", 6),
      0,
      0,
      deployer.address,
      deadline,
      { value: ethers.parseEther("40") }
    )
  ).wait();

  // WOPN <> mDAI  (price: 1 OPN = 2 mDAI)
  await approve(c.mDAI);
  console.log("Adding liquidity WOPN/mDAI ...");
  await (
    await router.addLiquidityETH(
      c.mDAI,
      ethers.parseUnits("80", 18),
      0,
      0,
      deployer.address,
      deadline,
      { value: ethers.parseEther("40") }
    )
  ).wait();

  console.log("\nLiquidity seeded. Pools: mUSDC/mUSDT, WOPN/mUSDC, WOPN/mDAI");
  console.log(`(network ${network.name}, chainId ${chainId})`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
