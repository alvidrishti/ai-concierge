# MAN — Master Product Hardening & Intelligence Evolution Pass — Report

**Author:** MD Rayhan Mia (creator of MAN — Personal AI Intelligence Agent)
**Generated:** 2026-08-11 07:10 UTC (real build timestamp)
**Scope:** Phases 1–15 of the hardening pass.

> Honesty statement: everything below that is claimed as implemented + tested is
> backed by the build (`next build`), TypeScript (`tsc`), lint, and the test
> suites. Nothing is marked "production-ready" beyond what is verified. External
> integrations that need credentials are labelled **EXTERNAL CREDENTIAL REQUIRED**.

---

## 1. AUTH DEFECTS FOUND

| # | Defect | Severity |
|---|---|---|
| D1 | **Account creation via login.** The old `/api/auth/login` auto-created an account when the name was unknown, so anyone could "register" a foreign email/name with a made-up password. | High |
| D2 | **No email verification.** `/api/auth/signup` created an account and issued a session immediately — an email address never had to be owned/confirmed. | High |
| D3 | **Account enumeration / no generic errors.** Login revealed whether an account existed (by auto-creating or by distinct messages). | Medium |
| D4 | **Phone signup not verified at creation** — phone-based accounts could be created without proof of the phone. | Medium |
| D5 | **No session/device management** — only a single logout; no per-device revoke or logout-all. | Medium |
| D6 | **Legacy accounts have no lifecycle status** — could block existing users once a status column was added (mitigated with grandfather backfill). | Low |

## 2. AUTH FIXES

- **Login no longer auto-creates accounts** — it only authenticates existing ones; unknown account → generic `401 invalid credentials` (D1, D3).
- **Login requires the account to exist, a valid password, and an active status.** Wrong password → generic 401 (does not reveal existence). Correct password but unverified → 403 (revealed only after correct password, so not an enumeration vector). Disabled → 403. (D3)
- **Signup now validates email format** before accepting (D2).
- **Signup creates a PENDING (UNVERIFIED) account and sends a verification email**; no session is issued until verified (D2).
- **Phone signup routes through mandatory OTP**; the account activates only on successful OTP (D4).
- **Legacy grandfathering** — pre-existing accounts (status NULL) set to `active` so they are not locked out (D6).
- Added device/IP metadata capture on session issuance and session listing (D5).

## 3. ACCOUNT VERIFICATION MODEL

- **Email:** signup → `status='pending'` → create one-time verification token (cryptographically random, **hashed** in DB, **expiring 24h**, **one-time**, **attempt-limited** to 10) → email sent via Resend adapter → `/api/auth/verify-email?token=...&uid=...` consumes the token → sets `email_verified_at` and `status='active'`. Replay rejected; wrong-user tokens rejected.
- **Phone:** signup → pending → OTP request/verify (`/api/auth/otp`) → on success sets `phone_verified_at` + `status='active'`.
- **Login gate:** `status='active'` required (new accounts). No session issued pre-verification.
- Verification tokens persisted in a new `verification_tokens` table (hashed, one-time, expiring, attempt-limited).
- **Never fakes delivery** — if the email provider is missing/invalid the account stays `pending` and the response says delivery is pending (no fabricated "sent").

## 4. DEVICE / SESSION SECURITY

- Each session has `jti`, `user_id`, `created_at`, `last_seen_at`, `revoked`, `revoked_at`, plus privacy-safe `device`, `ip`, `user_agent`.
- New endpoint `GET/POST /api/auth/sessions`:
  - `GET` — list current sessions (+ the current `jti`).
  - `revoke` (individual, ownership-checked), `logout_current`, `revoke_all`.
- Accounts are **not** locked to one physical device — legitimate login from a new device works after correct authentication.
- Existing logout + `revokeSession`/`revokeAllSessions` (jti) preserved.

## 5. UNKNOWN CAPABILITY BEHAVIOR

- Central **CAPABILITY_REGISTRY** in `lib/capabilities.ts` (status, tier, provider, enabled, tool, description, limitations).
- `classifyCapabilityRequest()` detects unsupported intents (image/video generation, edit image, build/deploy a full website/app, multimodal analysis, advanced media).
- Honest canonical response for un-enabled capabilities:
  > *"I can understand and help plan that, but that capability is not currently enabled in MAN. I'm being actively upgraded, and I'll support more capabilities as they become available."*
- Planned-but-not-live **Pro** capabilities return:
  > *"That capability isn't enabled yet — when it becomes available, it will require the appropriate MAN Pro access."*
- MAN never claims "I generated it" / "I'm doing it now" for something it can't execute. Registry drives the behavior and can be updated as capabilities go live.

## 6. FREE / PRO ARCHITECTURE

- Entitlement layer (`lib/entitlements.ts` + `public.entitlements` table) already existed; verified it stays the authoritative gate (server-side, never client trust).
- **No fake billing.** Stripe connection is **EXTERNAL CREDENTIAL REQUIRED** (`STRIPE_SECRET_KEY`, webhook secret, real product/price IDs). No invented Stripe IDs are used.
- Future Pro capabilities (image/video gen, premium tools) are listed as `future_pro` and return the "requires MAN Pro" honesty message — they are **not** available to anyone yet.
- `docs/CAPABILITY_ROADMAP.md` classifies every capability as AVAILABLE NOW / REQUIRES EXTERNAL CREDENTIAL / COMING / FUTURE PRO / NOT SUPPORTED.

