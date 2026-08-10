import { NextResponse } from "next/server";
import { respond } from "@/lib/agent";
import { getSession } from "@/lib/session";
import { checkLimit, consume, logUsage } from "@/lib/usage";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ---- auth (server-side) ----
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    }
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const threadId = typeof body?.threadId === "string" ? body.threadId : undefined;
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    if (message.length > 4000) {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }

    // ---- rate limiting ----
    const limit = checkLimit(session.userId, "text");
    if (!limit.allowed) {
      return NextResponse.json({
        error: `Daily message limit reached (${limit.limit}). Please try again tomorrow.`,
      }, { status: 429 });
    }
    consume(session.userId, "text");

    // Ensure a thread exists (use provided one if valid, else the user's most
    // recent thread or a new one). Never trust a cross-user threadId: agent
    // queries are scoped by userId internally.
    let activeThread = threadId;
    if (activeThread) {
      const threads = await memory.listThreads(session.userId);
      const owns = threads.some((t) => t.id === activeThread);
      if (!owns) activeThread = undefined; // not yours -> fall back
    }

    const turn = await respond(message, session.userId, session.role === "admin", activeThread);
    await logUsage(session.userId, "text", turn.provider, undefined,
      turn.provider === "none" ? "no provider" : undefined);

    // Return the threadId so the UI can group messages.
    return NextResponse.json({ ...turn, threadId: activeThread || "new" });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
