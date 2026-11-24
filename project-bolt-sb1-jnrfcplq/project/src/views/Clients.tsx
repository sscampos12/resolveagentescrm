import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client, Plan } from '@/types';

interface ClientsProps {
  showToast: (msg: string) => void;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  plan_id: '',
  status: 'active' as Client['status'],
  due_date: '',
};

export default function Clients({ showToast }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [clientsRes, plansRes] = await Promise.all([
      supabase.from('clients').select('*, plan(*)').order('created_at', { ascending: false }),
      supabase.from('plans').select('*').order('monthly_price'),
    ]);
    setClients((clientsRes.data as Client[]) ?? []);
    setPlans((plansRes.data as Plan[]) ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(c: Client) {
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone,
      plan_id: c.plan_id ?? '',
      status: c.status,
      due_date: c.due_date ?? '',
    });
    setEditingId(c.id);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      showToast('Preencha nome e e-mail.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      plan_id: form.plan_id || null,
      status: form.status,
      due_date: form.due_date || null,
    };

    if (editingId) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingId);
      if (error) {
        showToast('Erro ao atualizar cliente.');
        return;
      }
      showToast('Cliente atualizado!');
    } else {
      const { error } = await supabase.from('clients').insert(payload);
      if (error) {
        showToast('Erro ao cadastrar cliente.');
        return;
      }
      showToast('Cliente cadastrado!');
    }
    setModalOpen(false);
    await loadData();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover cliente.');
      return;
    }
    showToast('Cliente removido.');
    await loadData();
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  );

  const statusBadge = (status: Client['status']) => {
    if (status === 'active') return 'bg-[#e8fbf0] text-[#128c4a]';
    if (status === 'pending') return 'bg-[#fff7e6] text-[#b45309]';
    return 'bg-[#fee2e2] text-[#991b1b]';
  };

  const statusLabel = (status: Client['status']) => {
    if (status === 'active') return 'Ativo';
    if (status === 'pending') return 'Pendente';
    return 'Inativo';
  };

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
          <h2 className="text-base font-bold">Gestão de Clientes</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a75]"
              />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 h-10 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition-colors w-44"
              />
            </div>
            <button
              onClick={openNew}
              className="h-10 px-4 rounded-xl bg-[#25d366] text-[#052014] font-bold text-[13px] flex items-center gap-2 hover:brightness-105 transition"
            >
              <Plus size={16} strokeWidth={2.5} />
              Novo Cliente
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[#6b7a75] py-8 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#6b7a75] py-8 text-center">
            {search ? 'Nenhum resultado.' : 'Nenhum cliente cadastrado ainda.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Nome / Empresa
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    E-mail
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Plano
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Status
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f8fbfa] transition-colors">
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                      <strong>{c.name}</strong>
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm text-[#6b7a75]">
                      {c.email}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                      {c.plan?.name ?? '—'}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8]">
                      <span
                        className={`text-[11px] font-extrabold px-2 py-1 rounded-lg ${statusBadge(
                          c.status,
                        )}`}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm text-[#6b7a75]">
                      {formatDate(c.due_date)}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="h-7 px-2.5 rounded-lg border border-[#bfe8d0] text-[#128c4a] text-[11px] font-bold flex items-center gap-1 hover:bg-[#e8fbf0] transition"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          className="h-7 w-7 rounded-lg border border-[#fecaca] text-[#991b1b] grid place-items-center hover:bg-[#fee2e2] transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4">
          <div className="bg-white rounded-[18px] shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-xl grid place-items-center hover:bg-[#f4f7f6] transition"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Nome / Empresa</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="Farmácia Saúde+"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Telefone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="+55 11 99999-0000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Plano</label>
                <select
                  value={form.plan_id}
                  onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
                >
                  <option value="">Sem plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.monthly_price).toFixed(0)}/mês
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Status</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as Client['status'] })
                  }
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
                >
                  <option value="active">Ativo</option>
                  <option value="pending">Pendente</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Vencimento</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                />
              </div>
              <div className="col-span-full flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-[#e3ebe8] text-sm font-bold text-[#6b7a75] hover:bg-[#f4f7f6] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] text-sm font-bold hover:brightness-105 transition"
                >
                  {editingId ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
