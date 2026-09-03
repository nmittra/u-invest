import { useState } from "react";
import type { Position } from "../lib/types";
import { addonSummary, cushionToStop, pct, pnlPct, price, stopBandState, stopBreached, stopDepth } from "../lib/calc";
import { CADENCE_LABEL, daysUntil, fmtDate, timeAgo } from "../lib/store";
import { SleeveBadge, btnGhost, btnPrimary } from "./ui";
import { IconAlert, IconCalendar, IconFlag, IconPencil, IconPlus, IconRefresh, IconShield, IconUpload } from "./icons";

export function PositionsTable({
  positions,
  accountName,
  onNew,
  onEdit,
  onReview,
  onExit,
  onUpdatePrice,
  onLoadSample,
  onImportCsv,
  onRefreshAll,
  onRefreshOne,
  busyPrices,
  refreshProgress,
}: {
  positions: Position[];
  accountName: string;
  onNew: () => void;
  onEdit: (p: Position) => void;
  onReview: (p: Position) => void;
  onExit: (p: Position) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onLoadSample: () => void;
  onImportCsv: () => void;
  onRefreshAll: () => void;
  onRefreshOne: (p: Position) => void;
  busyPrices: Record<string, boolean>;
  refreshProgress: { done: number; total: number } | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-500">{accountName}</div>
          <h1 className="mt-1.5 font-display font-bold text-[32px] sm:text-[38px] leading-none tracking-tight text-fog-100">
            Position Log
          </h1>
          <p className="mt-2 text-[13.5px] text-fog-500 max-w-xl leading-relaxed">
            One row per position, classified at purchase. <span className="text-fog-300">No position changes sleeves mid-drawdown.</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={onImportCsv} className={btnGhost}>
            <IconUpload size={14} /> Import CSV
          </button>
          <button
            onClick={onRefreshAll}
            disabled={!!refreshProgress || positions.length === 0}
            className={`${btnGhost} disabled:opacity-40 disabled:pointer-events-none`}
            title="Fetch latest prices — free, no API key, typically ~15-min delayed"
          >
            <IconRefresh size={14} className={refreshProgress ? "animate-spin" : ""} />
            {refreshProgress ? `Updating ${refreshProgress.done}/${refreshProgress.total}…` : "Refresh prices"}
          </button>
          <button onClick={onNew} className={btnPrimary}>
            <IconPlus size={15} /> New entry — run the checklist
          </button>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="rise rounded-lg border border-dashed border-pine-600 bg-pine-850/50 px-8 py-16 text-center" style={{ animationDelay: "0.1s" }}>
          <svg width="150" height="64" viewBox="0 0 150 64" fill="none" className="mx-auto opacity-60">
            {[10, 22, 34, 46, 58].map((y) => (
              <line key={y} x1="6" y1={y} x2="144" y2={y} stroke="#2b3d33" strokeWidth="1.4" strokeDasharray={y === 34 ? "0" : "3 5"} />
            ))}
            <path d="M20 46 L45 34 L70 40 L95 22 L120 28 L138 16" stroke="#3ecf8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
            <circle cx="95" cy="22" r="3.4" fill="#f0a63c" />
          </svg>
          <h2 className="mt-5 font-display font-bold text-xl text-fog-100">A clean log is a valid log.</h2>
          <p className="mt-2 text-[14px] text-fog-500 max-w-md mx-auto leading-relaxed">
            Nothing open{accountName !== "All accounts" ? " in this account" : ""}. When you buy something, it goes in the same day —
            sleeve, thesis, stop or invalidation, size, review date.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={onNew} className={btnPrimary}><IconPlus size={15} /> New entry</button>
            <button onClick={onImportCsv} className={btnGhost}><IconUpload size={14} /> Import CSV</button>
            <button onClick={onLoadSample} className={btnGhost}>Load the MRVL example</button>
          </div>
        </div>
      ) : (
        <div className="rise rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.08s" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead>
                <tr className="border-b border-line bg-pine-900/70">
                  {["Position", "Entry", "Entry px", "Last px / P&L", "Size", "Stop (S1) · Invalidation (S2)", "Add-on plan", "Next review", ""].map((h, i) => (
                    <th key={i} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-600 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {positions.map((p, idx) => (
                  <Row
                    key={p.id}
                    p={p}
                    idx={idx}
                    busy={!!busyPrices[p.id]}
                    onEdit={() => onEdit(p)}
                    onReview={() => onReview(p)}
                    onExit={() => onExit(p)}
                    onUpdatePrice={(v) => onUpdatePrice(p.id, v)}
                    onRefresh={() => onRefreshOne(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-line flex flex-wrap gap-x-6 gap-y-1 items-center">
            <span className="font-mono text-[10.5px] text-fog-600 tracking-wide">
              {positions.length} OPEN · CLICK A LAST PRICE TO EDIT IT · REFRESH PULLS FREE QUOTES (YAHOO FINANCE, ~15-MIN DELAYED) · S1 GAUGE = CUSHION TO STOP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- row ---------------- */

function Row({
  p,
  idx,
  busy,
  onEdit,
  onReview,
  onExit,
  onUpdatePrice,
  onRefresh,
}: {
  p: Position;
  idx: number;
  busy: boolean;
  onEdit: () => void;
  onReview: () => void;
  onExit: () => void;
  onUpdatePrice: (v: number) => void;
  onRefresh: () => void;
}) {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");

  const ch = pnlPct(p.entryPrice, p.currentPrice);
  const dueDays = daysUntil(p.nextReview);
  const overdue = dueDays <= 0;

  const depth = p.sleeve === 1 && p.stopPrice ? stopDepth(p.entryPrice, p.stopPrice) : null;
  const band = depth !== null ? stopBandState(depth) : null;
  const cushion = p.sleeve === 1 && p.stopPrice ? cushionToStop(p.currentPrice, p.stopPrice) : null;
  const breached = p.sleeve === 1 && p.stopPrice !== undefined && p.currentPrice !== null && p.currentPrice <= p.stopPrice;

  function commitPrice() {
    const v = parseFloat(priceDraft);
    if (Number.isFinite(v) && v > 0) onUpdatePrice(v);
    setEditingPrice(false);
  }

  return (
    <tr className="rise group hover:bg-pine-800/50 transition-colors align-top" style={{ animationDelay: `${0.05 + idx * 0.04}s` }}>
      {/* position */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="font-display font-bold text-[16px] text-fog-100 tracking-wide">{p.ticker}</span>
          <SleeveBadge sleeve={p.sleeve} compact />
        </div>
        <div className="mt-1 max-w-[240px] text-[12px] text-fog-500 leading-snug line-clamp-2" title={p.thesis}>
          {p.thesis}
        </div>
      </td>
      {/* entry */}
      <td className="px-4 py-3.5 font-mono text-[12.5px] text-fog-300 tabular whitespace-nowrap">{fmtDate(p.entryDate)}</td>
      {/* entry px */}
      <td className="px-4 py-3.5 font-mono text-[13px] text-fog-100 tabular">{price(p.entryPrice)}</td>
      {/* last px + pnl */}
      <td className="px-4 py-3.5">
        {editingPrice ? (
          <input
            autoFocus
            className="w-[92px] bg-pine-900 border border-moss-600 rounded px-2 py-1 font-mono text-[13px] text-fog-100 outline-none focus:ring-2 focus:ring-moss-600/25"
            value={priceDraft}
            inputMode="decimal"
            onChange={(e) => setPriceDraft(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
              if (e.key === "Escape") setEditingPrice(false);
            }}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span key={p.lastPriceUpdate ?? -1} className="price-flash inline-block px-0.5 -mx-0.5">
              <button
                onClick={() => {
                  setPriceDraft(p.currentPrice ? String(p.currentPrice) : "");
                  setEditingPrice(true);
                }}
                className="font-mono text-[13px] text-fog-100 tabular border-b border-dashed border-pine-600 hover:border-moss-400 hover:text-moss-300 transition-colors cursor-text"
                title="Update last price"
              >
                {p.currentPrice ? price(p.currentPrice) : "set price"}
              </button>
            </span>
            <button
              onClick={onRefresh}
              disabled={busy}
              className="p-1 rounded text-fog-600 hover:text-moss-300 hover:bg-pine-800 transition-colors disabled:opacity-60"
              title="Fetch latest price — free quote, ~15-min delayed"
            >
              <IconRefresh size={12} className={busy ? "animate-spin" : ""} />
            </button>
          </span>
        )}
        <div className={`mt-0.5 font-mono text-[11.5px] tabular ${ch === null ? "text-fog-600" : ch >= 0 ? "text-moss-400" : "text-ember-400"}`}>
          {ch === null ? "—" : `${ch >= 0 ? "▲" : "▼"} ${pct(ch)}`}
        </div>
        {p.lastPriceUpdate && (
          <div className="mt-0.5 font-mono text-[10px] text-fog-600 tabular">upd {timeAgo(p.lastPriceUpdate)}</div>
        )}
      </td>
      {/* size */}
      <td className="px-4 py-3.5">
        <div className="font-mono text-[13px] text-fog-100 tabular">{p.sizePct}%</div>
        <div className="mt-1 h-1 w-[64px] rounded-full bg-pine-900 border border-line overflow-hidden">
          <div className={`h-full ${p.sizePct > 15 ? "bg-flare-400" : "bg-fog-600"}`} style={{ width: `${Math.min(100, (p.sizePct / 25) * 100)}%` }} />
        </div>
      </td>
      {/* stop / invalidation */}
      <td className="px-4 py-3.5 max-w-[260px]">
        {p.sleeve === 1 ? (
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[13px] tabular font-medium ${breached ? "text-ember-400" : "text-flare-300"}`}>
                {price(p.stopPrice!)}
              </span>
              {band && band !== "in-band" && (
                <span className="font-mono text-[9.5px] tracking-wider px-1.5 py-px rounded border border-flare-600/50 text-flare-400" title="Deviation from the 7–8% band was acknowledged at entry">
                  {depth!.toFixed(1)}% BAND
                </span>
              )}
              {breached && (
                <span className="font-mono text-[9.5px] tracking-wider px-1.5 py-px rounded border border-ember-600/60 bg-ember-900/60 text-ember-300 throb">
                  BREACHED
                </span>
              )}
            </div>
            {cushion !== null && !breached && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1 w-[76px] rounded-full bg-pine-900 border border-line overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${cushion <= 2.5 ? "bg-ember-400" : cushion <= 4.5 ? "bg-flare-400" : "bg-moss-400"}`}
                    style={{ width: `${Math.max(4, Math.min(100, (cushion / 8) * 100))}%` }}
                  />
                </div>
                <span className="font-mono text-[10.5px] text-fog-500 tabular">{cushion.toFixed(1)}% left</span>
              </div>
            )}
            {breached && (
              <button onClick={onExit} className="mt-1.5 text-[11px] font-semibold text-ember-400 hover:text-ember-300 hover:underline">
                stop hit → log the exit
              </button>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-fog-300 leading-snug line-clamp-3" title={p.invalidation}>
            <span className="font-mono text-[9.5px] tracking-wider text-moss-600 block mb-0.5">INVALIDATES IF</span>
            {p.invalidation || "—"}
          </div>
        )}
      </td>
      {/* add-on */}
      <td className="px-4 py-3.5">
        {p.sleeve === 2 ? (
          <span className="font-mono text-[11.5px] text-fog-500 tabular leading-relaxed">{addonSummary(p)}</span>
        ) : (
          <span className="font-mono text-[11.5px] text-fog-600">n/a — S1</span>
        )}
      </td>
      {/* next review */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <div className={`flex items-center gap-1.5 font-mono text-[12.5px] tabular ${overdue ? "text-ember-300" : "text-fog-300"}`}>
          {overdue && <span className="w-1.5 h-1.5 rounded-full bg-ember-400 throb" />}
          {fmtDate(p.nextReview)}
        </div>
        <div className="font-mono text-[10.5px] text-fog-600 tabular mt-0.5">
          {overdue ? (dueDays === 0 ? "due today" : `${Math.abs(dueDays)}d overdue`) : `in ${dueDays}d`} · {CADENCE_LABEL[p.cadence].toLowerCase()}
        </div>
      </td>
      {/* actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onReview}
            title="Run scheduled review"
            className={`p-2 rounded-md transition-all active:scale-90 ${overdue ? "text-flare-400 bg-flare-900/50 hover:bg-flare-900" : "text-fog-500 hover:text-fog-100 hover:bg-pine-700"}`}
          >
            <IconCalendar size={15} />
          </button>
          <button onClick={onEdit} title="Amend entry" className="p-2 rounded-md text-fog-500 hover:text-fog-100 hover:bg-pine-700 transition-all active:scale-90">
            <IconPencil size={15} />
          </button>
          <button onClick={onExit} title="Close position" className="p-2 rounded-md text-fog-500 hover:text-ember-400 hover:bg-pine-700 transition-all active:scale-90">
            <IconFlag size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function OverdueChip({ positions }: { positions: Position[] }) {
  const n = positions.filter((p) => daysUntil(p.nextReview) <= 0).length;
  if (n === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ember-300 border border-ember-600/60 bg-ember-900/50 rounded px-2 py-0.5">
      <IconAlert size={11} /> {n} review{n > 1 ? "s" : ""} due
    </span>
  );
}

export function StopWarning({ positions }: { positions: Position[] }) {
  const n = positions.filter((p) => stopBreached(p)).length;
  if (n === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ember-300 border border-ember-600/60 bg-ember-900/50 rounded px-2 py-0.5">
      <IconShield size={11} /> {n} stop{n > 1 ? "s" : ""} breached
    </span>
  );
}
