
-- 1) Per-agent simulation config
CREATE TABLE IF NOT EXISTS public.agent_simulation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  stop_loss_pct numeric NOT NULL DEFAULT 0.02,
  take_profit_pct numeric NOT NULL DEFAULT 0.04,
  reward_amount numeric NOT NULL DEFAULT 1,
  penalty_amount numeric NOT NULL DEFAULT 1,
  max_reports_per_tick integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_simulation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY asc_select ON public.agent_simulation_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY asc_admin_ins ON public.agent_simulation_config
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY asc_admin_upd ON public.agent_simulation_config
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY asc_admin_del ON public.agent_simulation_config
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER asc_updated_at
  BEFORE UPDATE ON public.agent_simulation_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Idempotency constraints
CREATE UNIQUE INDEX IF NOT EXISTS arr_unique_agent_report
  ON public.agent_report_reads (agent_id, report_id, report_kind);

CREATE UNIQUE INDEX IF NOT EXISTS ad_unique_agent_report
  ON public.agent_decisions (agent_id, report_id)
  WHERE report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS apt_unique_decision
  ON public.agent_paper_trades (decision_id);

-- 3) Advisory lock helpers for cron tick concurrency
CREATE OR REPLACE FUNCTION public.try_sim_advisory_lock(p_key bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_try_advisory_lock(p_key);
$$;

CREATE OR REPLACE FUNCTION public.release_sim_advisory_lock(p_key bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pg_advisory_unlock(p_key);
$$;

REVOKE ALL ON FUNCTION public.try_sim_advisory_lock(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_sim_advisory_lock(bigint) FROM PUBLIC, anon, authenticated;
