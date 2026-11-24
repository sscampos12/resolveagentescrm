import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Plan } from '@/types';

interface PlansProps {
  showToast: (msg: string) => void;
}

const emptyForm = {
  name: '',
  monthly_price: '',
  max_connections: '1',
  features: '',
  max_contacts: '1000',
};

export default function Plans({ showToast }: PlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    const { data } = await supabase.from('plans').select('*').order('monthly_price');
    setPlans((data as Plan[]) ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(p: Plan) {
    setForm({
      name: p.name,
      monthly_price: String(p.monthly_price),
      max_connections: String(p.max_connections),
      features: p.features,
      max_contacts: String(p.max_contacts),
    });
    setEditingId(p.id);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Preencha o nome do plano.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      monthly_price: parseFloat(form.monthly_price) || 0,
      max_connections: parseInt(form.max_connections) || 1,
      features: form.features.trim(),
      max_contacts: parseInt(form.max_contacts) || 1000,
    };

    if (editingId) {
      const { error } = await supabase.from('plans').update(payload).eq('id', editingId);
      if (error) {
        showToast('Erro ao atualizar plano.');
        return;
      }
      showToast('Plano atualizado!');
    } else {
      const { error } = await supabase.from('plans').insert(payload);
      if (error) {
        showToast('Erro ao criar plano.');
        return;
      }
      showToast('Plano criado!');
    }
    setModalOpen(false);
    await loadPlans();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover plano.');
      return;
    }
    showToast('Plano removido.');
    await loadPlans();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Gerenciar Planos de Assinatura</h2>
          <button
            onClick={openNew}
            className="h-10 px-4 rounded-xl bg-[#25d366] text-[#052014] font-bold text-[13px] flex items-center gap-2 hover:brightness-105 transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            Novo Plano
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#6b7a75] py-8 text-center">Carregando...</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-[#6b7a75] py-8 text-center">
            Nenhum plano cadastrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Nome do Plano
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Valor Mensal
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Conexões
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Recursos
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Contatos
                  </th>
                  <th className="px-4 py-3 border-b border-[#e3ebe8] text-xs font-bold uppercase text-[#6b7a75]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-[#f8fbfa] transition-colors">
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                      <strong>{p.name}</strong>
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm font-bold text-[#128c4a]">
                      R$ {Number(p.monthly_price).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                      {p.max_connections}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm text-[#6b7a75]">
                      {p.features}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8] text-sm">
                      {p.max_contacts.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-4 border-b border-[#e3ebe8]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="h-7 px-2.5 rounded-lg border border-[#bfe8d0] text-[#128c4a] text-[11px] font-bold flex items-center gap-1 hover:bg-[#e8fbf0] transition"
                        >
                          <Pencil size={12} />
                          Editar
                        </button>
                        <button
                          onClick={() => remove(p.id)}
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
                {editingId ? 'Editar Plano' : 'Novo Plano'}
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
                <label className="text-[13px] font-bold">Nome do Plano</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="Plano Básico"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Valor Mensal (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.monthly_price}
                  onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="97.00"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Máx. Conexões</label>
                <input
                  type="number"
                  value={form.max_connections}
                  onChange={(e) => setForm({ ...form, max_connections: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="1"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Máx. Contatos</label>
                <input
                  type="number"
                  value={form.max_contacts}
                  onChange={(e) => setForm({ ...form, max_contacts: e.target.value })}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="1000"
                />
              </div>
              <div className="col-span-full flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Recursos Inclusos</label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition resize-y min-h-[80px]"
                  placeholder="CRM, IA, Disparos, 3.000 contatos"
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
                  {editingId ? 'Salvar' : 'Criar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
