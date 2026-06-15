"use client";

import { useAccount, useBalance, useReadContracts } from "wagmi";
import { erc20Abi } from "@/lib/abis";
import { formatAmount } from "@/lib/format";
import { TOKENS, type Token } from "@/lib/tokens";
import { TokenIcon } from "./TokenIcon";

export function TokenModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: Token) => void;
}) {
  const { address } = useAccount();
  const erc20Tokens = TOKENS.filter((t) => !t.isNative);

  const native = useBalance({ address, query: { enabled: open && !!address } });
  const { data: ercBalances } = useReadContracts({
    allowFailure: true,
    contracts: erc20Tokens.map((t) => ({
      address: t.address,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: address ? [address] : undefined,
    })),
    query: { enabled: open && !!address },
  });

  function balanceLabel(t: Token): string {
    if (!address) return "";
    if (t.isNative) return native.data ? formatAmount(native.data.value, t.decimals) : "0";
    const idx = erc20Tokens.findIndex((x) => x.symbol === t.symbol);
    const r = ercBalances?.[idx]?.result as bigint | undefined;
    return r != null ? formatAmount(r, t.decimals) : "0";
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl2 border border-border bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Select a token</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            ✕
          </button>
        </div>
        <ul className="space-y-1">
          {TOKENS.map((t) => {
            const bal = balanceLabel(t);
            return (
              <li key={t.symbol}>
                <button
                  onClick={() => {
                    onSelect(t);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface2"
                >
                  <TokenIcon token={t} size={32} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.symbol}</span>
                    <span className="block truncate text-xs text-muted">{t.name}</span>
                  </span>
                  {bal !== "" && (
                    <span className="ml-auto pl-2 text-right text-sm tabular-nums text-white">
                      {bal}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
