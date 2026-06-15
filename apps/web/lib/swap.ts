import { formatUnits } from "viem";
import { publicClient } from "./viem";
import { routerAbi, factoryAbi, pairAbi } from "./abis";
import { ROUTER, FACTORY, WOPN, type Address, type Token } from "./tokens";

export type SwapKind = "wrap" | "unwrap" | "ethForTokens" | "tokensForEth" | "tokensForTokens";

export type Quote = {
  kind: SwapKind;
  amountOut: bigint;
  path: Address[];
  priceImpactPct: number | null; // null when not computable (multi-hop / wrap)
  hops: number;
};

// Classify the swap given the selected tokens.
export function swapKind(inT: Token, outT: Token): SwapKind | null {
  const sameAddr = inT.address.toLowerCase() === outT.address.toLowerCase();
  if (sameAddr) {
    if (inT.isNative && !outT.isNative) return "wrap";
    if (!inT.isNative && outT.isNative) return "unwrap";
    return null; // identical token
  }
  if (inT.isNative) return "ethForTokens";
  if (outT.isNative) return "tokensForEth";
  return "tokensForTokens";
}

// Candidate routes: direct, then via WOPN.
function buildPaths(inT: Token, outT: Token): Address[][] {
  const a = inT.address;
  const b = outT.address;
  if (a.toLowerCase() === b.toLowerCase()) return [];
  const paths: Address[][] = [[a, b]];
  if (a.toLowerCase() !== WOPN.toLowerCase() && b.toLowerCase() !== WOPN.toLowerCase()) {
    paths.push([a, WOPN, b]);
  }
  return paths;
}

async function singleHopPriceImpact(
  path: Address[],
  amountIn: bigint,
  amountOut: bigint,
  inDecimals: number,
  outDecimals: number
): Promise<number | null> {
  try {
    const pair = (await publicClient.readContract({
      address: FACTORY,
      abi: factoryAbi,
      functionName: "getPair",
      args: [path[0], path[1]],
    })) as Address;
    const [reserves, token0] = await Promise.all([
      publicClient.readContract({ address: pair, abi: pairAbi, functionName: "getReserves" }) as Promise<
        readonly [bigint, bigint, number]
      >,
      publicClient.readContract({ address: pair, abi: pairAbi, functionName: "token0" }) as Promise<Address>,
    ]);
    const inIsToken0 = path[0].toLowerCase() === token0.toLowerCase();
    const reserveIn = inIsToken0 ? reserves[0] : reserves[1];
    const reserveOut = inIsToken0 ? reserves[1] : reserves[0];

    const rIn = Number(formatUnits(reserveIn, inDecimals));
    const rOut = Number(formatUnits(reserveOut, outDecimals));
    const aIn = Number(formatUnits(amountIn, inDecimals));
    const aOut = Number(formatUnits(amountOut, outDecimals));
    if (rIn === 0 || rOut === 0 || aIn === 0) return null;

    const midPrice = rOut / rIn; // marginal price, no fee
    const execPrice = aOut / aIn;
    const impact = (1 - execPrice / midPrice) * 100;
    return impact < 0 ? 0 : impact;
  } catch {
    return null;
  }
}

// Returns the best available quote, or null if no route / zero input.
export async function getQuote(amountIn: bigint, inT: Token, outT: Token): Promise<Quote | null> {
  if (amountIn <= 0n) return null;
  const kind = swapKind(inT, outT);
  if (!kind) return null;

  // Wrap / unwrap is always 1:1 (both 18 decimals).
  if (kind === "wrap" || kind === "unwrap") {
    return { kind, amountOut: amountIn, path: [], priceImpactPct: null, hops: 0 };
  }

  const paths = buildPaths(inT, outT);
  let best: { amountOut: bigint; path: Address[] } | null = null;

  for (const path of paths) {
    try {
      const amounts = (await publicClient.readContract({
        address: ROUTER,
        abi: routerAbi,
        functionName: "getAmountsOut",
        args: [amountIn, path],
      })) as readonly bigint[];
      const out = amounts[amounts.length - 1];
      if (!best || out > best.amountOut) best = { amountOut: out, path };
    } catch {
      // pair not found on this route — try the next
    }
  }

  if (!best) return null;

  const hops = best.path.length - 1;
  const priceImpactPct =
    hops === 1
      ? await singleHopPriceImpact(best.path, amountIn, best.amountOut, inT.decimals, outT.decimals)
      : null;

  return { kind, amountOut: best.amountOut, path: best.path, priceImpactPct, hops };
}
