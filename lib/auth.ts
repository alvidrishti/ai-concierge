// MAN — Authentication & user isolation.
//
// Lightweight, server-side-signed token auth. A secret (AUTH_SECRET) signs
// tokens with HMAC; tokens carry the user id + role. On every protected
// request we verify the token server-side and derive the user id — memory
// and conversations are then scoped to that id. Users can never read another
// user's data because every query is filtered by user id.
//
// Env: AUTH_SECRET (a long random string), ADMIN_PASS (creator/admin login).

import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET || "";
const ADMIN_PASS = process.env.ADMIN_PASS || "changeme";

export interface Session {
  userId: string;
  name: string;
  role: "user" | "admin";
  exp: number;
}

export function signToken(payload: { userId: string; name: string; role: "user" | "admin" }): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400000 }))
    .toString("base64url");
  const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): Session | null {
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
  return createHmac("sha256", SECRET || "x").update(pw).digest("hex");
}

export function verifyAdmin(password: string): boolean {
  return !!SECRET && password === ADMIN_PASS;
}
