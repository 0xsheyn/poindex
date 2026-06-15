"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { opnTestnet } from "@/lib/chains";
import { shortAddress } from "@/lib/format";

export function ConnectButton() {
  // Use the wallet's actual chainId (useAccount), not wagmi config state (useChainId).
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected })}
        disabled={isPending}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primaryHover disabled:opacity-60"
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== opnTestnet.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: opnTestnet.id })}
        disabled={switching}
        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-60"
      >
        {switching ? "Switching…" : "Switch to OPN"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden rounded-lg bg-surface2 px-3 py-1.5 text-xs text-emerald-400 sm:inline">
        OPN Testnet
      </span>
      <button
        onClick={() => disconnect()}
        className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-white transition hover:bg-surface2"
        title="Disconnect"
      >
        {shortAddress(address)}
      </button>
    </div>
  );
}
