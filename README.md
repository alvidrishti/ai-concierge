# Tether — Reliable AI Concierge

An AI concierge web app with the **MAA v4.0 trust layer** built in:
persistent memory, real tools, and a **human-in-the-loop approval gate** so
the agent never acts (or guesses) without your explicit OK.

**Portfolio / product:** the missing "trust architecture" that turns a
breakable AI demo into a reliable agent people will pay for. Built on the
same logic as the `personal-task-concierge` portfolio piece, now as a hosted
web app you can deploy to Vercel for free.

## What it demonstrates
- **Persistent memory** — remembers your name/preferences across sessions (Supabase Postgres).
- **Tool use** — reminders, local places lookup (Dhaka), web references.
- **Task orchestration** — decomposes a request into steps, tracks status.
- **Human-in-the-loop approval (MAA Pillar 10)** — before it creates a
  reminder it shows an **Approve / Reject** prompt. No guessing, no silent actions.

## Quick start (local)

```bash
cp .env.example .env.local   # optional: add Supabase for persistent memory
npm install
npm run dev                  # http://localhost:3000
```

## Deploy to Vercel (free) — from GitHub

1. Push this folder to your GitHub repo (e.g. `ai-concierge`).
2. Go to **vercel.com → New Project → Import** your GitHub repo.
3. Vercel auto-detects Next.js → click **Deploy**.
4. (Optional) Add env vars in Project Settings: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
5. Done — your concierge is live on a `*.vercel.app` URL. Share it with friends.

> No GitHub token needed on Vercel if you connect the repo from the Vercel UI.
> If you prefer, you can also run `vercel` CLI and pass your Vercel token.

## Supabase (optional, for persistent memory)

- Create a free Supabase project.
- Run `db/schema.sql` in the SQL editor.
- Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` / Vercel env vars.
- Without it, the app still works but memory resets on each serverless restart
  (fine for a demo).

## Product positioning

- **Who:** SMBs / non-technical clients who want an AI assistant they can trust.
- **Why now:** 85% of enterprises pilot AI agents but only 5% ship them — the
  gap is **trust**, not technology. Most freelancers ship a demo script that
  breaks; this ships an agent with an approval gate, self-QA, and audit.
- **Monetization:** $1,500–5,000 setup + monthly retainer (Upwork), or
  $5–10/user/mo as a hosted product.

---
*Tether — Reliable AI Concierge. Built on the Master AI Architect (MAA) v4.0
Ecosystem — trust layer (Pillars 10–16). By MD Rayhan Mia.*
