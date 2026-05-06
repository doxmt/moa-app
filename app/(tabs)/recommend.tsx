import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
  Modal,
  ScrollView,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
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

const WHEEL_COLORS = [
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#48DBFB',
  '#54A0FF',
  '#A29BFE',
  '#FD79A8',
  '#55EFC4',
];

const SLIP_COLORS = [
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#48DBFB',
  '#54A0FF',
  '#A29BFE',
  '#FD79A8',
  '#55EFC4',
];

type SlipItem = { text: string; color: string };

const LADDER_ROWS = 8;

function generateLadder(n: number): { bridges: { row: number; col: number }[]; map: number[] } {
  const bridges: { row: number; col: number }[] = [];
  for (let row = 0; row < LADDER_ROWS; row++) {
    const used = new Set<number>();
    for (let col = 0; col < n - 1; col++) {
      if (!used.has(col - 1) && Math.random() > 0.5) {
        bridges.push({ row, col });
        used.add(col);
      }
    }
  }
  const map = Array.from({ length: n }, (_, start) => {
    let pos = start;
    for (let row = 0; row < LADDER_ROWS; row++) {
      if (bridges.some((b) => b.row === row && b.col === pos)) pos++;
      else if (bridges.some((b) => b.row === row && b.col === pos - 1)) pos--;
    }
    return pos;
  });
  return { bridges, map };
}

function DetailPage({ category, onBack }: { category: Category; onBack: () => void }) {
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
                  <View className="px-3 py-1 rounded-full bg-[#F5F5F5]">
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

function SpinningWheel({ size, candidates }: { size: number; candidates: string[] }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const display = candidates.length >= 2 ? candidates : [...candidates, ...Array(2 - candidates.length).fill('')];
  const n = display.length;

  const polarToCartesian = (angleDeg: number, radius: number) => {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const segSize = 360 / n;
  const textRadius = r * 0.6;
  const fontSize = n <= 4 ? 14 : n <= 6 ? 12 : 11;
  const maxChars = n <= 4 ? 9 : n <= 6 ? 8 : 7;

  let colorIdx = 0;

  return (
    <Svg width={size} height={size}>
      {display.map((label, i) => {
        const startAngle = i * segSize;
        const endAngle = (i + 1) * segSize;
        const midAngle = startAngle + segSize / 2;
        const start = polarToCartesian(startAngle, r);
        const end = polarToCartesian(endAngle, r);
        const largeArc = segSize > 180 ? 1 : 0;
        const pathD = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
        const isEmpty = label === '';
        const color = WHEEL_COLORS[colorIdx++ % WHEEL_COLORS.length];
        const textPos = polarToCartesian(midAngle, textRadius);
        const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + '…' : label;

        return (
          <G key={i}>
            <Path d={pathD} fill={color} stroke="white" strokeWidth={2} />
            {!isEmpty && (
              <SvgText
                x={textPos.x}
                y={textPos.y}
                fill="white"
                fontSize={fontSize}
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {displayLabel}
              </SvgText>
            )}
          </G>
        );
      })}
      <Circle cx={cx} cy={cy} r={14} fill="white" />
    </Svg>
  );
}

const SLIP_ROTATIONS = [3, -4, 2, -5, 4, -2, 5, -3, 3];

const slipShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 1, height: 3 },
  shadowOpacity: 0.16,
  shadowRadius: 5,
  elevation: 5,
} as const;

function SlipNote({ color, showText, text, width, height }: {
  color: string;
  showText?: boolean;
  text?: string;
  width: number;
  height: number;
}) {
  const linePositions = [0.36, 0.52, 0.68, 0.84];
  return (
    <View style={{ width, height, backgroundColor: color, borderRadius: 14, alignItems: 'center', overflow: 'hidden', ...slipShadow }}>
      {/* 구멍 */}
      <View style={{ marginTop: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.15)' }} />
      {/* 줄 */}
      {linePositions.map((pos, i) => (
        <View key={i} style={{ position: 'absolute', left: 12, right: 12, height: 1, top: height * pos, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      ))}
      {/* 내용 */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingBottom: 8 }}>
        {showText ? (
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 18, letterSpacing: 0.2 }} numberOfLines={5}>
            {text}
          </Text>
        ) : (
          <View style={{ alignItems: 'center', gap: 7 }}>
            <View style={{ width: 32, height: 2, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 1 }} />
            <View style={{ width: 22, height: 2, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 1 }} />
            <View style={{ width: 28, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1 }} />
          </View>
        )}
      </View>
    </View>
  );
}

