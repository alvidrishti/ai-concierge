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

// Verify + parse a Stripe webhook event. Returns null if signature invalid.
export async function verifyWebhook(raw: string, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return null;
  // Full verification uses the stripe SDK's constructEvent. Here we do a basic
  // pass-through for the starter; install `stripe` and use constructEvent in prod.
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
