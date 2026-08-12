-- MAN — Personal AI Agent schema (multi-user).
-- Run in Supabase SQL editor. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

-- Users (auth identities + profiles)
create table if not exists public.users (
  id text primary key,
  name text,
  email text,
  phone text,                          -- phone for OTP auth
  role text default 'user',            -- 'user' | 'admin'
  password_hash text,
  status text default 'pending',       -- 'pending' | 'active' | 'disabled'  (Phase 1 account lifecycle)
  email_verified_at timestamptz,       -- set when email verification token consumed
  phone_verified_at timestamptz,       -- set when phone OTP verified
  created_at timestamptz default now()
);
-- Phase 1: add lifecycle columns idempotently (in case table already exists)
alter table public.users add column if not exists status text default 'pending';
alter table public.users add column if not exists email_verified_at timestamptz;
alter table public.users add column if not exists phone_verified_at timestamptz;
alter table public.users enable row level security;
-- Grandfather legacy accounts (created before the verification columns): their
-- status is NULL, so set them to 'active' so they are NOT locked out. New
-- accounts are created explicitly as 'pending' and are unaffected by this.
update public.users set status = 'active' where status is null;

-- Per-user long-term memory (key/value, scoped to user)
create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  key text not null,
  value text,
  created_at timestamptz default now(),
  unique (user_id, key)
);
alter table public.user_memory enable row level security;

-- Conversation threads (Phase 1 — chat history). Scoped per user.
create table if not exists public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.conversation_threads enable row level security;

-- Per-user conversation history (messages belong to a thread)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.conversation_threads(id) on delete cascade,
  user_id text not null,
  role text not null,                  -- 'user' | 'assistant'
  content text,
  provider text,
  created_at timestamptz default now()
);
alter table public.conversations enable row level security;

-- Reminders (scoped to user)
create table if not exists public.reminders (
  id text primary key,
  user_id text not null,
  title text not null,
  "when" text,
  status text default 'scheduled',
  created_at timestamptz default now()
);
alter table public.reminders enable row level security;

-- Pending approval actions (scoped to user)
create table if not exists public.pending_actions (
  id text primary key,
  user_id text not null,
  intent text not null,
  summary text,
  detail text,
  state text default 'PENDING',
  created_at timestamptz default now()
);
alter table public.pending_actions enable row level security;

-- Usage log (rate limiting + admin monitoring)
create table if not exists public.usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,                  -- 'text' | 'voice'
  provider text,
  tokens int,
  error text,
  created_at timestamptz default now()
);
alter table public.usage_log enable row level security;

-- Subscriptions (Stripe)
create table if not exists public.subscriptions (
  id text primary key,
  user_id text,
  plan text,
  status text default 'active',
  stripe_session_id text,
  created_at timestamptz default now()
);
alter table public.subscriptions enable row level security;

-- ---- Policies: service role (app backend) has full access ----
drop policy if exists "service role all" on public.users;
create policy "service role all" on public.users for all using (true) with check (true);
drop policy if exists "service role all" on public.user_memory;
create policy "service role all" on public.user_memory for all using (true) with check (true);
drop policy if exists "service role all" on public.conversation_threads;
create policy "service role all" on public.conversation_threads for all using (true) with check (true);
drop policy if exists "service role all" on public.conversations;
create policy "service role all" on public.conversations for all using (true) with check (true);
drop policy if exists "service role all" on public.reminders;
create policy "service role all" on public.reminders for all using (true) with check (true);
drop policy if exists "service role all" on public.pending_actions;
create policy "service role all" on public.pending_actions for all using (true) with check (true);
drop policy if exists "service role all" on public.usage_log;
create policy "service role all" on public.usage_log for all using (true) with check (true);
drop policy if exists "service role all" on public.subscriptions;
create policy "service role all" on public.subscriptions for all using (true) with check (true);

-- ---- Performance indexes (non-destructive) ----
create index if not exists idx_user_memory_user on public.user_memory(user_id);
create index if not exists idx_conversation_threads_user on public.conversation_threads(user_id);
create index if not exists idx_conversations_user_thread on public.conversations(user_id, thread_id);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_pending_actions_user on public.pending_actions(user_id, state);
create index if not exists idx_usage_log_user on public.usage_log(user_id);
create index if not exists idx_usage_log_time on public.usage_log(created_at);

-- ============ ACCOUNT RECOVERY / VERIFICATION ============

