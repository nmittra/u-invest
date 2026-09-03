import type { Account, AddOnStep, Cadence, Position } from "./types";
import { advanceByCadence, todayISO, uid } from "./store";
import { isPriceOnlyInvalidation, stopDepth } from "./calc";

/* ---------------- generic CSV parsing (handles quotes, CRLF, commas in cells) ---------------- */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

/* ---------------- field mapping ---------------- */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const FIELD_ALIASES: Record<string, string> = {
  ticker: "ticker", symbol: "ticker",
  sleeve: "sleeve",
  entrydate: "entryDate", date: "entryDate", boughtdate: "entryDate", purchasedate: "entryDate",
  entryprice: "entryPrice", buyprice: "entryPrice", avgprice: "entryPrice", costbasis: "entryPrice",
  currentprice: "currentPrice", lastprice: "currentPrice", price: "currentPrice", last: "currentPrice",
  sizepct: "sizePct", size: "sizePct", positionsize: "sizePct", weight: "sizePct", sizeofacct: "sizePct",
  thesis: "thesis", onelinethesis: "thesis", rationale: "thesis",
  stopprice: "stopPrice", stop: "stopPrice", hardstop: "stopPrice",
  invalidation: "invalidation", invalidationcriteria: "invalidation", thesisinvalidation: "invalidation", exitcriteria: "invalidation",
  addon: "addon", addonplan: "addon", addplan: "addon", addonpct: "addon",
  nextreview: "nextReview", reviewdate: "nextReview", nextreviewdate: "nextReview",
  cadence: "cadence", reviewcadence: "cadence",
  account: "account", accountname: "account",
};

const CADENCES: Record<string, Cadence> = {
  weekly: "weekly", biweekly: "biweekly", biweekly2: "biweekly", monthly: "monthly", quarterly: "quarterly",
};

function toISO(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const d = new Date(t);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
  return null;
}

function toNum(s: string): number | null {
  const t = s.trim().replace(/[$,%\s]/g, "");
  if (!t) return null;
  const v = parseFloat(t);
  return Number.isFinite(v) ? v : null;
}

function parseSleeve(s: string): 1 | 2 | null {
  const t = norm(s);
  if (["1", "s1", "sleeve1", "trading"].includes(t)) return 1;
  if (["2", "s2", "sleeve2", "core", "corethematic", "thematic"].includes(t)) return 2;
  return null;
}

/** addon format: "-20:3;-35:3|14"  → steps at -20% (+3%) and -35% (+3%), hard cap 14%. */
function parseAddon(s: string): { steps: AddOnStep[]; hardCapPct: number } | null | "bad" {
  const t = s.trim();
  if (!t) return null;
  const [stepsPart, capPart] = t.split("|");
  const stepChunks = stepsPart.split(/[;,]/).map((x) => x.trim()).filter(Boolean);
  const steps: AddOnStep[] = [];
  for (const chunk of stepChunks) {
    const clean = chunk.replace(/%/g, "").replace(/\s+/g, "");
    const m = clean.match(/^(-?\d+(?:\.\d+)?)(?::|→|->)\+?(\d+(?:\.\d+)?)$/);
    if (!m) return "bad";
    steps.push({ id: uid(), triggerPct: -Math.abs(parseFloat(m[1])), sizePct: parseFloat(m[2]) });
  }
  if (!steps.length) return "bad";
  steps.sort((a, b) => a.triggerPct - b.triggerPct);
  let hardCapPct = 0;
  if (capPart) {
    const cm = capPart.replace(/[^0-9.]/g, "");
    hardCapPct = parseFloat(cm) || 0;
  }
  return { steps, hardCapPct };
}

/* ---------------- import rows ---------------- */

export interface ImportRow {
  line: number;
  ticker: string;
  sleeve: 1 | 2;
  entryDate: string;
  entryPrice: number;
  currentPrice: number | null;
  sizePct: number;
  thesis: string;
  stopPrice?: number;
  stopOverride?: boolean;
  invalidation?: string;
  addon?: { steps: AddOnStep[]; hardCapPct: number } | null;
  cadence: Cadence;
  nextReview: string;
  accountName?: string;
  status: "ok" | "warn" | "error";
  messages: string[];
}

