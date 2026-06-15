import { ethers, network } from "hardhat";
async function main() {
  const [s] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const bal = await ethers.provider.getBalance(s.address);
  console.log(`network: ${network.name} chainId ${net.chainId}`);
  console.log(`deployer: ${s.address}`);
  console.log(`balance: ${ethers.formatEther(bal)} OPN`);
}
main().catch((e) => { console.error(e.message || e); process.exitCode = 1; });
