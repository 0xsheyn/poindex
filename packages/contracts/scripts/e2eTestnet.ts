import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Live end-to-end QA against the deployed contracts on OPN Testnet 984.
// Executes real swaps through the deployed Router and asserts the outcomes.
async function main() {
  const [signer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const dep = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", `${chainId}.json`), "utf8")
  );
  const c = dep.contracts;

  const router = await ethers.getContractAt("UniswapV2Router02", c.UniswapV2Router02);
  const usdc = await ethers.getContractAt("MockERC20", c.mUSDC);
  const usdt = await ethers.getContractAt("MockERC20", c.mUSDT);
  const me = signer.address;
  const deadline = Math.floor(Date.now() / 1000) + 600;
  const MaxUint = ethers.MaxUint256;

  const pass: string[] = [];
  const fail: string[] = [];
  const ok = (cond: boolean, msg: string) => (cond ? pass.push(msg) : fail.push(msg));

  // The public RPC is load-balanced; reads right after a write can hit a lagging
  // replica. Poll until the balance settles to a value different from `prev`.
  async function settled(token: any, addr: string, prev: bigint): Promise<bigint> {
    for (let i = 0; i < 12; i++) {
      const b: bigint = await token.balanceOf(addr);
      if (b !== prev) return b;
      await new Promise((r) => setTimeout(r, 800));
    }
    return token.balanceOf(addr);
  }

  console.log(`E2E on chainId ${chainId} as ${me}\n`);

  // ---- Test 1: swap native OPN -> mUSDC (swapExactETHForTokens) ----
  {
    const path1 = [c.WOPN, c.mUSDC];
    const amtIn = ethers.parseEther("1");
    const quoted = await router.getAmountsOut(amtIn, path1);
    const expectedOut = quoted[1];
    const minOut = (expectedOut * 99n) / 100n; // 1% slippage
    const before = await usdc.balanceOf(me);
    const tx = await router.swapExactETHForTokens(minOut, path1, me, deadline, { value: amtIn });
    await tx.wait();
    const after = await settled(usdc, me, before);
    const got = after - before;
    console.log(`T1 OPN->mUSDC: quoted ${ethers.formatUnits(expectedOut, 6)}, got ${ethers.formatUnits(got, 6)}`);
    ok(got >= minOut && got === expectedOut, "T1 swapExactETHForTokens delivers quoted output");
  }

  // ---- Test 2: swap mUSDC -> mUSDT (swapExactTokensForTokens, direct pair) ----
  {
    if ((await usdc.allowance(me, c.UniswapV2Router02)) < ethers.parseUnits("10", 6)) {
      await (await usdc.approve(c.UniswapV2Router02, MaxUint)).wait();
    }
    const path2 = [c.mUSDC, c.mUSDT];
    const amtIn = ethers.parseUnits("10", 6);
    const quoted = await router.getAmountsOut(amtIn, path2);
    const minOut = (quoted[1] * 99n) / 100n;
    const before = await usdt.balanceOf(me);
    const tx = await router.swapExactTokensForTokens(amtIn, minOut, path2, me, deadline);
    await tx.wait();
    const after = await settled(usdt, me, before);
    const got = after - before;
    console.log(`T2 mUSDC->mUSDT: quoted ${ethers.formatUnits(quoted[1], 6)}, got ${ethers.formatUnits(got, 6)}`);
    ok(got === quoted[1], "T2 swapExactTokensForTokens (direct pair) delivers quoted output");
  }

  // ---- Test 3: multi-hop mUSDC -> WOPN -> mDAI ----
  {
    const path3 = [c.mUSDC, c.WOPN, c.mDAI];
    const amtIn = ethers.parseUnits("10", 6);
    try {
      const quoted = await router.getAmountsOut(amtIn, path3);
      const dai = await ethers.getContractAt("MockERC20", c.mDAI);
      const minOut = (quoted[2] * 99n) / 100n;
      const before = await dai.balanceOf(me);
      const tx = await router.swapExactTokensForTokens(amtIn, minOut, path3, me, deadline);
      await tx.wait();
      const got = (await settled(dai, me, before)) - before;
      console.log(`T3 mUSDC->WOPN->mDAI: quoted ${ethers.formatUnits(quoted[2], 18)}, got ${ethers.formatUnits(got, 18)}`);
      ok(got === quoted[2], "T3 multi-hop swap via WOPN delivers quoted output");
    } catch (e) {
      ok(false, `T3 multi-hop swap reverted unexpectedly: ${(e as Error).message}`);
    }
  }

  // ---- Test 4: slippage protection (minOut too high must revert, no state change) ----
  {
    const path4 = [c.mUSDC, c.mUSDT];
    const amtIn = ethers.parseUnits("10", 6);
    const quoted = await router.getAmountsOut(amtIn, path4);
    const absurdMin = quoted[1] * 2n; // impossible
    try {
      // staticCall does not spend gas / change state; it should revert
      await router.swapExactTokensForTokens.staticCall(amtIn, absurdMin, path4, me, deadline);
      ok(false, "T4 slippage revert: expected revert but call succeeded");
    } catch {
      ok(true, "T4 swap reverts when output below slippage minimum");
    }
  }

  // ---- Test 5: deadline enforcement (past deadline must revert) ----
  {
    const path5 = [c.mUSDC, c.mUSDT];
    const amtIn = ethers.parseUnits("1", 6);
    try {
      await router.swapExactTokensForTokens.staticCall(amtIn, 0n, path5, me, 1);
      ok(false, "T5 deadline revert: expected revert but call succeeded");
    } catch {
      ok(true, "T5 swap reverts past the deadline");
    }
  }

  console.log("\n--- RESULTS ---");
  pass.forEach((p) => console.log(`PASS ${p}`));
  fail.forEach((f) => console.log(`FAIL ${f}`));
  console.log(`\n${pass.length} passed, ${fail.length} failed`);
  if (fail.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
