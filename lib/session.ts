// MAN — extract/verify the session from an incoming request.
//
// Phase 3 (Auth hardening): supports BOTH transports so the web (httpOnly
// cookie) and the native Expo client (Authorization: Bearer token stored in
// SecureStore) work against the same routes.
//   - Cookie first (web):  `man_token`
//   - Fallback (mobile):   `Authorization: Bearer <token>`
// Either way the token is verified with the same HMAC + jti-revocation logic.

import { cookies, headers } from "next/headers";
import { verifyToken, Session } from "./auth";

const TOKEN_COOKIE = "man_token";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  let token = store.get(TOKEN_COOKIE)?.value;
  if (!token) {
    const h = await headers();
    const auth = h.get("authorization") || "";
    if (auth.startsWith("Bearer ")) token = auth.slice(7).trim();
  }
  if (!token) return null;
  return verifyToken(token); // async now (revocation check)
}

export function cookieName(): string {
  return TOKEN_COOKIE;
}
