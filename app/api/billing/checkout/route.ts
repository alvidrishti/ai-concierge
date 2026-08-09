import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/billing";

export const runtime = "nodejs";

// POST /api/billing/checkout  { plan: "pro", userId: "...", email?: "..." }
export async function POST(req: Request) {
  try {
    const { plan, userId, email } = await req.json();
    if (!plan || !userId) {
      return NextResponse.json({ error: "plan and userId required" }, { status: 400 });
    }
    const url = await createCheckout(plan, userId, email);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
