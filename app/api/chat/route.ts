import { NextResponse } from "next/server";
import { respond } from "@/lib/agent";
import { listPendingActions } from "@/lib/approval";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body?.message as string | undefined;
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    const turn = await respond(message);
    // include pending actions count so the UI can show approval prompts
    const pending = await listPendingActions();
    return NextResponse.json({ ...turn, pendingCount: pending.length, pending });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