function DrawPage({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<'input' | 'draw'>('input');
  const [slips, setSlips] = useState<SlipItem[]>([]);
  const [input, setInput] = useState('');
  const [shuffled, setShuffled] = useState<SlipItem[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const flipAnims = useRef(Array.from({ length: 9 }, () => new Animated.Value(1))).current;
  const { width } = useWindowDimensions();

  const MAX = 9;
  const GRID_GAP = 10;
  const slipW = Math.floor((width - 40 - GRID_GAP * 2) / 3);
  const slipH = Math.floor(slipW * 1.38);

  const addSlip = () => {
    const trimmed = input.trim();
    if (!trimmed || slips.length >= MAX) return;
    const color = SLIP_COLORS[slips.length % SLIP_COLORS.length];
    setSlips((prev) => [...prev, { text: trimmed, color }]);
    setInput('');
  };

  const removeSlip = (i: number) => {
    setSlips((prev) => prev.filter((_, j) => j !== i));
  };

  const startDraw = () => {
    const shuffledSlips = [...slips].sort(() => Math.random() - 0.5);
    setShuffled(shuffledSlips);
    setRevealed(Array(slips.length).fill(false));
    flipAnims.forEach((anim) => anim.setValue(1));
    setPhase('draw');
  };

  const revealCard = (i: number) => {
    if (revealed[i]) return;
    Animated.timing(flipAnims[i], {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setRevealed((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
      Animated.timing(flipAnims[i], {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity
          onPress={() => phase === 'draw' ? setPhase('input') : onBack()}
          className="w-8 h-8 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-moa-text">제비뽑기</Text>
        {phase === 'draw' && (
          <TouchableOpacity
            onPress={() => { setPhase('input'); setSlips([]); setInput(''); }}
            className="px-3 py-1.5 rounded-full bg-moa-text"
          >
            <Text className="text-xs font-semibold text-white">초기화</Text>
          </TouchableOpacity>
        )}
      </View>

      {phase === 'input' && (
        <View className="flex-1 px-5 pb-5 gap-4">
          <View className="flex-row gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={addSlip}
              placeholder={slips.length >= MAX ? '최대 9개까지 추가 가능해요' : '제비를 입력하세요'}
              placeholderTextColor="#CCCCCC"
              returnKeyType="done"
              editable={slips.length < MAX}
              className="flex-1 px-4 py-3 rounded-2xl border border-moa-border bg-white text-sm text-moa-text"
            />
            <TouchableOpacity
              onPress={addSlip}
              disabled={!input.trim() || slips.length >= MAX}
              className="px-4 py-3 rounded-2xl bg-moa-text items-center justify-center disabled:opacity-40"
            >
              <Text className="text-white text-sm font-semibold">추가</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {slips.length === 0 ? (
              <View className="flex-1 py-16 items-center gap-2">
                <Text className="text-2xl">✉️</Text>
                <Text className="text-sm text-moa-muted">제비를 추가해보세요</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#F7F3EE', borderRadius: 20, padding: 16 }}>
                <View className="flex-row flex-wrap justify-center" style={{ gap: GRID_GAP }}>
                  {slips.map((slip, i) => (
                    <View key={i} style={{ transform: [{ rotate: `${SLIP_ROTATIONS[i % SLIP_ROTATIONS.length]}deg` }] }}>
                      <SlipNote color={slip.color} showText text={slip.text} width={slipW} height={slipH} />
                      <TouchableOpacity
                        onPress={() => removeSlip(i)}
                        style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: '#AAAAAA', alignItems: 'center', justifyContent: 'center' }}
                        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', lineHeight: 11 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={startDraw}
            disabled={slips.length < 2}
            className="w-full py-4 rounded-2xl bg-moa-text items-center disabled:opacity-40"
          >
            <Text className="text-white text-sm font-semibold">제비 섞기</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'draw' && (
        <View className="flex-1 px-5 pb-5">
          <Text className="text-xs text-moa-muted mb-4">쪽지를 탭해서 뽑아보세요</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap justify-center" style={{ gap: GRID_GAP, paddingVertical: 8 }}>
              {shuffled.map((slip, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => revealCard(i)}
                  activeOpacity={revealed[i] ? 1 : 0.75}
                  disabled={revealed[i]}
                  style={{ transform: [{ rotate: `${SLIP_ROTATIONS[i % SLIP_ROTATIONS.length]}deg` }] }}
                >
                  <Animated.View style={{ transform: [{ scaleX: flipAnims[i] }] }}>
                    <SlipNote
                      color={revealed[i] ? slip.color : '#EDE4D0'}
                      showText={revealed[i]}
                      text={slip.text}
                      width={slipW}
                      height={slipH}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function LadderPage({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<'players' | 'results' | 'ladder'>('players');
  const [players, setPlayers] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [bridges, setBridges] = useState<{ row: number; col: number }[]>([]);
  const [map, setMap] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { width } = useWindowDimensions();
  const MAX = 6;

  const addPlayer = () => {
    const trimmed = input.trim();
    if (!trimmed || players.length >= MAX) return;
    setPlayers((prev) => [...prev, trimmed]);
    setInput('');
  };

  const addResult = () => {
    const trimmed = input.trim();
    if (!trimmed || results.length >= players.length) return;
    setResults((prev) => [...prev, trimmed]);
    setInput('');
  };

  const startLadder = () => {
    const { bridges: b, map: m } = generateLadder(players.length);
    setBridges(b);
    setMap(m);
    setShowResults(false);
    setPhase('ladder');
  };

  const handleBack = () => {
    if (phase === 'players') onBack();
    else if (phase === 'results') { setPhase('players'); setInput(''); }
    else onBack();
  };

  const n = players.length || 2;
  const PADDING = 24;
  const colSpacing = n > 1 ? Math.min(80, Math.max(40, (width - 40 - PADDING * 2) / (n - 1))) : 80;
  const svgW = colSpacing * (n - 1) + PADDING * 2;
  const svgH = 300;
  const TOP = 44;
  const BOTTOM = svgH - 44;
  const xOf = (i: number) => PADDING + i * colSpacing;
  const yOfRow = (row: number) => TOP + (row + 1) * (BOTTOM - TOP) / (LADDER_ROWS + 1);

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity
          onPress={handleBack}
          className="w-8 h-8 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-moa-text">사다리타기</Text>
        {phase === 'ladder' && (
          <TouchableOpacity
            onPress={() => { setPhase('players'); setPlayers([]); setResults([]); setInput(''); }}
            className="px-3 py-1.5 rounded-full bg-moa-text"
          >
            <Text className="text-xs font-semibold text-white">초기화</Text>
          </TouchableOpacity>
        )}
      </View>

      {phase === 'players' && (
        <View className="flex-1 px-5 pb-5 gap-4">
          <Text className="text-xs text-moa-muted">참가자를 입력하세요 (2~6명)</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={addPlayer}
              placeholder={players.length >= MAX ? '최대 6명까지 추가 가능해요' : '이름을 입력하세요'}
              placeholderTextColor="#CCCCCC"
              returnKeyType="done"
              editable={players.length < MAX}
              className="flex-1 px-4 py-3 rounded-2xl border border-moa-border bg-white text-sm text-moa-text"
            />
            <TouchableOpacity
              onPress={addPlayer}
              disabled={!input.trim() || players.length >= MAX}
              className="px-4 py-3 rounded-2xl bg-moa-text items-center justify-center disabled:opacity-40"
            >
              <Text className="text-white text-sm font-semibold">추가</Text>
            </TouchableOpacity>
          </View>
          {players.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {players.map((p, i) => (
                <View key={i} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-moa-border" style={{ maxWidth: 140 }}>
                  <Text className="flex-1 text-sm text-moa-text" numberOfLines={1} ellipsizeMode="tail">{p}</Text>
                  <TouchableOpacity onPress={() => setPlayers((prev) => prev.filter((_, j) => j !== i))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text className="text-moa-muted text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View className="flex-1" />
          <TouchableOpacity
            onPress={() => { setInput(''); setPhase('results'); }}
            disabled={players.length < 2}
            className="w-full py-4 rounded-2xl bg-moa-text items-center disabled:opacity-40"
          >
            <Text className="text-white text-sm font-semibold">다음</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'results' && (
        <View className="flex-1 px-5 pb-5 gap-4">
          <Text className="text-xs text-moa-muted">결과를 {players.length}개 입력하세요</Text>
          <View className="flex-row gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={addResult}
              placeholder={results.length >= players.length ? '결과를 모두 입력했어요' : '결과를 입력하세요'}
              placeholderTextColor="#CCCCCC"
              returnKeyType="done"
              editable={results.length < players.length}
              className="flex-1 px-4 py-3 rounded-2xl border border-moa-border bg-white text-sm text-moa-text"
            />
            <TouchableOpacity
              onPress={addResult}
              disabled={!input.trim() || results.length >= players.length}
              className="px-4 py-3 rounded-2xl bg-moa-text items-center justify-center disabled:opacity-40"
            >
              <Text className="text-white text-sm font-semibold">추가</Text>
            </TouchableOpacity>
          </View>
          {results.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {results.map((r, i) => (
                <View key={i} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-moa-border" style={{ maxWidth: 140 }}>
                  <Text className="flex-1 text-sm text-moa-text" numberOfLines={1} ellipsizeMode="tail">{r}</Text>
                  <TouchableOpacity onPress={() => setResults((prev) => prev.filter((_, j) => j !== i))} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text className="text-moa-muted text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View className="flex-1" />
          <TouchableOpacity
            onPress={startLadder}
            disabled={results.length !== players.length}
            className="w-full py-4 rounded-2xl bg-moa-text items-center disabled:opacity-40"
          >
            <Text className="text-white text-sm font-semibold">사다리 시작</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'ladder' && (
        <View className="flex-1 px-5 pb-5 gap-4">
          <View className="flex-1 rounded-3xl border border-moa-border bg-white items-center justify-center py-4">
            <Svg width={svgW} height={svgH}>
              {players.map((p, i) => (
                <SvgText key={`pn-${i}`} x={xOf(i)} y={22} fontSize={11} textAnchor="middle" fill="#222222" fontWeight="600">
                  {p.length > 5 ? p.slice(0, 4) + '…' : p}
                </SvgText>
              ))}
              {players.map((_, i) => (
                <Path key={`vl-${i}`} d={`M ${xOf(i)} ${TOP} L ${xOf(i)} ${BOTTOM}`} stroke="#E0E0E0" strokeWidth={2} />
              ))}
              {bridges.map((b, i) => (
                <Path
                  key={`br-${i}`}
                  d={`M ${xOf(b.col)} ${yOfRow(b.row)} L ${xOf(b.col + 1)} ${yOfRow(b.row)}`}
                  stroke="#CCCCCC"
                  strokeWidth={2}
                />
              ))}
              {results.map((r, i) => (
                <SvgText key={`rn-${i}`} x={xOf(i)} y={svgH - 8} fontSize={11} textAnchor="middle" fill="#888888">
                  {r.length > 5 ? r.slice(0, 4) + '…' : r}
                </SvgText>
              ))}
            </Svg>
          </View>
          <TouchableOpacity
            onPress={() => setShowResults(true)}
            className="w-full py-4 rounded-2xl bg-moa-text items-center"
          >
            <Text className="text-white text-sm font-semibold">결과 확인</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showResults} transparent animationType="fade" onRequestClose={() => setShowResults(false)}>
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-3xl px-6 py-8 gap-5 mx-6">
            <Text className="text-base font-semibold text-moa-text text-center">결과</Text>
            <View className="gap-3">
              {players.map((p, i) => (
                <View key={i} className="flex-row items-center gap-3">
                  <Text className="flex-1 text-sm font-semibold text-moa-text" numberOfLines={1}>{p}</Text>
                  <Text className="text-moa-muted text-xs">→</Text>
                  <Text className="flex-1 text-sm text-moa-sub text-right" numberOfLines={1}>{results[map[i]]}</Text>
                </View>
              ))}
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowResults(false)}
                className="flex-1 py-3 rounded-2xl border border-moa-border items-center"
              >
                <Text className="text-sm font-semibold text-moa-sub">닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowResults(false); startLadder(); }}
                className="flex-1 py-3 rounded-2xl bg-moa-text items-center"
              >
                <Text className="text-sm font-semibold text-white">다시하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function RoulettePage({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const rotationRef = useRef(0);
  const rotationAnim = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const wheelSize = Math.min(width - 80, 280);

  useEffect(() => {
    rotationAnim.setValue(0);
    rotationRef.current = 0;
    setResult(null);
  }, [candidates.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const addCandidate = () => {
    const trimmed = input.trim();
    if (!trimmed || candidates.length >= 8) return;
    setCandidates((prev) => [...prev, trimmed]);
    setInput('');
  };

  const removeCandidate = (index: number) => {
    if (spinning) return;
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    if (spinning) return;
    setCandidates([]);
    rotationAnim.setValue(0);
    rotationRef.current = 0;
    setResult(null);
  };

  const spin = () => {
    if (candidates.length < 2 || spinning) return;
    setSpinning(true);
    setResult(null);

    const idx = Math.floor(Math.random() * candidates.length);
    const segSize = 360 / candidates.length;
    const segCenterAngle = idx * segSize + segSize / 2;
    const targetOffset = (360 - segCenterAngle % 360 + 360) % 360;

    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    let delta = (targetOffset - currentMod + 360) % 360;
    if (delta < 30) delta += 360;

    const totalRotation = rotationRef.current + 5 * 360 + delta;
    rotationRef.current = totalRotation;

    Animated.timing(rotationAnim, {
      toValue: totalRotation,
      duration: 3500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setResult(candidates[idx]);
      setSpinning(false);
    });
  };

  const wheelRotation = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity
          onPress={onBack}
          className="w-8 h-8 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-moa-text">나만의 룰렛</Text>
        <TouchableOpacity
          onPress={reset}
          disabled={spinning}
          className="px-3 py-1.5 rounded-full bg-moa-text disabled:opacity-40"
        >
          <Text className="text-xs font-semibold text-white">초기화</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-5 pb-5 gap-4">
        <View className="flex-row gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={addCandidate}
            placeholder={candidates.length >= 8 ? '최대 8개까지 추가 가능해요' : '후보를 입력하세요'}
            placeholderTextColor="#CCCCCC"
            returnKeyType="done"
            editable={candidates.length < 8}
            className="flex-1 px-4 py-3 rounded-2xl border border-moa-border bg-white text-sm text-moa-text"
          />
          <TouchableOpacity
            onPress={addCandidate}
            disabled={!input.trim() || candidates.length >= 8}
            className="px-4 py-3 rounded-2xl bg-moa-text items-center justify-center disabled:opacity-40"
          >
            <Text className="text-white text-sm font-semibold">추가</Text>
          </TouchableOpacity>
        </View>

        {candidates.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {candidates.map((item, i) => (
              <View
                key={i}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-moa-border"
                style={{ maxWidth: 140 }}
              >
                <Text className="flex-1 text-sm text-moa-text" numberOfLines={1} ellipsizeMode="tail">{item}</Text>
                <TouchableOpacity
                  onPress={() => removeCandidate(i)}
                  disabled={spinning}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text className="text-moa-muted text-xs">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View className="flex-1 items-center justify-center">
          <View className="items-center">
            <View style={styles.pointer} />
            <Animated.View style={{ transform: [{ rotate: wheelRotation }] }}>
              <SpinningWheel size={wheelSize} candidates={candidates} />
            </Animated.View>
          </View>
        </View>

        <TouchableOpacity
          onPress={spin}
          disabled={candidates.length < 2 || spinning}
          className="w-full py-4 rounded-2xl bg-moa-text items-center disabled:opacity-40"
        >
          <Text className="text-white text-sm font-semibold">
            {spinning ? '돌아가는 중...' : result ? '다시 돌리기' : '돌리기'}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={result !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setResult(null)}
      >
        <View style={styles.modalOverlay}>
          <View className="bg-white rounded-3xl px-8 py-10 items-center gap-7">
            <View className="items-center gap-2 w-full">
              <Text className="text-sm text-moa-muted">결과</Text>
              <Text
                className="w-full text-3xl font-bold text-moa-text text-center"
                adjustsFontSizeToFit
                numberOfLines={2}
                minimumFontScale={0.5}
              >{result}</Text>
            </View>
            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={() => setResult(null)}
                className="flex-1 py-3 rounded-2xl border border-moa-border items-center"
              >
                <Text className="text-sm font-semibold text-moa-sub">닫기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setResult(null); spin(); }}
                className="flex-1 py-3 rounded-2xl bg-moa-text items-center"
              >
                <Text className="text-sm font-semibold text-white">다시 돌리기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

export default function RecommendScreen() {
  const [selected, setSelected] = useState<Category | 'roulette' | 'draw' | 'ladder' | null>(null);

  if (selected === 'roulette') {
    return <RoulettePage onBack={() => setSelected(null)} />;
  }

  if (selected === 'draw') {
    return <DrawPage onBack={() => setSelected(null)} />;
  }

  if (selected === 'ladder') {
    return <LadderPage onBack={() => setSelected(null)} />;
  }

  if (selected) {
    return <DetailPage category={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 10 }}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <View style={styles.sectionBar} />
          <Text className="text-xs font-semibold text-moa-text">추천</Text>
        </View>

        <TouchableOpacity
          onPress={() => setSelected(CATEGORIES[0])}
          activeOpacity={0.85}
          className="h-44 rounded-3xl items-center justify-center gap-3"
          style={styles.cardFood}
        >
          <Text className="text-5xl">{CATEGORIES[0].emoji}</Text>
          <View className="items-center gap-1">
            <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[0].title}</Text>
            <Text className="text-xs text-moa-muted">{CATEGORIES[0].subtitle}</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setSelected(CATEGORIES[1])}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardActivity}
          >
            <Text className="text-4xl">{CATEGORIES[1].emoji}</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[1].title}</Text>
              <Text className="text-xs text-moa-muted">{CATEGORIES[1].subtitle}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelected(CATEGORIES[2])}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardLocation}
          >
            <Text className="text-4xl">{CATEGORIES[2].emoji}</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[2].title}</Text>
              <Text className="text-xs text-moa-muted">{CATEGORIES[2].subtitle}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2 mt-3 mb-1">
          <View style={styles.sectionBar} />
          <Text className="text-xs font-semibold text-moa-text">뽑기</Text>
        </View>

        <TouchableOpacity
          onPress={() => setSelected('roulette')}
          activeOpacity={0.85}
          className="h-44 rounded-3xl items-center justify-center gap-3"
          style={styles.cardRoulette}
        >
          <Text className="text-5xl">🎰</Text>
          <View className="items-center gap-1">
            <Text className="text-sm font-semibold text-moa-text">나만의 룰렛</Text>
            <Text className="text-xs text-moa-muted">후보를 넣고 뽑아보세요</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setSelected('draw')}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardDraw}
          >
            <Text className="text-4xl">✉️</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">제비뽑기</Text>
              <Text className="text-xs text-moa-muted">카드를 뒤집어 뽑아보세요</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelected('ladder')}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardLadder}
          >
            <Text className="text-4xl">🪜</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">사다리타기</Text>
              <Text className="text-xs text-moa-muted">공평하게 정해볼까요</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBar: {
    width: 3,
    height: 13,
    backgroundColor: '#222222',
    borderRadius: 2,
  },
  cardFood: {
    backgroundColor: '#FFF6EE',
  },
  cardActivity: {
    backgroundColor: '#EEFAF4',
  },
  cardLocation: {
    backgroundColor: '#EEF3FF',
  },
  cardRoulette: {
    backgroundColor: '#F3EEFF',
  },
  cardDraw: {
    backgroundColor: '#FFEEF5',
  },
  cardLadder: {
    backgroundColor: '#EEFAF4',
  },
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
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 18,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#222222',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
});
