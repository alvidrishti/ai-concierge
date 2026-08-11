// MAN — FREELANCER / SME FINANCE COMPANION (BD 2027, option A)
//
// Simple income/expense tracking for Bangladeshi freelancers & small businesses.
// Real, working, per-user isolated. No external credentials needed.
// Supports BDT (taka). Categories include freelancer/SME + Bangladesh terms.

import { db, dbEnabled } from "./db";

export type FinanceType = "income" | "expense";
export type FinanceCategory =
  | "freelance_income" | "salary" | "grant" | "other_income"
  | "tools" | "internet" | "electricity" | "transport" | "food" | "rent"
  | "marketing" | "education" | "medical" | "family" | "other_expense";

export interface FinanceRecord {
  id: string;
  user_id: string;
  type: FinanceType;
  category: FinanceCategory;
  amount: number;          // in BDT
  note?: string;
  created_at: string;
}

const CATEGORIES: Record<FinanceType, FinanceCategory[]> = {
  income: ["freelance_income", "salary", "grant", "other_income"],
  expense: ["tools", "internet", "electricity", "transport", "food", "rent", "marketing", "education", "medical", "family", "other_expense"],
};

const store = new Map<string, FinanceRecord[]>();

function iso(): string { return new Date().toISOString(); }
function nid(): string { return "fin_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }

export function financeCategories(type: FinanceType): FinanceCategory[] {
  return CATEGORIES[type];
}

// Add an income/expense record.
export async function addFinance(userId: string, input: {
  type: FinanceType; category: FinanceCategory; amount: number; note?: string;
}): Promise<FinanceRecord | null> {
  const amount = Math.round(input.amount * 100) / 100;
  if (!isFinite(amount) || amount <= 0) return null;
  if (!CATEGORIES[input.type]?.includes(input.category)) return null;
  const rec: FinanceRecord = {
    id: nid(), user_id: userId, type: input.type,
    category: input.category, amount, note: input.note || "", created_at: iso(),
  };
  if (dbEnabled()) {
    try {
      const rows = await db.insert("finances", {
        id: rec.id, user_id: userId, type: rec.type, category: rec.category,
        amount: rec.amount, note: rec.note, created_at: rec.created_at,
      });
      if (rows && rows[0]) return { ...rec, ...rows[0] };
    } catch { /* fall through to memory */ }
  }
  const list = store.get(userId) || [];
  list.push(rec);
  store.set(userId, list);
  return rec;
}

export async function listFinance(userId: string, limit = 200): Promise<FinanceRecord[]> {
  if (dbEnabled()) {
    const rows = await db.select("finances", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=${limit}`).catch(() => []);
    return rows as FinanceRecord[];
  }
  return (store.get(userId) || []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export async function deleteFinance(userId: string, id: string): Promise<void> {
  if (dbEnabled()) {
    await db.del("finances", `id=eq.${id}&user_id=eq.${encodeURIComponent(userId)}`).catch(() => {});
    return;
  }
  const list = store.get(userId) || [];
  store.set(userId, list.filter((r) => r.id !== id));
}

// Summary: totals + by category + balance.
export function financeSummary(records: FinanceRecord[]): {
  income: number; expense: number; balance: number;
  byCategory: Record<string, number>;
} {
  let income = 0, expense = 0;
  const byCategory: Record<string, number> = {};
  for (const r of records) {
    if (r.type === "income") income += r.amount;
    else expense += r.amount;
    byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;
  }
  return { income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100, balance: Math.round((income - expense) * 100) / 100, byCategory };
}
