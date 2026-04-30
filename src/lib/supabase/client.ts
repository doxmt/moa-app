import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore는 키에 특수문자(. : /)를 허용하지 않아 치환
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key.replace(/[^a-zA-Z0-9_-]/g, '_')),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key.replace(/[^a-zA-Z0-9_-]/g, '_'), value),
  removeItem: (key: string) =>
    SecureStore.deleteItemAsync(key.replace(/[^a-zA-Z0-9_-]/g, '_')),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
