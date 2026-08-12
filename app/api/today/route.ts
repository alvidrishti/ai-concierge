import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listFinance, financeSummary } from "@/lib/finance";
import { listDebts, debtSummary } from "@/lib/debt";
import { listPlans } from "@/lib/daily_life";
import { memory } from "@/lib/memory";
import { listNotes } from "@/lib/notes";

export const runtime = "nodejs";

// GET /api/today — the TODAY aggregate (single round trip for the home screen).
// Everything is the authenticated user's own data. `insight` is data-grounded;
// it is null when there is not enough data (never fabricated).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const month = date.slice(0, 7);

  const [fin, debts, plans, reminders, notes] = await Promise.all([
    listFinance(session.userId),
    listDebts(session.userId),
    listPlans(session.userId, date),
    memory.listReminders(session.userId),
    listNotes(session.userId),
  ]);

  const sum = financeSummary(fin);
  const todayIncome = fin.filter((r: any) => r.type === "income" && (r.created_at || "").startsWith(date))
    .reduce((s: number, r: any) => s + Number(r.amount), 0);
  const todayExpense = fin.filter((r: any) => r.type === "expense" && (r.created_at || "").startsWith(date))
    .reduce((s: number, r: any) => s + Number(r.amount), 0);
  const mIncome = fin.filter((r: any) => r.type === "income" && (r.created_at || "").startsWith(month))
    .reduce((s: number, r: any) => s + Number(r.amount), 0);
  const mExpense = fin.filter((r: any) => r.type === "expense" && (r.created_at || "").startsWith(month))
    .reduce((s: number, r: any) => s + Number(r.amount), 0);
  const savings = Math.round((mIncome - mExpense) * 100) / 100;
  const ds = debtSummary(debts);

  const h = now.getHours();
  const bn = h < 5 ? "শুভ রাত্রি" : h < 12 ? "শুভ সকাল" : h < 16 ? "শুভ দুপুর" : h < 19 ? "শুভ সন্ধ্যা" : "শুভ রাত্রি";

  // Data-grounded insight; null when there's no finance data to reason about.
  let insight: string | null = null;
  if (mIncome > 0 || mExpense > 0) {
    if (mExpense > mIncome && mIncome > 0) insight = `এই মাসে আপনার খরচ (৳${mExpense.toLocaleString("en-IN")}) ইনকামের (৳${mIncome.toLocaleString("en-IN")}) চেয়ে বেশি — সেভিংস নেতিবাচক। একটু বাজেট মেনে চলুন।`;
    else if (savings > 0) insight = `এই মাসে আপনি ৳${savings.toLocaleString("en-IN")} সেভ করতে পেরেছেন। ভালো কাজ!`;
    else insight = "এই মাসে এখনো কোনো ফিন্যান্স রেকর্ড নেই। MONEY ট্যাবে ইনকাম/খরচ যোগ করলে MAN ইনসাইট দেখাতে পারবে।";
  }

  return NextResponse.json({
    ok: true,
    date,
    greeting: { bn, name: session.name },
    tasks: plans,
    reminders,
    today: { income: todayIncome, expense: todayExpense },
    balance: sum.balance,
    savings,
    debt: { ...ds, outstanding: debts.filter((d: any) => d.status === "open") },
    notes,
    insight,
  });
}
