import { NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { activeProviders } from "@/lib/llm";

export const runtime = "nodejs";

// GET /api/health — minimal public health endpoint (Phase 10).
// Reports only status booleans and provider availability — NEVER secrets,
// env values, API keys, or stack traces.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "MAN",
    database: dbEnabled() ? "connected" : "not_configured",
    ai_providers: activeProviders, // provider names only (configured, not keys)
    version: process.env.MAN_VERSION || "1.0.0",
    time: new Date().toISOString(),
  });
}
