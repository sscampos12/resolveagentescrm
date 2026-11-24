/*
# WhatsApp SaaS Admin Panel — Full Schema

## Overview
Creates the complete database schema for a WhatsApp SaaS admin panel (single-tenant, no auth).
The admin manages clients, subscription plans, automations, mass campaigns, CRM conversations,
UazAPI connections, and AI configuration — all persisted in Supabase.

## New Tables

1. **clients** — Customers/companies using the SaaS platform.
   - id (uuid PK), name (text), email (text), phone (text), plan_id (FK → plans),
     status (text: 'active'|'pending'|'inactive'), due_date (date), created_at.

2. **plans** — Subscription tiers offered to clients.
   - id (uuid PK), name (text), monthly_price (numeric), max_connections (int),
     features (text), max_contacts (int), created_at.

3. **automations** — Automation flows triggered by keywords or events.
   - id (uuid PK), name (text), trigger_condition (text), action_description (text),
     is_active (bool), created_at.

4. **campaigns** — Mass broadcast campaigns sent to contact lists.
   - id (uuid PK), connection_name (text), message_template (text),
     contact_count (int), status (text: 'draft'|'scheduled'|'sending'|'sent'|'failed'),
     scheduled_at (timestamptz), created_at.

5. **connections** — WhatsApp number connections managed via UazAPI.
   - id (uuid PK), instance_name (text), phone (text),
     status (text: 'connected'|'disconnected'), base_url (text), admin_token (text),
     created_at.

6. **conversations** — CRM chat threads with contacts.
   - id (uuid PK), contact_name (text), contact_phone (text),
     contact_avatar_color (text), ai_enabled (bool), last_message (text),
     last_message_at (timestamptz), created_at.

7. **messages** — Individual messages within a conversation.
   - id (uuid PK), conversation_id (FK → conversations),
     direction (text: 'inbound'|'outbound'), content (text), created_at.

8. **ai_config** — Global AI system prompt (single row).
   - id (uuid PK), system_prompt (text), model (text), temperature (numeric),
     updated_at.

## Security
- RLS enabled on every table.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant admin panel with no sign-in — all data is intentionally
  shared/public for the admin operator.
- Grants: SELECT, INSERT, UPDATE, DELETE on every table to anon + authenticated.
*/

-- ── PLANS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  max_connections integer NOT NULL DEFAULT 1,
  features text NOT NULL DEFAULT '',
  max_contacts integer NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON plans TO anon, authenticated;

DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "plans_insert" ON plans;
CREATE POLICY "plans_insert" ON plans FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "plans_update" ON plans;
CREATE POLICY "plans_update" ON plans FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "plans_delete" ON plans;
CREATE POLICY "plans_delete" ON plans FOR DELETE TO anon, authenticated USING (true);

-- ── CLIENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  due_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients TO anon, authenticated;

DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE TO anon, authenticated USING (true);

-- ── AUTOMATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_condition text NOT NULL,
  action_description text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON automations TO anon, authenticated;

DROP POLICY IF EXISTS "automations_select" ON automations;
CREATE POLICY "automations_select" ON automations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "automations_insert" ON automations;
CREATE POLICY "automations_insert" ON automations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "automations_update" ON automations;
CREATE POLICY "automations_update" ON automations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "automations_delete" ON automations;
CREATE POLICY "automations_delete" ON automations FOR DELETE TO anon, authenticated USING (true);

-- ── CAMPAIGNS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_name text NOT NULL DEFAULT '',
  message_template text NOT NULL DEFAULT '',
  contact_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO anon, authenticated;

DROP POLICY IF EXISTS "campaigns_select" ON campaigns;
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "campaigns_insert" ON campaigns;
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "campaigns_update" ON campaigns;
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "campaigns_delete" ON campaigns;
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE TO anon, authenticated USING (true);

-- ── CONNECTIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'disconnected',
  base_url text NOT NULL DEFAULT '',
  admin_token text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON connections TO anon, authenticated;

DROP POLICY IF EXISTS "connections_select" ON connections;
CREATE POLICY "connections_select" ON connections FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "connections_insert" ON connections;
CREATE POLICY "connections_insert" ON connections FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "connections_update" ON connections;
CREATE POLICY "connections_update" ON connections FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "connections_delete" ON connections;
CREATE POLICY "connections_delete" ON connections FOR DELETE TO anon, authenticated USING (true);

-- ── CONVERSATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  contact_phone text NOT NULL DEFAULT '',
  contact_avatar_color text NOT NULL DEFAULT '#dff8e9',
  ai_enabled boolean NOT NULL DEFAULT true,
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO anon, authenticated;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "conversations_delete" ON conversations;
CREATE POLICY "conversations_delete" ON conversations FOR DELETE TO anon, authenticated USING (true);

