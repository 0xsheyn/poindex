"use client";

import { useEffect, useMemo, useState } from "react";
import { maxUint256 } from "viem";
import {
  useAccount,
  useBalance,
  useChainId,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, routerAbi, wopnAbi } from "@/lib/abis";
import { ROUTER, WOPN, TOKENS, findToken, type Token } from "@/lib/tokens";
import { opnTestnet, txUrl } from "@/lib/chains";
import { applySlippage, formatAmount, safeParseUnits } from "@/lib/format";
import { getQuote, type Quote } from "@/lib/swap";
import { TokenModal } from "./TokenModal";
import { SettingsModal } from "./SettingsModal";

const symbolOf = (addr: string) =>
  TOKENS.find((t) => !t.isNative && t.address.toLowerCase() === addr.toLowerCase())?.symbol ??
  (addr.toLowerCase() === WOPN.toLowerCase() ? "WOPN" : "?");

function useAssetBalance(token: Token) {
  const { address } = useAccount();
  const native = useBalance({ address, query: { enabled: !!address && token.isNative } });
  const erc = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !token.isNative },
  });
  return token.isNative ? native.data?.value ?? 0n : ((erc.data as bigint | undefined) ?? 0n);
}

export function SwapCard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const queryClient = useQueryClient();

  const [tokenIn, setTokenIn] = useState<Token>(findToken("OPN"));
  const [tokenOut, setTokenOut] = useState<Token>(findToken("mUSDC"));
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [deadlineMin, setDeadlineMin] = useState(20);

  const [modal, setModal] = useState<null | "in" | "out">(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);

  const balanceIn = useAssetBalance(tokenIn);
  const balanceOut = useAssetBalance(tokenOut);

  const amountInParsed = useMemo(
    () => safeParseUnits(amountIn, tokenIn.decimals),
    [amountIn, tokenIn.decimals]
  );

  // Allowance (only relevant for ERC-20 inputs)
  const { data: allowance } = useReadContract({
    address: tokenIn.address,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, ROUTER] : undefined,
    query: { enabled: !!address && !tokenIn.isNative },
  });

  // Debounced quoting
  useEffect(() => {
    let cancelled = false;
    if (!amountInParsed || amountInParsed <= 0n) {
      setQuote(null);
      setQuoting(false);
      return;
    }
    setQuoting(true);
    const t = setTimeout(async () => {
      const q = await getQuote(amountInParsed, tokenIn, tokenOut);
      if (!cancelled) {
        setQuote(q);
        setQuoting(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [amountInParsed, tokenIn, tokenOut]);

  const { writeContractAsync, isPending: writing } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
      setAmountIn("");
      setQuote(null);
    }
  }, [isSuccess, queryClient]);

  function switchTokens() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
    setQuote(null);
  }

  const needsApproval =
    !tokenIn.isNative &&
    amountInParsed != null &&
    (allowance as bigint | undefined) != null &&
    (allowance as bigint) < amountInParsed;

  const insufficient = amountInParsed != null && amountInParsed > balanceIn;
  const minReceived = quote ? applySlippage(quote.amountOut, slippage) : 0n;
  const deadline = () => BigInt(Math.floor(Date.now() / 1000) + deadlineMin * 60);

  async function handleApprove() {
    try {
      const hash = await writeContractAsync({
        address: tokenIn.address,
        abi: erc20Abi,
        functionName: "approve",
        args: [ROUTER, maxUint256],
      });
      setTxHash(hash);
    } catch (e) {
      /* user rejected or error — surfaced by wallet */
    }
  }

  async function handleSwap() {
    if (!quote || !amountInParsed || !address) return;
    try {
      let hash: `0x${string}`;
      const dl = deadline();
      if (quote.kind === "wrap") {
        hash = await writeContractAsync({
          address: WOPN,
          abi: wopnAbi,
          functionName: "deposit",
          value: amountInParsed,
        });
      } else if (quote.kind === "unwrap") {
        hash = await writeContractAsync({
          address: WOPN,
          abi: wopnAbi,
          functionName: "withdraw",
          args: [amountInParsed],
        });
      } else if (quote.kind === "ethForTokens") {
        hash = await writeContractAsync({
          address: ROUTER,
          abi: routerAbi,
          functionName: "swapExactETHForTokens",
          args: [minReceived, quote.path, address, dl],
          value: amountInParsed,
        });
      } else if (quote.kind === "tokensForEth") {
        hash = await writeContractAsync({
          address: ROUTER,
          abi: routerAbi,
          functionName: "swapExactTokensForETH",
          args: [amountInParsed, minReceived, quote.path, address, dl],
        });
      } else {
        hash = await writeContractAsync({
          address: ROUTER,
          abi: routerAbi,
          functionName: "swapExactTokensForTokens",
          args: [amountInParsed, minReceived, quote.path, address, dl],
        });
      }
      setTxHash(hash);
    } catch (e) {
      /* user rejected or error */
    }
  }

  // ---- Adaptive CTA ----
  const wrongChain = isConnected && chainId !== opnTestnet.id;
  const busy = writing || confirming;

  let cta: { label: string; onClick?: () => void; disabled?: boolean } = {
    label: "Swap",
    onClick: handleSwap,
    disabled: true,
  };

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    cta = { label: connecting ? "Connecting…" : "Connect Wallet", onClick: () => connect({ connector: injected }) };
  } else if (wrongChain) {
    cta = { label: switching ? "Switching…" : "Switch to OPN", onClick: () => switchChain({ chainId: opnTestnet.id }) };
  } else if (!amountInParsed || amountInParsed <= 0n) {
    cta = { label: "Masukkan jumlah", disabled: true };
  } else if (insufficient) {
    cta = { label: `Saldo ${tokenIn.symbol} tidak cukup`, disabled: true };
  } else if (quoting) {
    cta = { label: "Menghitung…", disabled: true };
  } else if (!quote) {
    cta = { label: "Tidak ada rute / likuiditas", disabled: true };
  } else if (needsApproval) {
    cta = { label: busy ? "Menunggu…" : `Approve ${tokenIn.symbol}`, onClick: handleApprove, disabled: busy };
  } else {
    cta = { label: busy ? "Memproses…" : "Swap", onClick: handleSwap, disabled: busy };
  }

  const routeLabel =
    quote && quote.path.length > 0
      ? quote.path.map((a, i) => (i === 0 ? tokenIn.symbol : i === quote.path.length - 1 ? tokenOut.symbol : symbolOf(a))).join(" → ")
      : quote?.kind === "wrap"
        ? "Wrap (1:1)"
        : quote?.kind === "unwrap"
          ? "Unwrap (1:1)"
          : "—";

  return (
    <div className="w-full max-w-md rounded-xl2 border border-border bg-surface p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Swap</h2>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg p-2 text-muted transition hover:bg-surface2 hover:text-white"
          title="Pengaturan"
        >
          ⚙
        </button>
      </div>

      {/* FROM */}
      <div className="rounded-xl2 bg-surface2 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Dari</span>
          <span>
            Saldo: {formatAmount(balanceIn, tokenIn.decimals)}{" "}
            <button
              className="text-primary hover:underline"
              onClick={() => setAmountIn(formatAmount(balanceIn, tokenIn.decimals, 18))}
            >
              Max
            </button>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            className="w-full bg-transparent text-2xl font-medium outline-none placeholder:text-muted"
          />
          <TokenButton token={tokenIn} onClick={() => setModal("in")} />
        </div>
      </div>

      {/* SWITCH */}
      <div className="relative my-1 flex justify-center">
        <button
          onClick={switchTokens}
          className="absolute -top-3 rounded-lg border border-border bg-surface p-1.5 text-muted transition hover:text-white"
          title="Balik arah"
        >
          ↑↓
        </button>
      </div>

      {/* TO */}
      <div className="rounded-xl2 bg-surface2 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Ke (estimasi)</span>
          <span>Saldo: {formatAmount(balanceOut, tokenOut.decimals)}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            readOnly
            placeholder="0.0"
            value={quote ? formatAmount(quote.amountOut, tokenOut.decimals) : ""}
            className="w-full bg-transparent text-2xl font-medium text-white outline-none placeholder:text-muted"
          />
          <TokenButton token={tokenOut} onClick={() => setModal("out")} />
        </div>
      </div>

      {/* INFO */}
      {quote && (
        <div className="mt-3 space-y-1.5 rounded-xl2 border border-border bg-surface2/40 p-3 text-xs text-muted">
          <Row label="Rute" value={routeLabel} />
          {quote.kind !== "wrap" && quote.kind !== "unwrap" && (
            <>
              <Row
                label="Price impact"
                value={
                  quote.priceImpactPct == null
                    ? "—"
                    : `${quote.priceImpactPct.toFixed(2)}%`
                }
                warn={(quote.priceImpactPct ?? 0) > 5}
              />
              <Row label="Min. diterima" value={`${formatAmount(minReceived, tokenOut.decimals)} ${tokenOut.symbol}`} />
              <Row label="Biaya LP" value={`${(0.3 * quote.hops).toFixed(2)}%`} />
            </>
          )}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={cta.onClick}
        disabled={cta.disabled}
        className="mt-4 w-full rounded-xl2 bg-primary py-3.5 text-base font-semibold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {cta.label}
      </button>

      {/* TX STATUS */}
      {txHash && (
        <div className="mt-3 rounded-lg bg-surface2 p-3 text-xs">
          {confirming ? (
            <span className="text-amber-400">Menunggu konfirmasi…</span>
          ) : isSuccess ? (
            <span className="text-emerald-400">Transaksi sukses ✓</span>
          ) : (
            <span className="text-muted">Transaksi terkirim</span>
          )}{" "}
          <a href={txUrl(txHash)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            Lihat di explorer ↗
          </a>
        </div>
      )}

      <TokenModal
        open={modal !== null}
        onClose={() => setModal(null)}
        onSelect={(t) => {
          if (modal === "in") {
            if (t.symbol === tokenOut.symbol) setTokenOut(tokenIn);
            setTokenIn(t);
          } else {
            if (t.symbol === tokenIn.symbol) setTokenIn(tokenOut);
            setTokenOut(t);
          }
          setAmountIn("");
          setQuote(null);
        }}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        slippage={slippage}
        setSlippage={setSlippage}
        deadlineMin={deadlineMin}
        setDeadlineMin={setDeadlineMin}
      />
    </div>
  );
}

function TokenButton({ token, onClick }: { token: Token; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-xl bg-surface px-3 py-2 font-semibold transition hover:bg-border"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-[10px] font-bold">
        {token.symbol.slice(0, 2)}
      </span>
      {token.symbol}
      <span className="text-muted">▾</span>
    </button>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={warn ? "text-amber-400" : "text-white"}>{value}</span>
    </div>
  );
}
