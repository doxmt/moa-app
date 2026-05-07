import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { getRecommendations, getGenreImages, Recommendation } from '@/lib/supabase/recommendations';
import { Category } from './constants';

export function DetailPage({ category, onBack }: { category: Category; onBack: () => void }) {
  const [genre, setGenre] = useState('전체');
  const [picked, setPicked] = useState<Recommendation | null>(null);
  const [items, setItems] = useState<Recommendation[]>([]);
  const [genreImages, setGenreImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    Promise.all([
      getRecommendations(category.id),
      getGenreImages(category.id),
    ]).then(([data, images]) => {
      setItems(data);
      setGenreImages(images);
    }).finally(() => setLoading(false));
  }, [category.id]);

  const pool = genre === '전체' ? items : items.filter((i) => i.genre === genre);

  const genreImage = genre !== '전체'
    ? genreImages[genre]
    : (picked?.genre ? genreImages[picked.genre] : undefined);

  const pick = () => {
    if (pool.length === 0 || picking) return;
    setPicking(true);
    setPicked(null);
    const random = pool[Math.floor(Math.random() * pool.length)];
    const imageUrl = genre !== '전체' ? genreImages[genre] : (random.genre ? genreImages[random.genre] : undefined);
    const show = () => { setImageReady(false); setPicked(random); setPicking(false); };
    if (imageUrl) {
      const start = Date.now();
      Image.prefetch(imageUrl).finally(() => {
        const elapsed = Date.now() - start;
        setTimeout(show, Math.max(0, 800 - elapsed));
      });
    } else {
      setTimeout(show, 800);
    }
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity
          onPress={onBack}
          className="w-8 h-8 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-moa-text">
          {category.title}
        </Text>
      </View>

      <View className="flex-1 px-5 pb-5 gap-5">
        {category.genres.length > 1 && (
          <View className="flex-row flex-wrap gap-1">
            {category.genres.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => { setGenre(g); setPicked(null); }}
                className={`px-4 py-1.5 rounded-full border ${
                  genre === g
                    ? 'bg-moa-text border-moa-text'
                    : 'bg-white border-moa-border'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    genre === g ? 'text-white' : 'text-moa-sub'
                  }`}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="flex-1 rounded-3xl overflow-hidden border border-moa-border bg-white items-center justify-center">
          {loading ? (
            <ActivityIndicator color="#CCCCCC" />
          ) : picking ? (
            <View className="items-center gap-3">
              <Text className="text-4xl">🎲</Text>
              <Text className="text-sm text-moa-muted">고르는 중...</Text>
            </View>
          ) : picked ? (
            genreImage ? (
              <>
                <ImageBackground
                  source={{ uri: genreImage }}
                  style={styles.genreImageBg}
                  resizeMode="cover"
                  onLoad={() => setImageReady(true)}
                >
                  <View className="absolute inset-0 bg-black/30" />
                  <View className="items-center gap-3">
                    <Text className="text-4xl font-bold text-center text-white px-6" style={styles.genreTitle}>
                      {picked.name}
                    </Text>
                    {picked.genre && (
                      <View className="px-3 py-1 rounded-full bg-white/80">
                        <Text className="text-xs text-moa-text">{picked.genre}</Text>
                      </View>
                    )}
                  </View>
                </ImageBackground>
                {!imageReady && (
                  <View className="absolute inset-0 bg-white items-center justify-center gap-3">
                    <Text className="text-4xl">🎲</Text>
                    <Text className="text-sm text-moa-muted">고르는 중...</Text>
                  </View>
                )}
              </>
            ) : (
              <View className="items-center gap-3">
                <Text className="text-4xl font-bold text-center text-moa-text px-6">
                  {picked.name}
                </Text>
                {picked.genre && (
                  <View className="px-3 py-1 rounded-full bg-moa-bg">
                    <Text className="text-xs text-moa-sub">{picked.genre}</Text>
                  </View>
                )}
              </View>
            )
          ) : (
            <View className="items-center gap-3">
              <Text className="text-sm text-moa-muted">버튼을 눌러서 뽑아보세요</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={pick}
          disabled={loading || picking || (picked !== null && !!genreImage && !imageReady)}
          className="w-full py-4 rounded-2xl bg-moa-text items-center disabled:opacity-40"
        >
          <Text className="text-white text-sm font-semibold">
            {picked && (imageReady || !genreImage) ? '다시 뽑기' : '뽑기'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  genreImageBg: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreTitle: {
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 4,
  },
});
