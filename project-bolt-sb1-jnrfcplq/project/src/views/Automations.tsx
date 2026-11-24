import { useEffect, useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Automation } from '@/types';

interface AutomationsProps {
  showToast: (msg: string) => void;
}

export default function Automations({ showToast }: AutomationsProps) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', trigger_condition: '', action_description: '' });

  useEffect(() => {
    loadAutomations();
  }, []);

  async function loadAutomations() {
    const { data } = await supabase.from('automations').select('*').order('created_at', {
      ascending: false,
    });
    setAutomations((data as Automation[]) ?? []);
    setLoading(false);
  }

  async function toggle(id: string, current: boolean) {
    const { error } = await supabase.from('automations').update({ is_active: !current }).eq('id', id);
    if (error) {
      showToast('Erro ao alterar automação.');
      return;
    }
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a)));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.trigger_condition.trim()) {
      showToast('Preencha nome e condição.');
      return;
    }
    const { error } = await supabase.from('automations').insert({
      name: form.name.trim(),
      trigger_condition: form.trigger_condition.trim(),
      action_description: form.action_description.trim() || 'Enviar resposta automática',
      is_active: true,
    });
    if (error) {
      showToast('Erro ao criar automação.');
      return;
    }
    showToast('Automação criada!');
    setForm({ name: '', trigger_condition: '', action_description: '' });
    setShowForm(false);
    await loadAutomations();
  }

  async function remove(id: string) {
    const { error } = await supabase.from('automations').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover automação.');
      return;
    }
    showToast('Automação removida.');
    await loadAutomations();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Fluxos de Automação</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-10 px-4 rounded-xl border border-[#bfe8d0] text-[#128c4a] font-bold text-[13px] flex items-center gap-2 hover:bg-[#e8fbf0] transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            Criar Automação
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={create}
            className="mb-5 p-4 border border-[#e3ebe8] rounded-xl bg-[#f8fbfa] grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold">Nome da Automação</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                placeholder="Resposta de Horário"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold">Condição (Gatilho)</label>
              <input
                type="text"
                value={form.trigger_condition}
                onChange={(e) => setForm({ ...form, trigger_condition: e.target.value })}
                className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                placeholder="Mensagem contiver 'horário'"
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <label className="text-[13px] font-bold">Ação (Resposta Automática)</label>
              <textarea
                value={form.action_description}
                onChange={(e) => setForm({ ...form, action_description: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition resize-y min-h-[70px]"
                placeholder="Enviar horário de funcionamento"
              />
            </div>
            <div className="col-span-full flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-10 px-4 rounded-xl border border-[#e3ebe8] text-sm font-bold text-[#6b7a75] hover:bg-[#f4f7f6] transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] text-sm font-bold hover:brightness-105 transition"
              >
                Criar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[#6b7a75] py-6 text-center">Carregando...</p>
        ) : automations.length === 0 ? (
          <p className="text-sm text-[#6b7a75] py-6 text-center">Nenhuma automação criada.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {automations.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-4 border border-[#e3ebe8] rounded-xl"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                      a.is_active ? 'bg-[#e8fbf0] text-[#128c4a]' : 'bg-[#f1f5f4] text-[#6b7a75]'
                    }`}
                  >
                    <Zap size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="block text-sm font-bold">{a.name}</strong>
                    <span className="text-[13px] text-[#6b7a75]">
                      Se: {a.trigger_condition} → Então: {a.action_description}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => toggle(a.id, a.is_active)}
                    className={`relative w-[46px] h-[24px] rounded-full transition-colors ${
                      a.is_active ? 'bg-[#25d366]' : 'bg-[#ccc]'
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full transition-transform ${
                        a.is_active ? 'translate-x-[22px]' : ''
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="h-8 w-8 rounded-lg border border-[#fecaca] text-[#991b1b] grid place-items-center hover:bg-[#fee2e2] transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
