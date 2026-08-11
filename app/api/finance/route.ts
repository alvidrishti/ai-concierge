import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addFinance, listFinance, deleteFinance, financeSummary, financeCategories } from "@/lib/finance";

export const runtime = "nodejs";

// GET /api/finance — list + summary for the authenticated user (isolated).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const records = await listFinance(session.userId);
  return NextResponse.json({ records, summary: financeSummary(records) });
}

// POST /api/finance  { type, category, amount, note? }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { type, category, amount, note } = await req.json();
    if (type !== "income" && type !== "expense") {
      return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
    }
    if (!financeCategories(type).includes(category)) {
      return NextResponse.json({ error: "invalid category for this type" }, { status: 400 });
    }
    const rec = await addFinance(session.userId, { type, category, amount, note });
    if (!rec) return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    const records = await listFinance(session.userId);
    return NextResponse.json({ ok: true, record: rec, summary: financeSummary(records) }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// DELETE /api/finance?id=...
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteFinance(session.userId, id);
  const records = await listFinance(session.userId);
  return NextResponse.json({ ok: true, summary: financeSummary(records) });
}
