/**
 * Free, keyless market quotes.
 *
 * Primary source is Yahoo Finance's public chart endpoint. Browsers usually
 * block it on CORS, so we try it direct first and then fall back through two
 * long-running free CORS relays. Prices are typically ~15-min delayed — fine
 * for a rulebook, and every manual update path still works.
 */

export interface Quote {
  price: number;
  /** human-readable source, e.g. "Yahoo Finance" */
  source: string;
}

const YAHOO_CHART = (s: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=5d`;

const STRATEGIES: { name: string; wrap: (url: string) => string; label: string }[] = [
  { name: "direct", wrap: (u) => u, label: "Yahoo Finance" },
  { name: "allorigins", wrap: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, label: "Yahoo Finance (relayed)" },
  { name: "corsproxy", wrap: (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`, label: "Yahoo Finance (relayed)" },
];

async function fetchText(url: string, timeoutMs = 9000): Promise<string> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json,text/csv;q=0.9,*/*;q=0.8" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    window.clearTimeout(t);
  }
}

function parseYahooChart(text: string): number | null {
  try {
    const j = JSON.parse(text) as {
      chart?: { result?: { meta?: { regularMarketPrice?: number; previousClose?: number }; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
    };
    const r = j?.chart?.result?.[0];
    if (!r) return null;
    const meta = r.meta?.regularMarketPrice ?? r.meta?.previousClose;
    if (typeof meta === "number" && Number.isFinite(meta) && meta > 0) return meta;
    const closes = r.indicators?.quote?.[0]?.close;
    if (Array.isArray(closes)) {
      for (let i = closes.length - 1; i >= 0; i--) {
        const c = closes[i];
        if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Ticker → canonical Yahoo symbol. Supports suffixes like "SHEL.L", "CCJ", "BTC-USD". */
export function normalizeSymbol(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/\s+/g, "");
}

export async function fetchQuote(ticker: string): Promise<Quote> {
  const symbol = normalizeSymbol(ticker);
  if (!symbol) throw new Error("empty-symbol");
  for (const s of STRATEGIES) {
    try {
      const text = await fetchText(s.wrap(YAHOO_CHART(symbol)));
      const price = parseYahooChart(text);
      if (price !== null) return { price, source: s.label };
    } catch {
      /* try next strategy */
    }
  }
  throw new Error(`no-quote:${symbol}`);
}
