import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Deploys the full Poin DEX AMM stack: WOPN -> Factory -> Router, plus test
// ERC-20 tokens (testnet only). Writes addresses to deployments/<chainId>.json.
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`Network: ${network.name} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} OPN\n`);

  // 1. WOPN (wrapped native)
  const WOPN = await ethers.getContractFactory("WOPN");
  const wopn = await WOPN.deploy();
  await wopn.waitForDeployment();
  console.log(`WOPN:    ${await wopn.getAddress()}`);

  // 2. Factory (feeToSetter = deployer; feeTo left unset = no protocol fee)
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log(`Factory: ${await factory.getAddress()}`);

  // 3. Router02
  const Router = await ethers.getContractFactory("UniswapV2Router02");
  const router = await Router.deploy(await factory.getAddress(), await wopn.getAddress());
  await router.waitForDeployment();
  console.log(`Router:  ${await router.getAddress()}`);

  const tokens: Record<string, string> = {};

  // 4. Test tokens (testnet / local only — never on mainnet 985)
  if (chainId !== 985) {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const specs: [string, string, number, bigint][] = [
      ["Mock USD Coin", "mUSDC", 6, 1_000_000n],
      ["Mock Tether USD", "mUSDT", 6, 1_000_000n],
      ["Mock Dai", "mDAI", 18, 1_000_000n],
    ];
    for (const [name, symbol, decimals, supply] of specs) {
      const t = await MockERC20.deploy(name, symbol, decimals, supply);
      await t.waitForDeployment();
      tokens[symbol] = await t.getAddress();
      console.log(`${symbol}:   ${await t.getAddress()}`);
    }
  } else {
    console.log("\n(skipping mock tokens on mainnet)");
  }

  // pairCodeHash is exposed for tooling/verification (no hardcoded hash dependency).
  const pairCodeHash = await factory.pairCodeHash();

  const out = {
    chainId,
    network: network.name,
    deployedAt: new Date().toISOString(),
    contracts: {
      WOPN: await wopn.getAddress(),
      UniswapV2Factory: await factory.getAddress(),
      UniswapV2Router02: await router.getAddress(),
      ...tokens,
    },
    pairCodeHash,
  };

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${chainId}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nSaved deployment to deployments/${chainId}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
