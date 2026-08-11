// MAN — Account recovery (forgot password + OTP) + delivery adapters.
//
// Secure flow:
//  - One-time reset token: generated, hashed, stored, expiring, one-time.
//  - OTP: 6-digit, hashed, expiring, attempt-limited, resend-cooldown.
//  - Delivery via adapters (SMSBD for SMS/OTP, Resend for email).
//  - Credentials are SERVER-SIDE env vars only, never exposed.
//  - We never claim delivery succeeded if the provider rejected it.

import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.AUTH_SECRET || "";
const RESET_TTL_MS = 15 * 60 * 1000;   // 15 min
const OTP_TTL_MS = 10 * 60 * 1000;     // 10 min
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;  // 1 min

function hash(v: string): string {
  return createHmac("sha256", SECRET).update(v).digest("hex");
}

export function generateToken(): { plain: string; hash: string } {
  const plain = randomBytes(24).toString("base64url");
  return { plain, hash: hash(plain) };
}

export function generateOtp(): { plain: string; hash: string } {
  const plain = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
  return { plain, hash: hash(plain) };
}

export function tokenExpiry(): string {
  return new Date(Date.now() + RESET_TTL_MS).toISOString();
}
export function otpExpiry(): string {
  return new Date(Date.now() + OTP_TTL_MS).toISOString();
}
export function verifyHash(plain: string, storedHash: string): boolean {
  if (!storedHash) return false;
  return hash(plain) === storedHash;
}
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}
export function cooldownElapsed(lastAt: string | null, cooldown = RESEND_COOLDOWN_MS): boolean {
  if (!lastAt) return true;
  return Date.now() - new Date(lastAt).getTime() >= cooldown;
}
export const MAX_OTP_ATTEMPTS = MAX_ATTEMPTS;

// ---- Phone normalization (Bangladesh) ----
// Converts various local formats to a canonical E.164 "+8801XXXXXXXXX".
// "01888888888" -> "+8801888888888", "+8801888888888" stays, "8801888888888" ok.
export function normalizePhone(countryCode: string | undefined, phone: string): string {
  let p = (phone || "").trim();
  let cc = (countryCode || "").trim();
  // strip leading + and spaces/dashes
  p = p.replace(/[\s\-]/g, "");
  if (!p) return "";
  if (p.startsWith("00")) p = p.slice(2);
  if (cc) cc = cc.replace(/[^0-9+]/g, "");
  // if phone already includes country code, use it
  if (p.startsWith("+")) return p;
  if (p.startsWith("880") && p.length === 13) return "+" + p;
  if (p.startsWith("0") && p.length === 11 && p[1] === "1") {
    // local Bangladeshi mobile 01XXXXXXXXX
    return "+88" + p.slice(1);
  }
  if (cc && p.length >= 10 && p.length <= 11) {
    // combine country code (e.g. 880) with local number
    const digits = cc.replace(/[^0-9]/g, "");
    if (digits === "880" && p.startsWith("0")) p = p.slice(1);
    return "+" + digits + p;
  }
  // default: assume 880
  return "+88" + p;
}

// ---- Delivery adapters ----
export interface DeliveryResult {
  ok: boolean;        // true only if a real provider accepted
  provider: string;
  error?: string;
}

// SMSBD adapter — sends SMS via SMSBD HTTP API (server-side).
// Credentials from env: SMSBD_API_KEY, SMSBD_SENDER_ID, SMSBD_API_URL.
async function smsbdAdapter(to: string, message: string): Promise<DeliveryResult> {
  const apiKey = process.env.SMSBD_API_KEY;
  const sender = process.env.SMSBD_SENDER_ID;
  const apiUrl = process.env.SMSBD_API_URL || "https://api.smsbd.com/smsapi";
  if (!apiKey) return { ok: false, provider: "smsbd", error: "SMSBD_API_KEY not configured" };
  const body = new URLSearchParams({ api_key: apiKey, senderid: sender || "", number: to, sms: message }).toString();
  try {
    const res = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!res.ok) return { ok: false, provider: "smsbd", error: `SMSBD HTTP ${res.status}` };
    const text = await res.text();
    // SMSBD returns a status string (e.g. "1002" = sent). Treat known success
    // codes as delivered; anything else = not delivered.
    const ok = /^1\d{3}$/.test(text.trim()) || /sent|success/i.test(text);
    return { ok, provider: "smsbd", error: ok ? undefined : `SMSBD status: ${text.slice(0, 40)}` };
  } catch (e: any) {
    return { ok: false, provider: "smsbd", error: String(e?.message || e).slice(0, 80) };
  }
}

// Resend adapter — transactional email (forgot-password reset link).
// Credentials from env: RESEND_API_KEY, EMAIL_FROM (from address), APP_URL.
async function resendAdapter(to: string, subject: string, html: string): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "MAN <onboarding@resend.dev>";
  if (!apiKey) return { ok: false, provider: "resend", error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, provider: "resend", error: `Resend HTTP ${res.status}: ${body.slice(0, 60)}` };
    }
    return { ok: true, provider: "resend" };
  } catch (e: any) {
    return { ok: false, provider: "resend", error: String(e?.message || e).slice(0, 80) };
  }
}

// Dev-only adapter — never used in production. Logs payload, returns not-delivered.
async function consoleAdapter(channel: string, to: string, payload: string): Promise<DeliveryResult> {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[MAN-DEV-DELIVERY:${channel}] to=${to} payload=${payload}`);
  }
  return { ok: false, provider: "dev" };
}

// Dispatch: SMSBD for SMS, Resend for email.
export async function deliver(channel: "sms" | "email", to: string, payload: string, subject?: string, html?: string): Promise<DeliveryResult> {
  if (channel === "sms") {
    if (process.env.SMSBD_API_KEY) return smsbdAdapter(to, payload);
    return consoleAdapter("sms", to, payload);
  }
  if (process.env.RESEND_API_KEY) {
    return resendAdapter(to, subject || "MAN — verification", html || `<p>${payload}</p>`);
  }
  return consoleAdapter("email", to, payload);
}

export function getDeliveryAdapter() {
  return { deliver };
}
