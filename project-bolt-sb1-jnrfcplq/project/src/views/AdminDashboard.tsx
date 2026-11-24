import { useEffect, useState } from 'react';
import { TrendingUp, Users, CreditCard, Send, Plug, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Plan, Connection } from '@/types';

interface AdminProfile {
  id: string;
  role: string;
  display_name: string;
  plan_id: string | null;
  subscription_status: string;
  created_at: string;
  plan_name: string | null;
  plan_monthly_price: number | null;
  plan_max_connections: number | null;
}

interface AdminDashboardProps {
  showToast: (msg: string) => void;
}

interface Metrics {
  mrr: number;
  totalClients: number;
  activeSubscriptions: number;
  totalConnections: number;
  connectedNumbers: number;
}

export default function AdminDashboard({ showToast: _showToast }: AdminDashboardProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    mrr: 0,
    totalClients: 0,
    activeSubscriptions: 0,
    totalConnections: 0,
    connectedNumbers: 0,
  });
  const [recentClients, setRecentClients] = useState<AdminProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [connectionsByClient, setConnectionsByClient] = useState<
    { displayName: string; total: number; connected: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [profilesRes, plansRes, connectionsRes] = await Promise.all([
      supabase.rpc('admin_get_profiles'),
      supabase.from('plans').select('*').order('monthly_price'),
      supabase.from('connections').select('*'),
    ]);

    const allProfiles = (profilesRes.data as AdminProfile[]) ?? [];
    const allPlans = (plansRes.data as Plan[]) ?? [];
    const allConnections = (connectionsRes.data as Connection[]) ?? [];

    const mrr = allProfiles
      .filter((p) => p.role === 'client' && p.subscription_status === 'active')
      .reduce((sum, p) => sum + (p.plan_monthly_price ?? 0), 0);

    const clients = allProfiles.filter((p) => p.role === 'client');
    const connectedNumbers = allConnections.filter((c) => c.status === 'connected').length;

    // Connections per client
    const byClient = clients.map((c) => ({
      displayName: c.display_name,
      total: allConnections.filter((conn) => conn.user_id === c.id).length,
      connected: allConnections.filter(
        (conn) => conn.user_id === c.id && conn.status === 'connected',
      ).length,
    }));

    setMetrics({
      mrr,
      totalClients: clients.length,
      activeSubscriptions: clients.filter((c) => c.subscription_status === 'active').length,
      totalConnections: allConnections.length,
      connectedNumbers,
    });
    setRecentClients(allProfiles.slice(0, 6));
    setPlans(allPlans);
    setConnectionsByClient(byClient);
    setLoading(false);
  }

  const metricCards = [
    {
      label: 'Faturamento Mensal (MRR)',
      value: `R$ ${metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: '#25d366',
      bg: '#e8fbf0',
    },
    {
      label: 'Total de Clientes',
      value: String(metrics.totalClients),
      icon: Users,
      color: '#3b82f6',
      bg: '#dbeafe',
    },
    {
      label: 'Assinaturas Ativas',
      value: String(metrics.activeSubscriptions),
      icon: CreditCard,
      color: '#128c4a',
      bg: '#e8fbf0',
    },
    {
      label: 'Números Conectados',
      value: `${metrics.connectedNumbers}/${metrics.totalConnections}`,
      icon: Plug,
      color: '#f59e0b',
      bg: '#fef3c7',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
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
        {/* Recent clients */}
        <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
          <h2 className="text-base font-bold mb-4">Clientes Recentes</h2>
          {recentClients.length === 0 ? (
            <p className="text-sm text-[#6b7a75] py-6 text-center">
              {loading ? 'Carregando...' : 'Nenhum cliente cadastrado.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f4f7f6] transition-colors"
                >
                  <div className="w-10 h-10 rounded-full grid place-items-center bg-[#dff8e9] text-[#128c4a] font-black shrink-0">
                    {c.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="block text-sm font-bold truncate">{c.display_name}</strong>
                    <span className="text-xs text-[#6b7a75]">
                      {c.role === 'admin' ? 'Administrador' : c.plan_name ?? 'Sem plano'}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-1 rounded-lg shrink-0 ${
                      c.subscription_status === 'active'
                        ? 'bg-[#e8fbf0] text-[#128c4a]'
                        : c.subscription_status === 'pending'
                        ? 'bg-[#fff7e6] text-[#b45309]'
                        : 'bg-[#fee2e2] text-[#991b1b]'
                    }`}
                  >
                    {c.subscription_status === 'active'
                      ? 'Ativo'
                      : c.subscription_status === 'pending'
                      ? 'Pendente'
                      : c.subscription_status === 'expired'
                      ? 'Expirado'
                      : 'Cancelado'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connections per client */}
        <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
          <h2 className="text-base font-bold mb-4 flex items-center gap-2">
            <Activity size={18} className="text-[#128c4a]" />
            Conexões por Cliente
          </h2>
          {connectionsByClient.length === 0 ? (
            <p className="text-sm text-[#6b7a75] py-6 text-center">
              {loading ? 'Carregando...' : 'Nenhum cliente com conexões.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {connectionsByClient.map((c) => (
                <div
                  key={c.displayName}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#e3ebe8]"
                >
                  <span className="text-sm font-bold truncate">{c.displayName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-[#128c4a]">{c.connected}</span>
                    <span className="text-xs text-[#6b7a75]">/ {c.total} conectados</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plans overview */}
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <h2 className="text-base font-bold mb-4">Planos Disponíveis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl border border-[#e3ebe8] flex flex-col gap-1"
            >
              <strong className="text-sm font-bold">{p.name}</strong>
              <span className="text-xs text-[#6b7a75]">{p.features}</span>
              <strong className="text-lg font-extrabold text-[#128c4a] mt-2">
                R$ {Number(p.monthly_price).toFixed(2).replace('.', ',')}
                <span className="text-xs font-normal text-[#6b7a75]">/mês</span>
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
