export interface Plan {
  id: string;
  name: string;
  monthly_price: number;
  max_connections: number;
  features: string;
  max_contacts: number;
  created_at?: string;
}

export interface Profile {
  id: string;
  role: 'admin' | 'client';
  display_name: string;
  plan_id: string | null;
  subscription_status: 'active' | 'pending' | 'expired' | 'canceled';
  created_at?: string;
  plan?: Plan | null;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan_id: string | null;
  status: 'active' | 'pending' | 'inactive';
  due_date: string | null;
  created_at?: string;
  plan?: Plan | null;
}

export interface Automation {
  id: string;
  name: string;
  trigger_condition: string;
  action_description: string;
  is_active: boolean;
  user_id?: string;
  created_at?: string;
}

export interface Campaign {
  id: string;
  connection_name: string;
  message_template: string;
  contact_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  user_id?: string;
  created_at?: string;
}

export interface Connection {
  id: string;
  instance_name: string;
  phone: string;
  status: 'connected' | 'disconnected';
  base_url: string;
  admin_token: string;
  instance_token: string;
  qr_code: string | null;
  user_id?: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_avatar_color: string;
  ai_enabled: boolean;
  last_message: string;
  last_message_at: string;
  user_id?: string;
  connection_id?: string | null;
  assigned_to?: string | null;
  handoff_status?: 'ai' | 'human' | 'waiting';
  assigned_at?: string | null;
  created_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  created_at: string;
}

export interface AiConfig {
  id: string;
  system_prompt: string;
  model: string;
  temperature: number;
  user_id?: string;
  updated_at: string;
}

export type TabId =
  | 'dashboard'
  | 'usuarios'
  | 'planos'
  | 'atendimento'
  | 'campanhas'
  | 'automacoes'
  | 'conexoes'
  | 'ia'
  | 'admin-dashboard'
  | 'admin-clients';

export const BRAND = {
  name: 'Resolve Agentes',
  short: 'R',
  slogan: 'CRM WhatsApp Multi-tenant',
};
