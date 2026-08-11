import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db, dbEnabled } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/attachments?threadId=...  — list this user's attachments (owner-scoped)
// DELETE /api/attachments?id=...      — delete one attachment, owner-only
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const threadId = new URL(req.url).searchParams.get("threadId") || undefined;
  if (!dbEnabled()) return NextResponse.json({ attachments: [] });
  const f = threadId ? `&thread_id=eq.${threadId}` : "";
  const rows = await db.select("attachments", `&user_id=eq.${encodeURIComponent(session.userId)}${f}`).catch(() => []);
  // Never return storage keys or binary; return safe metadata only.
  const safe = rows.map((r: any) => ({ id: r.id, filename: r.filename, mime_type: r.mime_type, size_bytes: r.size_bytes, content_type: r.content_type, created_at: r.created_at }));
  return NextResponse.json({ attachments: safe });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!dbEnabled()) return NextResponse.json({ ok: true });
  // Owner-scoped delete — a user can only delete their own attachment.
  await db.del("attachments", `id=eq.${id}&user_id=eq.${encodeURIComponent(session.userId)}`).catch(() => {});
  return NextResponse.json({ ok: true });
}
