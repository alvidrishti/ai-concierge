// MAN — Auth endpoint rate limiting.
//
// Prevents brute force on login, OTP, forgot/reset. Uses IP + identifier-aware
// keys. Counters are PROCESS-LOCAL (documented limitation) — designed so a
// Redis / Vercel KV adapter can replace the map without changing call sites.
//
// IMPORTANT: generic, safe errors are returned by the routes; this layer only
// decides allow/deny. It never logs OTP/password/reset values.

import { createHash } from "crypto";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  limit: number;       // max attempts
  windowMs: number;    // window
  key?: string;        // optional identifier key (e.g. account/ip)
}

function keyOf(ip: string, idKey: string): string {
  return createHash("sha256").update(`${ip}:${idKey}`).digest("hex").slice(0, 32);
}

// Production note: replace `buckets` map with a Redis/Vercel KV adapter for
// multi-instance accuracy. Keep this function signature stable.
export function rateLimit(ip: string, config: RateLimitConfig): { allowed: boolean; retryAfterMs: number } {
  const k = keyOf(ip, config.key || "default");
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  if (b.count >= config.limit) {
    return { allowed: false, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Client IP helper (works behind Vercel/nginx proxies).
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "0.0.0.0";
}

// Standard auth limits (configurable via env).
export const AUTH_LIMIT = parseInt(process.env.MAN_AUTH_LIMIT || "10", 10);       // attempts
export const AUTH_WINDOW_MS = 15 * 60 * 1000;                                     // 15 min
export const OTP_LIMIT = parseInt(process.env.MAN_OTP_LIMIT || "5", 10);          // per window
export const OTP_WINDOW_MS = 15 * 60 * 1000;

export function authLimitKey(account?: string): string {
  return `auth:${account || "default"}`;
}
export function otpLimitKey(account: string): string {
  return `otp:${account}`;
}
