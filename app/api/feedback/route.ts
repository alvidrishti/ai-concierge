import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createFeedback, listUserFeedback, FEEDBACK_CATEGORIES } from "@/lib/feedback";

export const runtime = "nodejs";

// POST /api/feedback — submit feedback (auth required). Ownership is enforced
// server-side from the session; conversation/thread/message context is only
// attached when the user explicitly supplies it (privacy-first).
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    const body = await req.json();
    const { category, message, rating, conversation_id, thread_id, message_id, capability } = body;
    if (!category || !FEEDBACK_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "invalid category" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }
    const fb = await createFeedback(session.userId, {
      category, message: message.trim(), rating, conversation_id, thread_id, message_id, capability,
    });
    return NextResponse.json({ ok: true, feedback: fb }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// GET /api/feedback — list the authenticated user's own feedback (isolation).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const list = await listUserFeedback(session.userId);
  return NextResponse.json({ feedback: list });
}
