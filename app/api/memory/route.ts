import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { memory } from "@/lib/memory";

export const runtime = "nodejs";

// Memory control — users can see what MAN remembers and delete it.
// GET  /api/memory          -> list this user's memory
// DELETE /api/memory?key=X  -> delete one memory   (key optional = clear all)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const m = await memory.getMemory(session.userId);
  return NextResponse.json({ memory: m });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const key = new URL(req.url).searchParams.get("key") || undefined;
  await memory.deleteMemory(session.userId, key);
  return NextResponse.json({ ok: true });
}
