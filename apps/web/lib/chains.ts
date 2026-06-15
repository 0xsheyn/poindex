import { defineChain } from "viem";

// OPN Testnet — params verified from the iOPN developer docs.
export const opnTestnet = defineChain({
  id: 984,
  name: "OPN Testnet",
  nativeCurrency: { name: "OPN", symbol: "OPN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.iopn.tech"] },
  },
  blockExplorers: {
    default: { name: "OPN Explorer", url: "https://testnet.iopn.tech" },
  },
  testnet: true,
});

export const EXPLORER_URL = opnTestnet.blockExplorers.default.url;
export const txUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const addressUrl = (addr: string) => `${EXPLORER_URL}/address/${addr}`;
