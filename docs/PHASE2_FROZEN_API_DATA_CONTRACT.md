# MAN — PHASE 2: FROZEN API & DATA CONTRACT (Expo Mobile Client)

**Status:** ARCHITECTURE FREEZE (approved) · **Phase 2 — Backend Contract Freeze (in progress, authorization granted)**
**Mode:** Contract definition — DOCUMENT ONLY. No production-data mutation, no DROP, no push/deploy.
**Author:** Arena Agent (on behalf of **MD RAYHAN MIA**)
**Generated:** 2026-08-12 (real timestamp)
**Grounding:** every endpoint shape below was **read from the actual repo** (`alvidrishti/ai-concierge`, commit `e1c18ba`). Items marked **[ADD]** are new and not yet in code; **[REUSE]** are existing and locked; **[FIX]** are existing-but-to-be-corrected; **[HIDE]** are de-scoped.

This document is the **single source of truth the Expo mobile client is built against**. It supersedes earlier ad-hoc shapes. Next.js remains the backend service.

---

## 0. GLOBAL CONVENTIONS (freeze)

- **Base URL:** `https://ai-concierge-lake-three.vercel.app` (prod); `/api` prefix on all routes.
- **Auth transport — [FIX/ADD]:** web uses httpOnly `man_token` cookie; **Expo cannot use httpOnly cookies**. Add a **Bearer token** path:
  - Login/signup returns a token in the JSON body **additionally** (kept secret, stored in **Expo SecureStore**).
  - Mobile sends `Authorization: Bearer <token>`.
  - Server-side: `getSession()` falls back to Bearer header when no cookie present. **Reuse** existing `verifyToken` (jti revocation still enforced).
- **Error shape (all):** `{ error: string }` with HTTP status. `401` unauthenticated, `403` forbidden/unverified/Pro-gated, `429` rate-limited, `400` bad input, `201` created, `404` not found.
- **Success list shape:** `{ <plural>: [...] }` (e.g. `{ records }`, `{ debts }`, `{ plans }`, `{ threads }`, `{ capabilities }`).
- **Success mutation shape:** `{ ok: true, <entity>: {...} , ...summary? }`.
- **Numbers:** amounts in **BDT**, returned as `number` (already rounded by libs). `created_at`/timestamps ISO-8601 UTC.
- **Identity:** `user_id` is **always derived server-side from the authenticated session** — never trusted from the client.
- **Isolation:** all data routes filter by `user_id`; RLS enforced. No cross-user access.
- **Capability status values (frozen, §13):** `AVAILABLE` · `REQUIRES EXTERNAL SERVICE` · `PRO` · `PLANNED` · `UNAVAILABLE`. (Backend `CapabilityStatus` enum to be mapped: `available→AVAILABLE`, `requires_credential→REQUIRES EXTERNAL SERVICE`, `future_pro→PRO`, `coming→PLANNED`, `not_supported→UNAVAILABLE`, `degraded→BETA`.)

---

## 1. AUTH / SESSION (freeze §11, §12)

### POST /api/auth/signup  [FIX — remove auto-activate]
Request `{ name, email?, phone?, password }`
- **[FIX, CRITICAL]** Remove the `if (!delivered.ok) → status:"active" + sign in` path. Unverified email must NOT become `active`.
- Response on success → `{ ok: true, status: "pending", needsVerification: "email" | "phone", message }`.
- **[ADD]** If email delivery is unavailable, return `{ ok:true, status:"pending", needsVerification:"email", fallback:"otp"|"resend", message }` — user can resend or verify by phone OTP; **never auto-active**.
- Email format validated; duplicate email/name → 409; password ≥6.

### POST /api/auth/login  [REUSE + ADD token-in-body]
Request `{ name?, email?, password, isAdmin? }`
- Response `{ ok:true, userId, name, role }` **[ADD]** `+ token` (for SecureStore on native).
- Unverified → 403 `"Please verify your account before logging in."`; disabled → 403; wrong creds → generic 401 (no enumeration).

### POST /api/auth/logout  [REUSE]
Revokes jti. Cookie cleared; Bearer token becomes invalid on server (revoked session).