export interface ParseResult {
  rows: ImportRow[];
  headerNote?: string;
}

export function parseImportCsv(
  text: string,
  ctx: { accounts: Account[]; positions: Position[] },
): ParseResult {
  const grid = parseCsv(text);
  if (!grid.length) return { rows: [], headerNote: "Nothing to parse yet — paste CSV below or drop a file." };

  const header = grid[0].map(norm);
  const colToField: (string | null)[] = header.map((h) => FIELD_ALIASES[h] ?? null);
  if (!colToField.some((f) => f === "ticker")) {
    return {
      rows: [],
      headerNote: "No header row recognised. Expected column names like ticker, sleeve, entry_date, entry_price, size_pct, thesis, stop_price, invalidation…",
    };
  }

  const today = todayISO();
  const rows: ImportRow[] = [];

  grid.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (field: string) => {
      const idx = colToField.indexOf(field);
      return idx >= 0 && idx < cells.length ? cells[idx].trim() : "";
    };
    const warn: string[] = [];

    const tickerRaw = get("ticker");
    const sleeveRaw = get("sleeve");
    const entryPriceRaw = get("entryPrice");
    const sizeRaw = get("sizePct");
    const thesis = get("thesis");

    /* hard requirements — same ones the entry checklist enforces */
    if (!tickerRaw) return rows.push(err(line, "Missing ticker."));
    const sleeve = parseSleeve(sleeveRaw);
    if (sleeve === null) return rows.push(err(line, `Sleeve must be 1 (Trading) or 2 (Core) — got “${sleeveRaw || "blank"}”.`));
    const entryPrice = toNum(entryPriceRaw);
    if (entryPrice === null || entryPrice <= 0) return rows.push(err(line, "Entry price missing or not a positive number."));
    const sizePct = toNum(sizeRaw);
    if (sizePct === null || sizePct <= 0 || sizePct > 100) return rows.push(err(line, "Size (% of account) missing or not between 0 and 100."));
    if (!thesis) return rows.push(err(line, "Every position needs its one-line thesis."));

    const ticker = tickerRaw.toUpperCase().replace(/\s+/g, "");
    const entryDate = toISO(get("entryDate")) ?? today;
    if (!get("entryDate")) warn.push("No entry date — using today.");
    else if (toISO(get("entryDate")) === null) warn.push(`Couldn't read entry date “${get("entryDate")}” — using today.`);

    const currentRaw = toNum(get("currentPrice"));
    const currentPrice = currentRaw !== null && currentRaw > 0 ? currentRaw : null;

    const cadenceRaw = norm(get("cadence"));
    const cadence: Cadence = CADENCES[cadenceRaw] ?? "monthly";

    let nextReview = toISO(get("nextReview")) ?? advanceByCadence(entryDate, cadence);
    if (nextReview < today) warn.push("Next review is in the past — it will show as due immediately.");

    const accountName = get("account") || undefined;

    const row: ImportRow = {
      line, ticker, sleeve, entryDate, entryPrice, currentPrice, sizePct, thesis,
      cadence, nextReview, accountName, status: "ok", messages: [],
    };

    if (sleeve === 1) {
      const stop = toNum(get("stopPrice"));
      if (stop === null || stop <= 0) return rows.push(err(line, "Sleeve 1 needs a hard stop price — no exceptions."));
      row.stopPrice = stop;
      const depth = stopDepth(entryPrice, stop);
      if (depth < 7 || depth > 8) {
        row.stopOverride = true;
        warn.push(`Stop is ${depth.toFixed(1)}% below entry — outside the 7–8% band, imported as a declared override.`);
      }
      if (stop >= entryPrice) warn.push("Stop is not below the entry price — double-check this row.");
    } else {
      const inv = get("invalidation");
      if (!inv) return rows.push(err(line, "Sleeve 2 needs written thesis-invalidation criteria."));
      row.invalidation = inv;
      if (isPriceOnlyInvalidation(inv)) warn.push("Invalidation wording looks price-based — prefer a checkable fact.");
      const addon = parseAddon(get("addon"));
      if (addon === "bad") warn.push(`Couldn't parse the add-on plan “${get("addon")}” — expected “-20:3;-35:3|14”.`);
      else if (addon === null) warn.push("No add-on plan — the rulebook wants one written in advance.");
      else {
        row.addon = addon;
        if (!addon.hardCapPct) warn.push("Add-on plan has no hard cap (format: …|14).");
      }
    }

    /* duplicates within the destination account */
    const destName = (accountName ?? "").toLowerCase();
    const dup = ctx.positions.some((p) => {
      if (p.ticker !== ticker) return false;
      const acct = ctx.accounts.find((a) => a.id === p.accountId);
      if (destName) return acct?.name.toLowerCase() === destName;
      return true;
    });
    if (dup) warn.push(`${ticker} is already open in the log — importing anyway as a separate entry.`);

    row.messages = warn;
    row.status = warn.length ? "warn" : "ok";
    rows.push(row);
  });

  return { rows };

  function err(line: number, msg: string): ImportRow {
    return {
      line, ticker: "", sleeve: 1, entryDate: today, entryPrice: 0, currentPrice: null, sizePct: 0,
      thesis: "", cadence: "monthly", nextReview: today, status: "error", messages: [msg],
    };
  }
}

