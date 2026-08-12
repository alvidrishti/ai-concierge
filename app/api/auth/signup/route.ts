import { NextResponse } from "next/server";
import { db, dbEnabled } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { createVerificationToken } from "@/lib/account";
import { deliver, normalizePhone } from "@/lib/recovery";
import { rateLimit, clientIp, AUTH_LIMIT, AUTH_WINDOW_MS, authLimitKey } from "@/lib/ratelimit";

export const runtime = "nodejs";

// ---- Email format validation (Phase 1) ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

// POST /api/auth/signup  { name, email?, phone?, password }
// REAL ACCOUNT LIFECYCLE (Phase 3 — hardened):
//  - Email signup ALWAYS creates a PENDING (UNVERIFIED) account. It attempts to
//    send a one-time verification email. Regardless of whether delivery
//    succeeds, the account stays PENDING until a real verification token is
//    consumed (or phone OTP is verified). An unverified email is NEVER
//    auto-activated into a trusted account (fixes the previous gap where a
//    missing email provider silently activated accounts).
//  - If email delivery is unavailable, we return a graceful fallback state so
//    the client can offer resend / phone OTP — but NEVER activate the account.
//  - Phone-only signup is verified through /api/auth/otp (OTP flow).
export async function POST(req: Request) {
  try {
    const { name, email, phone, password } = await req.json();
    if (!name || !password) return NextResponse.json({ error: "name and password required" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "password must be at least 6 characters" }, { status: 400 });
    if (email && !isValidEmail(email)) return NextResponse.json({ error: "a valid email is required" }, { status: 400 });
    if (!email && !phone) return NextResponse.json({ error: "provide an email or phone to create an account" }, { status: 400 });
    if (!dbEnabled()) return NextResponse.json({ error: "registration requires a configured database" }, { status: 501 });

    const account = (email || phone || name || "").toLowerCase();
    const rl = rateLimit(clientIp(req), { limit: AUTH_LIMIT, windowMs: AUTH_WINDOW_MS, key: authLimitKey("signup_" + account) });
    if (!rl.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });

    const userId = "u_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    const existingById = await db.select("users", `&id=eq.${encodeURIComponent(userId)}`).catch(() => []);
    if (existingById.length) return NextResponse.json({ error: "Account already exists. Try logging in." }, { status: 409 });
    if (email) {
      const existingEmail = await db.select("users", `&email=eq.${encodeURIComponent(email)}`).catch(() => []);
      if (existingEmail.length) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (phone) {
      const full = normalizePhone(undefined, phone);
      const existingPhone = await db.select("users", `&phone=eq.${encodeURIComponent(full)}`).catch(() => []);
      if (existingPhone.length) return NextResponse.json({ error: "An account with this phone already exists." }, { status: 409 });
    }

    // ---- EMAIL signup ----
    if (email) {
      await db.insert("users", {
        id: userId, name, email, phone: phone ? normalizePhone(undefined, phone) : "",
        role: "user", password_hash: hashPassword(password),
        status: "pending",   // UNVERIFIED until token consumed (or fallback)
      }).catch(() => {});

      const { plain } = await createVerificationToken(userId, "email");

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ai-concierge-lake-three.vercel.app";
      const verifyUrl = `${appUrl}/api/auth/verify-email?token=${plain}&uid=${encodeURIComponent(userId)}`;
      const html = `<p>Welcome to MAN. Please confirm your email to activate your account.</p><p><a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 24 hours.</p>`;
      const delivered = await deliver("email", email, "MAN — verify your email", "MAN — Verify your email", html);

      // Delivery works -> keep PENDING until verified (secure).
      if (delivered.ok) {
        return NextResponse.json({
          ok: true, status: "pending", needsVerification: "email",
          message: "Account created. Check your email to verify and activate it.",
        });
      }

      // Delivery UNAVAILABLE -> STILL PENDING. Never auto-activate an unverified
      // account (Phase 3 security fix). Return a graceful fallback so the client
      // can prompt resend / phone OTP verification. No session is issued.
      return NextResponse.json({
        ok: true, status: "pending", needsVerification: "email",
        fallback: "resend_or_otp",
        message: "We could not send a verification email right now. Your account is pending. Please verify via the resend option or phone OTP to activate it.",
      });
    }

    // ---- PHONE-only signup: OTP verification to activate ----
    const full = normalizePhone(undefined, phone);
    return NextResponse.json({
      ok: true, status: "pending", needsVerification: "phone",
      message: "Verify your phone with a one-time code to activate your account. Use the phone sign-in option.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
