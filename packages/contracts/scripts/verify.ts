import { ethers } from "hardhat";
import * as fs from "fs"; import * as path from "path";
async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname,"..","deployments","984.json"),"utf8"));
  const c = dep.contracts;
  const factory = await ethers.getContractAt("UniswapV2Factory", c.UniswapV2Factory);
  const router = await ethers.getContractAt("UniswapV2Router02", c.UniswapV2Router02);
  console.log("allPairsLength:", (await factory.allPairsLength()).toString());

  async function show(a: string, b: string, an: string, bn: string) {
    const p = await factory.getPair(a, b);
    const pair = await ethers.getContractAt("UniswapV2Pair", p);
    const [r0, r1] = await pair.getReserves();
    console.log(`${an}/${bn} pair ${p}  reserves: ${r0} / ${r1}`);
  }
  await show(c.mUSDC, c.mUSDT, "mUSDC", "mUSDT");
  await show(c.WOPN, c.mUSDC, "WOPN", "mUSDC");
  await show(c.WOPN, c.mDAI, "WOPN", "mDAI");

  const q1 = await router.getAmountsOut(ethers.parseUnits("1",6), [c.mUSDC, c.mUSDT]);
  console.log(`quote 1 mUSDC -> mUSDT: ${ethers.formatUnits(q1[1],6)}`);
  const q2 = await router.getAmountsOut(ethers.parseEther("1"), [c.WOPN, c.mUSDC]);
  console.log(`quote 1 OPN -> mUSDC: ${ethers.formatUnits(q2[1],6)}`);
}
main().catch((e)=>{console.error(e.message||e);process.exitCode=1;});
