-- ENDLESS DRIFT V13 — usernames for existing email and Google players.
-- Safe to re-run after supabase-setup.sql; does not reset accounts/scores.
-- A player can only edit their own handle. Unique names are enforced by driver_profiles.

create or replace function public.ed_set_username(p_username text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_driver_id uuid := (select auth.uid());
  chosen text := trim(coalesce(p_username,''));
begin
  if v_driver_id is null then
    raise exception 'Sign in to set a username' using errcode='42501';
  end if;
  if chosen !~ '^[A-Za-z0-9_]{3,24}$' then
    raise exception 'Username needs 3–24 letters, numbers or underscores' using errcode='22023';
  end if;
  insert into public.driver_profiles (id, username) values (v_driver_id, chosen)
  on conflict (id) do update set username=excluded.username;
  insert into public.verified_scores (driver_id) values (v_driver_id)
  on conflict (driver_id) do nothing;
  return chosen;
exception
  when unique_violation then
    raise exception 'That username is already taken' using errcode='23505';
end;
$$;
revoke all on function public.ed_set_username(text) from public, anon;
grant execute on function public.ed_set_username(text) to authenticated;
