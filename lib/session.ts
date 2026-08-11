// MAN — extract/verify the session from an incoming request.

import { cookies } from "next/headers";
import { verifyToken, Session } from "./auth";

const TOKEN_COOKIE = "man_token";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token); // async now (revocation check)
}

export function cookieName(): string {
  return TOKEN_COOKIE;
}