export function buildPosition(r: ImportRow, accountId: string): Position {
  return {
    id: uid(),
    accountId,
    ticker: r.ticker,
    sleeve: r.sleeve,
    entryDate: r.entryDate,
    entryPrice: r.entryPrice,
    currentPrice: r.currentPrice,
    sizePct: r.sizePct,
    thesis: r.thesis,
    stopPrice: r.stopPrice,
    stopOverride: r.stopOverride,
    invalidation: r.invalidation,
    addon: r.addon ?? null,
    cadence: r.cadence,
    nextReview: r.nextReview,
    createdAt: Date.now(),
    reviewCount: 0,
  };
}

/* ---------------- template & export ---------------- */

export const CSV_TEMPLATE = `ticker,sleeve,entry_date,entry_price,current_price,size_pct,thesis,stop_price,invalidation,addon,next_review,cadence,account
MRVL,2,2026-01-15,64.20,66.75,8,AI infra networking silicon riding hyperscaler buildout,,"Hyperscaler capex cut two quarters running; loses design wins to named competitor",-20:3;-35:3|14,2026-02-15,monthly,ISA
NVDA,1,2026-02-02,118.40,121.10,5,Momentum continuation over a flat base,109.10,,,,2026-02-16,biweekly,Trading
CCJ,2,2026-01-20,48.60,,6,Uranium supply deficit against reactor restarts,,"Long-term contract book covers under 3 years of production; regulatory reversal on nuclear in key markets",-25:2|10,2026-04-20,quarterly,SIPP
`;

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportLogCsv(positions: Position[], accounts: Account[]): string {
  const head = "ticker,sleeve,entry_date,entry_price,current_price,size_pct,thesis,stop_price,invalidation,addon,next_review,cadence,account";
  const lines = positions.map((p) => {
    const acct = accounts.find((a) => a.id === p.accountId);
    const addon = p.addon
      ? `${p.addon.steps.map((s) => `${s.triggerPct}:${s.sizePct}`).join(";")}${p.addon.hardCapPct ? `|${p.addon.hardCapPct}` : ""}`
      : "";
    return [
      p.ticker, p.sleeve, p.entryDate, p.entryPrice, p.currentPrice ?? "", p.sizePct, p.thesis,
      p.stopPrice ?? "", p.invalidation ?? "", addon, p.nextReview, p.cadence, acct?.name ?? "",
    ].map(csvCell).join(",");
  });
  return [head, ...lines].join("\n") + "\n";
}
