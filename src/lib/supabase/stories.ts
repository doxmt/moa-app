import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from './client';

export const FREE_DAILY_LIMIT = 3;
export const LOCK_AFTER_DAYS = 7;

export type Story = {
  id: string;
  couple_id: string;
  created_by: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  signed_url?: string;
};

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function getStories(coupleId: string, isPremium = false): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const withUrls = await Promise.all(
    data.map(async (story) => {
      const diffDays = (Date.now() - new Date(story.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (!isPremium && diffDays > LOCK_AFTER_DAYS) {
        return { ...story, signed_url: undefined };
      }
      const { data: signed } = await supabase.storage
        .from('couple-photos')
        .createSignedUrl(story.storage_path, 60 * 60);
      return { ...story, signed_url: signed?.signedUrl ?? undefined };
    })
  );

  return withUrls;
}

export async function addStory(
  coupleId: string,
  uri: string,
  caption: string | null
): Promise<Story> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('stories')
    .select('id', { count: 'exact', head: true })
    .eq('couple_id', coupleId)
    .eq('created_by', user.id)
    .gte('created_at', today.toISOString());
  if ((count ?? 0) >= FREE_DAILY_LIMIT) throw new Error('DAILY_LIMIT_EXCEEDED');

  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const storyId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const storagePath = `${coupleId}/stories/${storyId}.${ext}`;

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const fileData = base64ToUint8Array(base64);

  const { error: uploadError } = await supabase.storage
    .from('couple-photos')
    .upload(storagePath, fileData, { contentType: `image/${ext}`, upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('stories')
    .insert({ couple_id: coupleId, created_by: user.id, storage_path: storagePath, caption })
    .select()
    .single();

  if (error || !data) throw error;

  const { data: signed } = await supabase.storage
    .from('couple-photos')
    .createSignedUrl(storagePath, 60 * 60);

  return { ...data, signed_url: signed?.signedUrl ?? undefined };
}

export async function updateCaption(storyId: string, caption: string | null): Promise<void> {
  const { error } = await supabase.from('stories').update({ caption }).eq('id', storyId);
  if (error) throw error;
}

export async function deleteStory(storyId: string, storagePath: string): Promise<void> {
  await supabase.from('stories').delete().eq('id', storyId);
  await supabase.storage.from('couple-photos').remove([storagePath]);
}
