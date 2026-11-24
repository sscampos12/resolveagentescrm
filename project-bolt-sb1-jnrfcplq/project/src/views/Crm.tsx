import { useEffect, useRef, useState } from 'react';
import { Bot, Send, UserRound, Search, Settings2, Globe, Key, Server, RefreshCw, Check, Loader2, ChevronDown, ChevronUp, Plug } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation, Message, Connection } from '@/types';

interface UazapiConfig {
  id: string;
  mode: 'admin' | 'single';
  base_url: string;
  api_token: string;
  instance_name: string | null;
}

interface UazapiInstance {
  name: string;
  status: string;
  phone: string;
}

interface Agent {
  id: string;
  display_name: string;
  role: 'admin' | 'client';
}

interface CrmProps {
  showToast: (msg: string) => void;
}

export default function Crm({ showToast }: CrmProps) {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // UazAPI config state
  const [uazapiConfig, setUazapiConfig] = useState<UazapiConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configMode, setConfigMode] = useState<'admin' | 'single'>('admin');
  const [configBaseUrl, setConfigBaseUrl] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [configInstance, setConfigInstance] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [instances, setInstances] = useState<UazapiInstance[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedConnection, setSelectedConnection] = useState('all');
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    loadConversations();
    loadConnections();
    loadAgents();
    loadUazapiConfig();
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (error) {
      showToast('Nao foi possivel carregar as conversas.');
      return;
    }
    const convs = (data as Conversation[]) ?? [];
    setConversations(convs);
    if (convs.length > 0 && !activeId) setActiveId(convs[0].id);
  }

  async function loadConnections() {
    const { data } = await supabase
      .from('connections')
      .select('*')
      .order('instance_name');
    setConnections((data as Connection[]) ?? []);
  }

  async function loadAgents() {
    if (profile?.role !== 'admin') return;
    const { data } = await supabase.rpc('admin_get_profiles');
    setAgents(
      ((data as Agent[]) ?? []).map((agent) => ({
        id: agent.id,
        display_name: agent.display_name,
        role: agent.role,
      })),
    );
  }

  async function loadUazapiConfig() {
    const { data } = await supabase
      .from('uazapi_config')
      .select('*')
      .maybeSingle();
    if (data) {
      const cfg = data as UazapiConfig;
      setUazapiConfig(cfg);
      setConfigMode(cfg.mode);
      setConfigBaseUrl(cfg.base_url);
      setConfigToken(cfg.api_token);
      setConfigInstance(cfg.instance_name ?? '');
    }
  }

  async function saveUazapiConfig() {
    if (!configBaseUrl.trim() || !configToken.trim()) {
      showToast('Preencha a URL e o token.');
      return;
    }
    setSavingConfig(true);
    const payload = {
      mode: configMode,
      base_url: configBaseUrl.trim(),
      api_token: configToken.trim(),
      instance_name: configMode === 'single' ? configInstance.trim() || null : null,
    };

    if (uazapiConfig) {
      const { error } = await supabase
        .from('uazapi_config')
        .update(payload)
        .eq('id', uazapiConfig.id);
      if (error) {
        showToast('Erro ao salvar configuracao.');
        setSavingConfig(false);
        return;
      }
    } else {
      const { error } = await supabase.from('uazapi_config').insert(payload);
      if (error) {
        showToast('Erro ao salvar configuracao.');
        setSavingConfig(false);
        return;
      }
    }

    showToast('Configuracao salva!');
    await loadUazapiConfig();
    setSavingConfig(false);
    if (configMode === 'admin') {
      await loadInstances();
    }
  }

  async function loadInstances() {
    if (!user) return;
    setLoadingInstances(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? '';
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-instances`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        },
      );
      const result = await response.json();
      if (response.ok && result.instances) {
        setInstances(result.instances);
      } else {
        showToast(result.error ?? 'Erro ao listar instancias.');
      }
    } catch {
      showToast('Erro de conexao ao listar instancias.');
    }
    setLoadingInstances(false);
  }

  async function loadMessages(convId: string) {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoadingMsgs(false);
  }

  async function updateHandoff(status: 'ai' | 'human' | 'waiting', assignedTo: string | null = null) {
    if (!activeConv) return;
    const { error } = await supabase
      .from('conversations')
      .update({
        ai_enabled: status === 'ai',
        handoff_status: status,
        assigned_to: assignedTo,
        assigned_at: status === 'human' ? new Date().toISOString() : null,
      })
      .eq('id', activeConv.id);
    if (error) {
      showToast('Nao foi possivel atualizar o atendimento.');
      return;
    }
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === activeConv.id
          ? { ...conversation, ai_enabled: status === 'ai', handoff_status: status, assigned_to: assignedTo }
          : conversation,
      ),
    );
    setTransferOpen(false);
    showToast(status === 'ai' ? 'Atendimento devolvido para a IA.' : status === 'human' ? 'Atendimento assumido.' : 'Atendimento transferido.');
  }

  async function sendMessage() {
    if (!input.trim() || !activeId) return;
    const content = input.trim();
    setInput('');

    const { data } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeId,
        direction: 'outbound',
        content,
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => [...prev, data as Message]);
      await supabase
        .from('conversations')
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq('id', activeId);
      await loadConversations();
    }
    showToast('Mensagem enviada!');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId);
  const filteredConvs = conversations.filter((c) => {
    const matchesSearch = c.contact_name.toLowerCase().includes(search.toLowerCase());
    const matchesConnection = selectedConnection === 'all' || c.connection_id === selectedConnection;
    return matchesSearch && matchesConnection;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* UazAPI Configuration Panel */}
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm">
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8fbf0] text-[#128c4a] grid place-items-center">
              <Settings2 size={20} />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold">Configuracao da UazAPI</h2>
              <span className="text-xs text-[#6b7a75]">
                {uazapiConfig
                  ? `Modo ${uazapiConfig.mode === 'admin' ? 'Administrador' : 'Instancia Unica'} — ${uazapiConfig.base_url}`
                  : 'Nao configurado'}
              </span>
            </div>
          </div>
          {showConfig ? <ChevronUp size={20} className="text-[#6b7a75]" /> : <ChevronDown size={20} className="text-[#6b7a75]" />}
        </button>

        {showConfig && (
          <div className="px-5 pb-5 border-t border-[#e3ebe8] pt-5 flex flex-col gap-5">
            {/* Mode selector */}
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold">Modo de conexao</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfigMode('admin')}
                  className={`h-auto p-4 rounded-xl border-2 text-left transition ${
                    configMode === 'admin'
                      ? 'border-[#25d366] bg-[#e8fbf0]'
                      : 'border-[#e3ebe8] hover:bg-[#f8fbfa]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Server size={16} className="text-[#128c4a]" />
                    <strong className="text-sm">Administrador</strong>
                  </div>
                  <span className="text-xs text-[#6b7a75]">
                    Token admin — visualiza todas as instancias
                  </span>
                </button>
                <button
                  onClick={() => setConfigMode('single')}
                  className={`h-auto p-4 rounded-xl border-2 text-left transition ${
                    configMode === 'single'
                      ? 'border-[#25d366] bg-[#e8fbf0]'
                      : 'border-[#e3ebe8] hover:bg-[#f8fbfa]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Plug size={16} className="text-[#128c4a]" />
                    <strong className="text-sm">Instancia Unica</strong>
                  </div>
                  <span className="text-xs text-[#6b7a75]">
                    Acessar somente uma instancia separada
                  </span>
                </button>
              </div>
            </div>

            {/* URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold flex items-center gap-1.5">
                <Globe size={14} className="text-[#6b7a75]" />
                URL da UazAPI
              </label>
              <input
                type="text"
                value={configBaseUrl}
                onChange={(e) => setConfigBaseUrl(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                placeholder="https://api.uazapi.com"
              />
            </div>

            {/* Token */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold flex items-center gap-1.5">
                <Key size={14} className="text-[#6b7a75]" />
                {configMode === 'admin' ? 'Token de Administrador' : 'Token da Instancia'}
              </label>
              <input
                type="password"
                value={configToken}
                onChange={(e) => setConfigToken(e.target.value)}
                className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                placeholder={configMode === 'admin' ? 'Token administrativo da UazAPI' : 'Token da instancia'}
              />
            </div>

            {/* Instance name (single mode only) */}
            {configMode === 'single' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Nome da Instancia</label>
                <input
                  type="text"
                  value={configInstance}
                  onChange={(e) => setConfigInstance(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                  placeholder="Nome da instancia a conectar"
                />
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={saveUazapiConfig}
                disabled={savingConfig}
                className="h-10 px-5 rounded-xl bg-[#25d366] text-[#052014] text-sm font-bold flex items-center gap-2 hover:brightness-105 transition disabled:opacity-60"
              >
                {savingConfig ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Salvar Configuracao
                  </>
                )}
              </button>
              {configMode === 'admin' && uazapiConfig && (
                <button
                  onClick={loadInstances}
                  disabled={loadingInstances}
                  className="h-10 px-4 rounded-xl border border-[#e3ebe8] text-sm font-bold text-[#6b7a75] hover:bg-[#f4f7f6] transition flex items-center gap-2 disabled:opacity-60"
                >
                  {loadingInstances ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Listar Instancias
                </button>
              )}
            </div>

            {/* Instances list (admin mode) */}
            {configMode === 'admin' && instances.length > 0 && (
              <div className="border border-[#e3ebe8] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#f8fbfa] border-b border-[#e3ebe8]">
                  <strong className="text-xs font-bold uppercase text-[#6b7a75]">
                    Instancias Encontradas ({instances.length})
                  </strong>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {instances.map((inst, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 border-b border-[#e3ebe8] last:border-0"
                    >
                      <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                        inst.status === 'open' || inst.status === 'connected'
                          ? 'bg-[#e8fbf0] text-[#128c4a]'
                          : 'bg-[#f1f5f4] text-[#999]'
                      }`}>
                        <Plug size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <strong className="block text-sm font-bold truncate">{inst.name}</strong>
                        <span className="text-xs text-[#6b7a75]">{inst.phone || 'Sem telefone'}</span>
                      </div>
                      <span className={`text-[11px] font-extrabold px-2 py-1 rounded-lg shrink-0 ${
                        inst.status === 'open' || inst.status === 'connected'
                          ? 'bg-[#e8fbf0] text-[#128c4a]'
                          : 'bg-[#fff7e6] text-[#b45309]'
                      }`}>
                        {inst.status === 'open' || inst.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat container */}
      <div className="bg-white border border-[#e3ebe8] rounded-[18px] overflow-hidden h-[600px] flex">
      {/* Chat list */}
      <div className="w-[300px] xl:w-[340px] border-r border-[#e3ebe8] flex flex-col shrink-0 hidden lg:flex">
        <div className="p-4 border-b border-[#e3ebe8]">
          <strong className="text-sm">Caixa de entrada</strong>
          <div className="relative mt-2">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a75]"
            />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-[#e3ebe8] text-[13px] outline-none focus:border-[#25d366] transition"
            />
          </div>
          <select
            value={selectedConnection}
            onChange={(e) => setSelectedConnection(e.target.value)}
            className="w-full mt-2 h-9 px-2.5 rounded-lg border border-[#e3ebe8] text-xs outline-none focus:border-[#25d366] bg-white"
          >
            <option value="all">Todas as instancias</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.instance_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full flex gap-3 p-3.5 border-b border-[#e3ebe8] text-left transition-colors ${
                c.id === activeId ? 'bg-[#e8fbf0]' : 'hover:bg-[#f8fbfa]'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full grid place-items-center font-black text-sm shrink-0"
                style={{
                  background: c.contact_avatar_color,
                  color: '#128c4a',
                }}
              >
                {c.contact_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-sm font-bold truncate">{c.contact_name}</strong>
                <span className="text-xs text-[#6b7a75] truncate block">
                  {c.last_message}
                </span>
                <span className="text-[10px] text-[#128c4a] truncate block mt-1">
                  {connections.find((connection) => connection.id === c.connection_id)?.instance_name ?? 'Instancia nao definida'}
                </span>
              </div>
            </button>
          ))}
          {filteredConvs.length === 0 && (
            <p className="text-sm text-[#6b7a75] py-6 text-center">Nenhuma conversa.</p>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col bg-[#efeae2]">
        {activeConv ? (
          <>
            <div className="px-5 py-2.5 bg-[#f0f2f5] flex items-center justify-between border-b border-[#e3ebe8]">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full grid place-items-center font-black text-sm"
                  style={{ background: activeConv.contact_avatar_color, color: '#128c4a' }}
                >
                  {activeConv.contact_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong className="text-sm block">{activeConv.contact_name}</strong>
                  {activeConv.ai_enabled ? (
                    <span className="text-xs text-[#128c4a] flex items-center gap-1">
                      <Bot size={12} />
                      Atendimento por IA
                    </span>
                  ) : (
                    <span className="text-xs text-[#6b7a75] flex items-center gap-1">
                      <UserRound size={12} />
                      Atendimento manual
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeConv.handoff_status !== 'human' && (
                  <button
                    onClick={() => updateHandoff('human', user?.id ?? null)}
                    className="h-9 px-3.5 rounded-xl bg-[#25d366] text-[#052014] text-xs font-bold hover:brightness-105 transition"
                  >
                    Assumir
                  </button>
                )}
                {activeConv.handoff_status === 'human' && (
                  <button
                    onClick={() => updateHandoff('ai')}
                    className="h-9 px-3.5 rounded-xl border border-[#bfe8d0] text-[#128c4a] text-xs font-bold hover:bg-[#e8fbf0] transition"
                  >
                    Voltar para IA
                  </button>
                )}
                {profile?.role === 'admin' && (
                  <button
                    onClick={() => setTransferOpen(true)}
                    className="h-9 px-3.5 rounded-xl border border-[#e3ebe8] text-[#6b7a75] text-xs font-bold hover:bg-[#f4f7f6] transition"
                  >
                    Transferir
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              {loadingMsgs ? (
                <p className="text-sm text-[#6b7a75] text-center py-8">Carregando mensagens...</p>
              ) : (
                <>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[65%] px-3.5 py-2.5 text-sm rounded-xl shadow-sm ${
                        m.direction === 'inbound'
                          ? 'bg-white self-start rounded-tl-none'
                          : 'bg-[#d9fdd3] self-end rounded-tr-none'
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-3.5 bg-[#f0f2f5] flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="flex-1 h-11 px-5 rounded-full border-none outline-none text-sm bg-white"
              />
              <button
                onClick={sendMessage}
                className="h-11 w-11 rounded-full bg-[#25d366] text-[#052014] grid place-items-center hover:brightness-105 transition shrink-0"
              >
                <Send size={18} strokeWidth={2.2} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center">
            <p className="text-sm text-[#6b7a75]">Selecione uma conversa.</p>
          </div>
        )}
      </div>
      </div>

      {transferOpen && activeConv && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[18px] shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Transferir atendimento</h2>
                <p className="text-xs text-[#6b7a75] mt-1">Escolha quem assumira esta conversa.</p>
              </div>
              <button
                onClick={() => setTransferOpen(false)}
                className="w-9 h-9 rounded-xl grid place-items-center hover:bg-[#f4f7f6]"
              >
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {agents.filter((agent) => agent.id !== user?.id).map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => updateHandoff('human', agent.id)}
                  className="w-full p-3 rounded-xl border border-[#e3ebe8] text-left hover:bg-[#e8fbf0] hover:border-[#bfe8d0] transition"
                >
                  <strong className="block text-sm">{agent.display_name}</strong>
                  <span className="text-xs text-[#6b7a75]">{agent.role === 'admin' ? 'Administrador' : 'Cliente'}</span>
                </button>
              ))}
              {agents.filter((agent) => agent.id !== user?.id).length === 0 && (
                <p className="text-sm text-[#6b7a75] text-center py-4">Nenhum outro usuário disponível.</p>
              )}
            </div>
            <button
              onClick={() => updateHandoff('waiting', null)}
              className="w-full mt-4 h-10 rounded-xl border border-[#e3ebe8] text-sm font-bold text-[#6b7a75] hover:bg-[#f4f7f6]"
            >
              Deixar na fila de atendimento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
