/*
# Create uazapi_config table

1. New Tables
- `uazapi_config`: stores each user's UazAPI integration settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
  - `mode` (text, not null): 'admin' = admin token (sees all instances) | 'single' = single instance token
  - `base_url` (text, not null): the UazAPI server URL (e.g. https://api.uazapi.com)
  - `api_token` (text, not null): the admin token or instance token
  - `instance_name` (text, nullable): when mode='single', the instance name to use
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `uazapi_config`.
- Grant CRUD to `authenticated` only (app has sign-in).
- Owner-scoped CRUD: each user can only access their own config row.
- SECURITY: api_token is sensitive — only the owner can read it.
*/

CREATE TABLE IF NOT EXISTS uazapi_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'admin' CHECK (mode IN ('admin', 'single')),
  base_url text NOT NULL DEFAULT '',
  api_token text NOT NULL DEFAULT '',
  instance_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE uazapi_config ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON uazapi_config TO authenticated;

DROP POLICY IF EXISTS "uazapi_config_select_own" ON uazapi_config;
CREATE POLICY "uazapi_config_select_own"
ON uazapi_config FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "uazapi_config_insert_own" ON uazapi_config;
CREATE POLICY "uazapi_config_insert_own"
ON uazapi_config FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "uazapi_config_update_own" ON uazapi_config;
CREATE POLICY "uazapi_config_update_own"
ON uazapi_config FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "uazapi_config_delete_own" ON uazapi_config;
CREATE POLICY "uazapi_config_delete_own"
ON uazapi_config FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
