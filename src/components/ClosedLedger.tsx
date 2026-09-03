import type { ClosedPosition } from "../lib/types";
import { pct, price } from "../lib/calc";
import { fmtDate } from "../lib/store";
import { SleeveBadge } from "./ui";
import { IconArchive, IconTrendDown, IconTrendUp } from "./icons";

const REASON_META: Record<ClosedPosition["reason"], { label: string; cls: string }> = {
  stopped: { label: "STOP EXECUTED", cls: "border-flare-600/60 text-flare-300 bg-flare-900/50" },
  invalidated: { label: "THESIS BROKEN", cls: "border-ember-600/60 text-ember-300 bg-ember-900/50" },
  discretionary: { label: "DISCRETIONARY", cls: "border-line text-fog-500 bg-pine-900/60" },
};

export function ClosedLedger({ closed, accountName }: { closed: ClosedPosition[]; accountName: string }) {
  const winners = closed.filter((c) => c.pnlPct >= 0).length;
  const losers = closed.length - winners;
  const stopped = closed.filter((c) => c.reason === "stopped");
  const avg = closed.length ? closed.reduce((a, c) => a + c.pnlPct, 0) / closed.length : null;
  const weighted = closed.reduce((a, c) => a + c.pnlPct * (c.sizePct / 100), 0);

  return (
    <div className="space-y-6">
      <div className="rise">
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-500">{accountName}</div>
        <h1 className="mt-1.5 font-display font-bold text-[32px] sm:text-[38px] leading-none tracking-tight text-fog-100">Closed Ledger</h1>
        <p className="mt-2 text-[13.5px] text-fog-500 max-w-xl leading-relaxed">
          The record of the system. Stopped-out trades sit here as <span className="text-flare-300">planned, defined losses</span> —
          the cost of running the system, not proof it failed.
        </p>
      </div>

      {closed.length === 0 ? (
        <div className="rise rounded-lg border border-dashed border-pine-600 bg-pine-850/50 px-8 py-16 text-center" style={{ animationDelay: "0.1s" }}>
          <div className="mx-auto w-12 h-12 rounded-md bg-pine-800 border border-line flex items-center justify-center text-fog-500">
            <IconArchive size={22} />
          </div>
          <h2 className="mt-4 font-display font-bold text-xl text-fog-100">Nothing closed yet.</h2>
          <p className="mt-2 text-[14px] text-fog-500 max-w-md mx-auto leading-relaxed">
            When a stop executes, a thesis breaks, or you exit by choice — log it here with the reason. The ledger is how
            the system proves itself over time.
          </p>
        </div>
      ) : (
        <>
          <div className="rise grid grid-cols-2 lg:grid-cols-4 rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.08s" }}>
            <LedgerStat label="Closed trades" value={`${closed.length}`} sub={`${winners}W / ${losers}L`} />
            <LedgerStat
              label="Avg result"
              value={avg === null ? "—" : pct(avg)}
              sub="per trade"
              tone={avg! >= 0 ? "moss" : "ember"}
            />
            <LedgerStat label="Size-weighted" value={pct(weighted, 2)} sub="contribution to account" tone={weighted >= 0 ? "moss" : "ember"} />
            <LedgerStat label="Stops executed" value={`${stopped.length}`} sub="defined losses, as designed" tone="flare" />
          </div>

          <div className="rise rounded-lg border border-line bg-pine-850/80 overflow-hidden" style={{ animationDelay: "0.14s" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-line bg-pine-900/70">
                    {["Ticker", "Sleeve", "Held", "Entry → Exit", "Result", "Why it closed", "Note"].map((h, i) => (
                      <th key={i} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-fog-600 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {closed.map((c, i) => {
                    const up = c.pnlPct >= 0;
                    const meta = REASON_META[c.reason];
                    return (
                      <tr key={c.id} className="rise hover:bg-pine-800/50 transition-colors align-top" style={{ animationDelay: `${0.04 * i}s` }}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            {up ? <IconTrendUp size={15} className="text-moss-400" /> : <IconTrendDown size={15} className="text-ember-400" />}
                            <span className="font-display font-bold text-[15px] text-fog-100">{c.ticker}</span>
                          </div>
                          <div className="mt-0.5 ml-6 max-w-[220px] text-[11.5px] text-fog-600 leading-snug line-clamp-1" title={c.thesis}>{c.thesis}</div>
                        </td>
                        <td className="px-4 py-3.5"><SleeveBadge sleeve={c.sleeve} compact /></td>
                        <td className="px-4 py-3.5 font-mono text-[12px] text-fog-500 tabular whitespace-nowrap">
                          {fmtDate(c.entryDate)}<br />→ {fmtDate(c.exitDate)}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[12.5px] text-fog-300 tabular whitespace-nowrap">
                          {price(c.entryPrice)} → {price(c.exitPrice)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-mono text-[14px] font-medium tabular ${up ? "text-moss-400" : "text-ember-400"}`}>{pct(c.pnlPct)}</span>
                          <div className="font-mono text-[10.5px] text-fog-600 tabular">size {c.sizePct}%</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block font-mono text-[10px] tracking-[0.12em] px-2 py-1 rounded border whitespace-nowrap ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[12.5px] text-fog-500 leading-snug max-w-[240px]">{c.note || <span className="text-fog-600">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="rise font-mono text-[10.5px] text-fog-600 tracking-wider" style={{ animationDelay: "0.2s" }}>
            READ THE LOSERS FIRST — ESPECIALLY THE STOPS. THEY'RE THE RECEIPTS FOR THE DRAWDOWN YOU DIDN'T HAVE TO SIT THROUGH.
          </p>
        </>
      )}
    </div>
  );
}

function LedgerStat({ label, value, sub, tone = "fog" }: { label: string; value: string; sub: string; tone?: "moss" | "ember" | "flare" | "fog" }) {
  const cls = tone === "moss" ? "text-moss-400" : tone === "ember" ? "text-ember-400" : tone === "flare" ? "text-flare-400" : "text-fog-100";
  return (
    <div className="px-5 py-4 border-line [&:nth-child(odd)]:border-r [&:nth-child(-n+2)]:border-b lg:[&:not(:last-child)]:border-r lg:[&:nth-child(-n+2)]:border-b-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">{label}</div>
      <div className={`mt-1.5 font-display font-bold text-[26px] leading-none tabular ${cls}`}>{value}</div>
      <div className="mt-1.5 text-[11.5px] text-fog-500">{sub}</div>
    </div>
  );
}
