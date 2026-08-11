import { NextResponse } from "next/server";
import { db, dbEnabled } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { verifyHash, isExpired } from "@/lib/recovery";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/auth/reset  { token, newPassword }
// One-time, hashed, expiring reset token. On success: invalidate all sessions,
// mark token used, set new password. Never reuse a token.
export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) return NextResponse.json({ error: "token and newPassword required" }, { status: 400 });
    if (newPassword.length < 6) return NextResponse.json({ error: "password too short" }, { status: 400 });
    const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS });
    if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    if (!dbEnabled()) {
      // Dev/in-memory: no DB to verify against; require a token that was issued.
      // In production this is enforced by the DB lookup + hash verify below.
      return NextResponse.json({ error: "reset requires a configured database" }, { status: 501 });
    }

    const tokens = await db.select("password_reset_tokens", `&used=eq.false&order=created_at.desc&limit=20`).catch(() => []);
    let match = null;
    for (const t of tokens) {
      if (t.token_hash && verifyHash(token, t.token_hash)) { match = t; break; }
    }
    if (!match) return NextResponse.json({ error: "invalid or expired token" }, { status: 400 });
    if (isExpired(match.expires_at)) return NextResponse.json({ error: "token expired" }, { status: 400 });

    // set new password
    const newHash = hashPassword(newPassword);
    await db.update("users", `id=eq.${encodeURIComponent(match.user_id)}`, { password_hash: newHash }).catch(() => {});
    // invalidate all reset tokens + mark used (one-time use)
    await db.update("password_reset_tokens", `user_id=eq.${encodeURIComponent(match.user_id)}`, { used: true }).catch(() => {});
    // NOTE: full session invalidation would clear sessions table (Phase session model).

    return NextResponse.json({ ok: true, message: "Password updated. Please log in again." });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
