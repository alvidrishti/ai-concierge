import { NextResponse } from "next/server";
import { getPendingAction, resolvePendingAction } from "@/lib/approval";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// Approve or reject a pending action (MAA Pillar 10 — Approval Gate).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, approved } = body || {};
    const action = await getPendingAction(String(id || ""));
    if (!action) {
      return NextResponse.json({ error: "action not found" }, { status: 404 });
    }
    await resolvePendingAction(action.id, !!approved);

    if (approved && action.intent === "create_reminder") {
      // persist the approved reminder to memory
      const title = action.detail.match(/"([^"]+)"/)?.[1] || "reminder";
      const when = action.detail.match(/on ([^\.]+)\./)?.[1] || "soon";
      await memory.addReminder(title, when);
    }
    return NextResponse.json({ ok: true, state: action.state, detail: action.detail });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
