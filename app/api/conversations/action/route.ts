import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// POST /api/conversations/action  { action: "rename"|"delete"|"messages", threadId, title? }
// All operations scoped to the authenticated user's own threads.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const { action, threadId, title } = await req.json().catch(() => ({}));
  if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

  switch (action) {
    case "rename": {
      if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
      await memory.renameThread(session.userId, threadId, title);
      return NextResponse.json({ ok: true });
    }
    case "delete": {
      await memory.deleteThread(session.userId, threadId);
      return NextResponse.json({ ok: true });
    }
    case "messages": {
      const msgs = await memory.getConversation(session.userId, threadId, 200);
      return NextResponse.json({ messages: msgs });
    }
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
