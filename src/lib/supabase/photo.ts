import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from './client';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function uploadCouplePhoto(uri: string, coupleId: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다');

  const compressed = await compressImage(uri);
  const photoId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const storagePath = `${coupleId}/${photoId}.jpg`;

  const base64 = await FileSystem.readAsStringAsync(compressed, { encoding: 'base64' });
  const fileData = base64ToUint8Array(base64);

  const { error: uploadError } = await supabase.storage
    .from('couple-photos')
    .upload(storagePath, fileData, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from('couple_photos')
    .insert({ couple_id: coupleId, user_id: user.id, storage_path: storagePath });

  if (dbError) throw dbError;

  return storagePath;
}

export async function deleteOldCouplePhotos(coupleId: string): Promise<void> {
  const { data: oldPhotos } = await supabase
    .from('couple_photos')
    .select('id, storage_path')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .range(1, 100);

  if (!oldPhotos || oldPhotos.length === 0) return;

  const paths = oldPhotos.map((p) => p.storage_path);
  const ids = oldPhotos.map((p) => p.id);

  await supabase.storage.from('couple-photos').remove(paths);
  await supabase.from('couple_photos').delete().in('id', ids);
}

export async function getLatestPhotoUrl(coupleId: string): Promise<string | null> {
  const { data } = await supabase
    .from('couple_photos')
    .select('storage_path')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const { data: signed } = await supabase.storage
    .from('couple-photos')
    .createSignedUrl(data.storage_path, 60 * 60);

  return signed?.signedUrl ?? null;
}
