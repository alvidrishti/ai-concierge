import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// GET /api/export?threadId=... -> download current conversation as text/markdown
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });

  const threadId = new URL(req.url).searchParams.get("threadId") || undefined;
  const messages = await memory.getConversation(session.userId, threadId, 500);

  const lines = [
    "# MAN — Conversation Export",
    `User: ${session.name} (${session.userId})`,
    `Exported: ${new Date().toISOString()}`,
    "",
  ];
  for (const m of messages) {
    lines.push(`## ${m.role === "user" ? "You" : "MAN"}\n${m.content}\n`);
  }

  const text = lines.join("\n");
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="man-chat-${Date.now()}.md"`,
    },
  });
}
