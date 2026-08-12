import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listFinance, financeSummary } from "@/lib/finance";
import { listDebts, debtSummary } from "@/lib/debt";

export const runtime = "nodejs";

// Minimal pure-JS single-page PDF (no external binary). Generates a finance
// report the user can download/save. No secrets, no DB writes.
function buildPdf(text: string): Buffer {
  const esc = (s: string) => (s || "").replace(/[\\()]/g, "\\$&");
  let y = 60;
  const lines: string[] = [];
  const line = (s: string, size = 11, bold = false) => {
    lines.push(`BT /F${bold ? 2 : 1} ${size} Tf 50 ${y} Td (${esc(s)}) Tj ET`);
    y -= size + 4;
  };
  const rule = () => { lines.push(`0.6 w 50 ${y} m 545 ${y} l S`); y -= 8; };
  for (const t of text.split("\n")) {
    if (t === "---") { rule(); continue; }
    line(t, 11, /^[A-Z]|DEVELOPED|HOTELIAN/.test(t));
  }
  const content = lines.join("\n");
  const pdf =
`%PDF-1.4
1 0 obj <</Type/Catalog/Pages 2 0 R>>
endobj
2 0 obj <</Type/Pages/Kids[3 0 R]/Count 1>>
endobj
3 0 obj <</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R/F2 5 0 R>>>>/Contents 6 0 R>>
endobj
4 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica>>
endobj
5 0 obj <</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>
endobj
6 0 obj <</Length ${content.length}>> stream
${content}
endstream
endobj
trailer <</Root 1 0 R>>
%%EOF`;
  return Buffer.from(pdf, "latin1");
}

// GET /api/finance/pdf — finance report PDF
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const recs = await listFinance(session.userId, 500);
  const sum = financeSummary(recs);
  const debts = await listDebts(session.userId);
  const ds = debtSummary(debts);
  const month = new Date().toISOString().slice(0, 7);
  const mIncome = recs.filter((r: any) => r.type === "income" && (r.created_at || "").startsWith(month)).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const mExpense = recs.filter((r: any) => r.type === "expense" && (r.created_at || "").startsWith(month)).reduce((s: number, r: any) => s + Number(r.amount), 0);
  const savings = mIncome - mExpense;
  const pct = mIncome > 0 ? Math.round((savings / mIncome) * 100) : 0;
  const sentiment = mIncome === 0 ? "Neutral" : pct > 25 ? "Great" : pct > 0 ? "Moderate" : "Needs attention";
  const t = new Date().toLocaleDateString("en-GB");
  const money = (n: number) => "BDT " + n.toLocaleString("en-IN");

  const text = [
    "MAN — FINANCE REPORT",
    "DEVELOPED BY MD RAYHAN MIA",
    "---",
    `User: ${session.name}`,
    `Month: ${month}   Generated: ${t}`,
    "---",
    `Monthly Income: ${money(mIncome)}`,
    `Monthly Expense: ${money(mExpense)}`,
    `Savings: ${money(savings)} (${pct}%)`,
    `Sentiment: ${sentiment}`,
    "---",
    `Total Income (all): ${money(sum.income)}`,
    `Total Expense (all): ${money(sum.expense)}`,
    `Net Balance: ${money(sum.balance)}`,
    "---",
    "DEBTS:",
    `Lent out (open): ${money(ds.totalLent)}`,
    `Borrowed (open): ${money(ds.totalBorrowed)}`,
    "---",
    "DEVELOPED BY MD RAYHAN MIA",
  ];
  const pdf = buildPdf(text.join("\n"));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="man-finance-${month}.pdf"`,
    },
  });
}
