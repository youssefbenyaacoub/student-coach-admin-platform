-- Message deletions support ("delete for me")
-- Run in Supabase SQL Editor.

-- 1) Table
create extension if not exists pgcrypto;

create table if not exists public.message_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  unique(user_id, message_id)
);

alter table public.message_deletions enable row level security;

-- 2) Policies
-- User can see only their own deletions
do $$ begin
  create policy "message_deletions_select_own" on public.message_deletions
    for select
    to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- User can insert only their own deletions
do $$ begin
  create policy "message_deletions_insert_own" on public.message_deletions
    for insert
    to authenticated
    with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- User can delete only their own deletions (optional: allow "undo delete")
do $$ begin
  create policy "message_deletions_delete_own" on public.message_deletions
    for delete
    to authenticated
    using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- 3) Realtime (optional but recommended)
-- Ensure message_deletions is in the realtime publication.
-- If you use the default supabase_realtime publication:
-- alter publication supabase_realtime add table public.message_deletions;
