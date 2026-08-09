-- Supabase schema for the AI Concierge persistent memory (MAA v4.0).
-- Run this in the Supabase SQL editor.

-- Profile / preferences (single-user v1)
create table if not exists public.profile (
  id integer primary key default 1,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.profile enable row level security;

-- Reminders
create table if not exists public.reminders (
  id text primary key,
  title text not null,
  when text,
  status text default 'scheduled',
  created_at timestamptz default now()
);
alter table public.reminders enable row level security;

-- Pending approval-gate actions (MAA Pillar 10) — persisted so approvals
-- survive across serverless calls.
create table if not exists public.pending_actions (
  id text primary key,
  intent text not null,
  summary text,
  detail text,
  state text default 'PENDING',
  created_at timestamptz default now()
);
alter table public.pending_actions enable row level security;

-- Open access for the service-role key (the app uses the service role).
create policy "service role all" on public.profile for all using (true) with check (true);
create policy "service role all" on public.reminders for all using (true) with check (true);
create policy "service role all" on public.pending_actions for all using (true) with check (true);
