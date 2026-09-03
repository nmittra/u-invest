export type Sleeve = 1 | 2;

export type Cadence = "weekly" | "biweekly" | "monthly" | "quarterly";

export type ExitReason = "stopped" | "invalidated" | "discretionary";

export interface AddOnStep {
  id: string;
  /** negative drawdown from entry, e.g. -20 means add at -20% */
  triggerPct: number;
  /** additional size as % of account */
  sizePct: number;
}

export interface Position {
  id: string;
  accountId: string;
  ticker: string;
  sleeve: Sleeve;
  entryDate: string; // ISO yyyy-mm-dd
  entryPrice: number;
  currentPrice: number | null;
  /** size as % of account */
  sizePct: number;
  thesis: string;
  /** Sleeve 1 only — hard stop price */
  stopPrice?: number;
  /** set when the user knowingly deviates from the 7–8% band */
  stopOverride?: boolean;
  /** Sleeve 2 only — thesis-invalidation criteria */
  invalidation?: string;
  /** Sleeve 2 only — pre-written add-on plan */
  addon?: { steps: AddOnStep[]; hardCapPct: number } | null;
  cadence: Cadence;
  nextReview: string; // ISO yyyy-mm-dd
  createdAt: number;
  reviewCount: number;
  lastReview?: string;
}

export interface ClosedPosition {
  id: string;
  accountId: string;
  ticker: string;
  sleeve: Sleeve;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  sizePct: number;
  thesis: string;
  reason: ExitReason;
  pnlPct: number;
  note?: string;
  closedAt: number;
}

export interface Account {
  id: string;
  name: string;
  /** approximate account value in USD, optional */
  value: number | null;
  createdAt: number;
}

export interface Profile {
  name: string;
  salt: string;
  hash: string;
  createdAt: number;
}

export interface Vault {
  profile: Profile;
  accounts: Account[];
  positions: Position[];
  closed: ClosedPosition[];
}

export type View = "desk" | "log" | "rules" | "closed";

export interface Toast {
  id: string;
  tone: "moss" | "flare" | "ember" | "fog";
  title: string;
  detail?: string;
}
