import { Session, Subscription, User } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  profileComplete: boolean | null;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  setProfileComplete: (value: boolean) => void;
};

let authSubscription: Subscription | null = null;

async function checkProfileComplete(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', userId)
    .single();
  return !!data?.name;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,
  profileComplete: null,

  initialize: async () => {
    if (get().initialized) return;

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;

    let profileComplete: boolean | null = null;
    if (user) {
      profileComplete = await checkProfileComplete(user.id);
    }

    set({ session: data.session, user, initialized: true, profileComplete });

    authSubscription?.unsubscribe();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const newUser = session?.user ?? null;
      let pc: boolean | null = null;
      if (newUser) {
        pc = await checkProfileComplete(newUser.id);
      }
      set({ session, user: newUser, profileComplete: pc });
    });
    authSubscription = subscription;
  },

  setProfileComplete: (value: boolean) => set({ profileComplete: value }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profileComplete: null });
  },
}));
