import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { adminUsage, providerStatus } from "@/lib/usage";
import { dbEnabled } from "@/lib/db";
import { activeProviders } from "@/lib/llm";

export const runtime = "nodejs";

// GET /api/usage — admin-only usage + system status (Phase 8/9).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const usage = await adminUsage();
  const providers = providerStatus();
  return NextResponse.json({
    ...usage,
    providers: usage.providers, // aggregated request counts by provider
    system: {
      ai_router: activeProviders.length ? "ok" : "no providers configured",
      database: dbEnabled() ? "ok" : "not_configured",
      authentication: "ok",
      memory: "ok",
      voice: "ok",
      rate_limit: "ok",
    },
    provider_status: providers, // configured/not_configured per provider
  });
}
