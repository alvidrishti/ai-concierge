import { NextResponse } from "next/server";
import { getSession, cookieName } from "@/lib/session";
import { revokeSession, revokeAllSessions } from "@/lib/auth";
import { listSessions } from "@/lib/account";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// GET /api/auth/sessions — list current sessions for the logged-in user.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const rows = await listSessions(session.userId);
  return NextResponse.json({ sessions: rows, current: session.jti });
}

// POST /api/auth/sessions  { action, jti? }
//   action = "revoke"  -> revoke one session (jti required)
//   action = "revoke_all" -> logout all sessions
//   action = "logout_current" -> revoke the current session
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const { action, jti } = await req.json();

  if (action === "logout_current") {
    await revokeSession(session.jti);
    const store = await cookies();
    store.delete(cookieName());
    return NextResponse.json({ ok: true, revoked: session.jti });
  }
  if (action === "revoke") {
    if (!jti) return NextResponse.json({ error: "jti required" }, { status: 400 });
    // Prevent a user from revoking another user's session: verify ownership.
    const rows = await listSessions(session.userId);
    const owns = rows.some((r: any) => r.jti === jti);
    if (!owns) return NextResponse.json({ error: "session not found" }, { status: 404 });
    await revokeSession(jti);
    return NextResponse.json({ ok: true, revoked: jti });
  }
  if (action === "revoke_all") {
    await revokeAllSessions(session.userId);
    const store = await cookies();
    store.delete(cookieName());
    return NextResponse.json({ ok: true, revoked: "all" });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
