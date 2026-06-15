import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { opnTestnet } from "./chains";

// MetaMask-focused config using the injected connector (no WalletConnect projectId needed).
export const config = createConfig({
  chains: [opnTestnet],
  connectors: [injected({ shimDisconnect: true })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [opnTestnet.id]: http("https://testnet-rpc.iopn.tech"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
