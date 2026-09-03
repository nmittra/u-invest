import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Account, ExitReason, Position, Toast, Vault, View } from "./lib/types";
import {
  advanceByCadence,
  createVault,
  exportVault,
  fmtDate,
  forgetKey,
  freshAccount,
  getVaultMeta,
  IDLE_LOCK_MINUTES,
  persistVault,
  rekeyVault,
  samplePosition,
  todayISO,
  uid,
  unlockVault,
  wipeVault,
} from "./lib/store";
import { Sidebar } from "./components/Sidebar";
import { LockScreen } from "./components/LockScreen";
import { TickerTape } from "./components/TickerTape";
import { Dashboard } from "./components/Dashboard";
import { PositionsTable } from "./components/PositionsTable";
import { PositionForm } from "./components/PositionForm";
import { ReviewModal } from "./components/ReviewModal";
import { ExitModal } from "./components/ExitModal";
import { GutCheck } from "./components/GutCheck";
import { Rulebook } from "./components/Rulebook";
import { ClosedLedger } from "./components/ClosedLedger";
import { SecurityModal } from "./components/SecurityModal";
import { ImportCsvModal } from "./components/ImportCsvModal";
import { ToastStack } from "./components/ui";
import { IconLock, IconPulse, IconShield, LogoMark } from "./components/icons";
import { fetchQuote, normalizeSymbol } from "./lib/quotes";
import { buildPosition, type ImportRow } from "./lib/csv";

