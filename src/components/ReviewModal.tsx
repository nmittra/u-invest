import { useState } from "react";
import type { Position } from "../lib/types";
import { cushionToStop, pct, pnlPct, price } from "../lib/calc";
import { CADENCE_LABEL, fmtDate } from "../lib/store";
import { Field, Modal, btnDanger, btnGhost, btnPrimary, inputCls } from "./ui";
import { IconAnchor, IconBolt, IconCheck, IconTarget, IconX } from "./icons";

export function ReviewModal({
  position,
  onUpdatePrice,
  onAdvance,
  onExit,
  onClose,
}: {
  position: Position;
  onUpdatePrice: (id: string, price: number) => void;
  onAdvance: (id: string) => void;
  onExit: (p: Position, presetReason: "stopped" | "invalidated") => void;
  onClose: () => void;
}) {
  const p = position;
  const [priceDraft, setPriceDraft] = useState(p.currentPrice ? String(p.currentPrice) : "");
  const [priceMsg, setPriceMsg] = useState(false);

  const ch = pnlPct(p.entryPrice, p.currentPrice);
  const cushion = p.sleeve === 1 && p.stopPrice ? cushionToStop(p.currentPrice, p.stopPrice) : null;
  const breached = p.sleeve === 1 && p.stopPrice !== undefined && p.currentPrice !== null && p.currentPrice <= p.stopPrice;

  function savePrice() {
    const v = parseFloat(priceDraft);
    if (Number.isFinite(v) && v > 0) {
      onUpdatePrice(p.id, v);
      setPriceMsg(true);
      setTimeout(() => setPriceMsg(false), 1800);
    }
  }

  return (
    <Modal
      tone={p.sleeve === 1 ? "flare" : "moss"}
      kicker={`Scheduled review · ${CADENCE_LABEL[p.cadence]} · #${p.reviewCount + 1}`}
      title={
        <span className="flex items-center gap-2.5">
          {p.ticker}
          {p.sleeve === 1 ? <span className="text-flare-400 text-sm font-mono tracking-wider">SLEEVE 1 — TRADE</span> : <span className="text-moss-400 text-sm font-mono tracking-wider">SLEEVE 2 — CORE</span>}
        </span>
      }
      onClose={onClose}
    >
      {/* price refresh */}
      <div className="rounded-md border border-line bg-pine-900/70 p-3.5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[150px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-600">Refresh last price</div>
          <div className="mt-1 flex items-center gap-2">
            <input
              className={`${inputCls} !py-1.5 !w-[120px] font-mono`}
              inputMode="decimal"
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value.replace(/[^0-9.]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && savePrice()}
            />
            <button onClick={savePrice} className="text-[12.5px] font-semibold text-moss-300 hover:text-moss-400 transition-colors">
              Save
            </button>
            {priceMsg && <span className="text-[11.5px] text-moss-400 fade-in">saved ✓</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-600">vs entry {price(p.entryPrice)}</div>
          <div className={`font-mono text-[16px] tabular font-medium ${ch === null ? "text-fog-500" : ch >= 0 ? "text-moss-400" : "text-ember-400"}`}>
            {ch === null ? "no price set" : pct(ch)}
          </div>
        </div>
      </div>

      {p.sleeve === 1 ? (
        /* ---------------- sleeve 1 review ---------------- */
        <div className="mt-5">
          <div className="flex items-center gap-2 text-flare-400">
            <IconTarget size={16} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">The only question: is the stop intact?</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border border-line bg-pine-900/60 py-3">
              <div className="font-mono text-[10px] text-fog-600 uppercase tracking-wider">Stop</div>
              <div className="mt-1 font-mono text-[17px] text-flare-300 tabular font-medium">{price(p.stopPrice!)}</div>
            </div>
            <div className="rounded-md border border-line bg-pine-900/60 py-3">
              <div className="font-mono text-[10px] text-fog-600 uppercase tracking-wider">Last</div>
              <div className="mt-1 font-mono text-[17px] text-fog-100 tabular font-medium">{price(p.currentPrice)}</div>
            </div>
            <div className={`rounded-md border py-3 ${breached ? "border-ember-600/60 bg-ember-900/50" : "border-line bg-pine-900/60"}`}>
              <div className="font-mono text-[10px] text-fog-600 uppercase tracking-wider">Cushion</div>
              <div className={`mt-1 font-mono text-[17px] tabular font-medium ${breached ? "text-ember-400" : (cushion ?? 9) <= 2.5 ? "text-flare-400" : "text-moss-400"}`}>
                {cushion === null ? "—" : `${cushion.toFixed(1)}%`}
              </div>
            </div>
          </div>

          {breached ? (
            <div className="mt-4 rounded-md border border-ember-600/60 bg-ember-900/50 p-4">
              <div className="font-display font-bold text-[15px] text-ember-300 flex items-center gap-2">
                <IconBolt size={15} /> Stop breached. The system says exit — no debate.
              </div>
              <p className="mt-1.5 text-[12.5px] text-fog-300 leading-relaxed">
                No averaging down, no "let me watch it one more day." A recovery afterwards is the cost of running this
                system, not proof it failed.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-[13px] text-fog-500 leading-relaxed">
              No stop = no action needed. Carry the position to the next scheduled check.
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5 justify-end">
            <button onClick={() => onAdvance(p.id)} className={btnGhost}>
              <IconCheck size={15} className="text-moss-400" /> Stop intact — carry forward
            </button>
            <button onClick={() => onExit(p, "stopped")} className={btnDanger}>
              <IconX size={15} /> Stop hit — log the exit
            </button>
          </div>
        </div>
      ) : (
        /* ---------------- sleeve 2 review ---------------- */
        <div className="mt-5">
          <div className="flex items-center gap-2 text-moss-400">
            <IconAnchor size={16} />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">The only question at a core review</span>
          </div>
          <p className="mt-2 font-display font-bold text-[17px] text-fog-100 leading-snug">
            "Has anything on my invalidation list actually happened?"
          </p>
          <p className="text-[12.5px] text-fog-600 mt-0.5">Not: "how does this red number feel?"</p>

          <blockquote className="mt-4 rounded-md border-l-[3px] border-moss-600 bg-pine-900/70 px-4 py-3.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-moss-600 mb-1.5">Written at entry · {fmtDate(p.entryDate)}</div>
            <p className="text-[14px] text-fog-100 leading-relaxed">{p.invalidation}</p>
          </blockquote>

          {p.addon && p.addon.steps.length > 0 && (
            <div className="mt-3 rounded-md border border-line bg-pine-900/60 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog-600 mb-1">Add-on plan on file</div>
              <div className="font-mono text-[12.5px] text-fog-300 tabular">
                {p.addon.steps.map((s) => `add ${s.sizePct}% at ${s.triggerPct}%`).join("  ·  ")}  ·  hard cap {p.addon.hardCapPct}%
              </div>
              {ch !== null && ch < 0 && (
                <div className="mt-1.5 text-[12px] text-flare-300">
                  Currently at {pct(ch)} — check your triggers before adding, and only as pre-written.
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5 justify-end">
            <button onClick={() => onAdvance(p.id)} className={btnPrimary}>
              <IconCheck size={15} /> Nothing happened — hold
            </button>
            <button onClick={() => onExit(p, "invalidated")} className={btnDanger}>
              <IconX size={15} /> Yes — thesis is broken, exit
            </button>
          </div>
          <p className="mt-3 text-[11.5px] text-fog-600 leading-snug text-right">
            Exiting on a named fact is correct at any price, including a loss. Holding through price alone is also correct.
          </p>
        </div>
      )}
    </Modal>
  );
}
