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
let initPromise: Promise<void> | null = null;

async function checkProfileComplete(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('name, nickname')
      .eq('user_id', userId)
      .maybeSingle();
    return !!(data?.name || data?.nickname);
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,
  profileComplete: null,

  initialize: async () => {
    if (get().initialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;

      let profileComplete: boolean | null = null;
      if (user) {
        profileComplete = await checkProfileComplete(user.id);
      }

      set({ session: data.session, user, initialized: true, profileComplete });

      authSubscription?.unsubscribe();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return;

        // 토큰 갱신/유저 정보 변경 시에는 세션/유저만 업데이트 (profileComplete 유지)
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          set({ session, user: session?.user ?? null });
          return;
        }

        const newUser = session?.user ?? null;
        set({ session, user: newUser, profileComplete: null });

        if (newUser) {
          const capturedUserId = newUser.id;
          checkProfileComplete(newUser.id).then((pc) => {
            if (get().user?.id === capturedUserId) {
              set({ profileComplete: pc });
            }
          });
        }
      });
      authSubscription = subscription;
    })();

    return initPromise;
  },

  setProfileComplete: (value: boolean) => set({ profileComplete: value }),

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      set({ session: null, user: null, profileComplete: null });
    }
  },
}));
