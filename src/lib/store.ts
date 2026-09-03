import type { Account, Cadence, Position, Profile, Vault } from "./types";

const VAULT_KEY = "rulebook:vault:v1";
const SESSION_KEY = "rulebook:session:v1";

/* ---------------- ids ---------------- */

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------------- password hashing ---------------- */

function fallbackHash(input: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export async function hashPassword(salt: string, password: string): Promise<string> {
  const input = `${salt}::${password}`;
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const data = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    /* insecure context — fall back */
  }
  return fallbackHash(input);
}

export function makeSalt(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/* ---------------- vault persistence ---------------- */

export function loadVault(): Vault | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Vault;
    if (!parsed || !parsed.profile) return null;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      closed: Array.isArray(parsed.closed) ? parsed.closed : [],
      profile: parsed.profile,
    };
  } catch {
    return null;
  }
}

export function saveVault(vault: Vault): void {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  } catch {
    /* storage full or unavailable */
  }
}

export function wipeVault(): void {
  try {
    localStorage.removeItem(VAULT_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function exportVault(vault: Vault): void {
  const blob = new Blob([JSON.stringify(vault, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rulebook-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/* ---------------- session ---------------- */

export function hasSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "open";
  } catch {
    return false;
  }
}

export function openSession(): void {
  try { sessionStorage.setItem(SESSION_KEY, "open"); } catch { /* noop */ }
}

export function closeSession(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
}

/* ---------------- dates ---------------- */

export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function advanceByCadence(fromISO: string, cadence: Cadence): string {
  switch (cadence) {
    case "weekly": return addDays(fromISO, 7);
    case "biweekly": return addDays(fromISO, 14);
    case "monthly": return addDays(fromISO, 30);
    case "quarterly": return addDays(fromISO, 91);
  }
}

export function daysUntil(iso: string): number {
  const target = new Date(`${iso}T12:00:00`).getTime();
  const now = new Date(`${todayISO()}T12:00:00`).getTime();
  return Math.round((target - now) / 86400000);
}

export function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

/* ---------------- sample data ---------------- */

export function samplePosition(accountId: string): Position {
  const entry = todayISO();
  return {
    id: uid(),
    accountId,
    ticker: "MRVL",
    sleeve: 2,
    entryDate: entry,
    entryPrice: 64.2,
    currentPrice: 66.75,
    sizePct: 8,
    thesis: "AI infra — custom networking & interconnect silicon riding hyperscaler buildout.",
    invalidation:
      "Hyperscaler capex guidance cut two quarters running, or loses key design wins to a named competitor.",
    addon: {
      steps: [
        { id: uid(), triggerPct: -20, sizePct: 3 },
        { id: uid(), triggerPct: -35, sizePct: 3 },
      ],
      hardCapPct: 14,
    },
    cadence: "monthly",
    nextReview: addDays(entry, 30),
    createdAt: Date.now(),
    reviewCount: 0,
  };
}

export function freshAccount(name: string, value: number | null): Account {
  return { id: uid(), name, value, createdAt: Date.now() };
}

export function blankProfile(name: string, salt: string, hash: string): Profile {
  return { name, salt, hash, createdAt: Date.now() };
}
