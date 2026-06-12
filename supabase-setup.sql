create table if not exists public.taskflow_state (
  id text primary key,
  payload jsonb not null default '{"tasks":[],"updatedAt":0}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.taskflow_state enable row level security;

drop policy if exists "TaskFlow shared state can be read" on public.taskflow_state;
drop policy if exists "TaskFlow shared state can be inserted" on public.taskflow_state;
drop policy if exists "TaskFlow shared state can be updated" on public.taskflow_state;

create policy "TaskFlow shared state can be read"
on public.taskflow_state
for select
to anon
using (id = 'default');

create policy "TaskFlow shared state can be inserted"
on public.taskflow_state
for insert
to anon
with check (id = 'default');

create policy "TaskFlow shared state can be updated"
on public.taskflow_state
for update
to anon
using (id = 'default')
with check (id = 'default');

grant select, insert, update on public.taskflow_state to anon;

insert into public.taskflow_state (id, payload)
values ('default', '{"tasks":[],"updatedAt":0}'::jsonb)
on conflict (id) do nothing;
