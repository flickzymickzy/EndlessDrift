-- V23: raise the single admin XP grant limit to 50,000.
-- Uses the existing ranked-XP RPC; normal /api/runs/bank still caps each report at 5,000 XP.
-- The function remains callable only with service-role credentials on the server.
create or replace function public.ed_record_ranked_xp(p_user uuid, p_event uuid, p_xp integer)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare total bigint;
begin
 if current_user <> 'postgres' and (current_setting('request.jwt.claim.role',true) is distinct from 'service_role') then
  raise exception 'server only';
 end if;
 if p_xp < 1 or p_xp > 50000 then raise exception 'XP outside allowed range'; end if;
 insert into public.ed_score_events(event_id,user_id,xp) values(p_event,p_user,p_xp)
 on conflict (event_id) do nothing;
 if found then
  insert into public.verified_scores (driver_id,lifetime_xp) values(p_user,p_xp)
  on conflict (driver_id) do update
    set lifetime_xp=public.verified_scores.lifetime_xp+excluded.lifetime_xp,updated_at=now();
 end if;
 select lifetime_xp into total from public.verified_scores where driver_id=p_user;
 return coalesce(total,0);
end;
$function$;

revoke all on function public.ed_record_ranked_xp(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.ed_record_ranked_xp(uuid,uuid,integer) to service_role;
