import {
  LayoutDashboard,
  Users,
  CreditCard,
  MessageSquare,
  Rocket,
  Settings2,
  Plug,
  Bot,
  LogOut,
  Building2,
} from 'lucide-react';
import type { TabId, Profile } from '@/types';
import { BRAND } from '@/types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSignOut: () => void;
}

const clientNav: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'conexoes', label: 'Conexões WhatsApp', icon: Plug },
  { id: 'atendimento', label: 'CRM / Atendimento', icon: MessageSquare },
  { id: 'campanhas', label: 'Disparos em Massa', icon: Rocket },
  { id: 'automacoes', label: 'Automações', icon: Settings2 },
  { id: 'ia', label: 'Configurar IA', icon: Bot },
];

const adminNav: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'admin-dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'admin-clients', label: 'Clientes', icon: Users },
  { id: 'planos', label: 'Planos', icon: CreditCard },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  profile,
  onSignOut,
}: SidebarProps) {
  const isAdmin = profile?.role === 'admin';
  const nav = isAdmin ? adminNav : clientNav;
  const navTitle = isAdmin ? 'Administração' : 'Ferramentas';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#0f1f1a] to-[#142b24] text-white flex flex-col gap-5 px-4 py-5 transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-2 pb-4 border-b border-white/10">
          <div className="w-11 h-11 rounded-2xl grid place-items-center bg-[#25d366] text-[#062014] font-black text-xl">
            {BRAND.short}
          </div>
          <div>
            <strong className="block text-base">{BRAND.name}</strong>
            <span className="block text-xs text-[#92a79f] mt-0.5">
              {isAdmin ? 'Painel Admin' : 'Painel do Cliente'}
            </span>
          </div>
        </div>

        {/* User badge */}
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-full grid place-items-center bg-[#25d366]/20 text-[#25d366] font-black text-sm shrink-0">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <strong className="block text-sm truncate">{profile.display_name}</strong>
              <span className="text-[11px] text-[#92a79f]">
                {isAdmin ? 'Administrador' : profile.plan?.name ?? 'Sem plano'}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="text-[10px] uppercase text-[#6b8a7e] font-extrabold tracking-wide my-2 ml-3">
            {navTitle}
          </div>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-[#25d366] text-[#052014]'
                    : 'text-[#b8c9c3] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={2.2} />
                {item.label}
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-1">
            <div className="text-[10px] uppercase text-[#6b8a7e] font-extrabold tracking-wide my-2 ml-3">
              Meu Espaço
            </div>
            <button
              onClick={() => onTabChange('atendimento')}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                activeTab === 'atendimento'
                  ? 'bg-[#25d366] text-[#052014]'
                  : 'text-[#b8c9c3] hover:bg-white/5 hover:text-white'
              }`}
            >
              <Building2 size={18} strokeWidth={2.2} />
              Meu Atendimento
            </button>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-white/10">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-[#b8c9c3] hover:bg-white/5 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} strokeWidth={2.2} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
