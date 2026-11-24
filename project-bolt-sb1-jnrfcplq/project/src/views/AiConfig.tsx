import { useEffect, useState } from 'react';
import { Bot, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AiConfig } from '@/types';

interface AiConfigProps {
  showToast: (msg: string) => void;
}

export default function AiConfig({ showToast }: AiConfigProps) {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState('0.70');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const { data } = await supabase.from('ai_config').select('*').limit(1).maybeSingle();
    if (data) {
      const cfg = data as AiConfig;
      setConfig(cfg);
      setPrompt(cfg.system_prompt);
      setModel(cfg.model);
      setTemperature(String(cfg.temperature));
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    if (config) {
      const { error } = await supabase
        .from('ai_config')
        .update({
          system_prompt: prompt,
          model,
          temperature: parseFloat(temperature) || 0.7,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);
      if (error) {
        showToast('Erro ao salvar.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('ai_config').insert({
        system_prompt: prompt,
        model,
        temperature: parseFloat(temperature) || 0.7,
      });
      if (error) {
        showToast('Erro ao salvar.');
        setSaving(false);
        return;
      }
    }
    showToast('Prompt global salvo!');
    setSaving(false);
    await loadConfig();
  }

  if (loading) {
    return (
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <p className="text-sm text-[#6b7a75] py-8 text-center">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-[#e8fbf0] text-[#128c4a] grid place-items-center">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold">Configuração Padrão da IA (White Label)</h2>
            <p className="text-xs text-[#6b7a75] mt-0.5">
              Define as diretrizes gerais para o atendimento automático de todos os clientes.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[13px] font-bold">
            Prompt do Sistema (Instruções Gerais para todos os clientes)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition resize-y min-h-[160px] leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold">Modelo de IA</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition bg-white"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold">
              Temperatura ({parseFloat(temperature).toFixed(2)})
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="h-10 accent-[#25d366] cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] font-bold text-[13px] flex items-center gap-2 hover:brightness-105 transition disabled:opacity-50"
        >
          <Save size={16} strokeWidth={2.2} />
          {saving ? 'Salvando...' : 'Salvar Padrão'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-[#e8fbf0] to-[#f0fdf4] border border-[#bfe8d0] rounded-[18px] p-5">
        <div className="flex items-start gap-3">
          <Bot size={20} className="text-[#128c4a] shrink-0 mt-0.5" />
          <div>
            <strong className="text-sm font-bold text-[#128c4a]">Dica</strong>
            <p className="text-sm text-[#17211e] mt-1 leading-relaxed">
              O prompt do sistema é aplicado a todos os atendimentos por IA. Para personalizar
              respostas específicas por cliente, use as Automações com palavras-chave.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