### POST /api/auth/logout-all  [REUSE]
Revokes all sessions.

### GET /api/me  [REUSE + extend for cold-start]
Current: `{ authenticated, user:{id,name,role}, memory, conversation, reminders, stats }`
**[ADD]** return `plan` (from entitlements) and `profile` name, so TODAY can render identity on restore.
- Cold-start flow: app launches → call `GET /api/me` with stored token → if `authenticated:true` → restore session → TODAY (no login). If `401`/`authenticated:false` → clear token → login.

### POST /api/auth/forgot · /api/auth/reset · /api/auth/otp · /api/auth/verify-email · /api/auth/sessions  [REUSE]
- Verify-email consumes one-time hashed token; sets `email_verified_at` + `status='active'`.
- OTP: hashed code, expiry, attempt limit, cooldown. **Rate-limited** (login/forgot/reset/OTP/verify) — [REUSE] process-local; distributed only when Redis present.
- Sessions: list/revoke devices.

### [ADD] POST /api/auth/pin  (optional local PIN)
`{ pin }` → store hashed PIN; unlock locally. No network dependency.

---

## 2. TODAY (freeze §5) — aggregate home

### [ADD] GET /api/today
Returns everything TODAY needs in one call (client = 1 round trip):
```
{
  ok: true,
  date: "YYYY-MM-DD",
  greeting: { bn, en, name },
  tasks:     [ {id, date, time, title, category, done, note} ],   // today, not done
  reminders: [ {id, title, when, status} ],                        // upcoming
  today:     { income: number, expense: number },
  balance:   number,             // lifetime income-expense
  savings:   number,             // month income - month expense [ADD concept]
  debt:      { totalLent, totalBorrowed, net, outstanding: [{person, amount, direction}] },
  notes:     [ {id, title, body, pinned, updated_at} ],            // [ADD notes]
  routine:   [ {id, title, recurrence, next} ],                    // [ADD routines]
  insight:   { text: string | null }   // MAN-grounded; null if no data (never invented)
}
```
Implementation note: `GET /api/today` aggregates existing `lib/finance`, `lib/debt`, `lib/daily_life`, memory reminders, plus new notes/routines. **[REUSE]** existing summary libs; **[ADD]** the endpoint only.

---

## 3. MONEY (freeze §6)

### GET /api/finance  [REUSE]
`{ records: FinanceRecord[], summary: { income, expense, balance, byCategory } }`
`FinanceRecord`: `{ id, user_id, type:"income"|"expense", category, amount, note?, created_at }`

### POST /api/finance  [REUSE + categories]
`{ type, category, amount, note? }` → `{ ok:true, record, summary }` (201)
**[REFACTOR]** categories to freeze set:
- Income: `salary, service_charge, business, freelance, gift, other_income`
- Expense: `rent, electricity, gas, water, internet, mobile, food, grocery, transport, education, medical, shopping, family, other_expense`
- **[ADD]** user-defined categories (store list per user; UI lets them add).

### DELETE /api/finance?id=  [REUSE]
`{ ok:true, summary }`

### [ADD] GET /api/money/summary?month=YYYY-MM
`{ month, income, expense, balance, savings, harLabh, isProfit, byCategory, byDay }` — reuses `monthlySummary` + derives savings.

### [ADD] GET /api/money/savings  (or fold into summary)
Savings computed from actual income/expense data. No separate invented table unless needed.

### GET /api/debts  [REUSE]
`{ debts: DebtRecord[], summary:{ totalLent, totalBorrowed, net } }`
`DebtRecord`: `{ id, user_id, direction:"lent"|"borrowed", person, amount, date?, reason?, status:"open"|"returned"|"settled", created_at }`

### POST /api/debts  [REUSE]  ·  PATCH /api/debts  [REUSE]  ·  DELETE /api/debts?id=  [REUSE]

