import { useEffect, useState } from 'react';
import { Rocket, Upload, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Campaign, Connection } from '@/types';

interface CampaignsProps {
  showToast: (msg: string) => void;
}

export default function Campaigns({ showToast }: CampaignsProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState({
    connection_name: '',
    message_template: '',
    contact_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [connRes, campRes] = await Promise.all([
      supabase.from('connections').select('*').order('created_at', { ascending: false }),
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
    ]);
    setConnections((connRes.data as Connection[]) ?? []);
    setCampaigns((campRes.data as Campaign[]) ?? []);
    setLoading(false);
  }

  async function createCampaign() {
    if (!form.message_template.trim()) {
      showToast('Escreva a mensagem da campanha.');
      return;
    }
    const { error } = await supabase.from('campaigns').insert({
      connection_name: form.connection_name || connections[0]?.instance_name || 'Padrão',
      message_template: form.message_template.trim(),
      contact_count: form.contact_count,
      status: 'scheduled',
      scheduled_at: new Date().toISOString(),
    });
    if (error) {
      showToast('Erro ao agendar campanha.');
      return;
    }
    showToast('Campanha agendada com sucesso!');
    setForm({ connection_name: '', message_template: '', contact_count: 0 });
    await loadData();
  }

  async function removeCampaign(id: string) {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover campanha.');
      return;
    }
    showToast('Campanha removida.');
    await loadData();
  }

  const statusConfig: Record<
    Campaign['status'],
    { label: string; icon: typeof CheckCircle2; color: string; bg: string }
  > = {
    draft: { label: 'Rascunho', icon: Clock, color: '#6b7a75', bg: '#f1f5f4' },
    scheduled: { label: 'Agendada', icon: Clock, color: '#b45309', bg: '#fff7e6' },
    sending: { label: 'Enviando', icon: Rocket, color: '#3b82f6', bg: '#dbeafe' },
    sent: { label: 'Enviada', icon: CheckCircle2, color: '#128c4a', bg: '#e8fbf0' },
    failed: { label: 'Falhou', icon: XCircle, color: '#991b1b', bg: '#fee2e2' },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <h2 className="text-base font-bold mb-5">Criar Disparo em Massa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold">Selecione a Conexão (Número)</label>
            <select
              value={form.connection_name}
              onChange={(e) => setForm({ ...form, connection_name: e.target.value })}
              className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
            >
              <option value="">Selecione...</option>
              {connections.map((c) => (
                <option key={c.id} value={c.instance_name}>
                  {c.instance_name} ({c.phone || 'sem número'})
                </option>
              ))}
              {connections.length === 0 && <option value="Padrão">WhatsApp Comercial</option>}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold">Importar Contatos (CSV)</label>
            <label className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm flex items-center gap-2 cursor-pointer hover:border-[#25d366] transition text-[#6b7a75]">
              <Upload size={16} />
              <span className="truncate">Escolher arquivo...</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const count = Math.floor(file.size / 25) || 100;
                    setForm((prev) => ({ ...prev, contact_count: count }));
                    showToast(`${file.name} carregado (${count} contatos estimados)`);
                  }
                }}
              />
            </label>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[13px] font-bold">Mensagem da Campanha</label>
          <textarea
            value={form.message_template}
            onChange={(e) => setForm({ ...form, message_template: e.target.value })}
            className="px-3.5 py-2.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition resize-y min-h-[80px]"
            placeholder="Olá {nome}, temos uma oferta especial para você..."
          />
        </div>
        <button
          onClick={createCampaign}
          className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] font-bold text-[13px] flex items-center gap-2 hover:brightness-105 transition"
        >
          <Rocket size={16} strokeWidth={2.2} />
          Iniciar Disparo
        </button>
      </div>

      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <h2 className="text-base font-bold mb-5">Campanhas Recentes</h2>
        {loading ? (
          <p className="text-sm text-[#6b7a75] py-6 text-center">Carregando...</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-[#6b7a75] py-6 text-center">Nenhuma campanha criada ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((c) => {
              const cfg = statusConfig[c.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 p-4 border border-[#e3ebe8] rounded-xl"
                >
                  <div
                    className="w-11 h-11 rounded-xl grid place-items-center shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    <StatusIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="block text-sm font-bold truncate">
                      {c.message_template.slice(0, 60)}
                      {c.message_template.length > 60 && '...'}
                    </strong>
                    <span className="text-xs text-[#6b7a75]">
                      {c.connection_name} · {c.contact_count} contatos ·{' '}
                      {new Date(c.created_at ?? Date.now()).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <button
                    onClick={() => removeCampaign(c.id)}
                    className="h-8 w-8 rounded-lg border border-[#fecaca] text-[#991b1b] grid place-items-center hover:bg-[#fee2e2] transition shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
