import { formatUnits, parseUnits } from "viem";

// Parse a user-typed decimal string into base units, tolerating empty/invalid input.
export function safeParseUnits(value: string, decimals: number): bigint | null {
  if (!value || Number.isNaN(Number(value))) return null;
  try {
    return parseUnits(value as `${number}`, decimals);
  } catch {
    return null;
  }
}

// Format base units to a trimmed, human-readable string with a max number of significant decimals.
export function formatAmount(value: bigint, decimals: number, maxDecimals = 6): string {
  const s = formatUnits(value, decimals);
  if (!s.includes(".")) return s;
  const [whole, frac] = s.split(".");
  const trimmed = frac.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function shortAddress(addr?: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Apply slippage tolerance (in %) to compute the minimum acceptable output.
export function applySlippage(amountOut: bigint, slippagePct: number): bigint {
  const bps = BigInt(Math.round(slippagePct * 100)); // pct -> basis points
  return (amountOut * (10000n - bps)) / 10000n;
}