### [ADD] REPAYMENTS (freeze §6 — first-class)
- Table `repayments`: `{ id, user_id, debt_id, amount, date, note?, created_at }` (RLS, user-scoped).
- `GET /api/repayments?debt_id=` → list repayments for a debt.
- `POST /api/repayments` `{ debt_id, amount, date?, note? }` → creates repayment, reduces debt `remaining`; when remaining ≤0 → debt status `settled` (or `returned`).
- **[ADD]** `debts.remaining` column (computed from original − sum(repayments)) OR derive in summary. Decision: **derive in summary** to avoid migration risk; store original `amount`.
- Answers: *who owes me / whom I owe / how much paid back / remaining.*

### GET /api/finance/pdf  [REUSE]
Finance report PDF (already works; pure-JS). Branding note: footer currently uses "HOTELIAN" — **[REFACTOR]** to "MAN · Personal Daily Life OS · Developed by MD RAYHAN MIA" per directive.

---

## 4. PLAN (freeze §7)

### GET /api/plans?date=YYYY-MM-DD  [REUSE]
`{ plans: [{ id, user_id, date, time, title, category, done, note, created_at }] }`
Categories: `task, work, health, errand, family, other` **[REFACTOR]** + `routine, recurring` distinctions [ADD].

### POST /api/plans  [REUSE]
`{ date, time?, title, category?, note? }` → `{ ok:true, plan }` (201)

### PATCH /api/plans (action=toggle&id&done) · DELETE /api/plans?id=  [REUSE]

### [ADD] /api/reminders (dedicated)
Currently reminders live in `lib/memory` (addReminder/listReminders). Expose:
- `GET /api/reminders` → list user reminders
- `POST /api/reminders` `{ title, when }` → create
- `DELETE /api/reminders?id=` → remove
*(Reuses existing memory lib; no new table needed — `reminders` table exists.)*

### [ADD] GET/POST/PATCH/DELETE /api/notes
First-class notes (table `notes`: `{ id, user_id, title, body, category?, pinned, created_at, updated_at }`, RLS).
- GET (list, optional `?pinned=1` / `?q=`), POST, PATCH (edit/pin), DELETE.

### [ADD] POST /api/plans/from-nl
`{ text }` → `{ ok:true, candidate: { kind:"task"|"reminder"|"routine"|"note", title, date?, time?, recurrence? }, humanReview:true }`
MAN parses natural language; **user always reviews/edits before saving**. If MAN is unsure → return `{ ok:true, parsed:false, suggestion:null }` (never fabricate).

### [ADD] GET/POST/DELETE /api/routines
Routines + recurring activities: `{ id, user_id, title, recurrence, time?, active }`. (Additive; may reuse `daily_plans` with `recurring` flag or new table — decision at Phase 10/impl.)

---

## 5. MAN (AI) (freeze §8)

### POST /api/chat  [REUSE]
Request `{ message, threadId? }` → `{ reply, threadId, provider?, ... }` (actual `Turn` shape). Rate-limited (daily limit). Threads auto-created/owned.
- **Grounded:** agent uses user life data (finance/debt/plans/memory) as context when relevant. **Never fabricates**; if data missing, says so.
- This is the **MAN tab** surface only — not the home.

### GET /api/conversations · POST /api/conversations · POST /api/conversations/action  [REUSE]
Threads CRUD/rename/delete; `action` route handles rename/delete.

### GET /api/memory · DELETE /api/memory?key=  [REUSE]
Inspect/edit/delete user memory (user-owned, private).

---

## 6. MORE (freeze §9)

### GET /api/profile · PATCH /api/profile  [REUSE + de-scope]
`[REFACTOR]` business/hotel fields (`business_name`, `business_type`) become optional/removed from primary; keep `full_name, phone, email, address, district, division, avatar_url, bio`. Profile returns `{ profile }`.

### GET /api/capabilities  [REUSE + map]
`{ capabilities: [{ id, name, status, tier, description, limitations }] }` with status mapped to frozen 5-state vocab.

### GET /api/feedback · POST /api/feedback  [REUSE]
Categories: `bug, wrong_answer, missing_capability, feature_request, ux_issue, safety, general`. Per-user private. Fields: `user_id, category, message, rating?, capability?, thread_id?, message_id?, created_at, status, priority`.
Optional screen/module tag **[ADD]**.

