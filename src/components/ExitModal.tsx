import { useState } from "react";
import type { ExitReason, Position } from "../lib/types";
import { pct, price } from "../lib/calc";
import { todayISO } from "../lib/store";
import { Field, Modal, btnDanger, btnGhost, inputCls } from "./ui";
import { IconFlag } from "./icons";

const REASONS: { id: ExitReason; label: string; sub: string }[] = [
  { id: "stopped", label: "Stop executed", sub: "Sleeve 1 — price hit the hard stop" },
  { id: "invalidated", label: "Thesis invalidated", sub: "Sleeve 2 — a named fact occurred" },
  { id: "discretionary", label: "Discretionary", sub: "Off-plan exit — note why, honestly" },
];

export function ExitModal({
  position,
  presetReason,
  onConfirm,
  onClose,
}: {
  position: Position;
  presetReason?: ExitReason;
  onConfirm: (p: Position, exit: { exitDate: string; exitPrice: number; reason: ExitReason; note?: string }) => void;
  onClose: () => void;
}) {
  const p = position;
  const [exitDate, setExitDate] = useState(todayISO());
  const [priceStr, setPriceStr] = useState(p.currentPrice ? String(p.currentPrice) : "");
  const [reason, setReason] = useState<ExitReason>(presetReason ?? "stopped");
  const [note, setNote] = useState("");

  const exitPrice = parseFloat(priceStr);
  const valid = exitDate !== "" && Number.isFinite(exitPrice) && exitPrice > 0;
  const pnl = valid ? ((exitPrice - p.entryPrice) / p.entryPrice) * 100 : null;

  return (
    <Modal
      tone="ember"
      kicker="Close position · enters the closed ledger"
      title={`Exit ${p.ticker} — record it like the system would`}
      onClose={onClose}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Exit date">
          <input type="date" className={inputCls} value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
        </Field>
        <Field label="Exit price $" error={priceStr !== "" && !(exitPrice > 0) ? "Must be > 0" : undefined}>
          <input
            className={`${inputCls} font-mono`}
            inputMode="decimal"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={price(p.currentPrice ?? undefined)}
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-500 mb-1.5">Why is this position closing?</div>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              className={`w-full text-left rounded-md border px-3.5 py-2.5 transition-all duration-150 active:scale-[0.99] ${
                reason === r.id
                  ? r.id === "discretionary"
                    ? "border-flare-400 bg-flare-900/40"
                    : "border-ember-400 bg-ember-900/40"
                  : "border-line bg-pine-900 hover:border-pine-600"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    reason === r.id ? (r.id === "discretionary" ? "border-flare-400" : "border-ember-400") : "border-pine-600"
                  }`}
                >
                  {reason === r.id && <span className={`w-1.5 h-1.5 rounded-full ${r.id === "discretionary" ? "bg-flare-400" : "bg-ember-400"}`} />}
                </span>
                <span className="font-display font-semibold text-[13.5px] text-fog-100">{r.label}</span>
              </div>
              <div className="ml-6 text-[12px] text-fog-500 mt-0.5">{r.sub}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Note (optional)" hint="what you'd tell yourself in a year">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. capex cut confirmed on two consecutive calls" />
        </Field>
      </div>

      {/* live result */}
      <div className="mt-4 rounded-md border border-line bg-pine-900/70 px-4 py-3 flex items-center justify-between">
        <div className="font-mono text-[11px] text-fog-500 tabular">
          entry {price(p.entryPrice)} → exit {valid ? price(exitPrice) : "· · ·"} · size {p.sizePct}%
        </div>
        <div className={`font-display font-bold text-[20px] tabular ${pnl === null ? "text-fog-600" : pnl >= 0 ? "text-moss-400" : "text-ember-400"}`}>
          {pnl === null ? "—" : pct(pnl)}
        </div>
      </div>

      {reason === "stopped" && (
        <p className="mt-3 text-[12px] text-fog-500 leading-snug">
          A stopped-out trade is a planned trade that worked: small, defined loss. The system only fails if you didn't exit.
        </p>
      )}
      {reason === "discretionary" && (
        <p className="mt-3 text-[12px] text-flare-300 leading-snug">
          Off-plan exits are exactly what the gut-check exists to prevent. If it's not on the pre-written plan, sleep on it first.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2.5">
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button
          onClick={() => valid && onConfirm(p, { exitDate, exitPrice, reason, note: note.trim() || undefined })}
          disabled={!valid}
          className={btnDanger}
        >
          <IconFlag size={15} /> Confirm exit
        </button>
      </div>
    </Modal>
  );
}
