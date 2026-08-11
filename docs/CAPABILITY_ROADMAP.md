# MAN — CAPABILITY ROADMAP

_Generated at build time (real timestamps below). Status is **honest**: nothing is marked "live" unless actually verified. Source of truth at runtime: `lib/capabilities.ts` (CAPABILITY_REGISTRY)._

**Author:** MD Rayhan Mia · **App:** MAN — Personal AI Intelligence Agent

## Classification legend

| Bucket | Meaning |
|---|---|
| **AVAILABLE NOW** | Implemented **and** provider/credential configured (verified). |
| **REQUIRES EXTERNAL CREDENTIAL** | Code exists, but an external key/sender/service is missing or invalid. |
| **COMING / IMPLEMENTABLE** | On the roadmap, not built yet. |
| **FUTURE PRO FEATURE** | Planned for Pro; **not available** to anyone yet. |
| **NOT SUPPORTED** | Out of scope / MAN cannot execute this. |

## Capability status

### AVAILABLE NOW
- Conversational AI (text) — when a provider key is set (Gemini/Groq/OpenRouter/GitHub).
- Voice input/output (browser Web Speech API).
- Personal memory (remember / forget / show).
- Calculator.
- Weather lookup (Open-Meteo, no key).
- Web search (DuckDuckGo HTML).
- Places / local lookup.
- Reminder (approval-gated).
- Attachments upload / list / delete (owner-scoped).
- Auth: email + password sign-in, phone OTP sign-in, session revocation, logout.

### REQUIRES EXTERNAL CREDENTIAL
| Capability | Provider / missing |
|---|---|
| SMS OTP delivery | `SMSBD_API_KEY` + `SMSBD_SENDER_ID` (provider reachability not verified from sandbox) |
| Email verification / reset delivery | `RESEND_API_KEY` (last key returned 401 — invalid/revoked) |
| Google OAuth | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + redirect URI |
| Stripe billing / Pro upgrade | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + real product/price IDs |
| Redis / KV global rate limiting | A Redis / Vercel KV provider |
| Multimodal (image/file content analysis) | A multimodal AI provider key |

### COMING / IMPLEMENTABLE
- Pro subscription checkout (blocked on Stripe credentials).
- Server-side telephony voice (needs a provider).
- Real notification delivery outside the app.

### FUTURE PRO FEATURE (NOT available yet)
- Image generation.
- Video generation.
- Advanced research/agent workflows.
- Premium models / tools.

### NOT SUPPORTED
- Build / deploy a complete website or application (MAN can plan and guide, not deploy).
- Edit an existing image.
- Advanced multimedia production.

## Honest behavior
- MAN never claims "I generated it" / "I'm doing it now" for a capability it cannot execute.
- Unsupported capability requests return:
  > *"I can understand and help plan that, but that capability is not currently enabled in MAN. I'm being actively upgraded, and I'll support more capabilities as they become available."*
- Planned-but-not-live Pro capabilities return:
  > *"That capability isn't enabled yet — when it becomes available, it will require the appropriate MAN Pro access."*
- No fake billing, no invented Stripe product/price IDs.

## Timestamps
- Document generated: 2026-08-11 (real date/time at build).
