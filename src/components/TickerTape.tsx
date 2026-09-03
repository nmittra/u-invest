import type { Position } from "../lib/types";
import { pct, pnlPct, price } from "../lib/calc";

const MAXIMS = [
  "NO SLEEVE CHANGES MID-DRAWDOWN",
  "STOP HIT = EXIT, NO DEBATE",
  "PRICE ALONE NEVER SELLS A CORE",
  "SIZE IS THE REAL RISK CONTROL",
  "WRITE THE PLAN WHILE CALM",
  "A RECOVERED STOP IS THE COST OF THE SYSTEM",
];

export function TickerTape({ positions }: { positions: Position[] }) {
  const items: { kind: "pos"; p: Position }[] = positions.map((p) => ({ kind: "pos", p }));

  const row = (keyPrefix: string) => (
    <>
      {items.map(({ p }) => {
        const ch = pnlPct(p.entryPrice, p.currentPrice);
        const up = ch !== null && ch >= 0;
        return (
          <span key={`${keyPrefix}-${p.id}`} className="flex items-center gap-2 px-5 shrink-0">
            <span className="font-display font-bold text-[13px] tracking-wide text-fog-100">{p.ticker}</span>
            <span className="font-mono text-[12px] text-fog-300 tabular">
              {p.currentPrice ? price(p.currentPrice) : "· · ·"}
            </span>
            {ch !== null && (
              <span className={`font-mono text-[12px] tabular ${up ? "text-moss-400" : "text-ember-400"}`}>
                {up ? "▲" : "▼"} {pct(ch)}
              </span>
            )}
            <span
              className={`font-mono text-[10px] tracking-[0.14em] px-1.5 py-px rounded-sm border ${
                p.sleeve === 1 ? "text-flare-400 border-flare-600/50" : "text-moss-400 border-moss-600/50"
              }`}
            >
              S{p.sleeve}
            </span>
            <Sep />
          </span>
        );
      })}
      {MAXIMS.map((m, i) => (
        <span key={`${keyPrefix}-m${i}`} className="flex items-center gap-2 px-5 shrink-0">
          <span className="font-mono text-[11px] tracking-[0.16em] text-fog-600">{m}</span>
          <Sep />
        </span>
      ))}
    </>
  );

  return (
    <div className="ticker-shell relative z-10 border-b border-line bg-pine-900/80 backdrop-blur-sm overflow-hidden select-none">
      <div className="ticker-track py-2">
        {row("a")}
        {row("b")}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-pine-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-pine-950 to-transparent" />
    </div>
  );
}

function Sep() {
  return <span className="text-pine-600 text-[10px]">◆</span>;
}