## 7. BRAND / UI CHANGES

- New centralized **brand system** `components/brand.tsx`:
  - `BrandLockup` — canonical mark↔wordmark ratio (wordmark = mark×0.62, gap = mark×0.3), optional tagline + animated caret.
  - `BrandCenter` — centered lockup for auth/splash.
  - `BrandLoader` — branded loading animation.
- Brand CSS tokens (`manBlink`, `brand-loader` pulse, `man-splash` fade) added to `globals.css`.
- Logo/mark reused from existing `ManLogo`/`ManMark` so proportions stay consistent across screens.

## 8. FEEDBACK ENGINE

- `lib/feedback.ts` + `public.feedback` table + `POST/GET /api/feedback`:
  - Categories: bug / wrong_answer / missing_capability / feature_request / ux_issue / safety / general.
  - Fields: feedback_id, user_id, category, message, rating, conversation_id, thread_id, message_id, capability, created_at, status, priority, admin_notes, resolution, resolved_at.
  - **Privacy-first:** does NOT dump the whole conversation; context only when the user explicitly supplies it.
- Default priority mapping: safety→critical, bug→high.

## 9. FEEDBACK ENGINE / LEARNING LOOP (admin)

- `GET/PATCH /api/admin/feedback` (admin-only, role-checked):
  - `GET?scope=all|metrics`.
  - `PATCH` — set status/priority/admin_notes/resolution.
- Metrics: total, open, resolved, high-priority, by-category, by-status, capability-request counts, avg rating.
- **Feedback is evidence, not authority** — MAN does not auto-change production behavior from a single submission.
- Example mapping captured: 100 "doesn't understand Banglish" → cluster "Banglish understanding" → high priority → language-processing improvement. 50 "image generation" → capability demand → roadmap.

## 10. PERSONAL INTELLIGENCE: RAYHAN

- `lib/personal_intelligence.ts` — structured layer with provenance and status:
  - Statuses: CANDIDATE / VERIFIED / APPROVED / REJECTED / OUTDATED.
  - Only **VERIFIED/APPROVED** facts are authoritative.
  - Facts carry: fact, category, source (provenance), confidence, status, created/updated, approved, keywords.
  - Covers identity, birthplace, village/roots, location, work, AI work, projects (MAA, Alvi Drishti, GEO), role, future plans (Hungary/Cyprus), tools, business goal (paid after ~20-user feedback), language/communication.
- Distinguishes "explicitly told" (approved) vs "inferred" vs "unknown"; never fabricates personal knowledge.

## 11. BANGLADESH / CULTURAL REALITY INTELLIGENCE

- `lib/bangladesh.ts` — structured context (no stereotypes): divisions/districts/upazilas/unions, Bangla/Banglish, currency + MFS (bKash/Nagad/Rocket/Upay), employment & economy, transport, digital behaviour, climate/season, markets. Each entry has a labelled confidence (high/medium).
- `BD_UNCERTAINTY` directive tells MAN to say "uncertain" rather than guess on specific local details.

## 12. ALVI DRISHTI KNOWLEDGE INGESTION — STATUS

**PENDING — source documents not yet provided.** Nothing has been integrated from ALVI DRISHTI.
- `lib/alvi_integration.ts` holds the proposed classification vocabulary and a **pending** mapping table driven by the known conceptual pipeline (Reality → DNA → Context → Decision → Memory → Prediction → Simulation → Civilization Intelligence) and the V20–V24 concepts from the brief.
- All rows are explicitly `status:"pending"` until the actual V20–V25 documents are read in full. We do **not** invent ALVI concepts absent from the supplied docs.

## 13. ALVI → MAN INTEGRATION MAP (proposed, pending docs)

| ALVI component | Version | Classification | Proposed MAN layer |
|---|---|---|---|
| Missing Reality Detection | V23 | DIRECTLY USEFUL | Uncertainty / Missing-information detector |
| District DNA | V20 | ADAPTABLE | Bangladesh Context Layer |
| Profession DNA | V21 | ADAPTABLE | Human Context / Decision Layer |
| Life Stage DNA | V22 | ADAPTABLE | User Context Layer |
| Human Decision Engine | V23 | ADAPTABLE | Planning / Recommendation Layer |
| Reality Memory | V24 | ADAPTABLE | Contextual memory architecture |
| Cross-DNA Query | V24 | ADAPTABLE | Multi-dimensional reasoning layer |
| Context Fusion / Master Integration Engine | V24 | ADAPTABLE | MAN Context Fusion Layer |
| Reality Atlas / Global Reality Atlas | V20/V23 | REFERENCE ONLY | — |
| Observation Intelligence | V20 | ADAPTABLE | Input/Observation layer |

> Final classification will be locked after reading the supplied ALVI DRISHTI documents.

