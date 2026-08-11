// MAN — ACCOUNT LIFECYCLE (Phase 1).
//
// Real account identity:
//  - Email signup creates a PENDING/UNVERIFIED account. A cryptographically
//    random, one-time, expiring, attempt-limited, hashed verification token is
//    created. The account is only ACTIVE (email_verified_at set) once the token
//    is successfully consumed.
//  - Phone signup requires mandatory OTP verification; only then is
//    phone_verified_at set and the account ACTIVE.
//  - Login requires the account to be verified/active. Wrong password must
//    return auth failure. Generic errors prevent account enumeration.
//
// Device/session security: each session carries a jti; server-side `sessions`
// rows track created_at / last_seen_at / device / ip (privacy-safe). A user can
// list sessions, log out current, revoke one, or revoke all. Accounts are NOT
// locked to a single physical device.

import { createHmac, randomBytes } from "crypto";
import { db, dbEnabled } from "./db";

const SECRET = process.env.AUTH_SECRET || "";
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;   // email verification: 24h
const MAX_VERIFY_ATTEMPTS = 10;

function hash(v: string): string {
  return createHmac("sha256", SECRET).update(v).digest("hex");
}

export interface VerificationRecord {
  userId: string;
  kind: "email" | "phone";
  tokenHash: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
  createdAt: string;
}

// In-memory fallback (dev/tests).
const memVerifications = new Map<string, VerificationRecord[]>();

export function newVerificationToken(): { plain: string; hash: string } {
  const plain = randomBytes(24).toString("base64url");
  return { plain, hash: hash(plain) };
}

// Create a one-time verification token and persist it (DB or in-memory).
export async function createVerificationToken(userId: string, kind: "email" | "phone"): Promise<{ plain: string; hash: string }> {
  const { plain, hash: tokenHash } = newVerificationToken();
  const rec: VerificationRecord = {
    userId, kind, tokenHash,
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
    attempts: 0, used: false, createdAt: new Date().toISOString(),
  };
  if (dbEnabled()) {
    await db.insert("verification_tokens", {
      user_id: userId, kind, token_hash: tokenHash, expires_at: rec.expiresAt,
      attempts: 0, used: false,
    }).catch(() => {});
  } else {
    const arr = memVerifications.get(userId) || [];
    arr.push(rec);
    memVerifications.set(userId, arr);
  }
  return { plain, hash: tokenHash };
}

// Consume a verification token. One-time, expiring, attempt-limited.
// Returns true only on successful consumption (and marks it used).
export async function consumeVerificationToken(userId: string, token: string, kind: "email" | "phone"): Promise<{ ok: boolean; reason?: string }> {
  if (dbEnabled()) {
    const rows = await db.select(
      "verification_tokens",
      `&user_id=eq.${encodeURIComponent(userId)}&kind=eq.${kind}&used=eq.false&order=created_at.desc&limit=5`
    ).catch(() => []);
    for (const r of rows) {
      if (r.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "too many attempts" };
      if (!r.token_hash || hash(token) !== r.token_hash) {
        await db.update("verification_tokens", `id=eq.${r.id}`, { attempts: (r.attempts || 0) + 1 }).catch(() => {});
        continue;
      }
      if (new Date(r.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
      await db.update("verification_tokens", `id=eq.${r.id}`, { used: true }).catch(() => {});
      return { ok: true };
    }
    return { ok: false, reason: "invalid token" };
  }
  const arr = memVerifications.get(userId) || [];
  for (const r of arr) {
    if (r.used) continue;
    if (r.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "too many attempts" };
    if (hash(token) !== r.tokenHash) { r.attempts++; continue; }
    if (new Date(r.expiresAt).getTime() < Date.now()) return { ok: false, reason: "expired" };
    r.used = true;
    return { ok: true };
  }
  return { ok: false, reason: "invalid token" };
}

// ---- Account status helpers ----
export type AccountStatus = "pending" | "active" | "disabled";

export async function getAccount(userId: string): Promise<any | null> {
  if (dbEnabled()) {
    const rows = await db.select("users", `&id=eq.${encodeURIComponent(userId)}`).catch(() => []);
    return rows[0] || null;
  }
  return null;
}

// Mark an account verified (email or phone).
export async function markVerified(userId: string, kind: "email" | "phone"): Promise<void> {
  const col = kind === "email" ? "email_verified_at" : "phone_verified_at";
  const patch: any = { status: "active" };
  patch[col] = new Date().toISOString();
  if (dbEnabled()) {
    await db.update("users", `id=eq.${encodeURIComponent(userId)}`, patch).catch(() => {});
  }
}

// ---- Session / device management ----
// `createSessionRow` records device + IP metadata on a session (privacy-safe).
export async function recordSessionMeta(jti: string, userId: string, meta: {
  device?: string; ip?: string; userAgent?: string;
}): Promise<void> {
  if (!dbEnabled()) return;
  const patch: any = {};
  if (meta.device) patch.device = meta.device.slice(0, 200);
  if (meta.ip) patch.ip = meta.ip.slice(0, 45);
  if (meta.userAgent) patch.user_agent = meta.userAgent.slice(0, 300);
  patch.last_seen_at = new Date().toISOString();
  // Try update if exists, else create.
  try {
    await db.update("sessions", `jti=eq.${jti}`, patch);
  } catch {
    await db.insert("sessions", { jti, user_id: userId, ...patch, revoked: false }).catch(() => {});
  }
}

export async function touchSession(jti: string): Promise<void> {
  if (!dbEnabled()) return;
  await db.update("sessions", `jti=eq.${jti}`, { last_seen_at: new Date().toISOString() }).catch(() => {});
}

export async function listSessions(userId: string): Promise<any[]> {
  if (dbEnabled()) {
    const rows = await db.select("sessions", `&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`).catch(() => []);
    return rows;
  }
  return [];
}
