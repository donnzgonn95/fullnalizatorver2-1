CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any prior schedule with the same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('zombie-cron-reaper');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Recurring reaper: every 5 minutes, mark rows stuck in 'running' >10 min as 'timeout'
SELECT cron.schedule(
  'zombie-cron-reaper',
  '*/5 * * * *',
  $$
  UPDATE public.cron_run_logs
  SET status = 'timeout',
      finished_at = now(),
      duration_ms = COALESCE(duration_ms, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::int,
      error_message = COALESCE(error_message, 'Marked timeout by recurring reaper')
  WHERE status = 'running'
    AND started_at < now() - interval '10 minutes';
  $$
);

-- One-shot cleanup of currently stuck rows
UPDATE public.cron_run_logs
SET status = 'timeout',
    finished_at = now(),
    duration_ms = COALESCE(duration_ms, EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::int,
    error_message = COALESCE(error_message, 'Marked timeout by recurring reaper backfill')
WHERE status = 'running'
  AND started_at < now() - interval '10 minutes';