ALTER TABLE public.cron_run_logs
  ADD COLUMN IF NOT EXISTS error_message text;

UPDATE public.cron_run_logs
SET status = 'timeout',
    finished_at = now(),
    error_message = COALESCE(error_message, 'Marked timeout by maintenance reaper')
WHERE status = 'running'
  AND started_at < now() - interval '10 minutes';