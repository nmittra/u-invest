import { useState } from "react";
import type { Account, Position, View } from "../lib/types";
import { ACCOUNT_WRAPPERS } from "../lib/types";
import { sumSize } from "../lib/calc";
import { inputCls } from "./ui";
import {
  IconArchive,
  IconBook,
  IconDesk,
  IconDownload,
  IconLock,
  IconPencil,
  IconPlus,
  IconRows,
  IconShield,
  IconX,
  LogoMark,
} from "./icons";

const NAV: { id: View; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: "desk", label: "Trading Desk", icon: (p) => <IconDesk {...p} /> },
  { id: "log", label: "Position Log", icon: (p) => <IconRows {...p} /> },
  { id: "rules", label: "The Rules", icon: (p) => <IconBook {...p} /> },
  { id: "closed", label: "Closed Ledger", icon: (p) => <IconArchive {...p} /> },
];

export function Sidebar({
  profileName,
  view,
  setView,
  accounts,
  selectedId,
  selectAccount,
  addAccount,
  renameAccount,
  deleteAccount,
  positions,
  closedCount,
  onOpenSecurity,
  onExport,
  onLock,
}: {
  profileName: string;
  view: View;
  setView: (v: View) => void;
  accounts: Account[];
  selectedId: string; // "all" or account id
  selectAccount: (id: string) => void;
  addAccount: (name: string, value: number | null, wrapper?: string) => void;
  renameAccount: (id: string, name: string) => void;
  deleteAccount: (id: string) => void;
  positions: Position[];
  closedCount: number;
  onOpenSecurity: () => void;
  onExport: () => void;
  onLock: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [wrapper, setWrapper] = useState<string>("Trading");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const countFor = (id: string) =>
    id === "all" ? positions.length : positions.filter((p) => p.accountId === id).length;
  const sizeFor = (id: string) =>
    sumSize(id === "all" ? positions : positions.filter((p) => p.accountId === id));

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const v = parseFloat(value);
    addAccount(name.trim(), Number.isFinite(v) && v > 0 ? v : null, wrapper);
    setName("");
    setValue("");
    setWrapper("Trading");
    setAdding(false);
  }

  function commitRename(id: string) {
    const trimmed = editName.trim();
    if (trimmed) renameAccount(id, trimmed);
    setEditingId(null);
  }

  return (
    <aside className="hidden lg:flex flex-col w-[256px] shrink-0 border-r border-line bg-pine-900/60 backdrop-blur-sm sticky top-0 h-screen">
      {/* brand */}
      <div className="px-5 pt-6 pb-5 border-b border-line">
        <div className="flex items-center gap-2.5 text-moss-400">
          <LogoMark size={28} />
          <div>
            <div className="font-display font-bold text-[15px] tracking-tight text-fog-100 leading-none">THE RULEBOOK</div>
            <div className="font-mono text-[10px] text-fog-500 tracking-[0.18em] mt-1">{profileName.toUpperCase()}'S BOOK</div>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="px-3 py-4 space-y-1">
        {NAV.map((n) => {
          const active = view === n.id;
          const count = n.id === "log" ? positions.length : n.id === "closed" ? closedCount : null;
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13.5px] font-medium transition-all duration-150 group ${
                active
                  ? "bg-pine-700 text-fog-100 shadow-[inset_2px_0_0_0_var(--color-moss-400)]"
                  : "text-fog-500 hover:text-fog-100 hover:bg-pine-800"
              }`}
            >
              <span className={active ? "text-moss-400" : "text-fog-600 group-hover:text-fog-300 transition-colors"}>
                {n.icon({ size: 17 })}
              </span>
              <span className="flex-1 text-left">{n.label}</span>
              {count !== null && count > 0 && (
                <span className="font-mono text-[11px] text-fog-500 bg-pine-900 border border-line rounded px-1.5 py-px tabular">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* accounts */}
      <div className="px-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">Accounts</span>
          <button
            onClick={() => setAdding((a) => !a)}
            className={`p-1 rounded transition-colors ${adding ? "text-moss-400 bg-pine-700" : "text-fog-600 hover:text-moss-400 hover:bg-pine-800"}`}
            aria-label="Add account"
          >
            {adding ? <IconX size={13} /> : <IconPlus size={13} />}
          </button>
        </div>

        {adding && (
          <form onSubmit={submitAdd} className="px-2 pb-3 space-y-2 fade-in">
            <div className="flex flex-wrap gap-1">
              {ACCOUNT_WRAPPERS.map((w) => (
                <button
                  type="button"
                  key={w}
                  onClick={() => {
                    setWrapper(w);
                    if (!name.trim()) setName(w);
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-[10.5px] tracking-wide border transition-all duration-150 ${
                    wrapper === w
                      ? "border-moss-500 text-moss-300 bg-moss-500/10"
                      : "border-line text-fog-500 hover:text-fog-200 hover:border-pine-600"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
            <input
              className={`${inputCls} !py-2 text-[13px]`}
              placeholder="Account name (e.g. Trading 212 ISA)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <input
              className={`${inputCls} !py-2 text-[13px] font-mono`}
              placeholder="Size in $ (optional)"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
            />
            <button type="submit" className="w-full text-[12px] font-semibold text-pine-950 bg-moss-400 hover:bg-moss-300 rounded py-1.5 transition-colors">
              Add account
            </button>
          </form>
        )}

        <div className="space-y-0.5 pb-4">
          <AccountRow
            label="All accounts"
            sub={`${positions.length} open · ${sizeFor("all").toFixed(0)}% committed`}
            active={selectedId === "all"}
            onClick={() => selectAccount("all")}
          />
          {accounts.map((a) => {
            const empty = countFor(a.id) === 0;
            if (editingId === a.id) {
              return (
                <form
                  key={a.id}
                  className="px-2 py-1.5 fade-in"
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitRename(a.id);
                  }}
                >
                  <input
                    autoFocus
                    className={`${inputCls} !py-1.5 text-[13px]`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => commitRename(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                </form>
              );
            }
            return (
              <AccountRow
                key={a.id}
                label={a.name}
                tag={a.wrapper}
                sub={`${countFor(a.id)} open · ${sizeFor(a.id).toFixed(0)}% committed`}
                active={selectedId === a.id}
                onClick={() => selectAccount(a.id)}
                onRename={() => {
                  setEditingId(a.id);
                  setEditName(a.name);
                }}
                onDelete={empty ? () => deleteAccount(a.id) : undefined}
                deleteHint={empty ? undefined : "Move or close its positions first"}
              />
            );
          })}
          {accounts.length === 0 && !adding && (
            <p className="px-3 py-2 text-[12px] text-fog-600 leading-snug">
              No accounts yet — add one to start logging positions.
            </p>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="px-3 py-4 border-t border-line space-y-1">
        <button
          onClick={onOpenSecurity}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-fog-500 hover:text-moss-300 hover:bg-pine-800 transition-colors"
        >
          <IconShield size={15} /> Security & password
        </button>
        <button
          onClick={onExport}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-fog-500 hover:text-fog-100 hover:bg-pine-800 transition-colors"
        >
          <IconDownload size={15} /> Export backup (.json)
        </button>
        <button
          onClick={onLock}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-fog-500 hover:text-ember-300 hover:bg-pine-800 transition-colors"
        >
          <IconLock size={15} /> Lock the book
        </button>
      </div>
    </aside>
  );
}

function AccountRow({
  label,
  tag,
  sub,
  active,
  onClick,
  onRename,
  onDelete,
  deleteHint,
}: {
  label: string;
  tag?: string;
  sub: string;
  active: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  deleteHint?: string;
}) {
  return (
    <div
      className={`group flex items-center rounded-md transition-all duration-150 cursor-pointer ${
        active ? "bg-pine-700 shadow-[inset_2px_0_0_0_var(--color-flare-400)]" : "hover:bg-pine-800"
      }`}
      onClick={onClick}
    >
      <div className="flex-1 px-3 py-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-[13px] font-medium truncate ${active ? "text-fog-100" : "text-fog-300"}`}>{label}</span>
          {tag && (
            <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.08em] text-flare-300 border border-flare-500/40 bg-flare-500/10 rounded px-1 py-px leading-none">
              {tag}
            </span>
          )}
        </div>
        <div className="font-mono text-[10.5px] text-fog-600 tabular truncate">{sub}</div>
      </div>
      {onRename && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          className="p-1 rounded text-fog-600 opacity-0 group-hover:opacity-100 hover:text-moss-300 hover:bg-pine-900 transition-all"
          aria-label={`Rename ${label}`}
        >
          <IconPencil size={12} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="mr-2 p-1 rounded text-fog-600 opacity-0 group-hover:opacity-100 hover:text-ember-400 hover:bg-pine-900 transition-all"
          aria-label={`Remove ${label}`}
        >
          <IconX size={12} />
        </button>
      )}
      {deleteHint && (
        <span
          className="mr-2 p-1 rounded text-fog-600 opacity-0 group-hover:opacity-40 cursor-not-allowed"
          title={deleteHint}
        >
          <IconX size={12} />
        </span>
      )}
    </div>
  );
}
