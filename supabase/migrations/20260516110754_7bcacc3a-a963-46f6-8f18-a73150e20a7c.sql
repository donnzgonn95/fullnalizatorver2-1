
-- AGENTS
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL,
  description text,
  version text NOT NULL DEFAULT '0.1.0',
  status text NOT NULL DEFAULT 'active',
  mentor_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  wallet_address text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_select ON public.agents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY agents_admin_ins ON public.agents FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY agents_admin_upd ON public.agents FOR UPDATE USING (has_role(auth.uid(),'admin'));
CREATE POLICY agents_admin_del ON public.agents FOR DELETE USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER agents_touch BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GOLDEN LEDGER (append-only)
CREATE TABLE public.golden_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq bigserial NOT NULL UNIQUE,
  category text NOT NULL,
  source text NOT NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  symbol text,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash text,
  entry_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.golden_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY gl_select ON public.golden_ledger FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE INDEX gl_created_idx ON public.golden_ledger (created_at DESC);
CREATE INDEX gl_category_idx ON public.golden_ledger (category, created_at DESC);
CREATE INDEX gl_agent_idx ON public.golden_ledger (agent_id, created_at DESC);

-- AGENT REPUTATION
CREATE TABLE public.agent_reputation (
  agent_id uuid PRIMARY KEY REFERENCES public.agents(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  events_count integer NOT NULL DEFAULT 0,
  hits integer NOT NULL DEFAULT 0,
  misses integer NOT NULL DEFAULT 0,
  last_active_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY ar_select ON public.agent_reputation FOR SELECT USING (auth.uid() IS NOT NULL);

-- ELJOT LEDGER (append-only token movements)
CREATE TABLE public.eljot_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  ledger_entry_id uuid REFERENCES public.golden_ledger(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  wallet_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.eljot_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY el_select ON public.eljot_ledger FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE INDEX el_agent_idx ON public.eljot_ledger (agent_id, created_at DESC);

-- Seed: pierwszy agent (już istniejący skaner setupów)
INSERT INTO public.agents (slug, name, kind, description, version, config) VALUES
  ('setup-scanner-v1', 'Setup Scanner v1', 'scanner',
   'Pierwszy agent ekosystemu. Skanuje BTC/ETH/SOL i 7 innych par na M15/M30/M45/H1/H4, wykrywa setupy BB-bounce i Elliott, zapisuje do złotej księgi.',
   '1.0.0',
   '{"intervals":["M15","M30","M45","H1","H4"],"detectors":["bb_bounce","elliott_wave"]}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.agent_reputation (agent_id)
SELECT id FROM public.agents WHERE slug = 'setup-scanner-v1'
ON CONFLICT (agent_id) DO NOTHING;
