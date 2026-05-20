-- ============================================================
-- Agent Simulation Loop core
-- ============================================================

-- 1) AGENT GUIDELINES -----------------------------------------
CREATE TABLE public.agent_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_guidelines_active ON public.agent_guidelines(agent_id, is_active);
ALTER TABLE public.agent_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY ag_select ON public.agent_guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY ag_admin_ins ON public.agent_guidelines FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY ag_admin_upd ON public.agent_guidelines FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY ag_admin_del ON public.agent_guidelines FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_agent_guidelines_updated BEFORE UPDATE ON public.agent_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) REPORTS (public) -----------------------------------------
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,                 -- morning|evening|scan|macro|...
  title text NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_date ON public.reports(report_date DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY rp_select ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY rp_admin_ins ON public.reports FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY rp_admin_upd ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY rp_admin_del ON public.reports FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- 3) PRIVATE REPORTS ------------------------------------------
CREATE TABLE public.private_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  shared_with_agents boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_priv_reports_user ON public.private_reports(user_id, created_at DESC);
ALTER TABLE public.private_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_select_owner ON public.private_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY pr_ins_owner ON public.private_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY pr_upd_owner ON public.private_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY pr_del_owner ON public.private_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4) AGENT REPORT READS ---------------------------------------
CREATE TABLE public.agent_report_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  report_id uuid NOT NULL,
  report_kind text NOT NULL CHECK (report_kind IN ('public','private')),
  read_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
CREATE INDEX idx_arr_agent ON public.agent_report_reads(agent_id, read_at DESC);
ALTER TABLE public.agent_report_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY arr_select ON public.agent_report_reads FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
-- INSERT only via service role (server)

-- 5) AGENT DECISIONS ------------------------------------------
CREATE TABLE public.agent_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  guideline_id uuid REFERENCES public.agent_guidelines(id) ON DELETE SET NULL,
  report_id uuid,
  report_kind text CHECK (report_kind IN ('public','private')),
  symbol text,
  verdict text NOT NULL CHECK (verdict IN ('BUY','SELL','WAIT','REJECT')),
  rationale text NOT NULL CHECK (length(rationale) >= 10),
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ad_agent ON public.agent_decisions(agent_id, created_at DESC);
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_select ON public.agent_decisions FOR SELECT TO authenticated USING (true);
-- INSERT only via service role

-- 6) AGENT PAPER TRADES (simulation) --------------------------
CREATE TABLE public.agent_paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  decision_id uuid NOT NULL REFERENCES public.agent_decisions(id) ON DELETE CASCADE,
  report_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('long','short')),
  quantity numeric NOT NULL CHECK (quantity > 0),
  entry_price numeric NOT NULL CHECK (entry_price > 0),
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','cancelled')),
  pnl numeric,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX idx_apt_agent ON public.agent_paper_trades(agent_id, opened_at DESC);
ALTER TABLE public.agent_paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY apt_select ON public.agent_paper_trades FOR SELECT TO authenticated USING (true);
-- INSERT/UPDATE only via service role

-- 7) AGENT JOURNAL --------------------------------------------
CREATE TABLE public.agent_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  decision_id uuid REFERENCES public.agent_decisions(id) ON DELETE SET NULL,
  trade_id uuid REFERENCES public.agent_paper_trades(id) ON DELETE SET NULL,
  topic text NOT NULL,
  content text NOT NULL CHECK (length(content) >= 1),
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_aj_agent ON public.agent_journal(agent_id, created_at DESC);
ALTER TABLE public.agent_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY aj_select ON public.agent_journal FOR SELECT TO authenticated USING (true);
-- INSERT only via service role

-- 8) TREASURY BALANCE -----------------------------------------
CREATE TABLE public.treasury_balance (
  currency text PRIMARY KEY,
  amount numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.treasury_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY tb_select_admin ON public.treasury_balance FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
-- No INSERT/UPDATE/DELETE policies — only trigger via treasury_events

INSERT INTO public.treasury_balance(currency, amount) VALUES ('ELJOT', 0);

-- 9) TREASURY EVENTS (append-only) ----------------------------
CREATE TABLE public.treasury_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency text NOT NULL DEFAULT 'ELJOT',
  delta numeric NOT NULL CHECK (delta <> 0),
  reason text NOT NULL CHECK (length(reason) >= 3),
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  decision_id uuid REFERENCES public.agent_decisions(id) ON DELETE SET NULL,
  eljot_entry_id uuid REFERENCES public.eljot_ledger(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_te_created ON public.treasury_events(created_at DESC);
ALTER TABLE public.treasury_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY te_select_admin ON public.treasury_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
-- INSERT only via service role; UPDATE/DELETE forbidden

-- Trigger: każdy treasury_event aktualizuje treasury_balance atomicznie
CREATE OR REPLACE FUNCTION public.apply_treasury_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.treasury_balance(currency, amount, updated_at)
  VALUES (NEW.currency, NEW.delta, now())
  ON CONFLICT (currency) DO UPDATE
    SET amount = public.treasury_balance.amount + EXCLUDED.amount,
        updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_treasury_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_apply_treasury_event
  AFTER INSERT ON public.treasury_events
  FOR EACH ROW EXECUTE FUNCTION public.apply_treasury_event();

-- Trigger: blokuj UPDATE/DELETE na treasury_events (append-only)
CREATE OR REPLACE FUNCTION public.treasury_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'treasury_events is append-only';
END;
$$;
CREATE TRIGGER trg_te_no_update BEFORE UPDATE ON public.treasury_events
  FOR EACH ROW EXECUTE FUNCTION public.treasury_events_immutable();
CREATE TRIGGER trg_te_no_delete BEFORE DELETE ON public.treasury_events
  FOR EACH ROW EXECUTE FUNCTION public.treasury_events_immutable();

-- Trigger: blokuj bezpośrednie UPDATE/DELETE na treasury_balance (poza triggerem)
CREATE OR REPLACE FUNCTION public.treasury_balance_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- pg_trigger_depth() > 1 means call originated from another trigger (apply_treasury_event)
  IF pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'treasury_balance can only be modified via treasury_events';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_tb_guard_ins BEFORE INSERT ON public.treasury_balance
  FOR EACH ROW EXECUTE FUNCTION public.treasury_balance_guard();
CREATE TRIGGER trg_tb_guard_upd BEFORE UPDATE ON public.treasury_balance
  FOR EACH ROW EXECUTE FUNCTION public.treasury_balance_guard();
CREATE TRIGGER trg_tb_guard_del BEFORE DELETE ON public.treasury_balance
  FOR EACH ROW EXECUTE FUNCTION public.treasury_balance_guard();