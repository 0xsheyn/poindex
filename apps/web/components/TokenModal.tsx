"use client";

import { TOKENS, type Token } from "@/lib/tokens";

export function TokenModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: Token) => void;
}) {
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
          <h3 className="text-base font-semibold">Pilih token</h3>
          <button onClick={onClose} className="text-muted hover:text-white">
            ✕
          </button>
        </div>
        <ul className="space-y-1">
          {TOKENS.map((t) => (
            <li key={t.symbol}>
              <button
                onClick={() => {
                  onSelect(t);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface2 text-xs font-bold">
                  {t.symbol.slice(0, 2)}
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.symbol}</span>
                  <span className="block text-xs text-muted">{t.name}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
