
CREATE TABLE public.detected_setups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  symbol text NOT NULL,
  interval text NOT NULL,
  setup_type text NOT NULL,
  wave_label text,
  direction text NOT NULL,
  entry_price numeric NOT NULL,
  stop_loss numeric NOT NULL,
  take_profit numeric NOT NULL,
  signal_strength numeric NOT NULL DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(),
  entry_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  result text,
  result_checked_at timestamptz,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_detected_setups_status ON public.detected_setups (status, symbol, interval);
CREATE INDEX idx_detected_setups_detected_at ON public.detected_setups (detected_at DESC);
CREATE INDEX idx_detected_setups_user ON public.detected_setups (user_id);

ALTER TABLE public.detected_setups ENABLE ROW LEVEL SECURITY;

CREATE POLICY ds_select ON public.detected_setups
FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY ds_insert ON public.detected_setups
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY ds_update ON public.detected_setups
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY ds_delete ON public.detected_setups
FOR DELETE USING (auth.uid() = user_id);
