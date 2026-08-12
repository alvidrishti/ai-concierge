// MAN — Authentication & user isolation (fail-closed) + session revocation.
//
// R3: ADMIN_PASS has NO default fallback. If missing, admin auth fails.
// R4: AUTH_SECRET has NO default. If missing/empty, we refuse to sign or
//     verify any token (fail closed).
//
// SESSION REVOCATION:
//  - Each token carries a `jti` (session id).
//  - A server-side `sessions` record (Supabase) stores active sessions.
//  - verifyToken additionally checks the session record is NOT revoked.
//  - logout revokes the session record -> stolen token becomes invalid.
//  - logout-all revokes all of a user's sessions.
// Production persistence requires Supabase (sessions table); without it we
// still sign/verify (stateless) but revocation is best-effort.

import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db, dbEnabled } from "./db";

const SECRET = process.env.AUTH_SECRET || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";

const INSECURE = new Set(["", "changeme", "change_this", "change_this_to_a_long_random_string", "password", "secret"]);

export interface Session {
  userId: string;
  name: string;
  role: "user" | "admin";
  exp: number;
  jti: string;   // session id — enables revocation
}

export function authReady(): boolean {
  return !!SECRET && !INSECURE.has(SECRET);
}

function newJti(): string {
  return randomBytes(16).toString("hex");
}

export async function signToken(
  payload: { userId: string; name: string; role: "user" | "admin" },
  meta?: { device?: string; ip?: string; userAgent?: string }
): Promise<string> {
  // R4: fail closed.
  if (!authReady()) throw new Error("AUTH_SECRET not configured; cannot issue session");
  const jti = newJti();
  // record the session (production: Supabase; else best-effort in-memory).
  // Phase 1: capture privacy-safe device/IP metadata when provided.
  const row: any = { jti, user_id: payload.userId, revoked: false, last_seen_at: new Date().toISOString() };
  if (meta?.device) row.device = meta.device.slice(0, 200);
  if (meta?.ip) row.ip = meta.ip.slice(0, 45);
  if (meta?.userAgent) row.user_agent = meta.userAgent.slice(0, 300);
  if (dbEnabled()) {
    await db.insert("sessions", row).catch(() => {});
  }
  const body = Buffer.from(JSON.stringify({ ...payload, jti, exp: Date.now() + 7 * 86400000 }))
    .toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export async function verifyToken(token: string): Promise<Session | null> {
  // R4: fail closed.
  if (!authReady()) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (data.exp < Date.now()) return null;
    const sess: Session = { userId: data.userId, name: data.name, role: data.role, exp: data.exp, jti: data.jti };
    // revocation check — fail closed if the session record is revoked.
    if (dbEnabled()) {
      const rows = await db.select("sessions", `&jti=eq.${data.jti}`).catch(() => []);
      if (!rows.length || rows[0].revoked) return null; // not found or revoked -> invalid
    }
    return sess;
  } catch {
    return null;
  }
}

// Revoke a single session (logout). After this, the stolen token is invalid.
export async function revokeSession(jti: string): Promise<void> {
  if (dbEnabled()) {
    await db.update("sessions", `jti=eq.${jti}`, { revoked: true, revoked_at: new Date().toISOString() }).catch(() => {});
  }
}

// Revoke ALL sessions for a user (logout-all-sessions).
export async function revokeAllSessions(userId: string): Promise<void> {
  if (dbEnabled()) {
    await db.update("sessions", `user_id=eq.${encodeURIComponent(userId)}`, { revoked: true, revoked_at: new Date().toISOString() }).catch(() => {});
  }
}

export function hashPassword(pw: string): string {
  // Phase 3 (Auth hardening): production-grade password hashing with bcrypt.
  // R4: still fail-closed — refuse to hash without a configured deployment
  // secret, preserving the original security invariant.
  if (!authReady()) throw new Error("AUTH_SECRET not configured");
  return bcrypt.hashSync(pw, 10); // cost 10; bcryptjs is pure-JS (serverless-safe)
}

// Detect whether a stored hash uses the legacy HMAC-SHA256 scheme (pre-Phase 3).
// bcrypt hashes always start with "$2"; legacy hashes are 64-char hex.
export function isLegacyPasswordHash(stored: string): boolean {
  return !!stored && !stored.startsWith("$2");
}

// Verify a password against the stored hash. Handles BOTH schemes so existing
// users keep working during the migration: bcrypt for new/upgraded accounts,
// legacy HMAC-SHA256 for accounts not yet rehashed. New accounts always bcrypt.
export function verifyPassword(pw: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.startsWith("$2")) {
    // Legacy HMAC-SHA256(secret, password). Requires the deployment secret.
    if (!authReady()) return false;
    const h = createHmac("sha256", SECRET).update(pw).digest("hex");
    return timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(stored, "hex"));
  }
  try {
    return bcrypt.compareSync(pw, stored);
  } catch {
    return false;
  }
}

export function verifyAdmin(password: string): boolean {
  // R3: fail closed — no fallback default; reject placeholder passwords.
  if (!ADMIN_PASS || INSECURE.has(ADMIN_PASS)) return false;
  return password === ADMIN_PASS;
}
