import { supabase } from './client';

export type Recommendation = {
  id: string;
  category: string;
  genre: string | null;
  name: string;
};

export async function getRecommendations(category: string): Promise<Recommendation[]> {
  const { data } = await supabase
    .from('recommendations')
    .select('id, category, genre, name')
    .eq('category', category);
  return data ?? [];
}

export async function getGenreImages(category: string): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('recommendation_genre_images')
    .select('genre, image_url')
    .eq('category', category);
  if (!data) return {};
  return Object.fromEntries(data.map((row: { genre: string; image_url: string }) => [row.genre, row.image_url.replace(/\n/g, '')]));
}
