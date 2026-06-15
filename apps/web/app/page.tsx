import { ConnectButton } from "@/components/ConnectButton";
import { SwapCard } from "@/components/SwapCard";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
            P
          </span>
          <span className="text-lg font-bold tracking-tight">
            Poin<span className="text-primary">DEX</span>
          </span>
        </div>
        <ConnectButton />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
        <SwapCard />
        <p className="max-w-md text-center text-xs text-muted">
          Berjalan di OPN Testnet (Chain ID 984). Butuh OPN untuk gas? Ambil dari{" "}
          <a
            href="https://faucet.iopn.tech"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            faucet.iopn.tech
          </a>
          . Token uji (mUSDC/mUSDT/mDAI) punya fungsi <code>faucet()</code> on-chain.
        </p>
      </section>
    </main>
  );
}
