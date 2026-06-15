import { ethers } from "hardhat";

// Prints the keccak256 of the pair creation code. Useful for off-chain tooling.
// Note: the periphery library resolves pairs via factory.getPair, so this hash
// is informational only and is NOT hardcoded anywhere.
async function main() {
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(ethers.ZeroAddress);
  await factory.waitForDeployment();
  console.log("pairCodeHash:", await factory.pairCodeHash());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
