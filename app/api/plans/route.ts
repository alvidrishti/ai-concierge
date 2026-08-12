import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listPlans, addPlan, togglePlan, deletePlan } from "@/lib/daily_life";

export const runtime = "nodejs";

// GET /api/plans?date=YYYY-MM-DD — list the user's daily plan
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date") || undefined;
  const plans = await listPlans(session.userId, date);
  return NextResponse.json({ plans });
}

// POST /api/plans  { date, time?, title, category?, note? }
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const { date, time, title, category, note } = await req.json();
    if (!date || !title) return NextResponse.json({ error: "date and title required" }, { status: 400 });
    const plan = await addPlan(session.userId, { date, time, title, category, note });
    return NextResponse.json({ ok: true, plan }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// PATCH /api/plans?action=toggle&id=...&done=true
// DELETE /api/plans?id=...
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const body = await req.json();
  if (body.action === "toggle" && body.id) {
    await togglePlan(body.id, session.userId, !!body.done);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deletePlan(id, session.userId);
  return NextResponse.json({ ok: true });
}
