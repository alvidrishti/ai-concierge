import { NextResponse } from "next/server";
import { db, dbEnabled } from "@/lib/db";
import { generateToken, tokenExpiry, deliver, normalizePhone } from "@/lib/recovery";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS, authLimitKey } from "@/lib/ratelimit";

export const runtime = "nodejs";

// POST /api/auth/forgot  { email | phone }
// Requests a password reset. Generates a one-time hashed token, stores it with
// an expiry, and hands it to the delivery adapter. Actual email/SMS delivery is
// EXTERNAL CREDENTIAL REQUIRED — until a provider is set, no fake "sent".
export async function POST(req: Request) {
  try {
    const { email, phone } = await req.json();
    const account = email || phone;
    if (!account) return NextResponse.json({ error: "email or phone required" }, { status: 400 });
    const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS, key: authLimitKey(account.toLowerCase()) });
    if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    // find user (avoid account enumeration: same response whether or not exists)
    let user = null;
    if (dbEnabled()) {
      const rows = await db.select("users", `&email=eq.${encodeURIComponent(account)}`).catch(() => []);
      if (!rows.length && phone) {
        const rows2 = await db.select("users", `&phone=eq.${encodeURIComponent(account)}`).catch(() => []);
        user = rows2[0] || null;
      } else user = rows[0] || null;
    }
    // In-memory dev mode: no user lookup, still issue a token for testing.
    if (!user && !dbEnabled()) user = { id: "u_" + account.replace(/[^a-z0-9]/gi, "_") };

    const { plain, hash } = generateToken();
    if (dbEnabled()) {
      await db.insert("password_reset_tokens", {
        user_id: user?.id || "unknown", token_hash: hash, expires_at: tokenExpiry(), used: false,
      }).catch(() => {});
    }

    // Delivery — real send via Resend (email) / SMSBD (sms). Never mark sent
    // if the provider rejected it.
    const channel = email ? "email" : "sms";
    let delivered;
    if (email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ai-concierge-lake-three.vercel.app";
      const resetUrl = `${appUrl}/reset?token=${plain}`;
      const html = `<p>You requested a password reset for MAN.</p><p>Click <a href="${resetUrl}">here</a> to set a new password. This link expires in 15 minutes.</p><p>If you didn't request this, you can ignore this email.</p>`;
      delivered = await deliver("email", account, "Password reset", "MAN — Reset your password", html);
    } else {
      const normPhone = normalizePhone("+880", phone);
      delivered = await deliver("sms", normPhone, `MAN password reset code: ${plain}`);
    }

    // CRITICAL: never expose the reset token to the client in production.
    const isDev = process.env.NODE_ENV !== "production";
    const resetLink = email && isDev ? `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset?token=${plain}` : null;

    return NextResponse.json({
      ok: true,
      status: delivered.ok ? "sent" : "delivery_pending",
      message: delivered.ok
        ? "Reset instructions sent."
        : "Reset request received. (Delivery requires an email/SMS provider — configured in production.)",
      // resetLink is null in production (never leaks the token).
      resetLink,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
