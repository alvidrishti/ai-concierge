import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, dbEnabled } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookieName } from "@/lib/session";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS, authLimitKey } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/auth/login  { name, email?, password, isAdmin? }
// Rate-limited (IP + account aware) to prevent brute force. Generic errors.
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
      return issueSession(userId, name, "admin");
    }

    if (dbEnabled()) {
      const existing = await db.select("users", `&id=eq.${userId}`).catch(() => []);
      if (existing.length) {
        const user: any = existing[0];
        if (!user.password_hash || user.password_hash.length < 16) {
          return NextResponse.json({ error: "account requires password reset" }, { status: 403 });
        }
        if (user.password_hash !== hashPassword(password)) {
          return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
        }
      } else {
        await db.insert("users", {
          id: userId, name, email: email || "", role: "user", password_hash: hashPassword(password),
        }).catch(() => {});
      }
    }

    return issueSession(userId, name, "user");
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

async function issueSession(userId: string, name: string, role: "user" | "admin") {
  const token = await signToken({ userId, name, role });
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
