import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, dbEnabled } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookieName } from "@/lib/session";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS, authLimitKey } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/auth/signup  { name, email?, phone?, password }
// Creates a NEW account. Password is hashed. Issues a session.
// Requires a database (no in-memory fallback for account creation).
export async function POST(req: Request) {
  try {
    const { name, email, phone, password } = await req.json();
    if (!name || !password) return NextResponse.json({ error: "name and password required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "password must be at least 6 characters" }, { status: 400 });
    if (!dbEnabled()) return NextResponse.json({ error: "registration requires a configured database" }, { status: 501 });

    const account = (email || phone || name || "").toLowerCase();
    const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS, key: authLimitKey("signup_" + account) });
    if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const userId = "u_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    // check existing by id, email, or phone
    const existingById = await db.select("users", `&id=eq.${encodeURIComponent(userId)}`).catch(() => []);
    if (existingById.length) return NextResponse.json({ error: "Account already exists. Try logging in." }, { status: 409 });
    if (email) {
      const existingEmail = await db.select("users", `&email=eq.${encodeURIComponent(email)}`).catch(() => []);
      if (existingEmail.length) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (phone) {
      const existingPhone = await db.select("users", `&phone=eq.${encodeURIComponent(phone)}`).catch(() => []);
      if (existingPhone.length) return NextResponse.json({ error: "An account with this phone already exists." }, { status: 409 });
    }

    await db.insert("users", {
      id: userId, name, email: email || "", phone: phone || "", role: "user", password_hash: hashPassword(password),
    }).catch(() => {});

    const token = await signToken({ userId, name, role: "user" });
    const store = await cookies();
    store.set(cookieName(), token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86400 });
    return NextResponse.json({ ok: true, userId, name, role: "user" });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
