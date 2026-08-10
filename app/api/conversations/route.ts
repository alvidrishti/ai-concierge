import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// Conversation history API (Phase 1). Everything scoped by the authenticated
// session's userId — never a client-supplied userId.
//
//  GET    /api/conversations            -> list this user's threads
//  POST   /api/conversations            -> create a new thread { title? }
//  POST   /api/conversations/rename     -> { threadId, title }
//  POST   /api/conversations/delete     -> { threadId }
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const threads = await memory.listThreads(session.userId);
  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { title } = await req.json().catch(() => ({}));
  const thread = await memory.createThread(session.userId, title || "New chat");
  return NextResponse.json({ thread }, { status: 201 });
}
