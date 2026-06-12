-- Fix: drop the default trigger that writes new auth users into public.users
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
  id text primary key,
  payload jsonb not null default '{"tasks":[],"updatedAt":0}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.taskflow_state enable row level security;

-- Drop old anon policies (migrate from shared to per-user)
drop policy if exists "TaskFlow shared state can be read" on public.taskflow_state;
drop policy if exists "TaskFlow shared state can be inserted" on public.taskflow_state;
drop policy if exists "TaskFlow shared state can be updated" on public.taskflow_state;

-- Per-user authenticated policies
create policy "Users can read own state" on public.taskflow_state
  for select to authenticated using (id = auth.uid());

create policy "Users can insert own state" on public.taskflow_state
  for insert to authenticated with check (id = auth.uid());

create policy "Users can update own state" on public.taskflow_state
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, update on public.taskflow_state to authenticated;
