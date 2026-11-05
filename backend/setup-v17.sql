-- ENDLESS DRIFT V17 - RUN THIS ONE FILE IN SUPABASE SQL EDITOR
-- Safe when the previous V14 username SQL was already run.

-- ENDLESS DRIFT V14 — first login username and server-enforced 7-day rename cooldown.
-- Run this ONCE in Supabase -> SQL Editor -> New query -> Run.
-- Safe to run again: does not delete accounts, cars, scores, purchases, or usernames.
-- DO NOT put secret keys in this file or in the browser.

alter table public.driver_profiles
  add column if not exists username_initialized_at timestamptz;
alter table public.driver_profiles
  add column if not exists username_changed_at timestamptz;

-- Existing users with a real name have already chosen their initial username.
-- Auto-assigned Google usernames have the precise format driver_<12 hex chars>.
update public.driver_profiles
set username_initialized_at = coalesce(created_at, now())
where username_initialized_at is null
  and username !~ '^driver_[0-9a-f]{12}$';

-- Case-insensitive uniqueness for public handles.
create unique index if not exists endless_drift_username_lower_unique
  on public.driver_profiles (lower(username));

-- Existing V13 ed_set_username returns text. This replacement keeps that return type
-- so running this SQL does not fail with a PostgreSQL return-type conflict.
-- New email signups who supplied a handle get their initial choice for free.
-- Google signups get a temporary driver_ handle and must choose a real username.
create or replace function public.on_driver_signup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  chosen text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  public_name text;
begin
  if chosen is not null and chosen ~ '^[A-Za-z0-9_]{3,24}$' then
    public_name := chosen;
  else
    public_name := 'driver_' || substr(replace(new.id::text, '-', ''), 1, 12);
    chosen := null;
  end if;
  insert into public.driver_profiles (id, username, username_initialized_at)
  values (new.id, public_name, case when chosen is null then null else now() end)
  on conflict (id) do nothing;
  insert into public.verified_scores (driver_id) values (new.id)
  on conflict (driver_id) do nothing;
  return new;
end;
$$;
revoke all on function public.on_driver_signup() from public;

-- Profile changes are only possible through this authenticated, atomic RPC.
-- First custom selection is free; the first later rename starts a 7-day lock.
create or replace function public.ed_set_username(p_username text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid := auth.uid();
  chosen text := btrim(coalesce(p_username, ''));
  prior public.driver_profiles%rowtype;
begin
  if v_id is null then
    raise exception 'Sign in before setting a username' using errcode = '42501';
  end if;
  if chosen !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception 'Username must be 3 to 24 letters, numbers or underscores' using errcode = '22023';
  end if;

  -- Recover profile if a pre-migration account is missing its signup row.
  insert into public.driver_profiles (id, username)
  values (v_id, 'driver_' || substr(replace(v_id::text, '-', ''), 1, 12))
  on conflict (id) do nothing;
  insert into public.verified_scores (driver_id) values (v_id)
  on conflict (driver_id) do nothing;

  select * into prior from public.driver_profiles where id = v_id for update;
  if prior.username = chosen and prior.username_initialized_at is not null then
    return prior.username;
  end if;

  if prior.username_initialized_at is null then
    -- First real choice: does NOT start a cooldown.
    update public.driver_profiles
    set username = chosen, username_initialized_at = now(), username_changed_at = null
    where id = v_id;
  else
    -- Rename: one rename is immediately allowed; then 7 days between renames.
    if prior.username_changed_at is not null
       and now() < prior.username_changed_at + interval '7 days' then
      raise exception 'Username locked until %',
        to_char(prior.username_changed_at + interval '7 days', 'YYYY-MM-DD HH24:MI UTC')
        using errcode = 'P0001';
    end if;
    update public.driver_profiles
    set username = chosen, username_changed_at = now()
    where id = v_id;
  end if;

  return chosen;
exception
  when unique_violation then
    raise exception 'That username is already taken' using errcode = '23505';
end;
$$;

revoke all on function public.ed_set_username(text) from public, anon;
grant execute on function public.ed_set_username(text) to authenticated;

-- Force PostgREST to discover the newly added RPC and profile columns.
notify pgrst, 'reload schema';


-- ENDLESS DRIFT V17: server-only admin entitlements and global dispatch board.
-- All writes occur from the trusted Render service after verifying Supabase Auth.
CREATE TABLE IF NOT EXISTS public.ed_admin_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'verified_invite'
);
ALTER TABLE public.ed_admin_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ed_admin_roles FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS public.ed_announcements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 180),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.ed_announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ed_announcements FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS ed_announcements_recent_idx ON public.ed_announcements (created_at DESC);


-- Upgrade tables created by earlier partial admin setup safely in place.
alter table public.ed_admin_roles
  add column if not exists source text not null default 'verified_invite';
alter table public.ed_announcements
  add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.ed_announcements
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');
