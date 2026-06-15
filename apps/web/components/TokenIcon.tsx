import type { Token } from "@/lib/tokens";

// Renders a token's real logo (local SVG), falling back to a text badge.
export function TokenIcon({ token, size = 24 }: { token: Token; size?: number }) {
  if (token.logoURI) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={token.logoURI}
        alt={token.symbol}
        width={size}
        height={size}
        className="shrink-0 rounded-full"
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-border text-[10px] font-bold"
      style={{ width: size, height: size }}
    >
      {token.symbol.slice(0, 2)}
    </span>
  );
}
