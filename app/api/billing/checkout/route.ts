import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/billing";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

// R5: Require a valid authenticated session. The userId is derived from the
// verified server-side session — NEVER trusted from the client request body.
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "not authenticated" }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!plan) {
      return NextResponse.json({ error: "plan required" }, { status: 400 });
    }

    // userId always comes from the session, not the body.
    const url = await createCheckout(plan, session.userId, /* email */ undefined);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
