import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, dbEnabled } from "@/lib/db";
import {
  generateOtp, otpExpiry, verifyHash, isExpired, cooldownElapsed,
  MAX_OTP_ATTEMPTS, deliver, normalizePhone,
} from "@/lib/recovery";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS, OTP_LIMIT, OTP_WINDOW_MS, otpLimitKey } from "@/lib/ratelimit";
import { signToken } from "@/lib/auth";
import { cookieName } from "@/lib/session";

export const runtime = "nodejs";

// POST /api/auth/otp/request  { phone, countryCode }
// POST /api/auth/otp/verify   { phone, code }
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const { phone, countryCode, code, action: bodyAction } = await req.json();
    const action = bodyAction || (url.searchParams.get("action") === "verify" ? "verify" : "request");

    if (action === "request") {
      if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
      const full = normalizePhone(countryCode, phone);
      const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS, key: otpLimitKey(full) });
      if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

      // Resend cooldown
      if (dbEnabled()) {
        const prev = await db.select("verification_codes", `&user_id=eq.${encodeURIComponent("otp_" + full)}&kind=eq.phone&order=created_at.desc&limit=1`).catch(() => []);
        if (prev.length && !cooldownElapsed(prev[0].created_at)) {
          return NextResponse.json({ error: "Please wait before requesting another code." }, { status: 429 });
        }
      }

      const { plain, hash } = generateOtp();
      if (dbEnabled()) {
        await db.insert("verification_codes", {
          user_id: "otp_" + full, kind: "phone", code_hash: hash,
          expires_at: otpExpiry(), attempts: 0, used: false,
        }).catch(() => {});
      }

      // Delivery via SMSBD (real SMS provider). Never mark sent if it failed.
      const delivered = await deliver("sms", full, `MAN verification code: ${plain}`);

      // CRITICAL: never expose the OTP to the client in production.
      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json({
        ok: true,
        status: delivered.ok ? "sent" : "delivery_pending",
        // devCode is null in production (never leaks the OTP).
        devCode: isDev && !delivered.ok ? plain : undefined,
        message: delivered.ok ? "Code sent." : "Verification requested. (SMS delivery requires a provider — configured in production.)",
      });
    }

    // ---- verify ----
    if (!phone || !code) return NextResponse.json({ error: "phone and code required" }, { status: 400 });
    const full = normalizePhone(countryCode, phone);
    const uid = "otp_" + full;
    const vrl = rateLimit(clientIp(req), { limit: OTP_LIMIT, windowMs: OTP_WINDOW_MS, key: otpLimitKey(full + ":verify") });
    if (!vrl.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    if (!dbEnabled()) return NextResponse.json({ error: "verification requires a configured database" }, { status: 501 });

    const codes = await db.select("verification_codes", `&user_id=eq.${encodeURIComponent(uid)}&kind=eq.phone&used=eq.false&order=created_at.desc&limit=5`).catch(() => []);
    let match = null;
    for (const c of codes) {
      if (c.code_hash && verifyHash(code, c.code_hash)) { match = c; break; }
    }
    if (!match) return NextResponse.json({ error: "invalid code" }, { status: 400 });
    if (isExpired(match.expires_at)) return NextResponse.json({ error: "code expired" }, { status: 400 });
    if ((match.attempts || 0) >= MAX_OTP_ATTEMPTS) return NextResponse.json({ error: "too many attempts" }, { status: 429 });

    await db.update("verification_codes", `id=eq.${match.id}`, { used: true }).catch(() => {});

    // Link to a REAL user account (upsert by phone) — fixes synthetic user_id.
    // Phase 1: phone signup is now verified — set phone_verified_at + active.
    const userId = "u_phone_" + full.replace(/[^a-z0-9]/gi, "_");
    const existing = await db.select("users", `&phone=eq.${encodeURIComponent(full)}`).catch(() => []);
    if (existing.length) {
      await db.update("users", `id=eq.${encodeURIComponent(existing[0].id)}`,
        { phone_verified_at: new Date().toISOString(), status: "active" }).catch(() => {});
    } else {
      await db.insert("users", {
        id: userId, name: phone, phone: full, role: "user", password_hash: "",
        status: "active", phone_verified_at: new Date().toISOString(),
      }).catch(() => {});
    }

    // Issue a REAL session using the SAME auth abstraction as email/password:
    // signToken() creates jti + records the session in the sessions table.
    const ua = req.headers.get("user-agent") || "";
    const token = await signToken(
      { userId, name: phone, role: "user" },
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

    // Return safe authenticated info only — never the OTP/token in production.
    return NextResponse.json({ ok: true, userId, name: phone, role: "user", authenticated: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
