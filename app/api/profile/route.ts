import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getProfile, upsertProfile } from "@/lib/daily_life";

export const runtime = "nodejs";

// GET /api/profile — the authenticated user's profile
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  const profile = await getProfile(session.userId);
  // fall back to session name if no profile yet
  return NextResponse.json({
    profile: profile || { user_id: session.userId, full_name: session.name, account_type: "personal" },
  });
}

// PATCH /api/profile — update name/address/account_type/etc.
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  try {
    const body = await req.json();
    const allowed = [
      "full_name", "phone", "email", "address", "district", "division",
      "avatar_url", "account_type", "business_name", "business_type", "bio",
    ];
    const patch: any = {};
    for (const k of allowed) if (body[k] !== undefined) patch[k] = body[k];
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }
    const profile = await upsertProfile(session.userId, patch);
    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