export default function App() {
  const [meta, setMeta] = useState(() => getVaultMeta());
  const [vault, setVault] = useState<Vault | null>(null);
  const [ownerName, setOwnerName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState<View>("desk");
  const [selectedId, setSelectedId] = useState<string>("all");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [reviewFor, setReviewFor] = useState<Position | null>(null);
  const [exitFor, setExitFor] = useState<{ p: Position; reason?: ExitReason } | null>(null);
  const [gutOpen, setGutOpen] = useState(false);
  const [secOpen, setSecOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [busyPrices, setBusyPrices] = useState<Record<string, boolean>>({});
  const [refreshProg, setRefreshProg] = useState<{ done: number; total: number } | null>(null);

  /** The password lives only in memory while the book is open — needed to re-seal on every save. */
  const passwordRef = useRef<string | null>(null);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4600);
  }, []);

  /* ---------------- auth ---------------- */

  async function handleCreate(name: string, pw: string) {
    const seed: Vault = { accounts: [freshAccount("Main account", null, "Trading")], positions: [], closed: [] };
    await createVault(name, pw, seed);
    passwordRef.current = pw;
    setOwnerName(name);
    setVault(seed);
    setUnlocked(true);
    setMeta({ name, counts: null });
    toast({
      tone: "moss",
      title: `The book is open, ${name}.`,
      detail: "Encrypted and sealed on this device. A “Main account” was created — add your ISA, SIPP and the rest from the sidebar.",
    });
  }

  async function handleUnlock(pw: string): Promise<boolean> {
    const v = await unlockVault(pw);
    if (!v) return false;
    passwordRef.current = pw;
    setOwnerName(meta?.name ?? "");
    setVault(v);
    setUnlocked(true);
    toast({ tone: "moss", title: "Book unlocked.", detail: "Plan first. Prices second." });
    return true;
  }

  const closeModals = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setReviewFor(null);
    setExitFor(null);
    setGutOpen(false);
    setSecOpen(false);
  }, []);

  const handleLock = useCallback(
    (reason?: "idle") => {
      forgetKey();
      passwordRef.current = null;
      setVault(null);
      setUnlocked(false);
      setView("desk");
      closeModals();
      if (reason === "idle") {
        toast({
          tone: "flare",
          title: "Locked after inactivity.",
          detail: `${IDLE_LOCK_MINUTES} minutes idle — the book sealed itself. Your password reopens it.`,
        });
      }
    },
    [closeModals, toast],
  );

  /* auto-lock on inactivity */
  useEffect(() => {
    if (!unlocked) return;
    const ms = IDLE_LOCK_MINUTES * 60_000;
    let t = window.setTimeout(() => handleLock("idle"), ms);
    const reset = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => handleLock("idle"), ms);
    };
    const evs = ["pointerdown", "keydown", "wheel", "touchstart"];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(t);
      evs.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [unlocked, handleLock]);

  /* persist (re-encrypt) on every change while open */
  useEffect(() => {
    if (vault && unlocked && passwordRef.current) {
      void persistVault(vault, ownerName, passwordRef.current).catch(() => {});
    }
  }, [vault, unlocked, ownerName]);

  function handleWipe() {
    wipeVault();
    setMeta(null);
    setVault(null);
    setUnlocked(false);
    closeModals();
    toast({ tone: "fog", title: "Vault erased.", detail: "This device is a blank page again." });
  }

  async function handleChangePassword(newPw: string) {
    if (!vault) return;
    await rekeyVault(vault, ownerName, newPw);
    passwordRef.current = newPw;
    toast({ tone: "moss", title: "Password changed.", detail: "The whole book was re-sealed under the new key." });
  }

  /* ---------------- derived ---------------- */

  const positions = useMemo(() => {
    if (!vault) return [];
    const list = selectedId === "all" ? vault.positions : vault.positions.filter((p) => p.accountId === selectedId);
    return [...list].sort((a, b) => a.sleeve - b.sleeve || b.createdAt - a.createdAt);
  }, [vault, selectedId]);

  const closed = useMemo(() => {
    if (!vault) return [];
    const list = selectedId === "all" ? vault.closed : vault.closed.filter((c) => c.accountId === selectedId);
    return [...list].sort((a, b) => b.closedAt - a.closedAt);
  }, [vault, selectedId]);

  const accountName =
    selectedId === "all" ? "All accounts" : (vault?.accounts.find((a) => a.id === selectedId)?.name ?? "Account");

  /* ---------------- mutations ---------------- */

  function mutate(fn: (v: Vault) => Vault) {
    setVault((prev) => (prev ? fn(prev) : prev));
  }

  function addAccount(name: string, value: number | null, wrapper?: string) {
    const acc = freshAccount(name, value, wrapper);
    mutate((v) => ({ ...v, accounts: [...v.accounts, acc] }));
    setSelectedId(acc.id);
    toast({
      tone: "moss",
      title: `Account “${name}” added${wrapper && wrapper !== name ? ` · ${wrapper}` : ""}.`,
      detail: "Positions you log will file under it. Size limits are tracked per account.",
    });
  }

  function renameAccount(id: string, name: string) {
    mutate((v) => ({ ...v, accounts: v.accounts.map((a) => (a.id === id ? { ...a, name } : a)) }));
    toast({ tone: "fog", title: `Account renamed to “${name}”.` });
  }

  function deleteAccount(id: string) {
    if (!vault) return;
    if (vault.accounts.length <= 1) {
      toast({ tone: "flare", title: "Keep at least one account.", detail: "Every position needs a book to live in." });
      return;
    }
    mutate((v) => ({ ...v, accounts: v.accounts.filter((a) => a.id !== id) }));
    if (selectedId === id) setSelectedId("all");
    toast({ tone: "fog", title: "Account removed." });
  }

  function savePosition(p: Position) {
    mutate((v) => ({
      ...v,
      positions: v.positions.some((x) => x.id === p.id)
        ? v.positions.map((x) => (x.id === p.id ? p : x))
        : [...v.positions, p],
    }));
    setFormOpen(false);
    setEditing(null);
    toast({
      tone: p.sleeve === 1 ? "flare" : "moss",
      title: editing ? `${p.ticker} amended — sleeve ${p.sleeve} stays locked.` : `${p.ticker} locked into Sleeve ${p.sleeve}.`,
      detail: editing ? undefined : `Classified while calm. Next review ${fmtDate(p.nextReview)}.`,
    });
  }

  function deletePosition(id: string) {
    const p = vault?.positions.find((x) => x.id === id);
    mutate((v) => ({ ...v, positions: v.positions.filter((x) => x.id !== id) }));
    setFormOpen(false);
    setEditing(null);
    toast({ tone: "fog", title: p ? `${p.ticker} removed from the log.` : "Entry removed." });
  }

  function updatePrice(id: string, priceVal: number) {
    const before = vault?.positions.find((x) => x.id === id);
    mutate((v) => ({
      ...v,
      positions: v.positions.map((x) => (x.id === id ? { ...x, currentPrice: priceVal, lastPriceUpdate: Date.now() } : x)),
    }));
    if (before && before.sleeve === 1 && before.stopPrice) {
      const wasBreached = before.currentPrice !== null && before.currentPrice <= before.stopPrice;
      const nowBreached = priceVal <= before.stopPrice;
      if (nowBreached && !wasBreached) {
        toast({
          tone: "ember",
          title: `${before.ticker} stop breached.`,
          detail: "The system says exit — no debate. Log it from the review or the log.",
        });
      }
    }
  }

  function advanceReview(id: string) {
    const p = vault?.positions.find((x) => x.id === id);
    const next = advanceByCadence(todayISO(), p?.cadence ?? "monthly");
    mutate((v) => ({
      ...v,
      positions: v.positions.map((x) =>
        x.id === id ? { ...x, nextReview: next, reviewCount: x.reviewCount + 1, lastReview: todayISO() } : x
      ),
    }));
    setReviewFor(null);
    toast({
      tone: "moss",
      title: p ? `${p.ticker} carried forward.` : "Carried forward.",
      detail: `Nothing on the list happened. Next review ${fmtDate(next)}.`,
    });
  }

  function confirmExit(p: Position, exit: { exitDate: string; exitPrice: number; reason: ExitReason; note?: string }) {
    const pnlPctVal = ((exit.exitPrice - p.entryPrice) / p.entryPrice) * 100;
    mutate((v) => ({
      ...v,
      positions: v.positions.filter((x) => x.id !== p.id),
      closed: [
        {
          id: uid(),
          accountId: p.accountId,
          ticker: p.ticker,
          sleeve: p.sleeve,
          entryDate: p.entryDate,
          entryPrice: p.entryPrice,
          exitDate: exit.exitDate,
          exitPrice: exit.exitPrice,
          sizePct: p.sizePct,
          thesis: p.thesis,
          reason: exit.reason,
          pnlPct: pnlPctVal,
          note: exit.note,
          closedAt: Date.now(),
        },
        ...v.closed,
      ],
    }));
    setExitFor(null);
    setReviewFor(null);
    const msg =
      exit.reason === "stopped"
        ? { title: `${p.ticker} stopped out at ${exit.exitPrice.toFixed(2)}.`, detail: "Defined loss, system intact. That's the whole idea.", tone: "flare" as const }
        : exit.reason === "invalidated"
          ? { title: `${p.ticker} exited — thesis broken.`, detail: "A named fact did the deciding, not the price. Logged with reason.", tone: "ember" as const }
          : { title: `${p.ticker} exit logged.`, detail: "Discretionary exits get re-read in the ledger. Honestly.", tone: "fog" as const };
    toast(msg);
  }

  function loadSample() {
    if (!vault) return;
    const targetId = selectedId === "all" ? vault.accounts[0]?.id : selectedId;
    if (!targetId) {
      toast({ tone: "flare", title: "Add an account first.", detail: "Use the + in the Accounts section of the sidebar." });
      return;
    }
    const s = samplePosition(targetId);
    mutate((v) => ({ ...v, positions: [...v.positions, s] }));
    setView("log");
    toast({ tone: "moss", title: "MRVL example loaded.", detail: "A Sleeve 2 core with invalidation facts and an add-on plan. Explore, then delete it." });
  }

  /* ---------------- live prices (free, keyless) ---------------- */

  async function refreshOne(p: Position) {
    if (busyPrices[p.id]) return;
    setBusyPrices((b) => ({ ...b, [p.id]: true }));
    try {
      const q = await fetchQuote(p.ticker);
      updatePrice(p.id, q.price);
      toast({
        tone: "moss",
        title: `${p.ticker} → ${q.price.toFixed(2)}.`,
        detail: `${q.source} · typically ~15-min delayed.`,
      });
    } catch {
      toast({
        tone: "flare",
        title: `No quote for ${p.ticker}.`,
        detail: "Free endpoints didn't return a price — check the symbol (Yahoo format, e.g. AAPL, SHEL.L) or set it by hand.",
      });
    } finally {
      setBusyPrices((b) => ({ ...b, [p.id]: false }));
    }
  }

  async function refreshAll() {
    if (refreshProg || !positions.length) return;
    setRefreshProg({ done: 0, total: positions.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      setBusyPrices((b) => ({ ...b, [p.id]: true }));
      try {
        const q = await fetchQuote(p.ticker);
        updatePrice(p.id, q.price);
        ok++;
      } catch {
        fail++;
      }
      setBusyPrices((b) => ({ ...b, [p.id]: false }));
      setRefreshProg({ done: i + 1, total: positions.length });
      await new Promise((r) => setTimeout(r, 350)); // be polite to the free endpoints
    }
    setRefreshProg(null);
    if (ok > 0) {
      toast({
        tone: "moss",
        title: `Updated ${ok} price${ok === 1 ? "" : "s"}.`,
        detail: fail
          ? `${fail} symbol${fail === 1 ? "" : "s"} returned no quote and were left unchanged.`
          : "Free quotes via Yahoo Finance — typically ~15-min delayed.",
      });
    } else {
      toast({
        tone: "ember",
        title: "No quotes came back.",
        detail: "The free endpoints may be busy or rate-limited right now — try again in a minute, or update by hand.",
      });
    }
  }

  /* ---------------- CSV import ---------------- */

  function handleImport(rows: ImportRow[]) {
    if (!vault) return;
    const acctByName = new Map<string, string>();
    vault.accounts.forEach((a) => acctByName.set(a.name.toLowerCase(), a.id));
    const newAccounts: Account[] = [];
    let createdAccts = 0;
    const fallbackId = selectedId !== "all" ? selectedId : (vault.accounts[0]?.id ?? "");
    const newPositions = rows.map((r) => {
      let accountId: string;
      const name = (r.accountName ?? "").trim();
      if (!name) accountId = fallbackId;
      else if (acctByName.has(name.toLowerCase())) accountId = acctByName.get(name.toLowerCase())!;
      else {
        const na = freshAccount(name, null, "Other");
        newAccounts.push(na);
        acctByName.set(name.toLowerCase(), na.id);
        createdAccts++;
        accountId = na.id;
      }
      return buildPosition(r, accountId);
    });
    mutate((v) => ({ ...v, accounts: [...v.accounts, ...newAccounts], positions: [...v.positions, ...newPositions] }));
    setImportOpen(false);
    toast({
      tone: "moss",
      title: `Imported ${newPositions.length} position${newPositions.length === 1 ? "" : "s"}.`,
      detail: `${createdAccts ? `${createdAccts} new account${createdAccts === 1 ? "" : "s"} created. ` : ""}Sleeves, stops and invalidation criteria were checked on the way in.`,
    });
  }

  /* ---------------- render ---------------- */

  if (!unlocked || !vault) {
    return (
      <>
        <BackgroundLayers />
        <LockScreen meta={meta} onUnlock={handleUnlock} onCreate={handleCreate} onWipe={handleWipe} />
        <ToastStack toasts={toasts} dismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
      </>
    );
  }

  const dueCount = positions.filter((p) => new Date(p.nextReview) <= new Date(todayISO())).length;

  return (
    <>
      <BackgroundLayers />
      <div className="relative z-10 min-h-screen flex flex-col">
        <TickerTape positions={vault.positions} />

        {/* mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 border-b border-line bg-pine-900/90 backdrop-blur px-4 pt-3 pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-moss-400">
              <LogoMark size={22} />
              <span className="font-display font-bold text-[14px] tracking-tight text-fog-100">THE RULEBOOK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setGutOpen(true)} className="p-2 rounded-md text-flare-400 hover:bg-pine-800 transition-colors" aria-label="Gut-check">
                <IconPulse size={17} />
              </button>
              <button onClick={() => setSecOpen(true)} className="p-2 rounded-md text-fog-500 hover:text-moss-300 hover:bg-pine-800 transition-colors" aria-label="Security">
                <IconShield size={17} />
              </button>
              <button onClick={() => handleLock()} className="p-2 rounded-md text-fog-500 hover:text-ember-300 hover:bg-pine-800 transition-colors" aria-label="Lock">
                <IconLock size={17} />
              </button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {(
              [
                { id: "desk", label: "Desk" },
                { id: "log", label: `Log${dueCount ? ` · ${dueCount} due` : ""}` },
                { id: "rules", label: "Rules" },
                { id: "closed", label: `Closed${closed.length ? ` · ${closed.length}` : ""}` },
              ] as { id: View; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-md text-[13px] font-medium font-mono tracking-wide transition-colors ${
                  view === t.id ? "bg-pine-700 text-fog-100" : "text-fog-500 hover:text-fog-100"
                }`}
              >
                {t.label}
              </button>
            ))}
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="ml-auto shrink-0 bg-pine-800 border border-line rounded-md px-2 py-1.5 text-[12.5px] text-fog-300 outline-none"
            >
              <option value="all">All accounts</option>
              {vault.accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-1 w-full max-w-[1440px] mx-auto">
          <Sidebar
            profileName={ownerName}
            view={view}
            setView={setView}
            accounts={vault.accounts}
            selectedId={selectedId}
            selectAccount={setSelectedId}
            addAccount={addAccount}
            renameAccount={renameAccount}
            deleteAccount={deleteAccount}
            positions={vault.positions}
            closedCount={vault.closed.length}
            onOpenSecurity={() => setSecOpen(true)}
            onExport={() => {
              exportVault(vault);
              toast({ tone: "moss", title: "Backup exported.", detail: "Plain-JSON file with the whole book — keep it somewhere safe." });
            }}
            onLock={() => handleLock()}
          />

          <main className="flex-1 min-w-0 px-4 sm:px-7 py-7 sm:py-9">
            <div key={`${view}-${selectedId}`}>
              {view === "desk" && (
                <Dashboard
                  profileName={ownerName}
                  accountName={accountName}
                  positions={positions}
                  closed={closed}
                  onReview={(p) => setReviewFor(p)}
                  onGutCheck={() => setGutOpen(true)}
                  onLoadSample={loadSample}
                  gotoLog={() => setView("log")}
                  gotoRules={() => setView("rules")}
                />
              )}
              {view === "log" && (
                <PositionsTable
                  positions={positions}
                  accountName={accountName}
                  onNew={() => {
                    if (vault.accounts.length === 0) {
                      toast({ tone: "flare", title: "Add an account first.", detail: "Use the + next to Accounts in the sidebar." });
                      return;
                    }
                    setEditing(null);
                    setFormOpen(true);
                  }}
                  onEdit={(p) => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                  onReview={(p) => setReviewFor(p)}
                  onExit={(p) => setExitFor({ p })}
                  onUpdatePrice={updatePrice}
                  onLoadSample={loadSample}
                  onImportCsv={() => setImportOpen(true)}
                  onRefreshAll={() => void refreshAll()}
                  onRefreshOne={(p) => void refreshOne(p)}
                  busyPrices={busyPrices}
                  refreshProgress={refreshProg}
                />
              )}
              {view === "rules" && <Rulebook profileName={ownerName} />}
              {view === "closed" && <ClosedLedger closed={closed} accountName={accountName} />}
            </div>
          </main>
        </div>
      </div>

      {/* modals */}
      {formOpen && (
        <PositionForm
          initial={editing}
          accounts={vault.accounts}
          defaultAccountId={selectedId}
          onSave={savePosition}
          onDelete={editing ? deletePosition : undefined}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
        />
      )}
      {reviewFor && (
        <ReviewModal
          position={reviewFor}
          onUpdatePrice={updatePrice}
          onAdvance={advanceReview}
          onExit={(p, reason) => {
            setReviewFor(null);
            setExitFor({ p, reason });
          }}
          onClose={() => setReviewFor(null)}
        />
      )}
      {exitFor && (
        <ExitModal
          position={exitFor.p}
          presetReason={exitFor.reason}
          onConfirm={confirmExit}
          onClose={() => setExitFor(null)}
        />
      )}
      {gutOpen && <GutCheck onClose={() => setGutOpen(false)} />}
      {importOpen && (
        <ImportCsvModal
          accounts={vault.accounts}
          positions={vault.positions}
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}
      {secOpen && (
        <SecurityModal
          ownerName={ownerName}
          onChangePassword={handleChangePassword}
          onErase={handleWipe}
          onClose={() => setSecOpen(false)}
        />
      )}

      <ToastStack toasts={toasts} dismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </>
  );
}

function BackgroundLayers() {
  return (
    <div className="bg-desk" aria-hidden>
      <div className="glow glow-a" />
      <div className="glow glow-b" />
    </div>
  );
}
