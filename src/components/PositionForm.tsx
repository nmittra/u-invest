import { useMemo, useState } from "react";
import type { Account, AddOnStep, Cadence, Position, Sleeve } from "../lib/types";
import { INVALIDATION_MIN_LENGTH, isPriceOnlyInvalidation, stopBandState, stopDepth } from "../lib/calc";
import { CADENCE_LABEL, addDays, todayISO, uid } from "../lib/store";
import { ChecklistItem, Field, Modal, btnGhost, btnPrimary, inputCls } from "./ui";
import { IconAlert, IconAnchor, IconBolt, IconCheck, IconLock, IconPlus, IconTrash, IconX } from "./icons";

const INVALIDATION_EXAMPLES = [
  "Hyperscaler capex guidance cut two quarters running",
  "Loses key design wins to a named competitor",
  "Commodity thesis breaks on a specific substitution / technology shift",
];

const CADENCES: Cadence[] = ["weekly", "biweekly", "monthly", "quarterly"];

export function PositionForm({
  initial,
  accounts,
  defaultAccountId,
  onSave,
  onDelete,
  onClose,
}: {
  initial: Position | null;
  accounts: Account[];
  defaultAccountId: string;
  onSave: (p: Position) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}) {
  const editing = !!initial;

  const [accountId, setAccountId] = useState(initial?.accountId ?? (defaultAccountId !== "all" ? defaultAccountId : accounts[0]?.id ?? ""));
  const [sleeve, setSleeve] = useState<Sleeve | null>(initial?.sleeve ?? null);
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayISO());
  const [entryPriceStr, setEntryPriceStr] = useState(initial ? String(initial.entryPrice) : "");
  const [sizeStr, setSizeStr] = useState(initial ? String(initial.sizePct) : "");
  const [thesis, setThesis] = useState(initial?.thesis ?? "");
  const [stopStr, setStopStr] = useState(initial?.stopPrice ? String(initial.stopPrice) : "");
  const [stopOverride, setStopOverride] = useState(initial?.stopOverride ?? false);
  const [invalidation, setInvalidation] = useState(initial?.invalidation ?? "");
  const [steps, setSteps] = useState<{ id: string; trigger: string; size: string }[]>(
    initial?.addon?.steps.map((s) => ({ id: s.id, trigger: String(s.triggerPct), size: String(s.sizePct) })) ?? []
  );
  const [noAdds, setNoAdds] = useState(initial ? !initial.addon || initial.addon.steps.length === 0 : false);
  const [capStr, setCapStr] = useState(initial?.addon ? String(initial.addon.hardCapPct) : "");
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? "monthly");
  const [nextReview, setNextReview] = useState(initial?.nextReview ?? addDays(todayISO(), 30));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const entryPrice = parseFloat(entryPriceStr);
  const size = parseFloat(sizeStr);
  const stop = parseFloat(stopStr);
  const cap = parseFloat(capStr);

  const depth = entryPrice > 0 && stop > 0 ? stopDepth(entryPrice, stop) : null;
  const band = depth !== null ? stopBandState(depth) : null;
  const bandOk = band === "in-band" || (band !== null && band !== "above" && stopOverride);

  const priceOnly = isPriceOnlyInvalidation(invalidation);
  const invalidationOk = invalidation.trim().length >= INVALIDATION_MIN_LENGTH && !priceOnly;

  const parsedSteps: AddOnStep[] = steps
    .map((s) => ({ id: s.id, triggerPct: parseFloat(s.trigger), sizePct: parseFloat(s.size) }))
    .filter((s) => Number.isFinite(s.triggerPct) && Number.isFinite(s.sizePct));
  const stepsOk = noAdds || (parsedSteps.length > 0 && parsedSteps.every((s) => s.triggerPct < 0 && s.sizePct > 0));
  const capOk = noAdds || cap > 0;

  const basicsOk = accountId !== "" && ticker.trim().length > 0 && entryDate !== "" && entryPrice > 0;
  const thesisOk = thesis.trim().length >= 8;
  const sizeOk = size > 0 && size <= 100;
  const reviewOk = nextReview !== "";

  const stopOk = sleeve === 1 ? stop > 0 && stop < entryPrice && bandOk : true;
  const s2Ok = sleeve === 2 ? invalidationOk && stepsOk && capOk : true;

  const allOk = !!sleeve && basicsOk && thesisOk && sizeOk && reviewOk && stopOk && s2Ok;

  const missing = useMemo(() => {
    const m: string[] = [];
    if (!sleeve) m.push("choose a sleeve");
    if (!basicsOk) m.push("ticker, entry date & price");
    if (!thesisOk) m.push("one-line thesis");
    if (!sizeOk) m.push("position size %");
    if (sleeve === 1 && !(stop > 0 && stop < entryPrice)) m.push("valid stop price below entry");
    if (sleeve === 1 && stop > 0 && stop < entryPrice && !bandOk) m.push("7–8% band — or tick the deviation box");
    if (sleeve === 2 && !invalidationOk) m.push("specific invalidation facts");
    if (sleeve === 2 && !stepsOk) m.push("add-on plan (or mark 'no adds')");
    if (sleeve === 2 && stepsOk && !capOk) m.push("hard cap %");
    if (!reviewOk) m.push("next review date");
    return m;
  }, [sleeve, basicsOk, thesisOk, sizeOk, stop, entryPrice, bandOk, invalidationOk, stepsOk, capOk, reviewOk]);

  function save() {
    if (!allOk || !sleeve) return;
    const pos: Position = {
      id: initial?.id ?? uid(),
      accountId,
      ticker: ticker.trim().toUpperCase(),
      sleeve,
      entryDate,
      entryPrice,
      currentPrice: initial?.currentPrice ?? (entryPrice > 0 ? entryPrice : null),
      sizePct: size,
      thesis: thesis.trim(),
      stopPrice: sleeve === 1 ? stop : undefined,
      stopOverride: sleeve === 1 && band !== "in-band" ? stopOverride : undefined,
      invalidation: sleeve === 2 ? invalidation.trim() : undefined,
      addon:
        sleeve === 2
          ? { steps: noAdds ? [] : parsedSteps, hardCapPct: noAdds ? (cap > 0 ? cap : size) : cap }
          : undefined,
      cadence,
      nextReview,
      createdAt: initial?.createdAt ?? Date.now(),
      reviewCount: initial?.reviewCount ?? 0,
      lastReview: initial?.lastReview,
    };
    onSave(pos);
  }

  const markerPct = depth !== null ? Math.max(0, Math.min(100, (depth / 12) * 100)) : null;

  return (
    <Modal
      wide
      tone={sleeve === 1 ? "flare" : "moss"}
      kicker={editing ? "Amend entry — sleeve is locked" : "Entry checklist · fill before you buy"}
      title={editing ? `${initial!.ticker} — amend the plan` : "New position, classified while calm"}
      onClose={onClose}
    >
      <div className="grid lg:grid-cols-[1fr_220px] gap-7">
        <div className="space-y-6 min-w-0">
          {/* sleeve selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-500">Which sleeve?</span>
              {editing && (
                <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-flare-400 tracking-wider">
                  <IconLock size={12} /> SLEEVE CANNOT CHANGE MID-DRAWDOWN
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <SleeveCard
                active={sleeve === 1}
                disabled={editing}
                onClick={() => setSleeve(1)}
                tone="flare"
                num="01"
                title="Trading"
                icon={<IconBolt size={17} />}
                lines={["Technical setup, not multi-year conviction", "Hard stop 7–8% below entry — no exceptions", "Small, defined losses on purpose"]}
              />
              <SleeveCard
                active={sleeve === 2}
                disabled={editing}
                onClick={() => setSleeve(2)}
                tone="moss"
                num="02"
                title="Core Thematic"
                icon={<IconAnchor size={17} />}
                lines={["Tied to a 5-year theme, held through volatility", "No price stop — invalidation facts replace it", "Size so a 50–70% drawdown is survivable"]}
              />
            </div>
          </div>

          {/* identity */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Account" className="col-span-2 sm:col-span-1">
              <select className={inputCls} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Ticker" className="col-span-2 sm:col-span-1">
              <input
                className={`${inputCls} font-display font-bold uppercase tracking-wide ${editing ? "opacity-60" : ""}`}
                value={ticker}
                disabled={editing}
                maxLength={6}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="MRVL"
              />
            </Field>
            <Field label="Entry date">
              <input type="date" className={inputCls} value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </Field>
            <Field label="Entry price $" error={entryPriceStr !== "" && !(entryPrice > 0) ? "Must be > 0" : undefined}>
              <input
                className={`${inputCls} font-mono`}
                inputMode="decimal"
                value={entryPriceStr}
                onChange={(e) => setEntryPriceStr(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="64.20"
              />
            </Field>
          </div>

          {/* thesis */}
          <Field
            label="One-line thesis"
            hint={`${thesis.length}/140 — why this stock, why this theme`}
            error={thesis.length > 0 && !thesisOk ? "Give it at least a sentence." : undefined}
          >
            <textarea
              className={`${inputCls} resize-none leading-snug`}
              rows={2}
              maxLength={140}
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              placeholder="AI infra — custom networking silicon riding hyperscaler buildout."
            />
          </Field>

          {/* size + review */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="Position size — % of account"
              error={sizeStr !== "" && !sizeOk ? "Between 0 and 100." : undefined}
              hint={size > 15 ? undefined : undefined}
            >
              <input
                className={`${inputCls} font-mono`}
                inputMode="decimal"
                value={sizeStr}
                onChange={(e) => setSizeStr(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="8"
              />
              {size > 15 && (
                <div className="mt-1.5 flex items-start gap-1.5 text-[12px] text-flare-300 leading-snug">
                  <IconAlert size={13} className="mt-0.5 shrink-0" />
                  Large. With no stop, size so a 50–70% drawdown wouldn't meaningfully damage the account.
                </div>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Next review">
                <input type="date" className={inputCls} value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
              </Field>
              <Field label="Cadence">
                <select className={inputCls} value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
                  {CADENCES.map((c) => (
                    <option key={c} value={c}>{CADENCE_LABEL[c]}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* sleeve-1 stop block */}
          {sleeve === 1 && (
            <div className="rounded-md border border-flare-600/40 bg-flare-900/25 p-4 fade-in">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-flare-400">
                  <IconBolt size={15} />
                  <span className="font-display font-bold text-[14px] text-fog-100">Hard stop — set at entry, no exceptions</span>
                </div>
                {entryPrice > 0 && (
                  <div className="flex gap-2">
                    {[7, 8].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setStopStr((entryPrice * (1 - d / 100)).toFixed(2))}
                        className="font-mono text-[11.5px] px-2.5 py-1 rounded border border-flare-600/50 text-flare-300 hover:bg-flare-900/60 transition-colors active:scale-95"
                      >
                        −{d}% → {(entryPrice * (1 - d / 100)).toFixed(2)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 grid sm:grid-cols-2 gap-3 items-end">
                <Field
                  label="Stop price $"
                  error={stopStr !== "" && stop > 0 && stop >= entryPrice ? "Stop must sit below entry." : undefined}
                >
                  <input
                    className={`${inputCls} font-mono`}
                    inputMode="decimal"
                    value={stopStr}
                    onChange={(e) => setStopStr(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="59.30"
                  />
                </Field>
                {depth !== null && band && (
                  <div className="pb-1">
                    <div className={`font-mono text-[12px] tabular ${band === "in-band" ? "text-moss-400" : band === "above" ? "text-ember-400" : "text-flare-400"}`}>
                      {depth.toFixed(1)}% below entry —{" "}
                      {band === "in-band" ? "in the 7–8% band" : band === "above" ? "above entry?" : band === "tight" ? "tighter than the band" : "wider than the band"}
                    </div>
                    {/* band meter */}
                    <div className="relative mt-2 h-2.5 rounded-full bg-pine-900 border border-line overflow-hidden">
                      <div className="absolute inset-y-0 bg-moss-600/40" style={{ left: `${(7 / 12) * 100}%`, width: `${(1 / 12) * 100}%` }} />
                      {markerPct !== null && (
                        <div
                          className={`absolute inset-y-0 w-[3px] rounded transition-all duration-300 ${band === "in-band" ? "bg-moss-400" : band === "above" ? "bg-ember-400" : "bg-flare-400"}`}
                          style={{ left: `calc(${markerPct}% - 1px)` }}
                        />
                      )}
                    </div>
                    <div className="flex justify-between font-mono text-[9.5px] text-fog-600 mt-1 tabular">
                      <span>0%</span><span className="text-moss-600">7–8% band</span><span>12%+</span>
                    </div>
                  </div>
                )}
              </div>

              {band !== null && band !== "in-band" && band !== "above" && (
                <label className="mt-3 flex items-start gap-2.5 cursor-pointer group">
                  <input type="checkbox" checked={stopOverride} onChange={(e) => setStopOverride(e.target.checked)} className="mt-0.5 accent-[#f0a63c]" />
                  <span className="text-[12.5px] text-fog-300 leading-snug group-hover:text-fog-100 transition-colors">
                    I knowingly deviate from the 7–8% band. The rulebook says this should be the exception I can defend out loud.
                  </span>
                </label>
              )}
              <p className="mt-3 font-mono text-[10.5px] text-fog-600 tracking-wide leading-relaxed">
                NO AVERAGING DOWN INTO THIS STOP. IF IT HITS, YOU'RE OUT — AND A RECOVERY AFTERWARDS IS THE COST OF THE SYSTEM, NOT PROOF IT FAILED.
              </p>
            </div>
          )}

          {/* sleeve-2 invalidation + add-on */}
          {sleeve === 2 && (
            <div className="space-y-4 fade-in">
              <div className="rounded-md border border-moss-600/40 bg-moss-900/25 p-4">
                <div className="flex items-center gap-2 text-moss-400">
                  <IconAnchor size={15} />
                  <span className="font-display font-bold text-[14px] text-fog-100">Thesis-invalidation criteria — written before you buy</span>
                </div>
                <p className="mt-1 text-[12.5px] text-fog-500 leading-snug">
                  Specific, falsifiable facts — not a price level. A market wobble and a broken thesis look identical on a chart.
                </p>
                <div className="mt-3">
                  <textarea
                    className={`${inputCls} resize-none leading-snug ${priceOnly ? "!border-ember-600 focus:!ring-ember-600/25" : ""}`}
                    rows={3}
                    value={invalidation}
                    onChange={(e) => setInvalidation(e.target.value)}
                    placeholder="e.g. Hyperscaler capex guidance cut two quarters running; loses key design wins to a named competitor."
                  />
                  {priceOnly && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-ember-300 leading-snug">
                      <IconAlert size={13} className="mt-0.5 shrink-0" />
                      That's a price move in disguise. Price alone never triggers a core sell — name the fact that would break the thesis.
                    </div>
                  )}
                  {!priceOnly && invalidation.length > 0 && invalidation.trim().length < INVALIDATION_MIN_LENGTH && (
                    <div className="mt-1.5 text-[12px] text-fog-500">Be more specific — a fact you could point to.</div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {INVALIDATION_EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setInvalidation(ex)}
                      className="text-left text-[11.5px] px-2.5 py-1.5 rounded border border-line text-fog-500 hover:text-moss-300 hover:border-moss-600/60 hover:bg-moss-900/40 transition-all active:scale-[0.98] max-w-[260px]"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-line bg-pine-900/60 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-display font-bold text-[14px] text-fog-100">Add-on plan — decided now, not in the moment</span>
                  <label className="flex items-center gap-2 cursor-pointer text-[12px] text-fog-500 hover:text-fog-300 transition-colors">
                    <input type="checkbox" checked={noAdds} onChange={(e) => setNoAdds(e.target.checked)} className="accent-[#3ecf8e]" />
                    No adds — entry size is final
                  </label>
                </div>

                {!noAdds && (
                  <>
                    <div className="mt-3 space-y-2">
                      {steps.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2 fade-in">
                          <span className="font-mono text-[11px] text-fog-600 w-10 shrink-0">add {i + 1}</span>
                          <div className="relative flex-1">
                            <input
                              className={`${inputCls} !py-2 font-mono !pl-8`}
                              inputMode="decimal"
                              value={s.trigger}
                              onChange={(e) => setSteps((prev) => prev.map((x) => (x.id === s.id ? { ...x, trigger: e.target.value.replace(/[^0-9.-]/g, "") } : x)))}
                              placeholder="-20"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-fog-600">at</span>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-fog-600">%</span>
                          </div>
                          <div className="relative flex-1">
                            <input
                              className={`${inputCls} !py-2 font-mono !pl-8`}
                              inputMode="decimal"
                              value={s.size}
                              onChange={(e) => setSteps((prev) => prev.map((x) => (x.id === s.id ? { ...x, size: e.target.value.replace(/[^0-9.]/g, "") } : x)))}
                              placeholder="3"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-fog-600">+</span>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-fog-600">% of acct</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSteps((prev) => prev.filter((x) => x.id !== s.id))}
                            className="p-2 rounded text-fog-600 hover:text-ember-400 hover:bg-pine-800 transition-colors"
                            aria-label="Remove step"
                          >
                            <IconX size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSteps((prev) => [...prev, { id: uid(), trigger: "", size: "" }])}
                        className="flex items-center gap-1.5 text-[12.5px] font-medium text-moss-400 hover:text-moss-300 transition-colors"
                      >
                        <IconPlus size={13} /> Add a step
                      </button>
                      {steps.length === 0 && (
                        <p className="text-[12px] text-fog-600">e.g. add 3% of account at −20%, another 3% at −35%. Write the real numbers while calm.</p>
                      )}
                    </div>
                    <div className="mt-3 max-w-[220px]">
                      <Field label="Hard cap — % of account" error={steps.length > 0 && stepsOk && !(cap > 0) ? "Set the cap." : undefined}>
                        <input
                          className={`${inputCls} font-mono`}
                          inputMode="decimal"
                          value={capStr}
                          onChange={(e) => setCapStr(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder="14"
                        />
                      </Field>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* actions */}
          <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
            {editing && onDelete ? (
              confirmDelete ? (
                <span className="flex items-center gap-2 text-[12.5px] fade-in">
                  <span className="text-ember-300">Remove this entry from the log?</span>
                  <button onClick={() => onDelete(initial!.id)} className="font-semibold text-ember-400 hover:underline">Yes, remove</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-fog-500 hover:underline">Keep</button>
                </span>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[12.5px] text-fog-600 hover:text-ember-400 transition-colors">
                  <IconTrash size={14} /> Remove entry
                </button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2.5">
              <button onClick={onClose} className={btnGhost}>Cancel</button>
              <button onClick={save} disabled={!allOk} className={btnPrimary}>
                <IconCheck size={15} />
                {editing ? "Save amendments" : "Lock in the entry"}
              </button>
            </div>
          </div>
        </div>

        {/* live checklist rail */}
        <aside className="lg:border-l lg:border-line lg:pl-5">
          <div className="lg:sticky lg:top-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600 mb-2">Checklist</div>
            <div className="divide-y divide-line/70">
              <ChecklistItem done={!!sleeve} label={sleeve ? `Sleeve ${sleeve} — ${sleeve === 1 ? "Trading" : "Core Thematic"}` : "Which sleeve?"} />
              <ChecklistItem done={basicsOk} label="Ticker, entry date & price" />
              <ChecklistItem done={thesisOk} label="One-line thesis" />
              {sleeve === 1 && <ChecklistItem done={stop > 0 && stop < entryPrice && bandOk} label="Stop set in the 7–8% band" />}
              {sleeve === 2 && <ChecklistItem done={invalidationOk} label="Invalidation facts — specific, not price" />}
              {sleeve === 2 && <ChecklistItem done={stepsOk && (noAdds || capOk)} label="Add-on plan + hard cap" />}
              <ChecklistItem done={sizeOk} label={`Size as % of account${sizeOk ? ` — ${size}%` : ""}`} />
              <ChecklistItem done={reviewOk} label="Next review scheduled" />
            </div>
            <div className={`mt-4 rounded-md border px-3 py-2.5 text-[12px] leading-snug transition-colors ${allOk ? "border-moss-600/50 bg-moss-900/40 text-moss-300" : "border-line bg-pine-900 text-fog-500"}`}>
              {allOk ? (
                <span className="flex items-center gap-2"><IconCheck size={13} /> Checklist complete. The plan is written while calm.</span>
              ) : (
                <span>Still needed: {missing.slice(0, 3).join("; ")}{missing.length > 3 ? "…" : ""}</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function SleeveCard({
  active,
  disabled,
  onClick,
  tone,
  num,
  title,
  icon,
  lines,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  tone: "flare" | "moss";
  num: string;
  title: string;
  icon: React.ReactNode;
  lines: string[];
}) {
  const activeCls =
    tone === "flare"
      ? "border-flare-400 bg-flare-900/50 shadow-[0_0_0_1px_rgba(240,166,60,0.35),0_12px_32px_-14px_rgba(240,166,60,0.35)]"
      : "border-moss-400 bg-moss-900/50 shadow-[0_0_0_1px_rgba(62,207,142,0.35),0_12px_32px_-14px_rgba(62,207,142,0.35)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left rounded-md border p-4 transition-all duration-200 ${
        active ? activeCls : "border-line bg-pine-900 hover:border-pine-600 hover:bg-pine-800"
      } ${disabled ? "opacity-70 cursor-not-allowed" : "active:scale-[0.985]"}`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-2 font-display font-bold text-[15px] ${tone === "flare" ? "text-flare-400" : "text-moss-400"}`}>
          {icon} Sleeve {num} — {title}
        </span>
        {active && (
          <span className={`check-pop flex items-center justify-center w-5 h-5 rounded-full ${tone === "flare" ? "bg-flare-400" : "bg-moss-400"} text-pine-950`}>
            <IconCheck size={12} strokeWidth={2.6} />
          </span>
        )}
      </div>
      <ul className="mt-2.5 space-y-1">
        {lines.map((l) => (
          <li key={l} className="text-[12px] text-fog-500 leading-snug flex gap-1.5">
            <span className={tone === "flare" ? "text-flare-600" : "text-moss-600"}>▸</span> {l}
          </li>
        ))}
      </ul>
    </button>
  );
}
