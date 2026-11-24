/*
# Resolve Agentes — Multi-tenant SaaS Schema

## Overview
Transforms the single-tenant admin panel into a multi-tenant SaaS where:
- An admin manages clients, plans, and sees aggregated metrics.
- Clients sign up, get assigned a plan, and connect their own WhatsApp numbers via QR code.
- Each client only sees their own data.

## New Tables
1. **profiles** — id (uuid PK FK→auth.users), role ('admin'|'client'), display_name, plan_id, subscription_status, created_at.

## Modified Tables
- automations, campaigns, connections, conversations, ai_config: added user_id column (DEFAULT auth.uid()).
- connections: added instance_token, qr_code columns.

## Functions
- is_admin(): returns true if current user's profile role is 'admin'.
- handle_new_user(): trigger that auto-creates a profile on signup. First user = admin, rest = client.

## Security
- RLS changed to authenticated-only, ownership-scoped.
- Admins can SELECT all rows; clients only see their own.
- Plans: all authenticated can SELECT; admin-only for writes.
- Anon access revoked on all tables.
- Plan prices updated: R$47,90 / R$99,90 / R$199,90 with 1/3/50 connections.
*/

-- ── STEP 1: PROFILES TABLE (must exist before is_admin function) ──
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client',
  display_name text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  subscription_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

-- ── STEP 2: IS_ADMIN FUNCTION ──────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── STEP 3: PROFILES POLICIES ──────────────────────────
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
TO authenticated USING (public.is_admin());

-- ── STEP 4: HANDLE_NEW_USER TRIGGER ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    CASE WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'client' END,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── STEP 5: ADD user_id COLUMNS ────────────────────────
ALTER TABLE automations ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE connections ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- ── STEP 6: ADD connection columns ─────────────────────
ALTER TABLE connections ADD COLUMN IF NOT EXISTS instance_token text NOT NULL DEFAULT '';
ALTER TABLE connections ADD COLUMN IF NOT EXISTS qr_code text;

-- ── STEP 7: UPDATE PLANS SEED ──────────────────────────
UPDATE plans SET monthly_price = 47.90, max_connections = 1, features = 'CRM, 1 conexão, 1.000 contatos', max_contacts = 1000 WHERE name = 'Plano Básico';
UPDATE plans SET monthly_price = 99.90, max_connections = 3, features = 'CRM, IA, Disparos, 3 conexões, 3.000 contatos', max_contacts = 3000 WHERE name = 'Plano Profissional';
UPDATE plans SET monthly_price = 199.90, max_connections = 50, features = 'CRM, IA, Disparos, 50 conexões, Contatos ilimitados', max_contacts = 100000 WHERE name = 'Plano Enterprise';

-- ── STEP 8: REVOKE ANON ACCESS ─────────────────────────
REVOKE SELECT, INSERT, UPDATE, DELETE ON plans FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON clients FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON automations FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON campaigns FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON connections FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON conversations FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON messages FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON ai_config FROM anon;

-- ── STEP 9: PLANS POLICIES ─────────────────────────────
DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "plans_insert" ON plans;
CREATE POLICY "plans_insert" ON plans FOR INSERT
TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "plans_update" ON plans;
CREATE POLICY "plans_update" ON plans FOR UPDATE
TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "plans_delete" ON plans;
CREATE POLICY "plans_delete" ON plans FOR DELETE
TO authenticated USING (public.is_admin());

-- ── STEP 10: AUTOMATIONS POLICIES ──────────────────────
DROP POLICY IF EXISTS "automations_select" ON automations;
CREATE POLICY "automations_select" ON automations FOR SELECT
TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "automations_insert" ON automations;
CREATE POLICY "automations_insert" ON automations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "automations_update" ON automations;
CREATE POLICY "automations_update" ON automations FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "automations_delete" ON automations;
CREATE POLICY "automations_delete" ON automations FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ── STEP 11: CAMPAIGNS POLICIES ────────────────────────
DROP POLICY IF EXISTS "campaigns_select" ON campaigns;
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT
TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "campaigns_insert" ON campaigns;
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaigns_update" ON campaigns;
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "campaigns_delete" ON campaigns;
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ── STEP 12: CONNECTIONS POLICIES ──────────────────────
DROP POLICY IF EXISTS "connections_select" ON connections;
CREATE POLICY "connections_select" ON connections FOR SELECT
TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "connections_insert" ON connections;
CREATE POLICY "connections_insert" ON connections FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "connections_update" ON connections;
CREATE POLICY "connections_update" ON connections FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "connections_delete" ON connections;
CREATE POLICY "connections_delete" ON connections FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ── STEP 13: CONVERSATIONS POLICIES ────────────────────
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT
TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_delete" ON conversations;
CREATE POLICY "conversations_delete" ON conversations FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ── STEP 14: MESSAGES POLICIES ─────────────────────────
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid())
);

-- ── STEP 15: AI_CONFIG POLICIES ────────────────────────
DROP POLICY IF EXISTS "ai_config_select" ON ai_config;
CREATE POLICY "ai_config_select" ON ai_config FOR SELECT
TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "ai_config_insert" ON ai_config;
CREATE POLICY "ai_config_insert" ON ai_config FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_config_update" ON ai_config;
CREATE POLICY "ai_config_update" ON ai_config FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_config_delete" ON ai_config;
CREATE POLICY "ai_config_delete" ON ai_config FOR DELETE
TO authenticated USING (auth.uid() = user_id);