import type { ReactNode } from "react";
import type { Sleeve, Toast } from "../lib/types";
import { IconAlert, IconCheck, IconX } from "./icons";

/* ---------------- class recipes ---------------- */

export const inputCls =
  "w-full bg-pine-900 border border-line rounded-md px-3 py-2.5 text-[15px] text-fog-100 placeholder:text-fog-600 outline-none transition-all duration-200 focus:border-moss-600 focus:ring-2 focus:ring-moss-600/25 hover:border-pine-600";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-moss-400 text-pine-950 font-display font-semibold tracking-wide rounded-md px-4 py-2.5 text-sm transition-all duration-150 hover:bg-moss-300 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none shadow-[0_0_0_1px_rgba(62,207,142,0.4),0_8px_24px_-10px_rgba(62,207,142,0.5)]";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 border border-line text-fog-300 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-150 hover:border-pine-600 hover:text-fog-100 hover:bg-pine-800 active:scale-[0.97]";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 bg-ember-400 text-pine-950 font-display font-semibold rounded-md px-4 py-2.5 text-sm transition-all duration-150 hover:bg-ember-300 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none";

/* ---------------- modal ---------------- */

export function Modal({
  title,
  kicker,
  onClose,
  children,
  wide,
  tone = "moss",
}: {
  title: ReactNode;
  kicker?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  tone?: "moss" | "flare" | "ember";
}) {
  const bar = tone === "flare" ? "bg-flare-400" : tone === "ember" ? "bg-ember-400" : "bg-moss-400";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-pine-950/80 backdrop-blur-[3px] fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? "max-w-3xl" : "max-w-lg"} modal-in rounded-lg border border-line bg-pine-850 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] my-auto`}
      >
        <div className={`h-[3px] rounded-t-lg ${bar}`} />
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div>
            {kicker && (
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-fog-500 mb-1">{kicker}</div>
            )}
            <h2 className="font-display font-bold text-xl text-fog-100 leading-tight">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 mt-0.5 p-1.5 rounded-md text-fog-500 hover:text-fog-100 hover:bg-pine-700 transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- form field ---------------- */

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-500">{label}</span>
        {hint && <span className="text-[11px] text-fog-600">{hint}</span>}
      </div>
      {children}
      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-ember-300 leading-snug">
          <IconAlert size={13} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </label>
  );
}

/* ---------------- sleeve badge ---------------- */

export function SleeveBadge({ sleeve, compact }: { sleeve: Sleeve; compact?: boolean }) {
  if (sleeve === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 border border-flare-600/60 bg-flare-900/70 text-flare-300 font-mono text-[11px] tracking-wider whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-flare-400" />
        {compact ? "S1" : "S1 · TRADE"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 border border-moss-600/60 bg-moss-900/70 text-moss-300 font-mono text-[11px] tracking-wider whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-moss-400" />
      {compact ? "S2" : "S2 · CORE"}
    </span>
  );
}

/* ---------------- checklist tick ---------------- */

export function ChecklistItem({ done, label }: { done: boolean; label: ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2.5 py-[7px] transition-colors duration-300 ${done ? "text-fog-100" : "text-fog-600"}`}
    >
      <span
        className={`flex items-center justify-center w-[18px] h-[18px] rounded-sm border transition-all duration-300 shrink-0 ${
          done ? "bg-moss-400 border-moss-400 text-pine-950" : "border-pine-600 bg-pine-900"
        }`}
      >
        {done && (
          <span className="check-pop">
            <IconCheck size={11} strokeWidth={2.6} />
          </span>
        )}
      </span>
      <span className="text-[13px] leading-snug">{label}</span>
    </div>
  );
}

/* ---------------- toasts ---------------- */

const toastTone = {
  moss: "border-moss-600/70 text-moss-300",
  flare: "border-flare-600/70 text-flare-300",
  ember: "border-ember-600/70 text-ember-300",
  fog: "border-line text-fog-300",
};

export function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2 w-[min(360px,calc(100vw-40px))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in rounded-md border bg-pine-850/95 backdrop-blur px-4 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)] ${toastTone[t.tone]}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display font-semibold text-[14px] text-fog-100">{t.title}</div>
              {t.detail && <div className="text-[12.5px] text-fog-500 mt-0.5 leading-snug">{t.detail}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-fog-600 hover:text-fog-100 transition-colors mt-0.5"
              aria-label="Dismiss"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
