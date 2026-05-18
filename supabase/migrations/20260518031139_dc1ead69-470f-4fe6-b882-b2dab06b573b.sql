
-- Prevent admins from modifying their own admin role (no self-escalation/lockout abuse)
CREATE OR REPLACE FUNCTION public.prevent_self_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role = 'admin' AND NEW.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Admins cannot grant the admin role to themselves; another admin must do it';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.role = 'admin' OR OLD.role = 'admin') AND OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Admins cannot modify their own admin role';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Admins cannot revoke their own admin role';
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_admin_role_change ON public.user_roles;
CREATE TRIGGER trg_prevent_self_admin_role_change
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_admin_role_change();
