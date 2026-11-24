import { useState } from 'react';
import { MessageCircle, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { BRAND } from '@/types';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onToggleMode: () => void;
}

export default function AuthPage({ mode, onToggleMode }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (displayName.trim().length < 2) {
        setError('Digite seu nome.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName.trim());
      if (error) setError(error);
    }
    setLoading(false);
  }

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0f1f1a] to-[#142b24] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-[#25d366]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#25d366]/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#25d366] text-[#062014] font-black text-2xl grid place-items-center">
            {BRAND.short}
          </div>
          <div>
            <strong className="text-lg block">{BRAND.name}</strong>
            <span className="text-sm text-[#92a79f]">{BRAND.slogan}</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-4 leading-tight">
            {isLogin ? 'Acesse seu painel de atendimento' : 'Comece a vender atendimento por WhatsApp'}
          </h1>
          <p className="text-[#92a79f] text-lg leading-relaxed max-w-md">
            CRM completo, disparos em massa, automações e IA. Conecte seus números pelo QR Code e
            gerencie tudo em um só lugar.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            {['CRM multi-conexão', 'Automação por IA', 'Disparos em massa', 'Gestão de clientes'].map(
              (feat) => (
                <div key={feat} className="flex items-center gap-3 text-[#b8c9c3]">
                  <div className="w-6 h-6 rounded-lg bg-[#25d366]/20 text-[#25d366] grid place-items-center text-xs">
                    ✓
                  </div>
                  {feat}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="relative z-10 text-sm text-[#6b8a7e]">
          © 2026 {BRAND.name}. Todos os direitos reservados.
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#f4f7f6]">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#25d366] text-[#062014] font-black text-2xl grid place-items-center">
              {BRAND.short}
            </div>
            <div>
              <strong className="text-lg block text-[#17211e]">{BRAND.name}</strong>
              <span className="text-sm text-[#6b7a75]">{BRAND.slogan}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e3ebe8] rounded-[18px] shadow-sm p-7">
            <div className="mb-6">
              <div className="w-14 h-14 rounded-2xl bg-[#e8fbf0] text-[#128c4a] grid place-items-center mb-4">
                <MessageCircle size={28} />
              </div>
              <h2 className="text-2xl font-extrabold text-[#17211e]">
                {isLogin ? 'Entrar' : 'Criar conta'}
              </h2>
              <p className="text-sm text-[#6b7a75] mt-1">
                {isLogin
                  ? 'Acesse seu painel de gestão de WhatsApp'
                  : 'Comece a usar o CRM em poucos segundos'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {!isLogin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold">Nome</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-11 px-4 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                    placeholder="Seu nome ou empresa"
                    required
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">E-mail</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7a75]"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 w-full pl-10 pr-4 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                    placeholder="voce@empresa.com"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold">Senha</label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7a75]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 w-full pl-10 pr-4 rounded-xl border border-[#e3ebe8] text-sm outline-none focus:border-[#25d366] transition"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-[#991b1b] bg-[#fee2e2] rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-11 rounded-xl bg-[#25d366] text-[#052014] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 transition disabled:opacity-60 mt-1"
              >
                {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar conta'}
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-[#6b7a75]">
              {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button
                onClick={onToggleMode}
                className="font-bold text-[#128c4a] hover:underline"
              >
                {isLogin ? 'Criar agora' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
