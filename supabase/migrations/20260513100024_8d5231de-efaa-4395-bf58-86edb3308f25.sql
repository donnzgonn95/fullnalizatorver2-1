
-- scanner_config (single row)
CREATE TABLE public.scanner_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbols text[] NOT NULL DEFAULT ARRAY['BTC','ETH','SOL','BNB','XRP','AVAX','LINK','DOGE','MATIC','ARB']::text[],
  intervals text[] NOT NULL DEFAULT ARRAY['M15','M30','M45','H1','H4']::text[],
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.scanner_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY sc_select ON public.scanner_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY sc_insert ON public.scanner_config FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY sc_update ON public.scanner_config FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY sc_delete ON public.scanner_config FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.scanner_config (symbols, intervals, enabled) VALUES (DEFAULT, DEFAULT, true);

-- cron_run_logs
CREATE TABLE public.cron_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  duration_ms integer,
  status text NOT NULL DEFAULT 'running',
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX cron_run_logs_started_idx ON public.cron_run_logs (started_at DESC);
CREATE INDEX cron_run_logs_job_idx ON public.cron_run_logs (job_name, started_at DESC);
ALTER TABLE public.cron_run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY crl_select ON public.cron_run_logs FOR SELECT USING (auth.uid() IS NOT NULL);

-- notification_settings
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean NOT NULL DEFAULT false,
  email_address text,
  webhook_url text,
  min_signal_strength numeric NOT NULL DEFAULT 60,
  symbols_filter text[] NOT NULL DEFAULT ARRAY[]::text[],
  intervals_filter text[] NOT NULL DEFAULT ARRAY[]::text[],
  setup_types_filter text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY ns_select ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ns_insert ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ns_update ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ns_delete ON public.notification_settings FOR DELETE USING (auth.uid() = user_id);

-- notification_log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setup_id uuid NOT NULL,
  user_id uuid NOT NULL,
  channel text NOT NULL,
  status text NOT NULL,
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_log_user_idx ON public.notification_log (user_id, sent_at DESC);
CREATE UNIQUE INDEX notification_log_dedup_idx ON public.notification_log (setup_id, user_id, channel);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY nl_select ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
