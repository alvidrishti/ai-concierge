import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, dbEnabled } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookieName } from "@/lib/session";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS, authLimitKey } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/auth/login  { name, email?, password, isAdmin? }
// REAL ACCOUNT LIFECYCLE (Phase 1):
//  - Only EXISTING accounts may log in (no auto-create on login — this prevents
//    someone registering a foreign email with a made-up password).
//  - Password must match.
//  - Account must be active/verified.
//  - Wrong password -> generic 401 (does NOT reveal whether the account exists).
//  - Unverified (correct password) -> 403, only reached after correct password.
// Rate-limited (IP + account aware).
export async function POST(req: Request) {
  try {
    const { name, email, password, isAdmin } = await req.json();
    if (!name || !password) {
      return NextResponse.json({ error: "name and password required" }, { status: 400 });
    }
    const account = (email || name || "").toLowerCase();
    const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS, key: authLimitKey(account) });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }
    const userId = "u_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (isAdmin) {
      const { verifyAdmin } = await import("@/lib/auth");
      if (!verifyAdmin(password)) {
        return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
      }
      return issueSession(req, userId, name, "admin");
    }

    if (!dbEnabled()) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    // Find the account by email (preferred, case-insensitive) OR by name-derived id.
    // No auto-create. Email is the reliable identifier for users.
    let user: any = null;
    if (email) {
      const byEmail = await db.select("users", `&email=ilike.${encodeURIComponent(email.trim())}`).catch(() => []);
      if (byEmail.length) user = byEmail[0];
    }
    if (!user) {
      const byId = await db.select("users", `&id=eq.${encodeURIComponent(userId)}`).catch(() => []);
      if (byId.length) user = byId[0];
    }
    // Generic failure regardless of whether the account exists (no enumeration).
    if (!user || !user.password_hash || user.password_hash.length < 16) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }
    // Wrong password -> generic 401 (does not reveal account existence).
    if (user.password_hash !== hashPassword(password)) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }
    // Correct password but unverified/disabled -> only revealed after password.
    if (user.status === "disabled") {
      return NextResponse.json({ error: "Account disabled. Contact support." }, { status: 403 });
    }
    // Phase 1 account lifecycle: accounts created via the new flow are
    // 'pending' until verified, and must verify before login. Accounts that
    // existed before the verification columns (status NULL) are grandfathered
    // as active so existing users are not locked out.
    if (user.status === "pending") {
      return NextResponse.json({ error: "Please verify your account before logging in." }, { status: 403 });
    }

    const displayName = user.name || name;
    return issueSession(req, user.id, displayName, "user");
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function issueSession(req: Request, userId: string, name: string, role: "user" | "admin") {
  const ua = req.headers.get("user-agent") || "";
  const token = await signToken(
    { userId, name, role },
    { device: ua.slice(0, 200), ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined, userAgent: ua }
  );
  const store = await cookies();
  store.set(cookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });
  return NextResponse.json({ ok: true, userId, name, role });
}
