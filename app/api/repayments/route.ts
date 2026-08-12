import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addRepayment, listRepayments, deleteRepayment } from "@/lib/repayments";
import { listDebts, debtSummary } from "@/lib/debt";

export const runtime = "nodejs";

// GET /api/repayments?debt_id=... — list the user's repayments (optionally per debt)
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const debtId = new URL(req.url).searchParams.get("debt_id") || undefined;
  const repayments = await listRepayments(session.userId, debtId);
  return NextResponse.json({ repayments });
}

// POST /api/repayments  { debt_id, amount, date?, note? }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { debt_id, amount, date, note } = await req.json();
    const rep = await addRepayment(session.userId, { debt_id, amount, date, note });
    if (!rep) return NextResponse.json({ error: "debt_id and valid amount required" }, { status: 400 });
    // keep debt summary fresh
    const debts = await listDebts(session.userId);
    return NextResponse.json({ ok: true, repayment: rep, summary: debtSummary(debts) }, { status: 201 });
  } catch { return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); }
}

// DELETE /api/repayments?id=...
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteRepayment(session.userId, id);
  return NextResponse.json({ ok: true });
}
