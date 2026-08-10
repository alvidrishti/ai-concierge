import { NextResponse } from "next/server";
import { oauthConfigured } from "@/lib/oauth";

export const runtime = "nodejs";

// GET /api/auth/oauth/config -> which social providers are configured
// (returns only booleans, never credentials).
export async function GET() {
  return NextResponse.json({
    google: oauthConfigured("google"),
    github: oauthConfigured("github"),
    facebook: oauthConfigured("facebook"),
  });
}
