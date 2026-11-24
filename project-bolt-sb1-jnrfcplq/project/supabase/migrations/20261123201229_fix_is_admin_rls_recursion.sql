/*
# Fix: is_admin() RLS recursion on profiles

## Problem
The `is_admin()` function queries `public.profiles`, which has RLS enabled.
The SELECT policy on profiles calls `is_admin()`, creating infinite recursion:
  profiles SELECT → is_admin() → profiles SELECT → is_admin() → ...

This caused the profiles query to return NULL for authenticated users,
so the panel never detected the admin role and showed the client panel instead.

## Fix
Replace `is_admin()` with a SECURITY DEFINER function that bypasses RLS
by setting `row_security = off` inside the function body. This breaks the
recursion: the function reads profiles directly, without going through RLS.

Also revoked EXECUTE from anon to prevent unauthenticated calls.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SET row_security = off;
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;