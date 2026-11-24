import { useEffect, useState, useRef } from 'react';
import { Plug, Trash2, Wifi, WifiOff, QrCode, RefreshCw, Plus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Connection, Plan } from '@/types';

interface ConnectionsProps {
  showToast: (msg: string) => void;
}

export default function Connections({ showToast }: ConnectionsProps) {
  const { profile } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadConnections();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function loadConnections() {
    const { data } = await supabase
      .from('connections')
      .select('*')
      .order('created_at', { ascending: false });
    setConnections((data as Connection[]) ?? []);
    if (profile?.plan_id) {
      const { data: planData } = await supabase
        .from('plans')
        .select('*')
        .eq('id', profile.plan_id)
        .maybeSingle();
      setPlan(planData as Plan | null);
    }
    setLoading(false);
  }

  const maxConnections = plan?.max_connections ?? 1;
  const currentCount = connections.length;
  const canAddMore = currentCount < maxConnections;

  async function createInstance() {
    if (!newInstanceName.trim()) {
      showToast('Digite um nome para a conexão.');
      return;
    }
    if (!canAddMore) {
      showToast(`Seu plano permite ${maxConnections} conexão(ões).`);
      return;
    }

    setQrLoading(true);
    setShowQrModal(true);
    setQrData(null);

    try {
      const { data: existing } = await supabase
        .from('connections')
        .select('id')
        .eq('instance_name', newInstanceName.trim())
        .maybeSingle();

      if (existing) {
        showToast('Já existe uma conexão com esse nome.');
        setQrLoading(false);
        return;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('connections')
        .insert({
          instance_name: newInstanceName.trim(),
          status: 'disconnected',
        })
        .select()
        .single();

      if (insertError || !inserted) {
        showToast('Erro ao criar conexão.');
        setQrLoading(false);
        return;
      }

      // Simulate QR code — in production this would call the UazAPI edge function
      // For now we generate a placeholder QR that represents the connection ID
      const qrPlaceholder = `resolve-agentes:connect:${inserted.id}`;
      setQrData(qrPlaceholder);
      setConnectingId(inserted.id);

      await supabase
        .from('connections')
        .update({ qr_code: qrPlaceholder })
        .eq('id', inserted.id);

      // Poll for connection status
      pollRef.current = setInterval(async () => {
        const { data: conn } = await supabase
          .from('connections')
          .select('status')
          .eq('id', inserted.id)
          .single();
        if (conn?.status === 'connected') {
          if (pollRef.current) clearInterval(pollRef.current);
          setShowQrModal(false);
          setQrData(null);
          setConnectingId(null);
          setNewInstanceName('');
          showToast('WhatsApp conectado com sucesso!');
          await loadConnections();
        }
      }, 3000);
    } catch {
      showToast('Erro ao gerar QR Code.');
    } finally {
      setQrLoading(false);
    }
  }

  function closeQrModal() {
    setShowQrModal(false);
    setQrData(null);
    setConnectingId(null);
    setNewInstanceName('');
    if (pollRef.current) clearInterval(pollRef.current);
  }

  async function toggleStatus(conn: Connection) {
    const newStatus = conn.status === 'connected' ? 'disconnected' : 'connected';
    const { error } = await supabase
      .from('connections')
      .update({ status: newStatus })
      .eq('id', conn.id);
    if (error) {
      showToast('Erro ao atualizar status.');
      return;
    }
    showToast(`Conexão ${newStatus === 'connected' ? 'ativada' : 'desativada'}.`);
    await loadConnections();
  }

  async function removeConnection(id: string) {
    const { error } = await supabase.from('connections').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover conexão.');
      return;
    }
    showToast('Conexão removida.');
    await loadConnections();
  }

  function openQrForExisting(conn: Connection) {
    setShowQrModal(true);
    setQrData(conn.qr_code ?? `resolve-agentes:reconnect:${conn.id}`);
    setConnectingId(conn.id);
    setNewInstanceName(conn.instance_name);

    pollRef.current = setInterval(async () => {
      const { data: c } = await supabase
        .from('connections')
        .select('status')
        .eq('id', conn.id)
        .single();
      if (c?.status === 'connected') {
        if (pollRef.current) clearInterval(pollRef.current);
        setShowQrModal(false);
        setQrData(null);
        setConnectingId(null);
        setNewInstanceName('');
        showToast('WhatsApp reconectado!');
        await loadConnections();
      }
    }, 3000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Plan info card */}
      <div className="bg-gradient-to-br from-[#0f1f1a] to-[#142b24] rounded-[18px] p-5 text-white flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold">Seu Plano: {plan?.name ?? '—'}</h2>
          <p className="text-sm text-[#92a79f] mt-1">
            {currentCount} de {maxConnections} conexões usadas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#25d366] rounded-full transition-all"
              style={{ width: `${Math.min((currentCount / maxConnections) * 100, 100)}%` }}
            />
          </div>
          <button
            onClick={() => {
              setNewInstanceName('');
              setShowQrModal(true);
              setQrData(null);
            }}
            disabled={!canAddMore}
            className="h-10 px-4 rounded-xl bg-[#25d366] text-[#052014] font-bold text-[13px] flex items-center gap-2 hover:brightness-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} strokeWidth={2.5} />
            Adicionar Número
          </button>
        </div>
      </div>

      {/* Connections list */}
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-5">
        <h2 className="text-base font-bold mb-4">Suas Conexões</h2>
        {loading ? (
          <p className="text-sm text-[#6b7a75] py-6 text-center">Carregando...</p>
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-[#f1f5f4] grid place-items-center">
              <Plug size={28} className="text-[#cbd5d1]" />
            </div>
            <p className="text-sm text-[#6b7a75] text-center max-w-sm">
              Nenhuma conexão ainda. Clique em "Adicionar Número" para conectar seu WhatsApp
              lendo o QR Code.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {connections.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-4 border border-[#e3ebe8] rounded-xl"
              >
                <div
                  className={`w-11 h-11 rounded-full grid place-items-center font-black shrink-0 ${
                    c.status === 'connected'
                      ? 'bg-[#e8fbf0] text-[#128c4a]'
                      : 'bg-[#f1f5f4] text-[#999]'
                  }`}
                >
                  W
                </div>
                <div className="flex-1 min-w-0">
                  <strong className="block text-sm font-bold">{c.instance_name}</strong>
                  <span className="text-xs text-[#6b7a75]">{c.phone || 'Aguardando conexão'}</span>
                </div>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                    c.status === 'connected'
                      ? 'bg-[#e8fbf0] text-[#128c4a]'
                      : 'bg-[#fff7e6] text-[#b45309]'
                  }`}
                >
                  {c.status === 'connected' ? 'Conectado' : 'Desconectado'}
                </span>
                {c.status !== 'connected' && (
                  <button
                    onClick={() => openQrForExisting(c)}
                    className="h-8 px-3 rounded-lg border border-[#bfe8d0] text-[#128c4a] text-[11px] font-bold flex items-center gap-1 hover:bg-[#e8fbf0] transition shrink-0"
                  >
                    <QrCode size={14} />
                    QR Code
                  </button>
                )}
                <button
                  onClick={() => toggleStatus(c)}
                  className="h-8 w-8 rounded-lg border border-[#e3ebe8] grid place-items-center hover:bg-[#f4f7f6] transition text-[#6b7a75] shrink-0"
                >
                  {c.status === 'connected' ? (
                    <Wifi size={15} className="text-[#128c4a]" />
                  ) : (
                    <WifiOff size={15} />
                  )}
                </button>
                <button
                  onClick={() => removeConnection(c.id)}
                  className="h-8 w-8 rounded-lg border border-[#fecaca] text-[#991b1b] grid place-items-center hover:bg-[#fee2e2] transition shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4">
          <div className="bg-white rounded-[18px] shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Conectar WhatsApp</h2>
              <button
                onClick={closeQrModal}
                className="w-9 h-9 rounded-xl grid place-items-center hover:bg-[#f4f7f6] transition"
              >
                <X size={18} />
              </button>
            </div>

            {qrLoading && !qrData ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <Loader2 size={32} className="text-[#25d366] animate-spin" />
                <p className="text-sm text-[#6b7a75]">Gerando QR Code...</p>
              </div>
            ) : !qrData ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[#6b7a75] text-center">
                  Digite um nome para identificar esta conexão (ex: "WhatsApp Comercial").
                </p>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  className="h-11 px-4 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="Nome da conexão"
                  autoFocus
                />
                <button
                  onClick={createInstance}
                  disabled={!newInstanceName.trim()}
                  className="h-11 rounded-xl bg-[#25d366] text-[#052014] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-50"
                >
                  <QrCode size={18} />
                  Gerar QR Code
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-56 h-56 rounded-2xl border-2 border-[#e3ebe8] grid place-items-center bg-[#f8fbfa] relative overflow-hidden">
                  {/* Simulated QR code */}
                  <div
                    className="w-48 h-48 grid place-items-center"
                    style={{
                      backgroundImage: `repeating-conic-gradient(#0f1f1a 0% 25%, #ffffff 0% 50%)`,
                      backgroundSize: '12px 12px',
                      borderRadius: '8px',
                    }}
                  >
                    <div className="w-20 h-20 bg-white rounded-lg grid place-items-center">
                      <QrCode size={32} className="text-[#0f1f1a]" />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">Escaneie com seu WhatsApp</p>
                  <p className="text-xs text-[#6b7a75] mt-1">
                    Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[#25d366]">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm font-semibold">Aguardando leitura...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
