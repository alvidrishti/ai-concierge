import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, dbEnabled } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { cookieName } from "@/lib/session";

export const runtime = "nodejs";

// POST /api/auth/login  { name, email?, password, isAdmin? }
// Creates a user if new, or validates an existing one. Issues a signed token
// in an httpOnly cookie.
export async function POST(req: Request) {
  try {
    const { name, email, password, isAdmin } = await req.json();
    if (!name || !password) {
      return NextResponse.json({ error: "name and password required" }, { status: 400 });
    }
    const userId = "u_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (isAdmin) {
      // Admin login is gated by ADMIN_PASS (see auth.verifyAdmin)
      const { verifyAdmin } = await import("@/lib/auth");
      if (!verifyAdmin(password)) {
        return NextResponse.json({ error: "invalid admin password" }, { status: 401 });
      }
      return issueSession(userId, name, "admin");
    }

    if (dbEnabled()) {
      const existing = await db.select("users", `&id=eq.${userId}`).catch(() => []);
      if (existing.length) {
        const user: any = existing[0];
        if (user.password_hash && user.password_hash !== hashPassword(password)) {
          return NextResponse.json({ error: "incorrect password" }, { status: 401 });
        }
      } else {
        await db.insert("users", {
          id: userId, name, email: email || "", role: "user", password_hash: hashPassword(password),
        }).catch(() => {});
      }
    }

    return issueSession(userId, name, "user");
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

async function issueSession(userId: string, name: string, role: "user" | "admin") {
  const token = signToken({ userId, name, role });
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
