import { useEffect, useState } from 'react';
import { TrendingUp, MessageSquare, Send, Plug, Zap, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Connection, Campaign, Automation, Conversation } from '@/types';

interface DashboardProps {
  showToast: (msg: string) => void;
}

export default function Dashboard({ showToast: _showToast }: DashboardProps) {
  const { profile } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [connRes, campRes, autoRes, convRes] = await Promise.all([
      supabase.from('connections').select('*'),
      supabase.from('campaigns').select('*'),
      supabase.from('automations').select('*'),
      supabase.from('conversations').select('*'),
    ]);
    setConnections((connRes.data as Connection[]) ?? []);
    setCampaigns((campRes.data as Campaign[]) ?? []);
    setAutomations((autoRes.data as Automation[]) ?? []);
    setConversations((convRes.data as Conversation[]) ?? []);
    setLoading(false);
  }

  const connectedCount = connections.filter((c) => c.status === 'connected').length;
  const activeAutomations = automations.filter((a) => a.is_active).length;
  const messagesSent = campaigns
    .filter((c) => c.status === 'sent')
    .reduce((sum, c) => sum + c.contact_count, 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const metricCards = [
    {
      label: 'Números Conectados',
      value: `${connectedCount}/${connections.length}`,
      icon: Plug,
      color: '#25d366',
      bg: '#e8fbf0',
    },
    {
      label: 'Conversas',
      value: String(conversations.length),
      icon: MessageSquare,
      color: '#3b82f6',
      bg: '#dbeafe',
    },
    {
      label: 'Automações Ativas',
      value: String(activeAutomations),
      icon: Zap,
      color: '#f59e0b',
      bg: '#fef3c7',
    },
    {
      label: 'Mensagens Enviadas',
      value: messagesSent.toLocaleString('pt-BR'),
      icon: Send,
      color: '#128c4a',
      bg: '#e8fbf0',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-gradient-to-br from-[#0f1f1a] to-[#142b24] rounded-[18px] p-6 text-white">
        <h2 className="text-xl font-bold mb-1">
          {greeting}, {profile?.display_name ?? ''}!
        </h2>
        <p className="text-sm text-[#92a79f]">
          {profile?.plan
            ? `Plano ${profile.plan.name} · ${profile.plan.max_connections} conexões disponíveis`
            : 'Bem-vindo ao seu painel de gestão de WhatsApp'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[18px]">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden"
            >
              <div
                className="absolute -right-5 -top-5 w-20 h-20 rounded-full opacity-60"
                style={{ background: m.bg }}
              />
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[13px] font-semibold text-[#6b7a75]">{m.label}</span>
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center"
                  style={{ background: m.bg, color: m.color }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>
              </div>
              <strong className="text-2xl font-extrabold relative z-10">
                {loading ? '—' : m.value}
              </strong>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
          <h2 className="text-base font-bold mb-4">Suas Conexões</h2>
          {connections.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <Plug size={28} className="text-[#cbd5d1]" />
              <p className="text-sm text-[#6b7a75] text-center">
                {loading
                  ? 'Carregando...'
                  : 'Nenhuma conexão. Vá em "Conexões WhatsApp" para conectar seu número.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {connections.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f4f7f6] transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-full grid place-items-center font-black text-sm shrink-0 ${
                      c.status === 'connected'
                        ? 'bg-[#e8fbf0] text-[#128c4a]'
                        : 'bg-[#f1f5f4] text-[#999]'
                    }`}
                  >
                    W
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="block text-sm truncate">{c.instance_name}</strong>
                    <span className="text-xs text-[#6b7a75]">{c.phone || 'Sem número'}</span>
                  </div>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                      c.status === 'connected'
                        ? 'bg-[#e8fbf0] text-[#128c4a]'
                        : 'bg-[#fff7e6] text-[#b45309]'
                    }`}
                  >
                    {c.status === 'connected' ? 'Online' : 'Offline'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Bot size={18} className="text-[#128c4a]" />
            Automações Ativas
          </h2>
          {automations.length === 0 ? (
            <p className="text-sm text-[#6b7a75] py-6 text-center">
              {loading ? 'Carregando...' : 'Nenhuma automação configurada.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {automations.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[#e3ebe8]"
                >
                  <div
                    className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                      a.is_active ? 'bg-[#e8fbf0] text-[#128c4a]' : 'bg-[#f1f5f4] text-[#6b7a75]'
                    }`}
                  >
                    <Zap size={15} />
                  </div>
                  <span className="text-sm font-semibold flex-1 truncate">{a.name}</span>
                  <span
                    className={`text-[11px] font-bold ${a.is_active ? 'text-[#128c4a]' : 'text-[#6b7a75]'}`}
                  >
                    {a.is_active ? 'Ativa' : 'Pausada'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
