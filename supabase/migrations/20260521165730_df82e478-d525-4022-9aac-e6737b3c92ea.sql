CREATE OR REPLACE FUNCTION public.set_vault_secret(p_name text, p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_name IS NULL OR length(p_name) = 0 THEN
    RAISE EXCEPTION 'secret name required';
  END IF;
  IF p_value IS NULL OR length(p_value) = 0 THEN
    RAISE EXCEPTION 'secret value required';
  END IF;

  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name LIMIT 1;

  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_value, p_name, 'managed by set_vault_secret');
    RETURN 'created';
  ELSE
    PERFORM vault.update_secret(v_id, p_value, p_name, 'managed by set_vault_secret');
    RETURN 'updated';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_vault_secret(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_vault_secret(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_vault_secret(text, text) FROM authenticated;