
-- ============ GIELDA MODULE ============

CREATE TABLE public.stock_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  market text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, symbol)
);
ALTER TABLE public.stock_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sw_select" ON public.stock_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sw_insert" ON public.stock_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sw_update" ON public.stock_watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sw_delete" ON public.stock_watchlist FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.investment_tactics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  entry_rules jsonb DEFAULT '[]'::jsonb,
  exit_rules jsonb DEFAULT '[]'::jsonb,
  risk_profile text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.investment_tactics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "it_select" ON public.investment_tactics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "it_insert" ON public.investment_tactics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "it_update" ON public.investment_tactics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "it_delete" ON public.investment_tactics FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER it_updated BEFORE UPDATE ON public.investment_tactics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.portfolio_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  side text NOT NULL DEFAULT 'long',
  quantity numeric NOT NULL DEFAULT 0,
  entry_price numeric NOT NULL DEFAULT 0,
  exit_price numeric,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  pnl numeric,
  status text NOT NULL DEFAULT 'open',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pj_select" ON public.portfolio_journal FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pj_insert" ON public.portfolio_journal FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pj_update" ON public.portfolio_journal FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pj_delete" ON public.portfolio_journal FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'agent',
  verdict text NOT NULL,
  symbol text,
  payload jsonb DEFAULT '{}'::jsonb,
  approved boolean,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.decision_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dl_select" ON public.decision_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "dl_insert" ON public.decision_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dl_update" ON public.decision_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "dl_delete" ON public.decision_logs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.bajtlik_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  current_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PLN',
  deadline date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bajtlik_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bg_select" ON public.bajtlik_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bg_insert" ON public.bajtlik_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bg_update" ON public.bajtlik_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bg_delete" ON public.bajtlik_goals FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER bg_updated BEFORE UPDATE ON public.bajtlik_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bajtlik_capital (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_capital numeric NOT NULL DEFAULT 0,
  available_cash numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PLN',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bajtlik_capital ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_select" ON public.bajtlik_capital FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bc_insert" ON public.bajtlik_capital FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bc_update" ON public.bajtlik_capital FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bc_delete" ON public.bajtlik_capital FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER bc_updated BEFORE UPDATE ON public.bajtlik_capital FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  linked_decision_id uuid REFERENCES public.decision_logs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "an_select" ON public.agent_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "an_insert" ON public.agent_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "an_update" ON public.agent_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "an_delete" ON public.agent_notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER an_updated BEFORE UPDATE ON public.agent_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ LAB MODULE ============

CREATE TABLE public.lab_paper_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instrument text NOT NULL,
  side text NOT NULL DEFAULT 'long',
  entry_price numeric NOT NULL DEFAULT 0,
  stop_loss numeric,
  take_profit numeric,
  quantity numeric NOT NULL DEFAULT 0,
  risk_reward numeric,
  conviction_score int,
  risk_score int,
  rationale text,
  status text NOT NULL DEFAULT 'planned',
  opened_at timestamptz,
  closed_at timestamptz,
  result_pnl numeric,
  tags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_paper_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lpt_select" ON public.lab_paper_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lpt_insert" ON public.lab_paper_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lpt_update" ON public.lab_paper_trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lpt_delete" ON public.lab_paper_trades FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER lpt_updated BEFORE UPDATE ON public.lab_paper_trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_risk_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  max_trades_per_day int NOT NULL DEFAULT 6,
  max_daily_loss numeric NOT NULL DEFAULT 1000,
  max_risk_per_trade numeric NOT NULL DEFAULT 200,
  cooldown_minutes int NOT NULL DEFAULT 60,
  kill_switch boolean NOT NULL DEFAULT false,
  block_high_macro_risk boolean NOT NULL DEFAULT true,
  block_correlated boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_risk_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lrs_select" ON public.lab_risk_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lrs_insert" ON public.lab_risk_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lrs_update" ON public.lab_risk_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lrs_delete" ON public.lab_risk_settings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER lrs_updated BEFORE UPDATE ON public.lab_risk_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_telegram_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  bot_token text,
  chat_id text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_telegram_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltc_select" ON public.lab_telegram_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ltc_insert" ON public.lab_telegram_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ltc_update" ON public.lab_telegram_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ltc_delete" ON public.lab_telegram_config FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER ltc_updated BEFORE UPDATE ON public.lab_telegram_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_type text NOT NULL,
  report_date date NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_type, report_date)
);
ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lr_select" ON public.lab_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lr_insert" ON public.lab_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lr_update" ON public.lab_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lr_delete" ON public.lab_reports FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.lab_backtest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  strategy_name text NOT NULL,
  params jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  summary jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.lab_backtest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lbr_select" ON public.lab_backtest_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lbr_insert" ON public.lab_backtest_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lbr_update" ON public.lab_backtest_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lbr_delete" ON public.lab_backtest_runs FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.lab_backtest_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  run_id uuid NOT NULL REFERENCES public.lab_backtest_runs(id) ON DELETE CASCADE,
  instrument text NOT NULL,
  trade_date date NOT NULL,
  side text NOT NULL,
  entry_price numeric NOT NULL,
  stop_loss numeric,
  take_profit numeric,
  exit_price numeric,
  risk_reward numeric,
  conviction_score int,
  risk_score int,
  rationale text,
  result_pnl numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_backtest_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lbt_select" ON public.lab_backtest_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lbt_insert" ON public.lab_backtest_trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lbt_update" ON public.lab_backtest_trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lbt_delete" ON public.lab_backtest_trades FOR DELETE USING (auth.uid() = user_id);