-- ── MESSAGES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'outbound',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete" ON messages FOR DELETE TO anon, authenticated USING (true);

-- ── AI CONFIG (single row) ─────────────────────────────
CREATE TABLE IF NOT EXISTS ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt text NOT NULL DEFAULT 'Você é um assistente de vendas humanizado. Atenda com clareza, entenda a necessidade do cliente, apresente os produtos e quebre objeções.',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  temperature numeric(3,2) NOT NULL DEFAULT 0.70,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_config TO anon, authenticated;

DROP POLICY IF EXISTS "ai_config_select" ON ai_config;
CREATE POLICY "ai_config_select" ON ai_config FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ai_config_insert" ON ai_config;
CREATE POLICY "ai_config_insert" ON ai_config FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ai_config_update" ON ai_config;
CREATE POLICY "ai_config_update" ON ai_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "ai_config_delete" ON ai_config;
CREATE POLICY "ai_config_delete" ON ai_config FOR DELETE TO anon, authenticated USING (true);

-- ── SEED DATA ──────────────────────────────────────────
INSERT INTO plans (name, monthly_price, max_connections, features, max_contacts)
SELECT 'Plano Básico', 97.00, 1, 'CRM, 1.000 contatos', 1000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Plano Básico');

INSERT INTO plans (name, monthly_price, max_connections, features, max_contacts)
SELECT 'Plano Profissional', 197.00, 3, 'CRM, IA, Disparos, 3.000 contatos', 3000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Plano Profissional');

INSERT INTO plans (name, monthly_price, max_connections, features, max_contacts)
SELECT 'Plano Enterprise', 497.00, 10, 'CRM, IA, Disparos, Contatos ilimitados, Multi-conexão', 100000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Plano Enterprise');

INSERT INTO automations (name, trigger_condition, action_description, is_active)
SELECT 'Mensagem de Boas-Vindas', 'Contato enviar a primeira mensagem', 'Enviar saudação inicial', true
WHERE NOT EXISTS (SELECT 1 FROM automations WHERE name = 'Mensagem de Boas-Vindas');

INSERT INTO automations (name, trigger_condition, action_description, is_active)
SELECT 'Palavra-Chave: "Preço"', 'Mensagem contiver "preço"', 'Enviar tabela de valores', true
WHERE NOT EXISTS (SELECT 1 FROM automations WHERE name = 'Palavra-Chave: "Preço"');

INSERT INTO automations (name, trigger_condition, action_description, is_active)
SELECT 'Ausência de Resposta (Follow-up)', 'Sem resposta por 30 min', 'Enviar "Ainda posso ajudar?"', false
WHERE NOT EXISTS (SELECT 1 FROM automations WHERE name = 'Ausência de Resposta (Follow-up)');

INSERT INTO ai_config (system_prompt)
SELECT 'Você é um assistente de vendas humanizado. Atenda com clareza, entenda a necessidade do cliente, apresente os produtos e quebre objeções.'
WHERE NOT EXISTS (SELECT 1 FROM ai_config);

INSERT INTO conversations (contact_name, contact_phone, contact_avatar_color, ai_enabled, last_message, last_message_at)
SELECT 'Suzy Vivo', '+55 11 98888-7777', '#dff8e9', true, 'Gostaria de saber mais...', now()
WHERE NOT EXISTS (SELECT 1 FROM conversations WHERE contact_name = 'Suzy Vivo');

INSERT INTO conversations (contact_name, contact_phone, contact_avatar_color, ai_enabled, last_message, last_message_at)
SELECT 'Maria Costa', '+55 11 97777-6666', '#e0e0e0', true, 'Vocês emitem nota fiscal?', now()
WHERE NOT EXISTS (SELECT 1 FROM conversations WHERE contact_name = 'Maria Costa');

-- Messages for Suzy Vivo
INSERT INTO messages (conversation_id, direction, content)
SELECT id, 'inbound', 'Oi, gostaria de saber mais sobre a plataforma de vocês.'
FROM conversations WHERE contact_name = 'Suzy Vivo'
AND NOT EXISTS (
  SELECT 1 FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.contact_name = 'Suzy Vivo' AND m.content = 'Oi, gostaria de saber mais sobre a plataforma de vocês.'
);

INSERT INTO messages (conversation_id, direction, content)
SELECT id, 'outbound', 'Olá! Sou a IA de atendimento. Temos planos a partir de R$ 97/mês com automação e disparos. Posso te enviar o link?'
FROM conversations WHERE contact_name = 'Suzy Vivo'
AND NOT EXISTS (
  SELECT 1 FROM messages m
  JOIN conversations c ON c.id = m.conversation_id
  WHERE c.contact_name = 'Suzy Vivo' AND m.content = 'Olá! Sou a IA de atendimento. Temos planos a partir de R$ 97/mês com automação e disparos. Posso te enviar o link?'
);