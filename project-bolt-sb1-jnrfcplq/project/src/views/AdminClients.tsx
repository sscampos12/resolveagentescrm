import { useEffect, useState } from 'react';
import { X, Search, Plug, UserPlus, Loader2 } from 'lucide-react';
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

interface AdminClientsProps {
  showToast: (msg: string) => void;
}

export default function AdminClients({ showToast }: AdminClientsProps) {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editModal, setEditModal] = useState<AdminProfile | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [profilesRes, plansRes, connectionsRes] = await Promise.all([
      supabase.rpc('admin_get_profiles'),
      supabase.from('plans').select('*').order('monthly_price'),
      supabase.from('connections').select('*'),
    ]);
    setProfiles((profilesRes.data as AdminProfile[]) ?? []);
    setPlans((plansRes.data as Plan[]) ?? []);
    setConnections((connectionsRes.data as Connection[]) ?? []);
    setLoading(false);
  }

  function openEdit(p: AdminProfile) {
    setEditModal(p);
    setSelectedPlan(p.plan_id ?? '');
    setSelectedStatus(p.subscription_status);
  }

  async function saveEdit() {
    if (!editModal) return;
    const { error } = await supabase.rpc('admin_update_profile', {
      target_profile_id: editModal.id,
      new_plan_id: selectedPlan || null,
      new_subscription_status: selectedStatus,
    });
    if (error) {
      showToast('Erro ao atualizar cliente.');
      return;
    }
    showToast('Cliente atualizado!');
    setEditModal(null);
    await loadData();
  }

  async function createClient() {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      showToast('Preencha todos os campos.');
      return;
    }
    setCreating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email: newEmail.trim(),
            password: newPassword,
            display_name: newName.trim(),
            role: 'client',
            plan_id: newPlan || null,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        showToast(result.error ?? 'Erro ao criar cliente.');
        setCreating(false);
        return;
      }

      showToast('Cliente criado com sucesso!');
      setShowCreateModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPlan('');
      await loadData();
    } catch {
      showToast('Erro de conexão ao criar cliente.');
    }
    setCreating(false);
  }

  const clients = profiles.filter((p) => p.role === 'client');
  const filtered = clients.filter(
    (c) =>
      c.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.plan_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  function getConnCount(uid: string) {
    const userConns = connections.filter((c) => c.user_id === uid);
    return {
      total: userConns.length,
      connected: userConns.filter((c) => c.status === 'connected').length,
    };
  }

  const statusBadge = (status: string) => {
    if (status === 'active') return 'bg-[#e8fbf0] text-[#128c4a]';
    if (status === 'pending') return 'bg-[#fff7e6] text-[#b45309]';
    if (status === 'expired') return 'bg-[#fee2e2] text-[#991b1b]';
    return 'bg-[#f1f5f4] text-[#6b7a75]';
  };

  const statusLabel = (status: string) => {
    if (status === 'active') return 'Ativo';
    if (status === 'pending') return 'Pendente';
    if (status === 'expired') return 'Expirado';
    return 'Cancelado';
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <h2 className="text-base font-bold">Clientes</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a75]"
              />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 h-10 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition-colors w-44"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-10 px-4 rounded-xl bg-[#25d366] text-[#052014] text-sm font-bold flex items-center gap-2 hover:brightness-105 transition shrink-0"
            >
              <UserPlus size={16} strokeWidth={2.2} />
              Novo Cliente
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[#6b7a75] py-8 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#6b7a75] py-8 text-center">
            {search ? 'Nenhum resultado.' : 'Nenhum cliente cadastrado.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Plano
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Status
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Conexões
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const conn = getConnCount(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-[#f8fbfa] transition-colors">
                      <td className="px-4 py-4 border-b border-[#e3ebe8]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full grid place-items-center bg-[#dff8e9] text-[#128c4a] font-black text-sm shrink-0">
                            {c.display_name.charAt(0).toUpperCase()}
                          </div>
                          <strong className="text-sm">{c.display_name}</strong>
                        </div>
                      </td>
                      <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                        {c.plan_name ?? '—'}
                      </td>
                      <td className="px-4 py-4 border-b border-[#e3ebe8]">
                        <span
                          className={`text-[11px] font-extrabold px-2 py-1 rounded-lg ${statusBadge(
                            c.subscription_status,
                          )}`}
                        >
                          {statusLabel(c.subscription_status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                        <span className="flex items-center gap-1.5">
                          <Plug size={14} className="text-[#6b7a75]" />
                          {conn.connected}/{conn.total}
                        </span>
                      </td>
                      <td className="px-4 py-4 border-b border-[#e3ebe8]">
                        <button
                          onClick={() => openEdit(c)}
                          className="h-8 px-3 rounded-lg border border-[#bfe8d0] text-[#128c4a] text-[11px] font-bold hover:bg-[#e8fbf0] transition"
                        >
                          Gerenciar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
          <div className="bg-white rounded-[18px] shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full grid place-items-center bg-[#dff8e9] text-[#128c4a] font-black">
                  {editModal.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{editModal.display_name}</h2>
                  <span className="text-xs text-[#6b7a75]">Cliente</span>
                </div>
              </div>
              <button
                onClick={() => setEditModal(null)}
                className="w-9 h-9 rounded-xl grid place-items-center hover:bg-[#f4f7f6] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Plano</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
                >
                  <option value="">Sem plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.monthly_price).toFixed(2).replace('.', ',')}/mês
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Status da Assinatura</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
                >
                  <option value="pending">Pendente</option>
                  <option value="active">Ativo</option>
                  <option value="expired">Expirado</option>
                  <option value="canceled">Cancelado</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setEditModal(null)}
                  className="h-10 px-4 rounded-xl border border-[#e3ebe8] text-sm font-bold text-[#6b7a75] hover:bg-[#f4f7f6] transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] text-sm font-bold hover:brightness-105 transition"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create client modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
          <div className="bg-white rounded-[18px] shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl grid place-items-center bg-[#e8fbf0] text-[#128c4a]">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Novo Cliente</h2>
                  <span className="text-xs text-[#6b7a75]">Crie uma conta para seu cliente</span>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-9 h-9 rounded-xl grid place-items-center hover:bg-[#f4f7f6] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Nome</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="Nome do cliente ou empresa"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">E-mail</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Senha temporaria</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="Senha inicial do cliente"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Plano</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
                >
                  <option value="">Sem plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.monthly_price).toFixed(2).replace('.', ',')}/mes
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 px-4 rounded-xl border border-[#e3ebe8] text-sm font-bold text-[#6b7a75] hover:bg-[#f4f7f6] transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={createClient}
                  disabled={creating}
                  className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] text-sm font-bold hover:brightness-105 transition disabled:opacity-60 flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Cliente'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