-- Password reset tokens (one-time, hashed, expiring)
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  token_hash text not null,          -- hashed token, never stored plaintext
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default now()
);
alter table public.password_reset_tokens enable row level security;

-- Verification codes (email/phone OTP)
create table if not exists public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,                -- 'email' | 'phone' | 'password_reset'
  code_hash text not null,           -- hashed code
  expires_at timestamptz not null,
  attempts int default 0,
  used boolean default false,
  created_at timestamptz default now()
);
alter table public.verification_codes enable row level security;

-- ============ ATTACHMENTS ============
-- User-scoped + thread-scoped file/image uploads. Ownership enforced via
-- user_id (and optionally thread_id). Metadata stored; binary in secure storage.
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  thread_id uuid references public.conversation_threads(id) on delete set null,
  filename text not null,
  mime_type text not null,
  size_bytes int not null,
  storage_key text not null,         -- secure storage key, never public URL
  content_type text not null,        -- 'image' | 'document' | 'text' | 'other'
  created_at timestamptz default now()
);
alter table public.attachments enable row level security;

-- ============ ENTITLEMENTS (FREE vs PRO) ============
-- Plan and feature flags, independent of any billing provider.
create table if not exists public.entitlements (
  user_id text primary key,
  plan text default 'free',          -- 'free' | 'pro'
  can_voice boolean default false,
  can_image boolean default false,
  can_file boolean default false,
  can_advanced_model boolean default false,
  can_advanced_memory boolean default false,
  text_daily_limit int default 100,
  updated_at timestamptz default now()
);
alter table public.entitlements enable row level security;

-- ---- policies ----
drop policy if exists "service role all" on public.password_reset_tokens;
create policy "service role all" on public.password_reset_tokens for all using (true) with check (true);
drop policy if exists "service role all" on public.verification_codes;
create policy "service role all" on public.verification_codes for all using (true) with check (true);
drop policy if exists "service role all" on public.attachments;
create policy "service role all" on public.attachments for all using (true) with check (true);
drop policy if exists "service role all" on public.entitlements;
create policy "service role all" on public.entitlements for all using (true) with check (true);

-- indexes
create index if not exists idx_password_reset_user on public.password_reset_tokens(user_id);
create index if not exists idx_verification_user on public.verification_codes(user_id);
create index if not exists idx_attachments_user on public.attachments(user_id);
create index if not exists idx_attachments_thread on public.attachments(thread_id);

-- ============ SESSIONS (revocation + device metadata) ============
-- Server-side session records keyed by jti. Enables logout revocation and
-- logout-all-sessions. Requires Supabase (production persistence).
create table if not exists public.sessions (
  jti text primary key,               -- session identifier inside the token
  user_id text not null,
  created_at timestamptz default now(),
  revoked boolean default false,
  revoked_at timestamptz,
  last_seen_at timestamptz,           -- Phase 1 device/session security
  device text,                        -- privacy-safe device label
  ip text,                            -- privacy-safe IP metadata
  user_agent text                     -- truncated UA
);
alter table public.sessions add column if not exists last_seen_at timestamptz;
alter table public.sessions add column if not exists device text;
alter table public.sessions add column if not exists ip text;
alter table public.sessions add column if not exists user_agent text;
alter table public.sessions enable row level security;
drop policy if exists "service role all" on public.sessions;
create policy "service role all" on public.sessions for all using (true) with check (true);
create index if not exists idx_sessions_user on public.sessions(user_id);

-- ============ VERIFICATION TOKENS (Phase 1 email/phone verification) ============
-- One-time, hashed, expiring, attempt-limited verification tokens.
create table if not exists public.verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,                -- 'email' | 'phone'
  token_hash text not null,          -- hashed token, never plaintext
  expires_at timestamptz not null,
  attempts int default 0,
  used boolean default false,
  created_at timestamptz default now()
);
alter table public.verification_tokens enable row level security;
drop policy if exists "service role all" on public.verification_tokens;
create policy "service role all" on public.verification_tokens for all using (true) with check (true);
create index if not exists idx_verification_tokens_user on public.verification_tokens(user_id, kind, used);

