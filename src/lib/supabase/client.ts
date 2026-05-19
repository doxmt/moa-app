import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const CHUNK_SIZE = 1800;
const chunkMetaKey = (key: string) => `${key}:chunks`;
const chunkKey = (key: string, index: number) => `${key}:chunk:${index}`;

const secureStorage = {
  async getItem(key: string) {
    const chunkCountValue = await SecureStore.getItemAsync(chunkMetaKey(key));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    if (!chunkCount || Number.isNaN(chunkCount)) {
      return SecureStore.getItemAsync(key);
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index)))
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },

  async setItem(key: string, value: string) {
    await secureStorage.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [];
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
    );
    await SecureStore.setItemAsync(chunkMetaKey(key), String(chunks.length));
  },

  async removeItem(key: string) {
    const chunkCountValue = await SecureStore.getItemAsync(chunkMetaKey(key));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    await SecureStore.deleteItemAsync(key);

    if (chunkCount && !Number.isNaN(chunkCount)) {
      await Promise.all(
        Array.from({ length: chunkCount }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index)))
      );
    }

    await SecureStore.deleteItemAsync(chunkMetaKey(key));
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
