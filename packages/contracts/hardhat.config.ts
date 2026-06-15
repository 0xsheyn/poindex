import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : [];

// OPN Chain enforces a 7 Gwei minimum gas price.
const GAS_PRICE = 7_000_000_000;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: { enabled: true, runs: 999999 },
      // OPN Chain runs the Pectra EVM.
      evmVersion: "prague",
    },
  },
  networks: {
    hardhat: {
      // Pectra/Prague isn't a built-in for the local in-process EVM on all versions;
      // local tests use the default hardfork. Live networks below use prague.
    },
    opnTestnet: {
      url: process.env.OPN_TESTNET_RPC || "https://testnet-rpc.iopn.tech",
      chainId: 984,
      gasPrice: GAS_PRICE,
      accounts,
    },
    opnMainnet: {
      url: process.env.OPN_MAINNET_RPC || "https://rpc.iopn.tech",
      chainId: 985,
      gasPrice: GAS_PRICE,
      accounts,
    },
  },
  // OPNScan verification config (etherscan-compatible) — enable once supported.
  // etherscan: {
  //   apiKey: { opnTestnet: process.env.OPNSCAN_API_KEY || "" },
  //   customChains: [ ... ],
  // },
};

export default config;
