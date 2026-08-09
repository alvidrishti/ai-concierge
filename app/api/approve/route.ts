import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPendingAction, resolvePendingAction } from "@/lib/approval";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// Approve / reject a pending action — scoped to the authenticated user.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

    const { id, approved } = await req.json();
    const action = await getPendingAction(String(id || ""), session.userId);
    if (!action) {
      return NextResponse.json({ error: "action not found" }, { status: 404 });
    }
    await resolvePendingAction(action.id, !!approved, session.userId);

    if (approved && action.intent === "create_reminder") {
      const title = action.summary.match(/"([^"]+)"/)?.[1] || "reminder";
      const when = action.summary.match(/on ([^\.]+)\.?$/)?.[1] || "soon";
      await memory.addReminder(session.userId, title, when);
    }
    return NextResponse.json({ ok: true, state: action.state, detail: action.detail });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
