// Billing helper — Stripe Checkout + webhook verification.
// Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET in env.

const STRIPE = "https://api.stripe.com/v1";

export interface Plan {
  id: string;
  name: string;
  priceId: string; // Stripe Price id
  amount: number;  // cents
}

// Example plans — create the matching Products/Prices in Stripe dashboard.
export const PLANS: Record<string, Plan> = {
  free:  { id: "free",  name: "Free",  priceId: "",            amount: 0 },
  pro:   { id: "pro",   name: "Pro",   priceId: "price_XXXX", amount: 600 },   // $6/mo
  team:  { id: "team",  name: "Team",  priceId: "price_YYYY", amount: 1500 },  // $15/mo
};

export async function createCheckout(planId: string, userId: string, email?: string) {
  const plan = PLANS[planId];
  if (!plan || !plan.priceId) throw new Error("invalid plan");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");

  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": plan.priceId,
    "line_items[0][quantity]": "1",
    "client_reference_id": userId,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
  });
  if (email) form.set("customer_email", email);

  const res = await fetch(`${STRIPE}/checkout/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.url as string;
}

// R1: Real Stripe webhook signature verification.
// Verifies the raw request body against X-Stripe-Signature using
// stripe.webhooks.constructEvent. Never parses JSON before verifying.
// Fails CLOSED: missing secret or missing/invalid signature -> 400.

import Stripe from "stripe";

// Lazy Stripe instance: only constructed when actually used, so importing this
// module at build time (when no key is set) never throws.
let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!_stripe) _stripe = new Stripe(key);
  return _stripe;
}

export async function verifyWebhook(raw: string, signature: string):
  Promise<{ event: any | null; error: string | null }> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return { event: null, error: "STRIPE_WEBHOOK_SECRET not configured" };
  }
  if (!signature) {
    return { event: null, error: "missing stripe-signature header" };
  }
  const stripe = getStripe();
  if (!stripe) {
    return { event: null, error: "STRIPE_SECRET_KEY not configured" };
  }
  try {
    const event = stripe.webhooks.constructEvent(raw, signature, secret);
    return { event, error: null };
  } catch (e: any) {
    return { event: null, error: `signature verification failed: ${String(e?.message || e)}` };
  }
}
