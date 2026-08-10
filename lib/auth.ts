// MAN — Authentication & user isolation (fail-closed).
//
// R3: ADMIN_PASS has NO default fallback. If missing, admin auth fails.
//     Placeholder values like "changeme" / "change_this" are rejected.
// R4: AUTH_SECRET has NO default. If missing/empty, we refuse to sign or
//     verify any token (fail closed) — never sign with an empty/default secret.

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "";

// Placeholder/predictable values that must never be accepted as real secrets.
const INSECURE = new Set(["", "changeme", "change_this", "change_this_to_a_long_random_string", "password", "secret"]);

export interface Session {
  userId: string;
  name: string;
  role: "user" | "admin";
  exp: number;
}

export function authReady(): boolean {
  return !!SECRET && !INSECURE.has(SECRET);
}

export function signToken(payload: { userId: string; name: string; role: "user" | "admin" }): string {
  // R4: fail closed — refuse to sign with missing/insecure secret.
  if (!authReady()) {
    throw new Error("AUTH_SECRET not configured; cannot issue session");
  }
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400000 }))
    .toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): Session | null {
  // R4: fail closed — do not verify with missing/insecure secret.
  if (!authReady()) return null;
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const expected = createHmac("sha256", SECRET).update(body).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (data.exp < Date.now()) return null;
    return { userId: data.userId, name: data.name, role: data.role, exp: data.exp };
  } catch {
    return null;
  }
}

export function hashPassword(pw: string): string {
  // R4: hashPassword requires a real secret.
  if (!authReady()) throw new Error("AUTH_SECRET not configured");
  return createHmac("sha256", SECRET).update(pw).digest("hex");
}

export function verifyAdmin(password: string): boolean {
  // R3: fail closed — no fallback default; reject placeholder passwords.
  if (!ADMIN_PASS || INSECURE.has(ADMIN_PASS)) return false;
  return password === ADMIN_PASS;
}
