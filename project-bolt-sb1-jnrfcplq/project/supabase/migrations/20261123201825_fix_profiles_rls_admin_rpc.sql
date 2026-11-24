/*
# Fix: Remove is_admin() recursion from profiles RLS + add admin RPC functions

## Problem
The profiles SELECT/UPDATE/DELETE policies call is_admin(), which queries profiles.
Even with SECURITY DEFINER + row_security off, this can still cause issues in
certain Supabase configurations. The result: the profile query returns NULL,
the panel never detects the admin role, and the user is stuck on the client panel.

## Fix
1. Profiles policies: remove is_admin() entirely. Users can only SELECT/UPDATE
   their own profile (auth.uid() = id). No recursion possible.
2. Create admin_get_profiles() RPC: SECURITY DEFINER function that returns all
   profiles with plan info. Only callable by authenticated users. Used by the
   admin panel instead of direct table queries.
3. Create admin_update_profile() RPC: SECURITY DEFINER function that lets admin
   update a client's plan and subscription status. Checks is_admin() internally
   (which now works because profiles SELECT no longer calls is_admin()).
4. is_admin() still works for OTHER tables (plans, automations, etc.) because
   those tables don't cause recursion — only profiles did.
*/

-- ── STEP 1: Simplify profiles SELECT (remove is_admin) ──
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

-- ── STEP 2: Simplify profiles UPDATE (remove is_admin) ──
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ── STEP 3: Simplify profiles DELETE (admin only, via is_admin which now works) ──
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
TO authenticated USING (public.is_admin());

-- ── STEP 4: Create admin_get_profiles RPC ──────────────
CREATE OR REPLACE FUNCTION public.admin_get_profiles()
RETURNS TABLE (
  id uuid,
  role text,
  display_name text,
  plan_id uuid,
  subscription_status text,
  created_at timestamptz,
  plan_name text,
  plan_monthly_price numeric,
  plan_max_connections integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  SET LOCAL row_security = off;
  RETURN QUERY
    SELECT 
      p.id, p.role, p.display_name, p.plan_id, p.subscription_status, p.created_at,
      pl.name as plan_name,
      pl.monthly_price as plan_monthly_price,
      pl.max_connections as plan_max_connections
    FROM profiles p
    LEFT JOIN plans pl ON pl.id = p.plan_id
    ORDER BY p.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles() TO authenticated;

-- ── STEP 5: Create admin_update_profile RPC ────────────
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_profile_id uuid,
  new_plan_id uuid DEFAULT NULL,
  new_subscription_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  SET LOCAL row_security = off;
  
  UPDATE profiles SET
    plan_id = COALESCE(new_plan_id, plan_id),
    subscription_status = COALESCE(new_subscription_status, subscription_status)
  WHERE id = target_profile_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, uuid, text) TO authenticated;