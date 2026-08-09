import { NextResponse } from "next/server";
import { respond } from "@/lib/agent";
import { getSession } from "@/lib/session";
import { checkLimit, consume, logUsage } from "@/lib/usage";

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
    if (!message) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    // basic input length guard
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

    const turn = await respond(message, session.userId, session.role === "admin");
    // record usage (provider + error)
    await logUsage(session.userId, "text", turn.provider, undefined,
      turn.provider === "none" ? "no provider" : undefined);

    return NextResponse.json(turn);
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
