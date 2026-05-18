-- Fix detected_setups SELECT: require authentication even for global (user_id IS NULL) rows
DROP POLICY IF EXISTS ds_select ON public.detected_setups;
CREATE POLICY ds_select
ON public.detected_setups
FOR SELECT
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_self_admin_role_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;