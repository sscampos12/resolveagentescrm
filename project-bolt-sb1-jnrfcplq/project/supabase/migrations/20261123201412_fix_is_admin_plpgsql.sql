/*
# Fix: is_admin() as plpgsql with row_security bypass

## Problem
The previous is_admin() was LANGUAGE sql with `SET row_security = off;` in the body.
SQL language functions only accept SQL queries, not SET commands.
This caused the function to fail at runtime, preventing profile reads and
making the panel always show the client view instead of admin.

## Fix
Use CREATE OR REPLACE FUNCTION (cannot DROP because policies depend on it).
Rewrite as LANGUAGE plpgsql SECURITY DEFINER with `SET LOCAL row_security = off`
inside BEGIN...END. plpgsql supports SET LOCAL. SECURITY DEFINER also bypasses RLS.
Both together ensure no infinite recursion.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;