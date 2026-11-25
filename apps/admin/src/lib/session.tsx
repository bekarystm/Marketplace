'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile, Store } from '@marketplace/shared';
import { supabase } from './supabase';

interface SessionState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** Stores the user manages (managers) — admins can access all stores. */
  managedStores: Store[];
  reload: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [managedStores, setManagedStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (s: Session | null) => {
    setSession(s);
    if (!s) {
      setProfile(null);
      setManagedStores([]);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: staff }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', s.user.id).single(),
      supabase.from('store_staff').select('role, store:stores(*)').eq('user_id', s.user.id).eq('role', 'manager'),
    ]);
    setProfile(p ?? null);
    setManagedStores((staff ?? []).map((r) => r.store).filter((x): x is Store => !!x));
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      load(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        loading,
        session,
        profile,
        isAdmin: profile?.role === 'admin',
        managedStores,
        reload: async () => load((await supabase.auth.getSession()).data.session),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession outside provider');
  return c;
}
