-- V21: expose game-save spending in the public leaderboard, without exposing saved garages.
-- Applied on Nov 5, 2026 to EndlessDrift Supabase project.
-- Browser-saved spending is game-only and NOT anti-cheat verified.
create or replace view public.leaderboard_public as
select p.username,
       s.lifetime_xp,
       greatest(
         s.coins_spent,
         case
           when (g.save->>'spent') ~ '^[0-9]{1,15}$'
           then (g.save->>'spent')::bigint
           else 0::bigint
         end
       ) as coins_spent
from public.verified_scores s
join public.driver_profiles p on p.id = s.driver_id
left join public.ed_game_saves g on g.user_id = s.driver_id;
