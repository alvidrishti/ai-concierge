import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAUTH_PROVIDERS, oauthProfile } from "@/lib/oauth";
import { signToken } from "@/lib/auth";
import { cookieName } from "@/lib/session";
import { db, dbEnabled } from "@/lib/db";

export const runtime = "nodejs";

// GET /api/auth/oauth/callback/:provider?code=...&state=...
// On success: derive userId, store/load user, sign a MAN session token, set
// the httpOnly cookie, and redirect to the app.
export async function GET(req: Request, ctx: { params: { provider: string } }) {
  const provider = ctx.params.provider;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!OAUTH_PROVIDERS[provider] || !code) {
    return NextResponse.json({ error: "missing code or provider" }, { status: 400 });
  }

  const profile = await oauthProfile(provider, code);
  if (!profile || !profile.name) {
    return NextResponse.json({ error: "could not verify profile" }, { status: 401 });
  }

  // Derive a stable userId from the provider + provider account id/email.
  const email = profile.email?.toLowerCase() || `${profile.name.toLowerCase().replace(/\s+/g, "_")}@${provider}`;
  const userId = `${provider}_` + email.replace(/[^a-z0-9@.]/g, "_");

  // Persist the user if new (keep existing user data untouched).
  if (dbEnabled()) {
    const existing = await db.select("users", `&id=eq.${userId}`).catch(() => []);
    if (!existing.length) {
      await db.insert("users", { id: userId, name: profile.name, email, role: "user", password_hash: "" })
        .catch(() => {});
    }
  }

  // Sign a real session token (R4 fail-closed applies — throws if no AUTH_SECRET).
  const token = signToken({ userId, name: profile.name, role: "user" });
  const store = await cookies();
  store.set(cookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 86400,
  });

  // redirect back to the app (root)
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || req.url));
}
