// MAN — REPAYMENTS (first-class, Phase 7 MONEY).
// Tracks partial/full repayment of a debt (lent or borrowed). Additive table
// `repayments`. "Remaining" is derived: original debt.amount minus sum of
// repayments for that debt — no migration to debts needed.

import { db, dbEnabled } from "./db";

export interface Repayment {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  date?: string;
  note?: string;
  created_at: string;
}

function iso(): string { return new Date().toISOString(); }

export async function addRepayment(userId: string, input: {
  debt_id: string; amount: number; date?: string; note?: string;
}): Promise<Repayment | null> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!isFinite(amount) || amount <= 0) return null;
  if (!input.debt_id) return null;
  const row = {
    user_id: userId,
    debt_id: input.debt_id,
    amount,
    date: input.date || "",
    note: input.note || "",
    created_at: iso(),
  };
  if (dbEnabled()) {
    const r = await db.insert("repayments", row).catch(() => null);
    if (r && r[0]) return r[0] as Repayment;
  }
  return { id: "rep_" + Date.now(), ...row } as Repayment;
}

export async function listRepayments(userId: string, debtId?: string): Promise<Repayment[]> {
  if (dbEnabled()) {
    const f = debtId
      ? `&user_id=eq.${encodeURIComponent(userId)}&debt_id=eq.${encodeURIComponent(debtId)}&order=created_at.desc`
      : `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=200`;
    return (await db.select("repayments", f).catch(() => [])) as Repayment[];
  }
  return [];
}

// Remaining amount owed on a debt = debt.amount - sum(repayments for it).
export function remainingOf(debtAmount: number, repayments: Repayment[]): number {
  const paid = repayments.reduce((s, r) => s + Number(r.amount), 0);
  return Math.max(0, Math.round((Number(debtAmount) - paid) * 100) / 100);
}

export async function deleteRepayment(userId: string, id: string): Promise<void> {
  if (!dbEnabled()) return;
  await db.del("repayments", `id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}`).catch(() => {});
}
