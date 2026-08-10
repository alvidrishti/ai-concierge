-- MAN — Personal AI Agent schema (multi-user).
-- Run in Supabase SQL editor. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

-- Users (auth identities + profiles)
create table if not exists public.users (
  id text primary key,
  name text,
  email text,
  role text default 'user',           -- 'user' | 'admin'
  password_hash text,
  created_at timestamptz default now()
);
alter table public.users enable row level security;

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
  when text,
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
create policy "service role all" on public.users for all using (true) with check (true);
create policy "service role all" on public.user_memory for all using (true) with check (true);
create policy "service role all" on public.conversation_threads for all using (true) with check (true);
create policy "service role all" on public.conversations for all using (true) with check (true);
create policy "service role all" on public.reminders for all using (true) with check (true);
create policy "service role all" on public.pending_actions for all using (true) with check (true);
create policy "service role all" on public.usage_log for all using (true) with check (true);
create policy "service role all" on public.subscriptions for all using (true) with check (true);

-- ---- Performance indexes (non-destructive) ----
create index if not exists idx_user_memory_user on public.user_memory(user_id);
create index if not exists idx_conversation_threads_user on public.conversation_threads(user_id);
create index if not exists idx_conversations_user_thread on public.conversations(user_id, thread_id);
create index if not exists idx_reminders_user on public.reminders(user_id);
create index if not exists idx_pending_actions_user on public.pending_actions(user_id, state);
create index if not exists idx_usage_log_user on public.usage_log(user_id);
create index if not exists idx_usage_log_time on public.usage_log(created_at);
