
-- Restrict sensitive ledger / reputation / cron logs to admin role only
DROP POLICY IF EXISTS gl_select ON public.golden_ledger;
CREATE POLICY gl_select_admin ON public.golden_ledger FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS el_select ON public.eljot_ledger;
CREATE POLICY el_select_admin ON public.eljot_ledger FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS ar_select ON public.agent_reputation;
CREATE POLICY ar_select_admin ON public.agent_reputation FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS crl_select ON public.cron_run_logs;
CREATE POLICY crl_select_admin ON public.cron_run_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- notification_log: allow users to delete their own rows (writes happen via service role)
CREATE POLICY nl_delete_own ON public.notification_log FOR DELETE USING (auth.uid() = user_id);