-- ============ FEEDBACK (Phase 7 / Phase 8) ============
create table if not exists public.feedback (
  id text primary key,
  user_id text not null,
  category text not null,            -- bug | wrong_answer | missing_capability | feature_request | ux_issue | safety | general
  message text not null,
  rating int,
  conversation_id text,
  thread_id text,
  message_id text,
  capability text,
  status text default 'open',        -- open | in_review | resolved | rejected
  priority text default 'normal',    -- low | normal | high | critical
  admin_notes text,
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;
drop policy if exists "service role all" on public.feedback;
create policy "service role all" on public.feedback for all using (true) with check (true);
create index if not exists idx_feedback_user on public.feedback(user_id);
create index if not exists idx_feedback_status on public.feedback(status);

-- ============ FINANCES (Freelancer/SME companion, BD 2027) ============
create table if not exists public.finances (
  id text primary key,
  user_id text not null,
  type text not null,              -- 'income' | 'expense'
  category text not null,
  amount numeric not null,         -- in BDT
  note text,
  created_at timestamptz default now()
);
alter table public.finances enable row level security;
drop policy if exists "service role all" on public.finances;
create policy "service role all" on public.finances for all using (true) with check (true);
create index if not exists idx_finances_user on public.finances(user_id, created_at);

-- ============================================================
-- MAN DAILY-LIFE PLATFORM (2027 expansion)
-- ============================================================

-- User profiles: personal info (name, address, image) + business role
create table if not exists public.profiles (
  user_id text primary key,
  full_name text,
  phone text,
  email text,
  address text,                       -- full address
  district text,                      -- e.g. Rangpur
  division text,                      -- e.g. Rangpur
  avatar_url text,                    -- profile image (upload key)
  account_type text default 'personal', -- 'personal' | 'business'
  business_name text,                 -- if business
  business_type text,                 -- 'hotel' | 'resort' | 'restaurant' | 'other'
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "service role all" on public.profiles;
create policy "service role all" on public.profiles for all using (true) with check (true);

-- Daily life schedule / to-do (the "daily talika" for any citizen)
create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  date text not null,                 -- YYYY-MM-DD
  time text,                          -- e.g. "09:00"
  title text not null,
  category text default 'task',       -- task | work | health | errand | family | other
  done boolean default false,
  note text,
  created_at timestamptz default now()
);
alter table public.daily_plans enable row level security;
drop policy if exists "service role all" on public.daily_plans;
create policy "service role all" on public.daily_plans for all using (true) with check (true);
create index if not exists idx_daily_plans_user_date on public.daily_plans(user_id, date);

-- Hotels / resorts / businesses (public listings, owner-managed)
create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,             -- the business account
  name text not null,
  category text default 'hotel',      -- hotel | resort | restaurant | motel | other
  address text,
  district text,
  division text,
  phone text,
  description text,
  amenities text[],                   -- e.g. wifi, pool, ac
  images text[],                      -- storage keys / urls
  rating numeric default 0,
  price_range text,                   -- budget | mid | premium | luxury
  verified boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.hotels enable row level security;
drop policy if exists "service role all" on public.hotels;
create policy "service role all" on public.hotels for all using (true) with check (true);
create index if not exists idx_hotels_owner on public.hotels(owner_id);
create index if not exists idx_hotels_district on public.hotels(district);

-- Bookings: a customer books a room at a hotel
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid references public.hotels(id) on delete cascade,
  user_id text not null,              -- who booked (customer)
  guest_name text,
  guest_phone text,
  check_in date,
  check_out date,
  rooms int default 1,
  guests int default 1,
  amount numeric default 0,           -- in BDT
  status text default 'confirmed',    -- pending | confirmed | cancelled | checked_in | checked_out
  note text,
  created_at timestamptz default now()
);
alter table public.bookings enable row level security;
drop policy if exists "service role all" on public.bookings;
create policy "service role all" on public.bookings for all using (true) with check (true);
create index if not exists idx_bookings_hotel on public.bookings(hotel_id);
create index if not exists idx_bookings_user on public.bookings(user_id);

-- Invoices / bills: a business creates a bill for a customer
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,          -- the hotel/business owner
  customer_name text,
  customer_phone text,
  items jsonb default '[]'::jsonb,    -- [{description, qty, price}]
  subtotal numeric default 0,
  tax numeric default 0,
  total numeric default 0,            -- in BDT
  status text default 'unpaid',       -- unpaid | paid
  invoice_no text,
  pdf_key text,                       -- storage key for generated PDF
  created_at timestamptz default now()
);
alter table public.invoices enable row level security;
drop policy if exists "service role all" on public.invoices;
create policy "service role all" on public.invoices for all using (true) with check (true);
create index if not exists idx_invoices_business on public.invoices(business_id);
