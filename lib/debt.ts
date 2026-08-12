// MAN — DHAR/DHON LEDGER (who owes money, lent/borrowed).
// Tracks money lent out (dhar deya) and money borrowed (dhar neya),
// each with amount, date (kobe), reason (keno), and status.

import { db, dbEnabled } from "./db";

export type DebtDirection = "lent" | "borrowed";
export type DebtStatus = "open" | "returned" | "settled";

export interface DebtRecord {
  id: string;
  user_id: string;
  direction: DebtDirection;   // 'lent' = I gave money; 'borrowed' = I took money
  person: string;             // who
  amount: number;             // in BDT
  date?: string;              // when (kobe)
  reason?: string;            // why (keno)
  status: DebtStatus;
  created_at: string;
}

const store = new Map<string, DebtRecord[]>();
function iso(): string { return new Date().toISOString(); }
function nid(): string { return "debt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }

export async function addDebt(userId: string, input: {
  direction: DebtDirection; person: string; amount: number; date?: string; reason?: string;
}): Promise<DebtRecord | null> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!isFinite(amount) || amount <= 0) return null;
  if (!input.person || !input.person.trim()) return null;
  const rec: DebtRecord = {
    id: nid(), user_id: userId, direction: input.direction,
    person: input.person.trim(), amount,
    date: input.date || "", reason: input.reason || "", status: "open", created_at: iso(),
  };
  if (dbEnabled()) {
    try {
      // id column is uuid — let the DB auto-generate it (omit id).
      const rows = await db.insert("debts", {
        user_id: userId, direction: rec.direction, person: rec.person,
        amount: rec.amount, date: rec.date, reason: rec.reason, status: rec.status,
      });
      if (rows && rows[0]) return { ...rec, ...rows[0] };
    } catch { /* fall through */ }
  }
  const list = store.get(userId) || [];
  list.push(rec); store.set(userId, list);
  return rec;
}

export async function listDebts(userId: string): Promise<DebtRecord[]> {
  if (dbEnabled()) {
    const rows = await db.select("debts", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=200`).catch(() => []);
    return rows as DebtRecord[];
  }
  return (store.get(userId) || []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function setDebtStatus(userId: string, id: string, status: DebtStatus): Promise<void> {
  if (!dbEnabled()) return;
  await db.update("debts", `id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}`, { status }).catch(() => {});
}

export async function deleteDebt(userId: string, id: string): Promise<void> {
  if (dbEnabled()) {
    await db.del("debts", `id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}`).catch(() => {});
    return;
  }
  const list = store.get(userId) || [];
  store.set(userId, list.filter((d) => d.id !== id));
}

// Summary: total lent (open), total borrowed (open).
export function debtSummary(debts: DebtRecord[]): {
  totalLent: number; totalBorrowed: number; net: number;
} {
  let lent = 0, borrowed = 0;
  for (const d of debts) {
    if (d.status !== "open") continue;
    if (d.direction === "lent") lent += d.amount;
    else borrowed += d.amount;
  }
  lent = Math.round(lent * 100) / 100;
  borrowed = Math.round(borrowed * 100) / 100;
  return { totalLent: lent, totalBorrowed: borrowed, net: Math.round((lent - borrowed) * 100) / 100 };
}
