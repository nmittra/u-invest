import type { Position } from "./types";

/* ---------------- money & percent formatting ---------------- */

export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function moneyCompact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return money(n);
}

export function pct(n: number | null | undefined, digits = 1, signed = true): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const s = n > 0 && signed ? "+" : "";
  return `${s}${n.toFixed(digits)}%`;
}

export function price(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------------- position math ---------------- */

export function pnlPct(entryPrice: number, current: number | null): number | null {
  if (!current || current <= 0 || !entryPrice || entryPrice <= 0) return null;
  return ((current - entryPrice) / entryPrice) * 100;
}

/** how far the stop sits below entry, in % (positive = below entry) */
export function stopDepth(entryPrice: number, stopPrice: number): number {
  return ((entryPrice - stopPrice) / entryPrice) * 100;
}

export type BandState = "above" | "tight" | "in-band" | "wide";

export function stopBandState(depthPct: number): BandState {
  if (depthPct <= 0) return "above";
  if (depthPct < 7) return "tight";
  if (depthPct <= 8) return "in-band";
  return "wide";
}

/** remaining cushion between current price and stop, % of current price */
export function cushionToStop(current: number | null, stopPrice: number): number | null {
  if (!current || current <= 0) return null;
  return ((current - stopPrice) / current) * 100;
}

export function stopBreached(p: Position): boolean {
  return p.sleeve === 1 && !!p.stopPrice && !!p.currentPrice && p.currentPrice <= p.stopPrice;
}

/* ---------------- sleeve-2 invalidation clarity ---------------- */

const PRICE_ONLY_PATTERNS = [
  /^\s*(if\s+)?(it|the\s+stock|the\s+price|price|stock)\s+(drops?|falls?|fell|declines?|dips?|craters?|tanks?|loses?)\b/i,
  /\b(drops?|falls?|declines?|dips?)\s+(more\s+than\s+|another\s+|by\s+)?\d+\s*%/i,
  /\bprice\s+(goes?|gets?)\s+(below|under)/i,
  /\b(down|below|under)\s+\d+\s*%\b/i,
  /^\s*\d+\s*%\s*(drop|fall|decline|drawdown)/i,
];

/** returns true when the criteria are just a price move in disguise */
export function isPriceOnlyInvalidation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return PRICE_ONLY_PATTERNS.some((re) => re.test(t));
}

export const INVALIDATION_MIN_LENGTH = 20;

/* ---------------- aggregation ---------------- */

export function sumSize(positions: Position[]): number {
  return positions.reduce((acc, p) => acc + (p.sizePct || 0), 0);
}

export function sleeveSplit(positions: Position[]): { s1: number; s2: number } {
  return {
    s1: positions.filter((p) => p.sleeve === 1).reduce((a, p) => a + p.sizePct, 0),
    s2: positions.filter((p) => p.sleeve === 2).reduce((a, p) => a + p.sizePct, 0),
  };
}

export function addonSummary(p: Position): string {
  if (p.sleeve !== 2 || !p.addon) return "—";
  if (p.addon.steps.length === 0) return `No adds · cap ${p.addon.hardCapPct}%`;
  const steps = p.addon.steps
    .map((s) => `${s.triggerPct}% → +${s.sizePct}%`)
    .join(" · ");
  return `${steps} · cap ${p.addon.hardCapPct}%`;
}