## 14. NEW INTELLIGENCE LAYERS

- `lib/intelligence.ts` — the MAN Intelligence Stack + `assembleContext()` context-fusion helper, with clean memory separation (Personal / Conversation / Contextual / Product Feedback / System / External retrieved). No duplicate memory systems.
- `lib/uncertainty.ts` — UNKNOWN/UNCERTAINTY engine with confidence (high/medium/low/none), source attribution, and an honest-response guard. Integrated into the agent.
- Agent now injects approved personal facts + Bangladesh context + uncertainty directive into the LLM system prompt, and short-circuits clearly-missing personal details rather than hallucinating.

## 15. FILES CHANGED

**Modified:**
- `app/api/auth/login/route.ts` — no auto-create; require active account; generic errors; device metadata.
- `app/api/auth/signup/route.ts` — PENDING lifecycle + email verification; phone→OTP.
- `app/api/auth/otp/route.ts` — marks phone verified/active; device metadata.
- `lib/auth.ts` — optional device/IP metadata on `signToken`.
- `lib/agent.ts` — capability honesty + intelligence context + uncertainty guard.
- `app/page.tsx` — splash + verification-aware signup flow.
- `app/globals.css` — brand/startup CSS.
- `db/schema.sql` — lifecycle columns, verification_tokens, feedback, sessions metadata, legacy backfill.
- `.env.example` — verification notes.

**Added:**
- `lib/account.ts`, `lib/capabilities.ts`, `lib/uncertainty.ts`, `lib/personal_intelligence.ts`, `lib/bangladesh.ts`, `lib/intelligence.ts`, `lib/alvi_integration.ts`, `lib/feedback.ts`
- `app/api/auth/verify-email/route.ts`, `app/api/auth/sessions/route.ts`
- `app/api/feedback/route.ts`, `app/api/admin/feedback/route.ts`
- `components/brand.tsx`, `components/ManSplash.tsx`
- `scripts/hardening_test.ts`
- `docs/CAPABILITY_ROADMAP.md`, `docs/HARDENING_REPORT.md`

## 16. DATABASE CHANGES

New/changed objects in `db/schema.sql` (idempotent):
- `public.users`: + `status`, `email_verified_at`, `phone_verified_at`; legacy backfill to `active`.
- New `public.verification_tokens` (hashed, one-time, expiring, attempt-limited).
- New `public.feedback` (+ indexes on user, status).
- `public.sessions`: + `last_seen_at`, `device`, `ip`, `user_agent`.

> **Not yet applied** to the live Supabase project. Applying is a deployment step — not done because no deployment was authorized this turn. The schema is ready to run in the Supabase SQL editor.

## 17. TEST RESULTS

- `scripts/hardening_test.ts` — **37 passed, 0 failed** (account verification lifecycle, capability registry/honesty, personal intelligence, Bangladesh context, ALVI map, uncertainty, feedback engine, roadmap buckets).
- `scripts/security_test.ts` — 17 passed.
- `scripts/mock_test.ts` — 9 passed.
- `scripts/product_test.ts` — 24 passed.
- `scripts/thread_isolation_test.ts` — 4 passed.
- `tsc --noEmit` — clean. `next lint` — no warnings/errors. `next build` — compiled successfully, 33 static pages.

## 18. REMAINING EXTERNAL CREDENTIALS

- **RESEND_API_KEY** — provided key returned 401 (invalid/revoked). Needed for real email verification + reset delivery. **EXTERNAL CREDENTIAL REQUIRED.**
- **SMSBD_API_KEY / SMSBD_SENDER_ID** — endpoint not reachable from sandbox (HTTP:000); delivery not verified end-to-end. **EXTERNAL CREDENTIAL REQUIRED.**
- **Google OAuth** — GOOGLE_CLIENT_ID/SECRET + redirect URI. **EXTERNAL CREDENTIAL REQUIRED.**
- **Stripe** — secret + webhook secret + real price IDs. **EXTERNAL CREDENTIAL REQUIRED.**
- **Redis / Vercel KV** — for globally-accurate rate limiting. **EXTERNAL CREDENTIAL REQUIRED.**
- **Multimodal AI provider key** — for image/file content analysis. **EXTERNAL CREDENTIAL REQUIRED.**

## 19. REMAINING LIMITATIONS / WHAT WAS NOT VERIFIED

- **Email verification delivery is not live-verified** — code + flow tested in-process, but real delivery needs a valid RESEND_API_KEY. Until then, email signups remain PENDING and cannot log in (correct secure behaviour, but requires the credential to be usable).
- **Real SMS OTP delivery not verified** end-to-end.
- **ALVI DRISHTI V20–V25** not ingested — source documents not yet supplied (Phase 11/13 pending).
- **No deployment / DB migration applied** — schema.sql is ready but not run against production.
- **No push to GitHub / no token usage** — none authorized this turn; existing keys may be revoked.
- Multimodal analysis, image/video generation, website/app generation remain **not enabled** (honestly classified).
- Process-local rate-limit counters remain a documented limitation until a Redis/KV adapter is added.
