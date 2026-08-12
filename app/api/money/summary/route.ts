import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listFinance, monthlySummary } from "@/lib/finance";
import { listDebts, debtSummary } from "@/lib/debt";
import { listRepayments } from "@/lib/repayments";

export const runtime = "nodejs";

// GET /api/money/summary?month=YYYY-MM — month summary + debt/repayment overview
// Savings = month income - month expense (derived from actual data, never fake).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const month = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const records = await listFinance(session.userId, 1000);
  const m = monthlySummary(records, month);
  const debts = await listDebts(session.userId);
  const repayments = await listRepayments(session.userId);
  return NextResponse.json({
    month,
    income: m.income,
    expense: m.expense,
    balance: m.harLabh,
    savings: m.harLabh,
    byCategory: (() => {
      const byCat: Record<string, number> = {};
      for (const r of records) {
        if (!(r.created_at || "").startsWith(month)) continue;
        byCat[r.category] = (byCat[r.category] || 0) + Number(r.amount) * (r.type === "expense" ? -1 : 1);
      }
      return byCat;
    })(),
    debt: debtSummary(debts),
    repaymentCount: repayments.length,
    repaymentTotal: repayments.reduce((s, r) => s + Number(r.amount), 0),
  });
}
