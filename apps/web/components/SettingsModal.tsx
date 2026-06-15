"use client";

const PRESETS = [0.1, 0.5, 1.0];

export function SettingsModal({
  open,
  onClose,
  slippage,
  setSlippage,
  deadlineMin,
  setDeadlineMin,
}: {
  open: boolean;
  onClose: () => void;
  slippage: number;
  setSlippage: (n: number) => void;
  deadlineMin: number;
  setDeadlineMin: (n: number) => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl2 border border-border bg-surface p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Pengaturan</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            ✕
          </button>
        </div>

        <label className="mb-2 block text-sm text-muted">Slippage tolerance</label>
        <div className="mb-4 flex items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setSlippage(p)}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                slippage === p ? "bg-primary text-white" : "bg-surface2 text-muted hover:text-white"
              }`}
            >
              {p}%
            </button>
          ))}
          <div className="flex items-center gap-1 rounded-lg bg-surface2 px-2">
            <input
              type="number"
              value={slippage}
              min={0}
              step={0.1}
              onChange={(e) => setSlippage(Math.max(0, Number(e.target.value)))}
              className="w-16 bg-transparent py-1.5 text-right text-sm outline-none"
            />
            <span className="text-sm text-muted">%</span>
          </div>
        </div>

        <label className="mb-2 block text-sm text-muted">Transaction deadline</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={deadlineMin}
            min={1}
            onChange={(e) => setDeadlineMin(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-lg bg-surface2 px-3 py-1.5 text-sm outline-none"
          />
          <span className="text-sm text-muted">menit</span>
        </div>
      </div>
    </div>
  );
}
