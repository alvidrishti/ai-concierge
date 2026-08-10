import { NextResponse } from "next/server";
import { oauthAuthorizeUrl, oauthConfigured, OAUTH_PROVIDERS } from "@/lib/oauth";
import { createHmac } from "crypto";

export const runtime = "nodejs";

// GET /api/auth/oauth/:provider  -> redirect to the provider's login
export async function GET(_req: Request, ctx: { params: { provider: string } }) {
  const provider = ctx.params.provider;
  if (!OAUTH_PROVIDERS[provider]) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }
  if (!oauthConfigured(provider)) {
    return NextResponse.json({ error: "provider not configured" }, { status: 400 });
  }
  // state = short-lived nonce signed with AUTH_SECRET to prevent CSRF.
  const state = createHmac("sha256", process.env.AUTH_SECRET || "x")
    .update(String(Date.now())).digest("hex").slice(0, 32);
  const url = oauthAuthorizeUrl(provider, state);
  return NextResponse.redirect(url);
}
