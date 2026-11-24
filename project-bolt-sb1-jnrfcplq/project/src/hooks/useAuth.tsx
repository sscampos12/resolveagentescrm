import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string): Promise<void> {
    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (error) {
      console.error('[Auth] Erro ao carregar perfil:', error.message);
    }

    if (profileData) {
      let loadedProfile = profileData as Profile;
      if (profileData.plan_id) {
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', profileData.plan_id)
          .maybeSingle();
        if (planError) console.error('[Auth] Erro ao carregar plano:', planError.message);
        loadedProfile = { ...loadedProfile, plan: planData };
      }
      console.log('[Auth] Perfil carregado:', loadedProfile.id, 'role:', loadedProfile.role);
      setProfile(loadedProfile);
    } else {
      console.warn('[Auth] Perfil nao encontrado para uid:', uid, '- retrying in 1s');
      // Retry once after 1 second — trigger might not have fired yet
      setTimeout(async () => {
        const { data: retryData, error: retryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        if (retryError) console.error('[Auth] Erro no retry do perfil:', retryError.message);
        if (retryData) {
          console.log('[Auth] Perfil carregado (retry):', retryData.id, 'role:', (retryData as Profile).role);
          setProfile(retryData as Profile);
        } else {
          console.error('[Auth] Perfil ainda nao encontrado apos retry');
        }
      }, 1000);
    }
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (mounted) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      // Skip the INITIAL_SESSION event — getSession already handled it
      if (event === 'INITIAL_SESSION') return;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setProfile(null);
        setLoading(true);
        (async () => {
          await loadProfile(newSession.user.id);
          if (mounted) setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      await loadProfile(data.user.id);
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
