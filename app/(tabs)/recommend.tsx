import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { getRecommendations, getGenreImages, Recommendation } from '@/lib/supabase/recommendations';

type Category = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  genres: string[];
};

const CATEGORIES: Category[] = [
  {
    id: 'food',
    emoji: '🍽️',
    title: '우리 뭐먹을까',
    subtitle: '메뉴 추천해드릴게요',
    genres: ['전체', '한식', '중식', '일식', '양식', '아시안', '분식'],
  },
  {
    id: 'activity',
    emoji: '📍',
    title: '우리 뭐할까',
    subtitle: '할 것 추천해드릴게요',
    genres: ['전체', '집에서', '실내', '야외'],
  },
  {
    id: 'location',
    emoji: '🚘',
    title: '우리 어디갈까',
    subtitle: '갈 곳 추천해드릴게요',
    genres: ['전체', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '경북', '경남', '전북', '전남', '제주'],
  },
];

function DetailPage({ category, onBack }: { category: Category; onBack: () => void }) {
  const [genre, setGenre] = useState('전체');
  const [picked, setPicked] = useState<Recommendation | null>(null);
  const [items, setItems] = useState<Recommendation[]>([]);
  const [genreImages, setGenreImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);

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

  const pick = () => {
    if (pool.length === 0 || picking) return;
    setPicking(true);
    setPicked(null);
    const random = pool[Math.floor(Math.random() * pool.length)];
    const imageUrl = random.genre ? genreImages[random.genre] : undefined;
    const show = () => { setPicked(random); setPicking(false); };
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

  const genreImage = picked?.genre ? genreImages[picked.genre] : undefined;

  return (
    <View className="flex-1">
      {/* 헤더 */}
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity
          onPress={onBack}
          className="w-8 h-8 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-moa-text">
          {category.emoji} {category.title}
        </Text>
      </View>

      <View className="flex-1 px-5 pb-5 gap-5">
        {/* 장르 필터 */}
        {category.genres.length > 1 && (
          <View className="flex-row flex-wrap gap-2">
            {category.genres.map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => { setGenre(g); setPicked(null); }}
                className={`flex-1 items-center px-4 py-1.5 rounded-full border ${
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

        {/* 결과 카드 */}
        <View className="flex-1 rounded-3xl overflow-hidden border border-moa-border bg-white items-center justify-center">
          {loading ? (
            <ActivityIndicator color="#CCCCCC" />
          ) : picking ? (
            <View className="items-center gap-3">
              <Text className="text-5xl">🎲</Text>
              <Text className="text-sm text-moa-muted">고르는 중...</Text>
            </View>
          ) : picked ? (
            genreImage ? (
              <ImageBackground
                source={{ uri: genreImage }}
                className="flex-1 w-full items-center justify-center"
                resizeMode="cover"
              >
                <View className="absolute inset-0 bg-black/30" />
                <View className="items-center gap-3">
                  <Text className="text-4xl font-bold text-center text-white px-6" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4 }}>
                    {picked.name}
                  </Text>
                  {picked.genre && (
                    <View className="px-3 py-1 rounded-full bg-white/80">
                      <Text className="text-xs text-moa-text">{picked.genre}</Text>
                    </View>
                  )}
                </View>
              </ImageBackground>
            ) : (
              <View className="items-center gap-3">
                <Text className="text-4xl font-bold text-center text-moa-text px-6">
                  {picked.name}
                </Text>
                {picked.genre && (
                  <View className="px-3 py-1 rounded-full bg-[#F5F5F5]">
                    <Text className="text-xs text-moa-sub">{picked.genre}</Text>
                  </View>
                )}
              </View>
            )
          ) : (
            <View className="items-center gap-3">
              <Text className="text-5xl">🎲</Text>
              <Text className="text-sm text-moa-muted">버튼을 눌러서 뽑아보세요</Text>
            </View>
          )}
        </View>

        {/* 뽑기 버튼 */}
        <TouchableOpacity
          onPress={pick}
          disabled={loading || picking}
          className="w-full py-4 rounded-2xl bg-moa-text items-center disabled:opacity-40"
        >
          <Text className="text-white text-sm font-semibold">
            {picked ? '다시 뽑기 🎲' : '뽑기 🎲'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RecommendScreen() {
  const [selected, setSelected] = useState<Category | null>(null);

  if (selected) {
    return <DetailPage category={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View className="flex-1">
      {/* 헤더 */}
      <View className="px-5 py-4">
        <Text className="text-base font-semibold text-moa-text">추천</Text>
        <Text className="text-xs text-moa-muted mt-0.5">고민하지 말고 추천받아보세요</Text>
      </View>

      {/* 카테고리 목록 */}
      <View className="px-5 pb-4 gap-3">
        {/* 첫 번째 카테고리 (큰 카드) */}
        <TouchableOpacity
          onPress={() => setSelected(CATEGORIES[0])}
          activeOpacity={0.85}
          className="h-44 bg-white border border-moa-border rounded-3xl items-center justify-center gap-3"
        >
          <Text className="text-5xl">{CATEGORIES[0].emoji}</Text>
          <View className="items-center gap-0.5">
            <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[0].title}</Text>
            <Text className="text-xs text-moa-muted">{CATEGORIES[0].subtitle}</Text>
          </View>
        </TouchableOpacity>

        {/* 두 번째, 세 번째 카테고리 (나란히) */}
        <View className="flex-row gap-3">
          {CATEGORIES.slice(1).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelected(cat)}
              activeOpacity={0.85}
              className="flex-1 h-36 bg-white border border-moa-border rounded-3xl items-center justify-center gap-3"
            >
              <Text className="text-4xl">{cat.emoji}</Text>
              <View className="items-center gap-0.5">
                <Text className="text-sm font-semibold text-moa-text">{cat.title}</Text>
                <Text className="text-xs text-moa-muted">{cat.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