### GET /api/usage  [REUSE] (admin-only)
System/provider status.

### [ADD] GET /api/me/plan (or fold into /api/me)
Return user's `entitlements`/`plan` so MORE can show Subscription honestly (Free = core; Pro gated; no fake billing).

---

## 7. DATA MODEL — FROZEN (freeze §15, §25)

**Existing — [REUSE] (do not touch):** `users, profiles, sessions, conversation_threads, conversations, user_memory, reminders, pending_actions, usage_log, subscriptions, password_reset_tokens, verification_codes, verification_tokens, attachments, entitlements, feedback, finances, daily_plans, debts`.

**Additive — [ADD] (new, justified by frozen architecture):**
| Table | Columns (all + `user_id` + `created_at`) | Purpose |
|---|---|---|
| `repayments` | `id, debt_id, amount, date?, note?` | Repayment history; derive remaining. |
| `notes` | `id, title, body, category?, pinned` | First-class notes (PLAN + TODAY). |
| *(income/expenses/savings)* | — | **Decision:** keep single `finances` table with `type` + category segregation; add `savings` as a **derived** value (month income − month expense). No new split tables → avoids migration risk. |

**De-scoped — [HIDE] (keep in DB, not primary):** `hotels, bookings, invoices` remain for migration compatibility, **not exposed in primary nav**, not defining identity.

**Guardrail:** no new table without Product Fit Check + approval (freeze §25).

---

## 8. CAPABILITY MATRIX (frozen, for client rendering)

| Capability | Status now | Frozen state |
|---|---|---|
| Text AI (`chat_text`) | available (if provider key) | **AVAILABLE** (or REQUIRES EXTERNAL SERVICE) |
| Voice (`chat_voice`) | available | **AVAILABLE** |
| Memory | available | **AVAILABLE** |
| Tools (calc/weather/web/places/reminder) | available (live) | **AVAILABLE** (weather/web need keys → REQUIRES EXTERNAL SERVICE if missing) |
| Attachments (image/file upload) | available but **Pro-gated** | **PRO** (real entitlement) |
| SMS OTP / Email / Google OAuth / Stripe / multimodal | requires_credential | **REQUIRES EXTERNAL SERVICE** |
| Image/video/website generation | coming/not_supported | **PLANNED / UNAVAILABLE** (never pretend) |
| Distributed rate limit | not present | **REQUIRES EXTERNAL SERVICE** (Upstash Redis) |

Client rule: render status honestly; **no fake "done"**, no fake Pro, no fake payment.

---

## 9. REUSE vs ADD vs FIX vs HIDE (summary)

**REUSE (no code change):** login/logout/logout-all/otp/reset/forgot/verify-email/sessions · me · chat · conversations · memory · finance+pdf · debts · plans · profile · feedback · capabilities · usage · upload/attachments · entitlements lib.
**ADD (new contracts):** `/api/today` · `/api/money/summary` · `/api/repayments` · `/api/notes` · `/api/reminders` (route) · `/api/routines` · `/api/plans/from-nl` · `/api/auth/pin` · Bearer-token transport · `plan` in `/api/me`.
**FIX (correct defects):** signup auto-activate (CRITICAL) · password hashing HMAC→argon2/bcrypt (Phase 3) · capability status vocab map · PDF footer branding.
**HIDE (de-scope):** hotels/bookings/invoices from primary UX · profile business fields.

---

## 10. CONFLICT CHECK vs MASTER EXECUTION DIRECTIVE

All contracts above are consistent with the directive. **No blocking conflict found in Phase 2.** Items deferred to their phases per directive §23 (password hash & signup verification → Phase 3 Auth hardening; entitlement/Pro → Phase 13; external → Phase 14; security QA → Phase 15). This Phase-2 deliverable is the contract that makes those later phases implementable without re-spec.

---

## 🛑 PHASE 2 STATUS

Frozen API/data contract **produced** (this document). No production data modified, no DROP, no push/deploy. 
**Stopping here** per directive — Phase 3 (Auth/session hardening) begins only on your explicit go. If you want this contract checked into `docs/` in the repo (still no push), say the word.
