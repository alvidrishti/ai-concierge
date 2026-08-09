# Tether — WhatsApp Integration + Billing Plan

How to take the live web MVP to a **revenue-generating product**: users chat
via WhatsApp, and you charge a subscription. Same agent + approval gate, just
reached where the user already is.

> ✅ **Starter code is included** in this repo:
> - `lib/whatsapp.ts` + `app/api/whatsapp/route.ts` — WhatsApp webhook
> - `lib/billing.ts` + `app/api/billing/checkout` + `webhook` — Stripe
> - `.env.example` lists the new env vars
> - `db/schema.sql` adds a `subscriptions` table

---

## Part A — WhatsApp integration

### Goal
Let users talk to the concierge from WhatsApp instead of only the web UI,
without giving up the human-in-the-loop approval gate.

### Approach (recommended): Twilio WhatsApp API + webhook
1. **Twilio account** (free trial) → enable **WhatsApp Sandbox** → get a
   phone number.
2. Add a Vercel webhook route: `POST /api/whatsapp`.
3. Twilio sends inbound WhatsApp messages to that URL. Your handler parses
   the message text, calls the **same** `respond()` agent logic, and replies.
4. **Approval gate on WhatsApp:** when the agent needs approval, it sends a
   message with the action details and two quick-reply buttons
   (Approve / Reject). Twilio Button messages call back to `/api/whatsapp`
   with the chosen option.

### Why keep the approval gate
MAA v4.0 Pillar 10 — WhatsApp is async and casual, so users may say
"handle it" and walk away. The gate ensures nothing is acted on without an
explicit Approve, and everything is logged.

### Env vars to add
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=+1...   # Twilio sandbox/number
```

### Minimal sequence
1. User texts: "Remind me about my dentist appointment next Tuesday at 3pm"
2. Concierge replies: "I'd like to set that reminder. Approve or Reject?" + buttons.
3. User taps **Approve** → `/api/approve` → reminder persisted.
4. Done — logged to audit.

> Alternatives: Meta WhatsApp Cloud API directly, or a provider like
> **Wassenger** / **Whapi**. Twilio is the fastest to stand up.

---

## Part B — Billing

### Goal
Turn usage into revenue. Two models below — start with one.

### Model 1 — Hosted SaaS (subscription)
- **Stripe** subscription via **Stripe Checkout** (hosted page — no card
  handling code).
- Plans: **Free** (limited, 5 reminders, no approvals override) →
  **Pro $6/user/mo** (unlimited, WhatsApp access, approval history) →
  **Team $15/mo** (multi-seat).
- When a user hits a paid feature, redirect to Checkout; Stripe webhook
  (`checkout.session.completed`) unlocks access in your DB.

### Model 2 — Upwork / agency (services + retainer)
- **Setup:** $1,500–5,000 (deploy, brand, WhatsApp on, train on their data).
- **Retainer:** $500–1,500/mo (run, monitor, cost monitoring + client report
  every cycle — MAA Pillars 13 & 14).
- Sell the **trust layer** as the differentiator: "an AI assistant you can
  actually rely on, with approval + audit."

### Recommended phasing
| Phase | What | Timeline |
|---|---|---|
| v1 (now) | Live web MVP, free for friends/3–5 beta users | done |
| v1.1 | Twilio WhatsApp + Stripe free/Pro checkout | 1–2 weeks |
| v1.2 | Billing webhook + usage limits + audit export | 2–3 weeks |
| v2 | Multi-client accounts (MAA Pillar 12 templatization) | after validation |

### Cost transparency (MAA Pillar 14)
Because we log per-run cost, you can show a client exactly what their
concierge costs to run and price margins honestly — a real trust advantage.

---

## What to deliberately NOT build first
- **Multi-user/family accounts** — single-user memory + billing must be solid
  first (same judgment call as the portfolio demo).
- **Native mobile app** — WhatsApp covers mobile; no app store overhead.
- **Vector/embeddings memory** — a simple structured store is enough until a
  real need for semantic memory appears.

---
*Tether — Reliable AI Concierge. By MD Rayhan Mia · MAA Ecosystem v4.0.*
