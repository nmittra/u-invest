import { useState } from "react";
import { btnPrimary, Field, inputCls } from "./ui";
import { IconAlert, IconEye, IconEyeOff, IconLock, IconShield, IconUnlock, LogoMark } from "./icons";

const HOUSE_RULES = [
  { n: "01", text: "Every position is classified at purchase — before price moves and emotion enters." },
  { n: "02", text: "Sleeve 1 trades carry a hard stop 7–8% below entry. Stop hit = exit, no debate." },
  { n: "03", text: "Sleeve 2 cores have no price stop — only pre-written, falsifiable invalidation facts." },
];

export interface VaultMeta {
  name: string;
  counts: { open: number; accounts: number } | null;
}

export function LockScreen({
  meta,
  onUnlock,
  onCreate,
  onWipe,
}: {
  meta: VaultMeta | null;
  onUnlock: (password: string) => Promise<boolean>;
  onCreate: (name: string, password: string) => Promise<void>;
  onWipe: () => void;
}) {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
        {/* manifesto side */}
        <div className="rise hidden lg:block">
          <div className="flex items-center gap-3 text-moss-400">
            <LogoMark size={34} />
            <div>
              <div className="font-display font-bold text-lg tracking-tight text-fog-100 leading-none">THE RULEBOOK</div>
              <div className="font-mono text-[11px] text-fog-500 tracking-[0.2em] mt-1">TWO-SLEEVE DISCIPLINE</div>
            </div>
          </div>
          <h1 className="mt-8 font-display font-bold text-[44px] leading-[1.04] tracking-tight text-fog-100">
            The sleeve is decided <span className="text-flare-400">calm</span>,
            <br />
            while the thesis is <span className="text-moss-400">clear</span>.
          </h1>
          <p className="mt-5 text-fog-300 text-[15px] leading-relaxed max-w-md">
            A private ledger for your positions. Trading sleeves stop at the price. Core sleeves stop at the fact.
            Nothing changes sleeves mid-drawdown<span className="caret text-moss-400">▍</span>
          </p>
          <div className="mt-9 space-y-4">
            {HOUSE_RULES.map((r, i) => (
              <div key={r.n} className="rise flex gap-4 items-start" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <span className="font-mono text-[12px] text-fog-600 pt-0.5">{r.n}</span>
                <span className="border-l-2 border-pine-600 pl-4 text-[13.5px] text-fog-300 leading-relaxed">{r.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* form side */}
        <div className="rise" style={{ animationDelay: "0.1s" }}>
          {meta ? (
            <UnlockForm meta={meta} onUnlock={onUnlock} onWipe={onWipe} />
          ) : (
            <CreateForm onCreate={onCreate} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------ shared bits ------------------------------------------------ */

function SealPlate() {
  return (
    <div className="mt-5 flex items-center gap-2.5 rounded-md border border-line bg-pine-900/70 px-3.5 py-2.5">
      <IconShield size={15} className="shrink-0 text-moss-400" />
      <p className="font-mono text-[10.5px] leading-snug text-fog-500 tracking-wide">
        AES-256-GCM · key derived on this device · the password itself is never stored
      </p>
    </div>
  );
}

/* ------------------------------------------------ unlock ------------------------------------------------ */

function UnlockForm({
  meta,
  onUnlock,
  onWipe,
}: {
  meta: VaultMeta;
  onUnlock: (password: string) => Promise<boolean>;
  onWipe: () => void;
}) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const legacy = meta.counts !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    const ok = await onUnlock(pw);
    setBusy(false);
    if (!ok) {
      setErr(true);
      setPw("");
      setTimeout(() => setErr(false), 550);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-pine-850/90 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-moss-600 via-moss-400 to-flare-400" />
      <form onSubmit={submit} className={`p-7 sm:p-8 ${err ? "shake" : ""}`}>
        <div className="lg:hidden flex items-center gap-2.5 text-moss-400 mb-6">
          <LogoMark size={26} />
          <span className="font-display font-bold tracking-tight text-fog-100">THE RULEBOOK</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-md bg-pine-700 text-moss-400">
            <IconLock size={19} />
          </span>
          <div>
            <h2 className="font-display font-bold text-xl text-fog-100 leading-tight">Welcome back, {meta.name}.</h2>
            <p className="text-[13px] text-fog-500 mt-0.5">
              {legacy
                ? `${meta.counts!.open} open position${meta.counts!.open === 1 ? "" : "s"} · ${meta.counts!.accounts} account${meta.counts!.accounts === 1 ? "" : "s"}`
                : "Your positions are sealed. Password required."}
            </p>
          </div>
        </div>

        {legacy && (
          <p className="mt-4 text-[11.5px] leading-snug text-flare-300 border-l-2 border-flare-500/50 pl-3">
            Legacy vault detected — the moment you unlock it, it will be re-saved fully encrypted.
          </p>
        )}

        <div className="mt-6">
          <Field label="Password">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className={`${inputCls} pr-11 font-mono`}
                placeholder="••••••••"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fog-500 hover:text-fog-100 transition-colors"
                aria-label="Toggle password visibility"
              >
                {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </Field>
        </div>

        {err && <p className="mt-2 text-[12.5px] text-ember-300">Wrong password — the seal held. Try again.</p>}

        <button type="submit" disabled={!pw || busy} className={`${btnPrimary} w-full mt-5 py-3`}>
          <IconUnlock size={16} />
          {busy ? "Decrypting…" : "Open the rulebook"}
        </button>

        <SealPlate />

        <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
          <span className="text-[11.5px] text-fog-600">Stored only on this device.</span>
          {confirmWipe ? (
            <span className="flex items-center gap-2 text-[11.5px]">
              <span className="text-ember-300">Erase everything?</span>
              <button type="button" className="text-ember-400 font-semibold hover:underline" onClick={onWipe}>
                Yes, erase
              </button>
              <button type="button" className="text-fog-500 hover:underline" onClick={() => setConfirmWipe(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmWipe(true)} className="text-[11.5px] text-fog-600 hover:text-ember-300 transition-colors">
              Forgot password?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------ first run ------------------------------------------------ */

function CreateForm({ onCreate }: { onCreate: (name: string, password: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const pwOk = pw.length >= 4;
  const match = pw2 === pw && pw2.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pwOk || !match || busy) return;
    setBusy(true);
    await onCreate(name.trim(), pw);
  }

  return (
    <div className="rounded-lg border border-line bg-pine-850/90 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.9)] overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-flare-400 via-moss-400 to-moss-600" />
      <form onSubmit={submit} className="p-7 sm:p-8">
        <div className="lg:hidden flex items-center gap-2.5 text-moss-400 mb-6">
          <LogoMark size={26} />
          <span className="font-display font-bold tracking-tight text-fog-100">THE RULEBOOK</span>
        </div>
        <h2 className="font-display font-bold text-2xl text-fog-100 tracking-tight">Open your rulebook.</h2>
        <p className="text-[13.5px] text-fog-500 mt-1.5 leading-relaxed">
          Name it, lock it. The whole book is encrypted with a key derived from your password — nothing is stored in
          plain text, and nothing ever leaves this browser.
        </p>

        <div className="mt-6 space-y-4">
          <Field label="Your name" hint="how the book greets you — the only thing stored unencrypted">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dana" autoFocus />
          </Field>
          <Field
            label="Password"
            hint="min. 4 characters — longer is stronger"
            error={pw.length > 0 && !pwOk ? "At least 4 characters." : undefined}
          >
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                className={`${inputCls} pr-11 font-mono`}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fog-500 hover:text-fog-100 transition-colors"
                aria-label="Toggle password visibility"
              >
                {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </Field>
          <Field label="Confirm password" error={pw2.length > 0 && !match ? "Passwords don't match." : undefined}>
            <input
              type={show ? "text" : "password"}
              className={`${inputCls} font-mono`}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        </div>

        <button type="submit" disabled={!name.trim() || !pwOk || !match || busy} className={`${btnPrimary} w-full mt-6 py-3`}>
          {busy ? "Sealing…" : "Create my rulebook"}
        </button>

        <SealPlate />

        <div className="mt-4 flex items-start gap-2 text-[11.5px] text-fog-600 leading-snug">
          <IconAlert size={13} className="mt-0.5 shrink-0" />
          <span>
            No recovery by design: if you lose this password the book can't be reopened. Once inside, export a backup
            and keep it somewhere safe.
          </span>
        </div>
      </form>
    </div>
  );
}
