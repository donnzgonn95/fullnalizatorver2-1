
CREATE UNIQUE INDEX IF NOT EXISTS agent_report_reads_uniq
  ON public.agent_report_reads (agent_id, report_id, report_kind);

CREATE UNIQUE INDEX IF NOT EXISTS agent_decisions_agent_report_uniq
  ON public.agent_decisions (agent_id, report_id)
  WHERE report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_paper_trades_decision_uniq
  ON public.agent_paper_trades (decision_id);
