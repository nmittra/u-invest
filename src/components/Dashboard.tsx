import type { ClosedPosition, Position } from "../lib/types";
import { cushionToStop, pct, pnlPct, price, sleeveSplit, stopBreached, sumSize } from "../lib/calc";
import { CADENCE_LABEL, daysUntil, fmtDate, todayISO } from "../lib/store";
import { SleeveBadge, btnGhost, btnPrimary } from "./ui";
import { IconAlert, IconBolt, IconCalendar, IconPulse, IconScale, IconShield, IconTarget, IconTrendDown, IconTrendUp } from "./icons";

export function Dashboard({
  profileName,
  accountName,
  positions,
  closed,
  onReview,
  onGutCheck,
  onLoadSample,
  gotoLog,
  gotoRules,
}: {
  profileName: string;
  accountName: string;
  positions: Position[];
  closed: ClosedPosition[];
  onReview: (p: Position) => void;
  onGutCheck: () => void;
  onLoadSample: () => void;
  gotoLog: () => void;
  gotoRules: () => void;
}) {
  const committed = sumSize(positions);
  const split = sleeveSplit(positions);
  const due = positions
    .filter((p) => daysUntil(p.nextReview) <= 0)
    .sort((a, b) => daysUntil(a.nextReview) - daysUntil(b.nextReview));
  const watches = positions
    .filter((p) => p.sleeve === 1 && p.currentPrice !== null && p.stopPrice)
    .map((p) => ({ p, cushion: cushionToStop(p.currentPrice, p.stopPrice!) ?? 99 }))
    .sort((a, b) => a.cushion - b.cushion)
    .slice(0, 5);
  const breachedCount = positions.filter(stopBreached).length;

  const realized = closed.reduce((a, c) => a + c.pnlPct * (c.sizePct / 100), 0);
  const stoppedCount = closed.filter((c) => c.reason === "stopped").length;

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-500">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} · {accountName}
          </div>
          <h1 className="mt-1.5 font-display font-bold text-[32px] sm:text-[38px] leading-none tracking-tight text-fog-100">
            {greet}, {profileName}. <span className="text-fog-500">Here's the book.</span>
          </h1>
        </div>
        {positions.length > 0 && (
          <button onClick={onGutCheck} className={btnGhost}>
            <IconPulse size={16} className="text-flare-400" />
            About to act on a red number?
          </button>
        )}
      </div>

      {/* stat strip */}
      <div className="rise rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.06s" }}>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <Stat label="Open positions" value={`${positions.length}`} sub={`${breachedCount > 0 ? `${breachedCount} stop breached` : "all stops intact"}`} tone={breachedCount > 0 ? "ember" : "fog"} />
          <Stat label="Capital committed" value={`${committed.toFixed(0)}%`} sub="of account, at entry sizing" tone="fog" />
          <Stat label="Reviews due" value={`${due.length}`} sub={due.length ? "run them on schedule" : "nothing due — discipline holds"} tone={due.length > 0 ? "flare" : "fog"} />
          <Stat
            label="Realized (size-weighted)"
            value={closed.length ? pct(realized, 2) : "—"}
            sub={closed.length ? `${stoppedCount} stop${stoppedCount === 1 ? "" : "s"} executed` : "no closed trades yet"}
            tone={realized >= 0 ? "moss" : "ember"}
          />
        </div>
        {/* sleeve split spans full row */}
        <div className="px-5 py-4 border-t border-line">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">Sleeve split — committed size</span>
            <span className="font-mono text-[11px] text-fog-500 tabular">
              <span className="text-flare-400">S1 {split.s1.toFixed(0)}%</span>
              <span className="mx-2 text-pine-600">/</span>
              <span className="text-moss-400">S2 {split.s2.toFixed(0)}%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-pine-900 border border-line overflow-hidden flex">
            <div
              className="h-full bg-flare-400/90 transition-all duration-700 ease-out"
              style={{ width: `${committed > 0 ? (split.s1 / Math.max(committed, 1)) * 100 : 0}%` }}
            />
            <div
              className="h-full bg-moss-400/90 transition-all duration-700 ease-out"
              style={{ width: `${committed > 0 ? (split.s2 / Math.max(committed, 1)) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-2 flex gap-5 text-[11.5px] text-fog-500">
            <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-flare-400 inline-block" /> Trading — defined risk, hard stops</span>
            <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-moss-400 inline-block" /> Core thematic — sized to survive 50–70%</span>
          </div>
        </div>
      </div>

      {positions.length === 0 ? (
        /* empty desk */
        <div className="rise rounded-lg border border-dashed border-pine-600 bg-pine-850/50 px-8 py-14 text-center" style={{ animationDelay: "0.12s" }}>
          <div className="mx-auto w-12 h-12 rounded-md bg-pine-800 border border-line flex items-center justify-center text-fog-500">
            <IconShield size={22} />
          </div>
          <h2 className="mt-4 font-display font-bold text-xl text-fog-100">The book is clean.</h2>
          <p className="mt-2 text-[14px] text-fog-500 max-w-md mx-auto leading-relaxed">
            No positions logged{accountName !== "All accounts" ? " in this account" : ""} yet. When you buy, classify first —
            the sleeve decides how the position gets stopped out.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={gotoLog} className={btnPrimary}>Log your first entry</button>
            <button onClick={onLoadSample} className={btnGhost}>Load the MRVL example</button>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {/* due reviews */}
          <section className="rise rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.12s" }}>
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h2 className="font-display font-bold text-[15px] text-fog-100 flex items-center gap-2">
                <IconCalendar size={16} className="text-flare-400" />
                Review queue
              </h2>
              <span className="font-mono text-[11px] text-fog-600 tabular">{due.length} due</span>
            </header>
            {due.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13.5px] text-fog-500">Nothing due. Reviews happen on schedule — never on red days.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {due.map(({ ...p }) => {
                  const d = daysUntil(p.nextReview);
                  const breached = stopBreached(p);
                  return (
                    <li key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-pine-800/60 transition-colors group">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${breached ? "bg-ember-400 throb" : d < 0 ? "bg-flare-400 throb" : "bg-moss-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-display font-bold text-[15px] text-fog-100">{p.ticker}</span>
                          <SleeveBadge sleeve={p.sleeve} compact />
                          {breached && (
                            <span className="font-mono text-[10.5px] text-ember-300 border border-ember-600/60 bg-ember-900/60 rounded px-1.5 py-px tracking-wider">
                              STOP BREACHED
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-fog-600 tabular mt-0.5">
                          {d === 0 ? "due today" : `${Math.abs(d)}d overdue`} · {CADENCE_LABEL[p.cadence].toLowerCase()} · next {fmtDate(p.nextReview)}
                        </div>
                      </div>
                      <button
                        onClick={() => onReview(p)}
                        className="shrink-0 text-[12.5px] font-semibold px-3 py-1.5 rounded-md border border-line text-fog-300 hover:border-moss-600 hover:text-moss-300 hover:bg-moss-900/40 transition-all active:scale-95"
                      >
                        Run review
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* right column */}
          <div className="space-y-6">
            {/* stop watch */}
            <section className="rise rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.18s" }}>
              <header className="flex items-center justify-between px-5 py-3.5 border-b border-line">
                <h2 className="font-display font-bold text-[15px] text-fog-100 flex items-center gap-2">
                  <IconTarget size={16} className="text-flare-400" />
                  Stop watch <span className="font-mono text-[10.5px] text-fog-600 font-normal tracking-wider">SLEEVE 1</span>
                </h2>
              </header>
              {watches.length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-fog-500 leading-relaxed">
                  No Sleeve 1 trades with a live price. Update a trade's last price in the log to arm its stop gauge.
                </p>
              ) : (
                <ul className="px-5 py-4 space-y-3.5">
                  {watches.map(({ p, cushion }) => {
                    const danger = cushion <= 0;
                    const warn = cushion > 0 && cushion <= 2.5;
                    const w = Math.max(0, Math.min(100, (cushion / 8) * 100));
                    return (
                      <li key={p.id}>
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="font-display font-bold text-[13.5px] text-fog-100">{p.ticker}</span>
                          <span className={`font-mono text-[11.5px] tabular ${danger ? "text-ember-400" : warn ? "text-flare-400" : "text-fog-300"}`}>
                            {danger ? "BREACHED" : `${cushion.toFixed(1)}% to stop`}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-pine-900 border border-line overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 ${danger ? "bg-ember-400" : warn ? "bg-flare-400" : "bg-moss-400"}`}
                            style={{ width: `${danger ? 100 : w}%` }}
                          />
                        </div>
                        <div className="font-mono text-[10.5px] text-fog-600 tabular mt-1">
                          last {price(p.currentPrice)} · stop {price(p.stopPrice!)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* gut check card */}
            <section className="rise rounded-lg border border-flare-600/40 bg-flare-900/30 overflow-hidden relative" style={{ animationDelay: "0.24s" }}>
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(-45deg, #f0a63c 0 2px, transparent 2px 12px)" }} />
              <div className="relative px-5 py-5">
                <div className="flex items-center gap-2 text-flare-400">
                  <IconBolt size={17} />
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">In-the-moment protocol</span>
                </div>
                <h3 className="mt-2 font-display font-bold text-lg text-fog-100 leading-snug">
                  "Has the news changed — or just the price?"
                </h3>
                <p className="mt-1.5 text-[13px] text-fog-300 leading-relaxed">
                  Two questions, asked before any action on a live position. Run the gut-check instead of acting on feel.
                </p>
                <button onClick={onGutCheck} className={`${btnGhost} mt-4 !border-flare-600/50 !text-flare-300 hover:!bg-flare-900/60`}>
                  Run the gut-check
                </button>
              </div>
            </section>

            {/* tenets */}
            <section className="rise rounded-lg border border-line bg-pine-850/80 px-5 py-4" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">House tenets</span>
                <button onClick={gotoRules} className="text-[12px] font-medium text-moss-400 hover:text-moss-300 transition-colors">
                  Read the full rules →
                </button>
              </div>
              <ul className="mt-3 space-y-2.5">
                {[
                  { icon: <IconBolt size={14} />, cls: "text-flare-400", text: "Sleeve 1: stop hit = exit. A recovered stop is the cost of the system, not its failure." },
                  { icon: <IconShield size={14} />, cls: "text-moss-400", text: "Sleeve 2: price alone never sells. Only a named invalidation fact does." },
                  { icon: <IconScale size={14} />, cls: "text-fog-500", text: "With no stop, size is the risk control — survive a 50–70% drawdown." },
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-fog-300 leading-snug">
                    <span className={`mt-0.5 shrink-0 ${t.cls}`}>{t.icon}</span>
                    {t.text}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}

      {/* recently closed strip */}
      {closed.length > 0 && (
        <section className="rise rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.3s" }}>
          <header className="px-5 py-3.5 border-b border-line flex items-center gap-2">
            <h2 className="font-display font-bold text-[15px] text-fog-100">Latest exits</h2>
            <span className="font-mono text-[11px] text-fog-600">the record of the system</span>
          </header>
          <ul className="divide-y divide-line">
            {closed.slice(0, 3).map((c) => {
              const up = c.pnlPct >= 0;
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3">
                  {up ? <IconTrendUp size={16} className="text-moss-400 shrink-0" /> : <IconTrendDown size={16} className="text-ember-400 shrink-0" />}
                  <span className="font-display font-bold text-[14px] text-fog-100 w-16">{c.ticker}</span>
                  <SleeveBadge sleeve={c.sleeve} compact />
                  <span className="font-mono text-[11.5px] text-fog-500 tabular hidden sm:block">
                    {fmtDate(c.entryDate)} → {fmtDate(c.exitDate)}
                  </span>
                  <span className="ml-auto font-mono text-[13px] tabular font-medium">
                    <span className={up ? "text-moss-400" : "text-ember-400"}>{pct(c.pnlPct)}</span>
                    <span className="text-fog-600 text-[11px] ml-2">
                      {c.reason === "stopped" ? "stop executed" : c.reason === "invalidated" ? "thesis broken" : "discretionary"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* footer note */}
      <p className="rise font-mono text-[10.5px] text-fog-600 tracking-wider flex items-center gap-2 pt-1" style={{ animationDelay: "0.36s" }}>
        <IconAlert size={12} className="text-flare-600" />
        PRICES ARE MANUALLY UPDATED — THIS BOOK TRACKS DISCIPLINE, NOT QUOTES. LOGGED {todayISO()}.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "moss" | "flare" | "ember" | "fog";
}) {
  const valueCls =
    tone === "moss" ? "text-moss-400" : tone === "flare" ? "text-flare-400" : tone === "ember" ? "text-ember-400" : "text-fog-100";
  return (
    <div className="px-5 py-4 border-line [&:nth-child(odd)]:border-r [&:nth-child(-n+2)]:border-b lg:[&:not(:last-child)]:border-r lg:[&:nth-child(-n+2)]:border-b-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">{label}</div>
      <div className={`mt-1.5 font-display font-bold text-[28px] leading-none tabular ${valueCls}`}>{value}</div>
      <div className="mt-1.5 text-[11.5px] text-fog-500">{sub}</div>
    </div>
  );
}


