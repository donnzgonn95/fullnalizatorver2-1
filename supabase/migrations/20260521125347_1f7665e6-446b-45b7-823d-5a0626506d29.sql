-- Helper: zawołaj /api/public/hooks/* z nagłówkiem x-cron-secret pobranym z vault.
CREATE OR REPLACE FUNCTION public.invoke_cron_hook(hook_path text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net, extensions
AS $$
DECLARE
  v_secret text;
  v_req_id bigint;
  v_base   text := 'https://project--5eca04f2-f1e3-4d71-ba32-c7e7c0a5b09f.lovable.app';
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE EXCEPTION 'CRON_SECRET missing in vault';
  END IF;

  SELECT net.http_post(
    url     := v_base || hook_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body    := '{}'::jsonb
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_cron_hook(text) FROM PUBLIC;

-- Reschedule wszystkich czterech jobów na helper z autoryzacją.
SELECT cron.unschedule('scan-setups-global');
SELECT cron.unschedule('verify-setups-global');
SELECT cron.unschedule('notify-setups-global');
SELECT cron.unschedule('agent-simulation-tick-global');

SELECT cron.schedule(
  'scan-setups-global', '*/5 * * * *',
  $cmd$ SELECT public.invoke_cron_hook('/api/public/hooks/scan-setups'); $cmd$
);
SELECT cron.schedule(
  'verify-setups-global', '*/5 * * * *',
  $cmd$ SELECT public.invoke_cron_hook('/api/public/hooks/verify-setups'); $cmd$
);
SELECT cron.schedule(
  'notify-setups-global', '*/2 * * * *',
  $cmd$ SELECT public.invoke_cron_hook('/api/public/hooks/notify-setups'); $cmd$
);
SELECT cron.schedule(
  'agent-simulation-tick-global', '*/5 * * * *',
  $cmd$ SELECT public.invoke_cron_hook('/api/public/hooks/agent-simulation-tick'); $cmd$
);