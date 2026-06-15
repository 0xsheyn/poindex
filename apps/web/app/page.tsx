import { ConnectButton } from "@/components/ConnectButton";
import { SwapCard } from "@/components/SwapCard";

const NAV = [
  { label: "Swap", soon: false },
  { label: "Liquidity Pool", soon: true },
  { label: "Farming", soon: true },
  { label: "Bridge", soon: true },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-gradient font-bold text-white">
              P
            </span>
            <span className="text-lg font-bold tracking-tight">
              Poin<span className="text-primary">DEX</span>
            </span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) =>
              item.soon ? (
                <span
                  key={item.label}
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted"
                  title="Coming soon"
                >
                  {item.label}
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                    Soon
                  </span>
                </span>
              ) : (
                <span
                  key={item.label}
                  className="rounded-lg bg-surface2 px-3 py-1.5 text-sm font-medium text-white"
                >
                  {item.label}
                </span>
              )
            )}
          </nav>
        </div>

        <ConnectButton />
      </header>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-border px-5 py-2 md:hidden">
        {NAV.map((item) => (
          <span
            key={item.label}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              item.soon ? "text-muted" : "bg-surface2 font-medium text-white"
            }`}
          >
            {item.label}
            {item.soon && (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                Soon
              </span>
            )}
          </span>
        ))}
      </nav>

      <section className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
        <SwapCard />
        <p className="max-w-md text-center text-xs text-muted">
          Running on OPN Testnet (Chain ID 984). Need OPN for gas? Get it from{" "}
          <a
            href="https://faucet.iopn.tech"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            faucet.iopn.tech
          </a>
          . Test tokens (mUSDC/mUSDT/mDAI) expose an on-chain <code>faucet()</code> function.
        </p>
      </section>
    </main>
  );
}
