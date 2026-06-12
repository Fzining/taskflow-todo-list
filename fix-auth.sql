-- Fix "Database error saving new user"
-- This runs in Supabase Dashboard → SQL Editor

-- 1. Drop the trigger that's trying to sync to a missing profiles table
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Create the missing profiles table that the trigger expects
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- 3. Recreate the trigger properly
create or replace function public.handle_new_user()
returns trigger
set search_path = ''
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Recreate the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Enable RLS on profiles
alter table public.profiles enable row level security;

-- 6. Allow authenticated users to read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());
