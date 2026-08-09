import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { adminUsage } from "@/lib/usage";

export const runtime = "nodejs";

// GET /api/usage — admin-only usage view (which provider, which user, errors)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }
  const usage = await adminUsage();
  return NextResponse.json(usage);
}
