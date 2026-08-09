# MAN — Personal AI Intelligence Agent

> **MAN** is a professional, private, multi-user personal AI assistant
> created by **MD Rayhan Mia** (Rangpur, Bangladesh).
> It is not a generic chatbot — it is a real AI agent with memory, tools,
> voice, and a human-in-the-loop approval gate.

**Identity:** MAN · Personal AI Intelligence Agent · Created by MD Rayhan Mia · Rangpur, Bangladesh

---

## Core capabilities

| Capability | How |
|---|---|
| **Natural AI conversation** | LLM provider router — Gemini → Groq → OpenRouter → GitHub Models, with graceful failover. Never fabricates; if all providers fail it says so. |
| **Persistent memory** | Per-user long-term memory (Supabase Postgres). Users can view & delete what MAN remembers. |
| **Multi-user** | 10 trusted users target, scalable. Every memory/conversation is isolated by `user_id` with server-side auth. |
| **Voice** | Browser STT + TTS (microphone button, listening/speaking/processing states). Graceful text fallback if unsupported. |
| **Knowledge about MD Rayhan Mia** | Structured knowledge base + relevant-context retrieval (only relevant entries sent to the model). |
| **Conversation history** | Per-user history, restored on reload. |
| **Human-in-the-loop approval** | Consequential actions (reminders) are held in PENDING and need explicit Approve/Reject (MAA Pillar 10). |
| **Tools** | Reminders, local places lookup (Dhaka), from the original Tether concierge. |
| **Rate limiting + usage monitoring** | Configurable daily limits + admin-only usage view (which provider, which user, errors). |

## AI provider routing

Priority: **Gemini → Groq → OpenRouter → GitHub Models → friendly error.**

- All keys stay server-side (Vercel env vars). Never exposed to the browser.
- The router handles provider failure, rate limits, timeouts, and unavailable
  models automatically. It never fakes a success.

## Quick start (local)

```bash
cp .env.example .env.local
# add GEMINI_API_KEY (or Groq/OpenRouter), AUTH_SECRET, SUPABASE_URL/KEY
npm install
npm run dev          # http://localhost:3000
```

Login as any name + password (admin login uses `ADMIN_PASS`).

## Deploy to Vercel (free)

1. Push this folder to your GitHub repo.
2. Vercel → New Project → Import the repo → Deploy.
3. Add env vars in Project Settings: `GEMINI_API_KEY` (or others),
   `AUTH_SECRET`, `ADMIN_PASS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `db/schema.sql` in Supabase SQL editor.

## Environment variables

See `.env.example`. Key ones:
- `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_TOKEN` — AI providers
- `AUTH_SECRET` — signs session tokens (long random string)
- `ADMIN_PASS` — creator/admin login
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — multi-user memory/conversations/usage
- `MAN_TEXT_DAILY`, `MAN_VOICE_MIN_DAILY` — rate limits (configurable)

## Security

- Server-side API keys, never in frontend or committed.
- Server-side auth + user isolation on every query.
- Rate limiting, input validation, safe error messages (no raw stack traces).
- Private memory never mixed between users.

## Tests

```bash
npx tsx scripts/mock_test.ts     # 9 checks: tools, approval, knowledge, billing
```

## Preserved from Tether

The existing concierge features are kept: reminders, local places lookup,
WhatsApp (Twilio) webhook, Stripe billing, and the MAA v4.0 approval gate —
all now user-scoped.

---
*MAN — Personal AI Intelligence Agent. Created by MD Rayhan Mia, Rangpur, Bangladesh.*
*Built on the Master AI Architect (MAA) v4.0 Ecosystem.*
