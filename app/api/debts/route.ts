import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addDebt, listDebts, setDebtStatus, deleteDebt, debtSummary } from "@/lib/debt";

export const runtime = "nodejs";

// GET /api/debts — the user's dhar/dhon ledger + summary
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const debts = await listDebts(session.userId);
  return NextResponse.json({ debts, summary: debtSummary(debts) });
}

// POST /api/debts  { direction, person, amount, date?, reason? }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { direction, person, amount, date, reason } = await req.json();
    if (direction !== "lent" && direction !== "borrowed") {
      return NextResponse.json({ error: "direction must be lent or borrowed" }, { status: 400 });
    }
    const debt = await addDebt(session.userId, { direction, person, amount, date, reason });
    if (!debt) return NextResponse.json({ error: "person and valid amount required" }, { status: 400 });
    const debts = await listDebts(session.userId);
    return NextResponse.json({ ok: true, debt, summary: debtSummary(debts) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PATCH /api/debts  { id, action: "returned"|"settled"|"open" }
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { id, action } = await req.json();
    if (!id || !["open", "returned", "settled"].includes(action)) {
      return NextResponse.json({ error: "invalid id or action" }, { status: 400 });
    }
    await setDebtStatus(session.userId, id, action);
    const debts = await listDebts(session.userId);
    return NextResponse.json({ ok: true, summary: debtSummary(debts) });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// DELETE /api/debts?id=...
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteDebt(session.userId, id);
  const debts = await listDebts(session.userId);
  return NextResponse.json({ ok: true, summary: debtSummary(debts) });
}
