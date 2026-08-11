import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { CAPABILITY_REGISTRY } from "@/lib/capabilities";

export const runtime = "nodejs";

// GET /api/capabilities — authenticated view of the honest capability registry.
// Returns what MAN can and cannot do, plus current roadmap status. No secrets.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const capabilities = CAPABILITY_REGISTRY.map((c) => ({
    id: c.id, name: c.name, status: c.status, tier: c.tier,
    description: c.description, limitations: c.limitations,
  }));
  return NextResponse.json({ capabilities });
}
