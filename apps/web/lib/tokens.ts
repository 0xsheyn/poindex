import deployment from "@/config/deployment.json";

export type Address = `0x${string}`;

const c = deployment.contracts;

export const ROUTER = c.UniswapV2Router02 as Address;
export const FACTORY = c.UniswapV2Factory as Address;
export const WOPN = c.WOPN as Address;

export type Token = {
  symbol: string;
  name: string;
  // For native OPN this holds the WOPN address (used when building swap paths).
  address: Address;
  decimals: number;
  isNative?: boolean;
  logoURI?: string;
};

export const TOKENS: Token[] = [
  { symbol: "OPN", name: "OPN (native)", address: WOPN, decimals: 18, isNative: true, logoURI: "/tokens/opn.svg" },
  { symbol: "WOPN", name: "Wrapped OPN", address: WOPN, decimals: 18, logoURI: "/tokens/wopn.svg" },
  { symbol: "mUSDC", name: "Mock USD Coin", address: c.mUSDC as Address, decimals: 6, logoURI: "/tokens/usdc.svg" },
  { symbol: "mUSDT", name: "Mock Tether USD", address: c.mUSDT as Address, decimals: 6, logoURI: "/tokens/usdt.svg" },
  { symbol: "mDAI", name: "Mock Dai", address: c.mDAI as Address, decimals: 18, logoURI: "/tokens/dai.svg" },
];

export const findToken = (symbol: string) => TOKENS.find((t) => t.symbol === symbol)!;

// Two tokens are the "same asset" for swap purposes when their on-chain address
// matches (OPN and WOPN share the WOPN address).
export const sameAsset = (a: Token, b: Token) => a.address.toLowerCase() === b.address.toLowerCase();
