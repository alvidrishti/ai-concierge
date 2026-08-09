import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/billing";

export const runtime = "nodejs";

// POST /api/billing/webhook — Stripe sends checkout.session.completed here.
// For production, verify the signature with the stripe SDK:
//   const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const event = await verifyWebhook(raw, sig);
  if (!event) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    // Unlock the user's plan in your DB here (MAA Pillar 12: config-driven access).
    console.log("Plan activated for user:", userId, "plan:", session.mode);
  }
  return NextResponse.json({ received: true });
}
