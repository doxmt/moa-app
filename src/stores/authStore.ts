import { Session, Subscription, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';

type Profile = { name: string | null; couple_id: string | null } | null;

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  profile: Profile;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

let authSubscription: Subscription | null = null;

async function fetchProfile(userId: string): Promise<Profile> {
  const { data } = await supabase
    .from('profiles')
    .select('name, couple_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,
  profile: null,

  initialize: async () => {
    if (get().initialized) return;

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    const profile = user ? await fetchProfile(user.id) : null;

    set({ session: data.session, user, profile, initialized: true });

    authSubscription?.unsubscribe();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ session: null, user: null, profile: null });
      } else {
        const profile = await fetchProfile(session.user.id);
        set({ session, user: session.user, profile });
      }
    });
    authSubscription = subscription;
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const profile = await fetchProfile(user.id);
    set({ profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },
}));
