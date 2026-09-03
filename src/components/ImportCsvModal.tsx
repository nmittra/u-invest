import { useMemo, useRef, useState } from "react";
import type { Account, Position } from "../lib/types";
import { CSV_TEMPLATE, exportLogCsv, parseImportCsv, type ImportRow } from "../lib/csv";
import { btnGhost, btnPrimary, Modal, SleeveBadge } from "./ui";
import { IconAlert, IconDownload, IconUpload } from "./icons";

export function ImportCsvModal({
  accounts,
  positions,
  onImport,
  onClose,
}: {
  accounts: Account[];
  positions: Position[];
  onImport: (rows: ImportRow[]) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => (text.trim() ? parseImportCsv(text, { accounts, positions }) : null),
    [text, accounts, positions],
  );

  const ready = parsed?.rows.filter((r) => r.status !== "error") ?? [];
  const okCount = parsed?.rows.filter((r) => r.status === "ok").length ?? 0;
  const warnCount = parsed?.rows.filter((r) => r.status === "warn").length ?? 0;
  const errCount = parsed?.rows.filter((r) => r.status === "error").length ?? 0;

  function loadFile(f: File | undefined | null) {
    if (!f) return;
    setFileName(f.name);
    void f.text().then((t) => setText(t.replace(/^\uFEFF/, "")));
  }

  function download(name: string, content: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }

  return (
    <Modal title="Import positions from CSV" kicker="The checklist rules are checked on the way in — bad rows are blocked, rule deviations are flagged" onClose={onClose} wide>
      {/* intake */}
      <div
        className={`relative rounded-md border transition-all duration-200 ${
          dragOver ? "border-moss-500 bg-moss-500/5" : "border-line bg-pine-900/70"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          loadFile(e.dataTransfer.files?.[0]);
        }}
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFileName(null);
          }}
          spellCheck={false}
          placeholder={"Paste CSV here — header row first…\n\nticker,sleeve,entry_date,entry_price,size_pct,thesis,stop_price,invalidation,…"}
          className="w-full h-36 bg-transparent resize-y px-3.5 py-3 font-mono text-[12px] leading-relaxed text-fog-200 placeholder:text-fog-600 outline-none"
        />
        <div className="flex flex-wrap items-center gap-2.5 px-3.5 py-2.5 border-t border-line">
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className={`${btnGhost} !px-3 !py-1.5 !text-[12.5px]`}>
            <IconUpload size={14} /> {fileName ? fileName : "Choose a .csv file"}
          </button>
          <span className="text-[11.5px] text-fog-600">or drop it anywhere in this box</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => download("rulebook-import-template.csv", CSV_TEMPLATE)} className="text-[11.5px] text-moss-400 hover:text-moss-300 hover:underline underline-offset-2 transition-colors">
              Download template
            </button>
            {positions.length > 0 && (
              <button type="button" onClick={() => download("rulebook-log.csv", exportLogCsv(positions, accounts))} className="text-[11.5px] text-fog-500 hover:text-fog-200 hover:underline underline-offset-2 transition-colors">
                Export current log
              </button>
            )}
          </span>
        </div>
      </div>

      {/* column help */}
      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-[11.5px] font-mono tracking-wide text-fog-500 hover:text-fog-300 transition-colors select-none">
          <span className="group-open:hidden">▸ expected columns & formats</span>
          <span className="hidden group-open:inline">▾ expected columns & formats</span>
        </summary>
        <div className="mt-2.5 rounded-md border border-line bg-pine-900/50 px-4 py-3.5 text-[12px] text-fog-400 leading-relaxed">
          <p>
            <span className="font-mono text-[11px] text-fog-200">ticker*</span> · <span className="font-mono text-[11px] text-fog-200">sleeve*</span> (1 or 2) ·{" "}
            <span className="font-mono text-[11px] text-fog-200">entry_date</span> · <span className="font-mono text-[11px] text-fog-200">entry_price*</span> ·{" "}
            <span className="font-mono text-[11px] text-fog-200">current_price</span> · <span className="font-mono text-[11px] text-fog-200">size_pct*</span> ·{" "}
            <span className="font-mono text-[11px] text-fog-200">thesis*</span> · <span className="font-mono text-[11px] text-fog-200">stop_price</span> (S1) ·{" "}
            <span className="font-mono text-[11px] text-fog-200">invalidation</span> (S2) · <span className="font-mono text-[11px] text-fog-200">addon</span> (S2) ·{" "}
            <span className="font-mono text-[11px] text-fog-200">next_review</span> · <span className="font-mono text-[11px] text-fog-200">cadence</span> ·{" "}
            <span className="font-mono text-[11px] text-fog-200">account</span> — <span className="text-fog-600">*required. Unrecognised columns are ignored.</span>
          </p>
          <p className="mt-2">
            Add-on plan format: <span className="font-mono text-[11px] text-moss-300">-20:3;-35:3|14</span> — add 3% at −20%, another 3% at −35%, hard cap 14% of account.
            An <span className="font-mono text-[11px] text-fog-200">account</span> name that doesn't exist yet is created automatically.
          </p>
        </div>
      </details>

      {/* preview */}
      {parsed && (
        <div className="mt-4 fade-in">
          {parsed.headerNote ? (
            <div className="flex items-start gap-2.5 rounded-md border border-flare-600/40 bg-flare-500/5 px-4 py-3">
              <IconAlert size={15} className="text-flare-400 mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-fog-300 leading-snug">{parsed.headerNote}</p>
            </div>
          ) : parsed.rows.length === 0 ? (
            <p className="text-[12.5px] text-fog-500">Only a header row — add some positions underneath it.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-wide">
                <span className="text-moss-400">{okCount} READY</span>
                <span className={warnCount ? "text-flare-400" : "text-fog-600"}>{warnCount} FLAGGED</span>
                <span className={errCount ? "text-ember-400" : "text-fog-600"}>{errCount} BLOCKED</span>
                {errCount > 0 && <span className="text-fog-600 normal-case tracking-normal font-sans text-[11.5px]">blocked rows won't import — fix them and paste again</span>}
              </div>
              <div className="mt-2 max-h-60 overflow-auto rounded-md border border-line">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-pine-900">
                    <tr className="border-b border-line">
                      {["Line", "Ticker", "Sleeve", "Entry px", "Size", "Account", "Status"].map((h) => (
                        <th key={h} className="px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-fog-600 font-medium whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {parsed.rows.map((r) => (
                      <tr key={r.line} className={r.status === "error" ? "bg-ember-500/5" : undefined}>
                        <td className="px-3 py-2 font-mono text-[11px] text-fog-600 tabular">{r.line}</td>
                        <td className="px-3 py-2 font-display font-bold text-[13px] text-fog-100">{r.ticker || "—"}</td>
                        <td className="px-3 py-2">{r.ticker ? <SleeveBadge sleeve={r.sleeve} compact /> : "—"}</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-fog-300 tabular">{r.entryPrice ? r.entryPrice.toFixed(2) : "—"}</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-fog-300 tabular">{r.sizePct ? `${r.sizePct}%` : "—"}</td>
                        <td className="px-3 py-2 text-[12px] text-fog-400">{r.accountName || <span className="text-fog-600">selected</span>}</td>
                        <td className="px-3 py-2">
                          {r.status === "ok" && <span className="font-mono text-[10px] tracking-wider text-moss-400">READY</span>}
                          {r.status === "warn" && (
                            <span className="font-mono text-[10px] tracking-wider text-flare-400" title={r.messages.join("\n")}>
                              FLAGGED · {r.messages.length}
                            </span>
                          )}
                          {r.status === "error" && (
                            <span className="text-[11px] text-ember-300 leading-snug" title={r.messages.join("\n")}>
                              {r.messages[0]}
                            </span>
                          )}
                          {r.status === "warn" && (
                            <div className="mt-1 max-w-[340px] text-[10.5px] text-fog-500 leading-snug">{r.messages.join(" · ")}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} className={btnGhost}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready.length}
          onClick={() => onImport(ready)}
          className={btnPrimary}
        >
          <IconUpload size={15} />
          Import {ready.length || ""} position{ready.length === 1 ? "" : "s"}
        </button>
      </div>
    </Modal>
  );
}
