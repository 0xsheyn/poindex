import { createPublicClient, http } from "viem";
import { opnTestnet } from "./chains";

// Read-only client used for quoting (getAmountsOut) and on-chain reads.
export const publicClient = createPublicClient({
  chain: opnTestnet,
  transport: http(),
});
