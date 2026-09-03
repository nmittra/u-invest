import type { Account, Cadence, ClosedPosition, Position, Vault } from "./types";

const VAULT_KEY_V2 = "rulebook:vault:v2"; // encrypted (AES-256-GCM)
const VAULT_KEY_V1 = "rulebook:vault:v1"; // legacy plaintext — migrated on unlock

/** Minutes of inactivity before the book locks itself. */
export const IDLE_LOCK_MINUTES = 10;

/* ---------------- ids ---------------- */

export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------------- byte / base64 helpers ---------------- */

const te = new TextEncoder();
const td = new TextDecoder();

function b64e(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

function b64d(str: string): Uint8Array<ArrayBuffer> {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

function enc(s: string): Uint8Array<ArrayBuffer> {
  return te.encode(s) as Uint8Array<ArrayBuffer>;
}

const HAS_CRYPTO = typeof crypto !== "undefined" && !!crypto.subtle;

/* ---------------- key derivation (PBKDF2 → AES-256-GCM) ---------------- */

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 150_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Memory-only key cache so routine saves don't re-run 150k PBKDF2 rounds. */
let keyCache: { pw: string; salt: string; key: CryptoKey } | null = null;

async function getKey(password: string, saltB64: string): Promise<CryptoKey> {
  if (keyCache && keyCache.pw === password && keyCache.salt === saltB64) return keyCache.key;
  const key = await deriveKey(password, b64d(saltB64));
  keyCache = { pw: password, salt: saltB64, key };
  return key;
}

/** Drop the derived key from memory (called on lock / re-key / wipe). */
export function forgetKey(): void {
  keyCache = null;
}

/* ---------------- legacy hashing (v1 compat + non-secure-context fallback) ---------------- */

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
    if (HAS_CRYPTO) {
      const digest = await crypto.subtle.digest("SHA-256", te.encode(input));
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
    return b64e(randBytes(16));
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/* ---------------- stored shapes ---------------- */

interface StoredV2 {
  v: 2;
  /** owner's display name — the only unencrypted field, used for the greeting */
  name: string;
  salt: string;
  iv: string;
  data: string;
}

interface StoredV1 {
  profile: { name: string; salt: string; hash: string };
  accounts?: Account[];
  positions?: Position[];
  closed?: ClosedPosition[];
}

function readV2(): StoredV2 | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY_V2);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredV2>;
    return p && p.v === 2 && p.data ? (p as StoredV2) : null;
  } catch {
    return null;
  }
}

function readV1(): StoredV1 | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY_V1);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredV1>;
    return p && p.profile ? (p as StoredV1) : null;
  } catch {
    return null;
  }
}

export function vaultExists(): boolean {
  return !!(readV2() || readV1());
}

/** Public (unencrypted) metadata for the lock screen. Counts are hidden once encrypted. */
export function getVaultMeta(): { name: string; counts: { open: number; accounts: number } | null } | null {
  const v2 = readV2();
  if (v2) return { name: v2.name, counts: null };
  const v1 = readV1();
  if (v1) {
    return {
      name: v1.profile.name,
      counts: { open: v1.positions?.length ?? 0, accounts: v1.accounts?.length ?? 0 },
    };
  }
  return null;
}

function normalize(parsed: Partial<Vault>): Vault {
  return {
    accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
    positions: Array.isArray(parsed.positions) ? parsed.positions : [],
    closed: Array.isArray(parsed.closed) ? parsed.closed : [],
  };
}

/** Encrypt the vault with a fresh IV (and optionally a given salt). */
async function seal(vault: Vault, name: string, password: string, saltB64?: string): Promise<StoredV2> {
  const salt = saltB64 ? b64d(saltB64) : randBytes(16);
  const key = await getKey(password, b64e(salt));
  const iv = randBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc(JSON.stringify(vault)));
  return { v: 2, name, salt: b64e(salt), iv: b64e(iv), data: b64e(new Uint8Array(ct)) };
}

/* ---------------- vault lifecycle ---------------- */

export async function createVault(name: string, password: string, seed: Vault): Promise<Vault> {
  if (HAS_CRYPTO) {
    const stored = await seal(seed, name, password);
    localStorage.setItem(VAULT_KEY_V2, JSON.stringify(stored));
  } else {
    const salt = makeSalt();
    const hash = await hashPassword(salt, password);
    localStorage.setItem(
      VAULT_KEY_V1,
      JSON.stringify({ profile: { name, salt, hash, createdAt: Date.now() }, ...seed }),
    );
  }
  return seed;
}

/** Returns the decrypted vault, or null when the password doesn't open the seal. */
export async function unlockVault(password: string): Promise<Vault | null> {
  const v2 = readV2();
  if (v2) {
    if (!HAS_CRYPTO) return null; // encrypted vault in a non-secure context
    try {
      const key = await getKey(password, v2.salt);
      const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(v2.iv) }, key, b64d(v2.data));
      return normalize(JSON.parse(td.decode(pt)) as Partial<Vault>);
    } catch {
      return null; // wrong password — the seal held
    }
  }
  const v1 = readV1();
  if (v1) {
    const h = await hashPassword(v1.profile.salt, password);
    if (h !== v1.profile.hash) return null;
    const vault = normalize(v1);
    // Migrate legacy plaintext storage into the encrypted format immediately.
    if (HAS_CRYPTO) {
      try {
        const stored = await seal(vault, v1.profile.name, password);
        localStorage.setItem(VAULT_KEY_V2, JSON.stringify(stored));
        localStorage.removeItem(VAULT_KEY_V1);
      } catch {
        /* keep the legacy copy */
      }
    }
    return vault;
  }
  return null;
}

export async function persistVault(vault: Vault, name: string, password: string): Promise<void> {
  try {
    if (HAS_CRYPTO) {
      const prev = readV2();
      const stored = await seal(vault, name, password, prev?.salt);
      localStorage.setItem(VAULT_KEY_V2, JSON.stringify(stored));
    } else {
      const salt = makeSalt();
      const hash = await hashPassword(salt, password);
      localStorage.setItem(
        VAULT_KEY_V1,
        JSON.stringify({ profile: { name, salt, hash, createdAt: Date.now() }, ...vault }),
      );
    }
  } catch {
    /* storage full or unavailable */
  }
}

/** Re-seal the whole book under a new password (fresh salt + key). */
export async function rekeyVault(vault: Vault, name: string, newPassword: string): Promise<void> {
  forgetKey();
  if (HAS_CRYPTO) {
    const stored = await seal(vault, name, newPassword);
    localStorage.setItem(VAULT_KEY_V2, JSON.stringify(stored));
    localStorage.removeItem(VAULT_KEY_V1);
  } else {
    const salt = makeSalt();
    const hash = await hashPassword(salt, newPassword);
    localStorage.setItem(
      VAULT_KEY_V1,
      JSON.stringify({ profile: { name, salt, hash, createdAt: Date.now() }, ...vault }),
    );
  }
}

export function wipeVault(): void {
  try {
    localStorage.removeItem(VAULT_KEY_V2);
    localStorage.removeItem(VAULT_KEY_V1);
  } catch {
    /* noop */
  }
  forgetKey();
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

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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

export function freshAccount(name: string, value: number | null, wrapper?: string): Account {
  return { id: uid(), name, wrapper, value, createdAt: Date.now() };
}
