import { useState } from "react";
import { IDLE_LOCK_MINUTES } from "../lib/store";
import { btnDanger, btnPrimary, Field, inputCls, Modal } from "./ui";
import { IconAlert, IconShield } from "./icons";

const PROTECTIONS = [
  {
    n: "01",
    text: "The password is never stored. A 256-bit key is derived from it — PBKDF2-SHA256, 150,000 rounds — and the entire book (accounts, positions, ledger) is encrypted with AES-256-GCM before it touches this browser's storage.",
  },
  {
    n: "02",
    text: "Open this device's storage and you'll find ciphertext, not tickers. A wrong password doesn't unlock anything — the decryption simply fails and the seal holds.",
  },
  {
    n: `03`,
    text: `The book locks on every fresh load, whenever you lock it yourself, and automatically after ${IDLE_LOCK_MINUTES} minutes of inactivity.`,
  },
  {
    n: "04",
    text: "Nothing leaves this device — no server, no cloud, no tracking. Exported backups are plain JSON, so treat that file like cash.",
  },
];

export function SecurityModal({
  ownerName,
  onChangePassword,
  onErase,
  onClose,
}: {
  ownerName: string;
  onChangePassword: (newPassword: string) => Promise<void>;
  onErase: () => void;
  onClose: () => void;
}) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);

  const ok = pw.length >= 4 && pw2 === pw;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    await onChangePassword(pw);
    setBusy(false);
    setPw("");
    setPw2("");
  }

  return (
    <Modal title="Vault security" kicker={`How unauthorized people are kept out of ${ownerName}'s book`} onClose={onClose}>
      <div className="space-y-3.5">
        {PROTECTIONS.map((p) => (
          <div key={p.n} className="flex gap-3.5 items-start">
            <span className="font-mono text-[11.5px] text-moss-500 pt-0.5">{p.n}</span>
            <p className="text-[13px] leading-relaxed text-fog-300 border-l border-line pl-3.5">{p.text}</p>
          </div>
        ))}
      </div>

      {/* change password */}
      <form onSubmit={submit} className="mt-7 rounded-md border border-line bg-pine-900/60 p-5">
        <div className="flex items-center gap-2 text-fog-100">
          <IconShield size={16} className="text-moss-400" />
          <h3 className="font-display font-semibold text-[15px]">Change password</h3>
        </div>
        <p className="mt-1.5 text-[12px] text-fog-500 leading-snug">
          The whole book gets re-sealed under a brand-new key derived from the new password.
        </p>
        <div className="mt-4 grid sm:grid-cols-2 gap-3.5">
          <Field label="New password" error={pw.length > 0 && pw.length < 4 ? "At least 4 characters." : undefined}>
            <input type="password" className={`${inputCls} font-mono`} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Confirm" error={pw2.length > 0 && pw2 !== pw ? "Doesn't match." : undefined}>
            <input type="password" className={`${inputCls} font-mono`} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
          </Field>
        </div>
        <button type="submit" disabled={!ok || busy} className={`${btnPrimary} mt-4 w-full sm:w-auto`}>
          {busy ? "Re-sealing…" : "Re-seal the book"}
        </button>
      </form>

      {/* danger zone */}
      <div className="mt-5 rounded-md border border-ember-500/30 bg-ember-500/5 p-5">
        <div className="flex items-center gap-2">
          <IconAlert size={15} className="text-ember-400" />
          <h3 className="font-display font-semibold text-[15px] text-ember-200">Erase this vault</h3>
        </div>
        <p className="mt-1.5 text-[12px] text-fog-500 leading-snug">
          Deletes every account, position and closed trade from this device. There is no recovery — export a backup
          first if you might want any of it.
        </p>
        <div className="mt-3.5 flex items-center gap-3">
          {armed ? (
            <>
              <button type="button" onClick={onErase} className={`${btnDanger} !py-2`}>
                Click again to erase everything
              </button>
              <button type="button" onClick={() => setArmed(false)} className="text-[12.5px] text-fog-500 hover:text-fog-200 underline underline-offset-2 transition-colors">
                Keep it
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setArmed(true)}
              className="text-[12.5px] font-semibold text-ember-300 border border-ember-500/40 rounded-md px-3.5 py-2 hover:bg-ember-500/10 transition-colors"
            >
              Erase vault…
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
