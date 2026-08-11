import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { memory } from "@/lib/memory";
import { checkLimit } from "@/lib/usage";

export const runtime = "nodejs";

// GET /api/me — session + that user's memory + conversation + pending actions
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ authenticated: false });
  const [userMemory, conversation, reminders, threads] = await Promise.all([
    memory.getMemory(session.userId),
    memory.getConversation(session.userId, undefined, 30),
    memory.listReminders(session.userId),
    memory.listThreads(session.userId),
  ]);
  const textLimit = checkLimit(session.userId, "text");
  return NextResponse.json({
    authenticated: true,
    user: { id: session.userId, name: session.name, role: session.role },
    memory: userMemory,
    conversation,
    reminders,
    stats: {
      messagesToday: textLimit.used,
      messageLimit: textLimit.limit,
      memoryCount: userMemory.length,
      threadsCount: threads.length,
    },
  });
}
