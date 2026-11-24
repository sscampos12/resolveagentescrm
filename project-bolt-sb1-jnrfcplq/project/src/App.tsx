import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Toast from '@/components/Toast';
import AuthPage from '@/views/AuthPage';
import Dashboard from '@/views/Dashboard';
import AdminDashboard from '@/views/AdminDashboard';
import AdminClients from '@/views/AdminClients';
import Plans from '@/views/Plans';
import Crm from '@/views/Crm';
import Campaigns from '@/views/Campaigns';
import Automations from '@/views/Automations';
import Connections from '@/views/Connections';
import AiConfig from '@/views/AiConfig';
import { useToast } from '@/hooks/useToast';
import type { TabId } from '@/types';

const tabMeta: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Visão Geral', subtitle: 'Acompanhe suas métricas' },
  usuarios: { title: 'Clientes', subtitle: 'Gerencie seus clientes' },
  planos: { title: 'Planos', subtitle: 'Gerencie assinaturas e faturamento' },
  atendimento: { title: 'CRM / Atendimento', subtitle: 'Gerencie suas conversas' },
  campanhas: { title: 'Disparos em Massa', subtitle: 'Envie campanhas para seus contatos' },
  automacoes: { title: 'Automações', subtitle: 'Crie regras de atendimento automático' },
  conexoes: { title: 'Conexões WhatsApp', subtitle: 'Conecte seus números via QR Code' },
  ia: { title: 'Configurar IA', subtitle: 'Defina as diretrizes da Inteligência Artificial' },
  'admin-dashboard': { title: 'Visão Geral', subtitle: 'Métricas do seu SaaS' },
  'admin-clients': { title: 'Clientes', subtitle: 'Gerencie contas e assinaturas' },
};

function AppContent() {
  const { session, profile, loading, signOut } = useAuth();
  const { message, showToast } = useToast();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [userTab, setUserTab] = useState<TabId | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Compute the effective tab: user's choice takes priority,
  // otherwise default based on role. This recomputes every render,
  // so when the profile loads and we learn the role, the tab updates.
  const effectiveTab: TabId = userTab ?? (isAdmin ? 'admin-dashboard' : 'dashboard');

  // Clear user's tab choice on sign out
  useEffect(() => {
    if (!session) setUserTab(null);
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f4f7f6]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#25d366] text-[#062014] font-black text-2xl grid place-items-center animate-pulse">
            R
          </div>
          <p className="text-sm text-[#6b7a75]">Carregando seu painel...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AuthPage
          mode={authMode}
          onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
        />
        <Toast message={message} />
      </>
    );
  }

  function handleTabChange(tab: TabId) {
    setUserTab(tab);
    setSidebarOpen(false);
  }

  const meta = tabMeta[effectiveTab] ?? tabMeta.dashboard;

  function renderView() {
    switch (effectiveTab) {
      case 'admin-dashboard':
        return isAdmin ? (
          <AdminDashboard showToast={showToast} />
        ) : (
          <Dashboard showToast={showToast} />
        );
      case 'admin-clients':
        return isAdmin ? (
          <AdminClients showToast={showToast} />
        ) : (
          <Dashboard showToast={showToast} />
        );
      case 'planos':
        return isAdmin ? <Plans showToast={showToast} /> : <Dashboard showToast={showToast} />;
      case 'dashboard':
        return <Dashboard showToast={showToast} />;
      case 'conexoes':
        return <Connections showToast={showToast} />;
      case 'atendimento':
        return <Crm showToast={showToast} />;
      case 'campanhas':
        return <Campaigns showToast={showToast} />;
      case 'automacoes':
        return <Automations showToast={showToast} />;
      case 'ia':
        return <AiConfig showToast={showToast} />;
      default:
        return <Dashboard showToast={showToast} />;
    }
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar
        activeTab={effectiveTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profile={profile}
        onSignOut={signOut}
      />
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <div className="flex flex-col gap-[22px] p-4 sm:p-6 lg:p-7 flex-1">
          {renderView()}
        </div>
      </main>
      <Toast message={message} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
