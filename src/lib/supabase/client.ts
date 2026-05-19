import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const CHUNK_SIZE = 1800;
const VALID_SECURE_STORE_KEY = /^[A-Za-z0-9._-]+$/;
const safeStorageKey = (key: string) => {
  const fallbackKey = 'supabase_auth_token';
  const normalized = key || fallbackKey;
  if (VALID_SECURE_STORE_KEY.test(normalized)) return normalized;
  return normalized.replace(/[^A-Za-z0-9._-]/g, '_');
};
const chunkMetaKey = (key: string) => `${key}_chunks`;
const chunkKey = (key: string, index: number) => `${key}_chunk_${index}`;

const secureStorage = {
  async getItem(key: string) {
    const storageKey = safeStorageKey(key);
    const chunkCountValue = await SecureStore.getItemAsync(chunkMetaKey(storageKey));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    if (!chunkCount || Number.isNaN(chunkCount)) {
      return SecureStore.getItemAsync(storageKey);
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(chunkKey(storageKey, index)))
    );

    if (chunks.some((chunk) => chunk === null)) {
      return null;
    }

    return chunks.join('');
  },

  async setItem(key: string, value: string) {
    const storageKey = safeStorageKey(key);
    await secureStorage.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(storageKey, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [];
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(storageKey, index), chunk))
    );
    await SecureStore.setItemAsync(chunkMetaKey(storageKey), String(chunks.length));
  },

  async removeItem(key: string) {
    const storageKey = safeStorageKey(key);
    const chunkCountValue = await SecureStore.getItemAsync(chunkMetaKey(storageKey));
    const chunkCount = chunkCountValue ? Number(chunkCountValue) : 0;

    await SecureStore.deleteItemAsync(storageKey);

    if (chunkCount && !Number.isNaN(chunkCount)) {
      await Promise.all(
        Array.from({ length: chunkCount }, (_, index) => SecureStore.deleteItemAsync(chunkKey(storageKey, index)))
      );
    }

    await SecureStore.deleteItemAsync(chunkMetaKey(storageKey));
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
