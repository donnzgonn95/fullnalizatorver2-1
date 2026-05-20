
DROP INDEX IF EXISTS public.agent_decisions_agent_report_uniq;
DROP INDEX IF EXISTS public.ad_unique_agent_report;
CREATE UNIQUE INDEX IF NOT EXISTS agent_decisions_agent_report_uniq
  ON public.agent_decisions (agent_id, report_id);
