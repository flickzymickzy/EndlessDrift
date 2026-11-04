-- ENDLESS DRIFT V12: secure accounts + READ-ONLY leaderboard schema
-- Paste in Supabase SQL Editor after creating a project.
-- IMPORTANT: Clients cannot edit XP / wallet / score columns.

create table if not exists public.driver_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  created_at timestamptz not null default now()
);
create table if not exists public.verified_scores (
  driver_id uuid primary key references public.driver_profiles(id) on delete cascade,
  lifetime_xp bigint not null default 0 check (lifetime_xp>=0),
  coins_spent bigint not null default 0 check (coins_spent>=0),
  updated_at timestamptz not null default now()
);

alter table public.driver_profiles enable row level security;
alter table public.verified_scores enable row level security;
revoke all on public.driver_profiles from anon,authenticated;
revoke all on public.verified_scores from anon,authenticated;
grant select on public.driver_profiles to anon,authenticated;
grant select on public.verified_scores to anon,authenticated;

-- Anyone can read public usernames and verified leaderboard totals.
create policy "public profiles read" on public.driver_profiles
  for select to anon,authenticated using (true);
create policy "public verified scores read" on public.verified_scores
  for select to anon,authenticated using (true);
-- There are deliberately NO INSERT / UPDATE / DELETE policies for public clients.

-- Create profile + 0-score row when someone signs up.
-- This trigger runs with elevated rights only for these narrowly scoped inserts.
create or replace function public.on_driver_signup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare u text;
begin
  u := nullif(trim(new.raw_user_meta_data ->> 'username'),'');
  if u is null then u := 'driver_' || substr(replace(new.id::text,'-',''),1,12); end if;
  insert into public.driver_profiles(id,username) values(new.id,u);
  insert into public.verified_scores(driver_id) values(new.id);
  return new;
end;
$$;
revoke all on function public.on_driver_signup() from public;
drop trigger if exists endless_driver_profile_created on auth.users;
create trigger endless_driver_profile_created
  after insert on auth.users for each row execute procedure public.on_driver_signup();

-- Security-invoker view obeys the RLS and GRANTs above.
create or replace view public.leaderboard_public with (security_invoker=true) as
select p.username, s.lifetime_xp, s.coins_spent
from public.verified_scores s
join public.driver_profiles p on p.id=s.driver_id;
revoke all on public.leaderboard_public from public,anon,authenticated;
grant select on public.leaderboard_public to anon,authenticated;

-- Future production server:
-- 1) Verify gameplay from authoritative server-side events or trusted telemetry.
-- 2) Use server-only credentials (NEVER in client JS) to update verified_scores.
-- 3) Validate that all purchase/coin transactions exist in an auditable ledger.
-- 4) Keep real-money purchases entirely server-verified.
