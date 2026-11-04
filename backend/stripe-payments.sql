-- ENDLESS DRIFT: payment-ledger and server-held paid coin balance.
-- Run once in Supabase SQL Editor AFTER supabase-setup.sql.
-- Safe to re-run; does not reset purchases or wallet amounts.
-- Only the trusted backend with SUPABASE_SECRET_KEY may execute the functions.

create table if not exists public.ed_paid_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins bigint not null default 0 check (coins >= 0),
  drift_pass boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.ed_stripe_purchases (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null check (sku in ('starter','street','legend','drift_pass')),
  amount_aed_fils integer not null,
  created_at timestamptz not null default now()
);
create table if not exists public.ed_paid_spends (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  coins bigint not null check (coins > 0),
  created_at timestamptz not null default now()
);
create index if not exists ed_purchases_user_idx on public.ed_stripe_purchases (user_id);
create index if not exists ed_spends_user_idx on public.ed_paid_spends (user_id);
alter table public.ed_paid_wallets enable row level security;
alter table public.ed_stripe_purchases enable row level security;
alter table public.ed_paid_spends enable row level security;
revoke all on public.ed_paid_wallets from anon,authenticated;
revoke all on public.ed_stripe_purchases from anon,authenticated;
revoke all on public.ed_paid_spends from anon,authenticated;
-- Deny direct public access; the server uses its secret key and validates identity.

create or replace function public.ed_fulfill_purchase(
 p_session_id text, p_user_id uuid, p_sku text, p_amount_aed_fils integer
) returns boolean language plpgsql security definer set search_path = '' as $$
declare added integer; grant_coins bigint := 0;
begin
 if p_session_id is null or p_session_id !~ '^cs_(test_|live_)' then raise exception 'Invalid checkout session'; end if;
 if (p_sku,p_amount_aed_fils) not in (('starter',999),('street',2499),('legend',4999),('drift_pass',3499)) then
   raise exception 'Invalid product or amount';
 end if;
 grant_coins := case p_sku when 'starter' then 1500 when 'street' then 5000 when 'legend' then 12000 else 0 end;
 insert into public.ed_stripe_purchases(session_id,user_id,sku,amount_aed_fils)
 values(p_session_id,p_user_id,p_sku,p_amount_aed_fils)
 on conflict(session_id) do nothing;
 get diagnostics added = row_count;
 if added = 0 then return false; end if;
 insert into public.ed_paid_wallets(user_id,coins,drift_pass)
 values(p_user_id,grant_coins,p_sku='drift_pass')
 on conflict(user_id) do update
 set coins=ed_paid_wallets.coins + excluded.coins,
     drift_pass=public.ed_paid_wallets.drift_pass or excluded.drift_pass,
     updated_at=now();
 return true;
end;
$$;

create or replace function public.ed_spend_paid_coins(
 p_user_id uuid, p_amount bigint, p_request_id uuid
) returns bigint language plpgsql security definer set search_path = '' as $$
declare balance bigint; original_owner uuid;
begin
 if p_amount < 1 or p_amount > 1000000 or p_request_id is null then raise exception 'Invalid debit request'; end if;
 -- Serialize spends for each wallet and make retries idempotent.
 select coins into balance from public.ed_paid_wallets where user_id=p_user_id for update;
 if not found then raise exception 'No purchased coin balance'; end if;
 select user_id into original_owner from public.ed_paid_spends where request_id=p_request_id;
 if found then
   if original_owner <> p_user_id then raise exception 'Invalid request id'; end if;
   return balance;
 end if;
 if balance < p_amount then raise exception 'Not enough purchased coins'; end if;
 insert into public.ed_paid_spends(request_id,user_id,coins) values(p_request_id,p_user_id,p_amount);
 update public.ed_paid_wallets set coins=coins-p_amount,updated_at=now() where user_id=p_user_id returning coins into balance;
 return balance;
end;
$$;
revoke all on function public.ed_fulfill_purchase(text,uuid,text,integer) from public,anon,authenticated;
revoke all on function public.ed_spend_paid_coins(uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.ed_fulfill_purchase(text,uuid,text,integer) to service_role;
grant execute on function public.ed_spend_paid_coins(uuid,bigint,uuid) to service_role;
