import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieName } from "@/lib/session";
import { verifyToken, revokeSession } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/auth/logout
// Revokes the server-side session (jti) so the stolen token becomes invalid,
// then deletes the cookie. Fails safely if the token is already invalid.
export async function POST() {
  const store = await cookies();
  const token = store.get(cookieName())?.value;
  if (token) {
    const sess = await verifyToken(token).catch(() => null);
    if (sess?.jti) {
      await revokeSession(sess.jti).catch(() => {});
    }
  }
  store.delete(cookieName());
  return NextResponse.json({ ok: true });
}
