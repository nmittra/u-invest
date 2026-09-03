import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExitReason, Position, Toast, Vault, View } from "./lib/types";
import {
  advanceByCadence,
  closeSession,
  exportVault,
  freshAccount,
  hasSession,
  loadVault,
  openSession,
  samplePosition,
  saveVault,
  todayISO,
  uid,
  wipeVault,
} from "./lib/store";
import { fmtDate } from "./lib/store";
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
import { ToastStack } from "./components/ui";
import { IconLock, IconPulse, LogoMark } from "./components/icons";

export default function App() {
  const [vault, setVault] = useState<Vault | null>(() => loadVault());
  const [unlocked, setUnlocked] = useState<boolean>(() => hasSession() && !!loadVault());
  const [view, setView] = useState<View>("desk");
  const [selectedId, setSelectedId] = useState<string>("all");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [reviewFor, setReviewFor] = useState<Position | null>(null);
  const [exitFor, setExitFor] = useState<{ p: Position; reason?: ExitReason } | null>(null);
  const [gutOpen, setGutOpen] = useState(false);

  /* persist */
  useEffect(() => {
    if (vault && unlocked) saveVault(vault);
  }, [vault, unlocked]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4600);
  }, []);

  /* ---------------- auth ---------------- */

  function handleCreate(v: Vault) {
    const withAccount: Vault = { ...v, accounts: [freshAccount("Main account", null)] };
    setVault(withAccount);
    saveVault(withAccount);
    openSession();
    setUnlocked(true);
    toast({ tone: "moss", title: `The book is open, ${v.profile.name}.`, detail: "A “Main account” was created — add more from the sidebar." });
  }

  function handleUnlock(v: Vault) {
    openSession();
    setVault(v);
    setUnlocked(true);
    toast({ tone: "moss", title: "Book unlocked.", detail: "Plan first. Prices second." });
  }

  function handleLock() {
    closeSession();
    setUnlocked(false);
    setView("desk");
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

  function addAccount(name: string, value: number | null) {
    const acc = freshAccount(name, value);
    mutate((v) => ({ ...v, accounts: [...v.accounts, acc] }));
    setSelectedId(acc.id);
    toast({ tone: "moss", title: `Account “${name}” added.`, detail: "Positions you log will file under it." });
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
    mutate((v) => {
      const exists = v.positions.some((x) => x.id === p.id);
      return { ...v, positions: exists ? v.positions.map((x) => (x.id === p.id ? p : x)) : [...v.positions, p] };
    });
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
    mutate((v) => ({ ...v, positions: v.positions.map((x) => (x.id === id ? { ...x, currentPrice: priceVal } : x)) }));
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

  /* ---------------- render ---------------- */

  if (!unlocked || !vault) {
    return (
      <>
        <BackgroundLayers />
        <LockScreen vault={vault} onUnlock={handleUnlock} onCreate={handleCreate} />
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
              <button onClick={handleLock} className="p-2 rounded-md text-fog-500 hover:text-ember-300 hover:bg-pine-800 transition-colors" aria-label="Lock">
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
            profileName={vault.profile.name}
            view={view}
            setView={setView}
            accounts={vault.accounts}
            selectedId={selectedId}
            selectAccount={setSelectedId}
            addAccount={addAccount}
            deleteAccount={deleteAccount}
            positions={vault.positions}
            closedCount={vault.closed.length}
            onExport={() => {
              exportVault(vault);
              toast({ tone: "moss", title: "Backup exported.", detail: "JSON file with the whole book — keep it somewhere safe." });
            }}
            onLock={handleLock}
          />

          <main className="flex-1 min-w-0 px-4 sm:px-7 py-7 sm:py-9">
            <div key={`${view}-${selectedId}`}>
              {view === "desk" && (
                <Dashboard
                  profileName={vault.profile.name}
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
                />
              )}
              {view === "rules" && <Rulebook profileName={vault.profile.name} />}
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
