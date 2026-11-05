-- ENDLESS DRIFT V16 — per-driver private game progress.
-- Safe, additive: existing purchases, wallets, profiles and game records stay unchanged.
CREATE TABLE IF NOT EXISTS public.ed_game_saves (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 save jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ed_game_saves_object CHECK (jsonb_typeof(save) = 'object'),
 CONSTRAINT ed_game_saves_size CHECK (pg_column_size(save) <= 250000)
);
ALTER TABLE public.ed_game_saves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ed_game_saves FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.ed_game_saves TO authenticated;
DROP POLICY IF EXISTS ed_save_select_self ON public.ed_game_saves;
DROP POLICY IF EXISTS ed_save_insert_self ON public.ed_game_saves;
DROP POLICY IF EXISTS ed_save_update_self ON public.ed_game_saves;
CREATE POLICY ed_save_select_self ON public.ed_game_saves
 FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY ed_save_insert_self ON public.ed_game_saves
 FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY ed_save_update_self ON public.ed_game_saves
 FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id)
 WITH CHECK ((select auth.uid()) = user_id);
-- NOTE: Premium Drift Coins remain exclusively in ed_paid_wallets.
-- Admin access is enforced by server environment ADMIN_USER_ID, not mutable user metadata.
