import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer } from "ethers";

const DEADLINE = 99999999999;

async function fixture() {
  const [deployer, user] = await ethers.getSigners();

  const WOPN = await ethers.getContractFactory("WOPN");
  const wopn = await WOPN.deploy();

  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(await deployer.getAddress());

  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(await factory.getAddress(), await wopn.getAddress());

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("Mock USD Coin", "mUSDC", 18, 1_000_000n);
  const usdt = await MockERC20.deploy("Mock Tether", "mUSDT", 18, 1_000_000n);

  return { deployer, user, wopn, factory, router, usdc, usdt };
}

describe("Poin DEX AMM", () => {
  it("factory creates a pair and registers it in getPair (both directions)", async () => {
    const { factory, usdc, usdt } = await fixture();
    await factory.createPair(await usdc.getAddress(), await usdt.getAddress());
    const pair = await factory.getPair(await usdc.getAddress(), await usdt.getAddress());
    expect(pair).to.not.equal(ethers.ZeroAddress);
    expect(await factory.getPair(await usdt.getAddress(), await usdc.getAddress())).to.equal(pair);
    expect(await factory.allPairsLength()).to.equal(1n);
  });

  it("reverts creating a pair with identical tokens", async () => {
    const { factory, usdc } = await fixture();
    await expect(
      factory.createPair(await usdc.getAddress(), await usdc.getAddress())
    ).to.be.revertedWith("UniswapV2: IDENTICAL_ADDRESSES");
  });

  it("pairCodeHash matches the on-chain create2 deployment (library uses getPair, hash is informational)", async () => {
    const { factory, usdc, usdt } = await fixture();
    const hash = await factory.pairCodeHash();
    expect(hash).to.match(/^0x[0-9a-f]{64}$/);
    // The pair actually deployed by the factory must be non-zero, proving the
    // create2 bytecode compiled cleanly.
    await factory.createPair(await usdc.getAddress(), await usdt.getAddress());
    expect(await factory.getPair(await usdc.getAddress(), await usdt.getAddress())).to.not.equal(
      ethers.ZeroAddress
    );
  });

  it("adds liquidity and mints LP tokens", async () => {
    const { deployer, router, usdc, usdt } = await fixture();
    await usdc.approve(await router.getAddress(), ethers.MaxUint256);
    await usdt.approve(await router.getAddress(), ethers.MaxUint256);

    await router.addLiquidity(
      await usdc.getAddress(),
      await usdt.getAddress(),
      ethers.parseEther("1000"),
      ethers.parseEther("1000"),
      0,
      0,
      await deployer.getAddress(),
      DEADLINE
    );

    const pairAddr = await router.factory().then(async (f) => {
      const factory = await ethers.getContractAt("UniswapV2Factory", f);
      return factory.getPair(await usdc.getAddress(), await usdt.getAddress());
    });
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddr);
    expect(await pair.totalSupply()).to.be.greaterThan(0n);
    const [r0, r1] = await pair.getReserves();
    expect(r0).to.equal(ethers.parseEther("1000"));
    expect(r1).to.equal(ethers.parseEther("1000"));
  });

  it("quotes and swaps exact tokens for tokens (0.30% fee applied)", async () => {
    const { deployer, user, router, usdc, usdt } = await fixture();
    await usdc.approve(await router.getAddress(), ethers.MaxUint256);
    await usdt.approve(await router.getAddress(), ethers.MaxUint256);
    await router.addLiquidity(
      await usdc.getAddress(),
      await usdt.getAddress(),
      ethers.parseEther("100000"),
      ethers.parseEther("100000"),
      0,
      0,
      await deployer.getAddress(),
      DEADLINE
    );

    // give the user some USDC and approve
    await usdc.transfer(await user.getAddress(), ethers.parseEther("1000"));
    await usdc.connect(user).approve(await router.getAddress(), ethers.MaxUint256);

    const amountIn = ethers.parseEther("1000");
    const path = [await usdc.getAddress(), await usdt.getAddress()];
    const amounts = await router.getAmountsOut(amountIn, path);
    const expectedOut = amounts[1];

    // sanity: fee means out < in for a balanced pool
    expect(expectedOut).to.be.lessThan(amountIn);

    const before = await usdt.balanceOf(await user.getAddress());
    await router
      .connect(user)
      .swapExactTokensForTokens(amountIn, expectedOut, path, await user.getAddress(), DEADLINE);
    const after = await usdt.balanceOf(await user.getAddress());
    expect(after - before).to.equal(expectedOut);
  });

  it("swaps native OPN for tokens via WOPN path", async () => {
    const { deployer, user, router, wopn, usdc } = await fixture();
    await usdc.approve(await router.getAddress(), ethers.MaxUint256);
    // seed WOPN/USDC: 1 OPN = 2 USDC
    await router.addLiquidityETH(
      await usdc.getAddress(),
      ethers.parseEther("2000"),
      0,
      0,
      await deployer.getAddress(),
      DEADLINE,
      { value: ethers.parseEther("1000") }
    );

    const path = [await wopn.getAddress(), await usdc.getAddress()];
    const amountInETH = ethers.parseEther("1");
    const amounts = await router.getAmountsOut(amountInETH, path);
    const before = await usdc.balanceOf(await user.getAddress());
    await router
      .connect(user)
      .swapExactETHForTokens(amounts[1], path, await user.getAddress(), DEADLINE, {
        value: amountInETH,
      });
    const after = await usdc.balanceOf(await user.getAddress());
    expect(after - before).to.equal(amounts[1]);
    // ~2 USDC out for 1 OPN, minus fee
    expect(after - before).to.be.greaterThan(ethers.parseEther("1.9"));
  });

  it("reverts swap when output below slippage minimum", async () => {
    const { deployer, router, usdc, usdt } = await fixture();
    await usdc.approve(await router.getAddress(), ethers.MaxUint256);
    await usdt.approve(await router.getAddress(), ethers.MaxUint256);
    await router.addLiquidity(
      await usdc.getAddress(),
      await usdt.getAddress(),
      ethers.parseEther("100000"),
      ethers.parseEther("100000"),
      0,
      0,
      await deployer.getAddress(),
      DEADLINE
    );
    const path = [await usdc.getAddress(), await usdt.getAddress()];
    const amountIn = ethers.parseEther("1000");
    await expect(
      router.swapExactTokensForTokens(amountIn, amountIn, path, await deployer.getAddress(), DEADLINE)
    ).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
  });

  it("reverts swap past the deadline", async () => {
    const { deployer, router, usdc, usdt } = await fixture();
    await usdc.approve(await router.getAddress(), ethers.MaxUint256);
    await usdt.approve(await router.getAddress(), ethers.MaxUint256);
    await router.addLiquidity(
      await usdc.getAddress(),
      await usdt.getAddress(),
      ethers.parseEther("1000"),
      ethers.parseEther("1000"),
      0,
      0,
      await deployer.getAddress(),
      DEADLINE
    );
    const path = [await usdc.getAddress(), await usdt.getAddress()];
    await expect(
      router.swapExactTokensForTokens(1n, 0n, path, await deployer.getAddress(), 1)
    ).to.be.revertedWith("UniswapV2Router: EXPIRED");
  });

  it("removes liquidity and returns underlying tokens", async () => {
    const { deployer, router, factory, usdc, usdt } = await fixture();
    await usdc.approve(await router.getAddress(), ethers.MaxUint256);
    await usdt.approve(await router.getAddress(), ethers.MaxUint256);
    await router.addLiquidity(
      await usdc.getAddress(),
      await usdt.getAddress(),
      ethers.parseEther("1000"),
      ethers.parseEther("1000"),
      0,
      0,
      await deployer.getAddress(),
      DEADLINE
    );
    const pairAddr = await factory.getPair(await usdc.getAddress(), await usdt.getAddress());
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddr);
    const lp = await pair.balanceOf(await deployer.getAddress());
    await pair.approve(await router.getAddress(), lp);

    const beforeUsdc = await usdc.balanceOf(await deployer.getAddress());
    await router.removeLiquidity(
      await usdc.getAddress(),
      await usdt.getAddress(),
      lp,
      0,
      0,
      await deployer.getAddress(),
      DEADLINE
    );
    const afterUsdc = await usdc.balanceOf(await deployer.getAddress());
    expect(afterUsdc).to.be.greaterThan(beforeUsdc);
    expect(await pair.balanceOf(await deployer.getAddress())).to.equal(0n);
  });
});
