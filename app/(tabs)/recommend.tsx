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
  return (
    <View style={{ width, height, backgroundColor: color, borderRadius: 10, alignItems: 'center', justifyContent: 'center', ...slipShadow }}>
      {showText ? (
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 }} numberOfLines={6}>
          {text}
        </Text>
      ) : (
        <>
          <View style={{ position: 'absolute', left: 10, right: 10, height: 1, top: height * 0.42, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.45)', marginTop: 12 }} />
        </>
      )}
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
              <View className="py-16 items-center">
                <Text className="text-sm text-moa-muted">제비를 추가해보세요</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-center" style={{ gap: GRID_GAP, paddingVertical: 8 }}>
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
  const [selected, setSelected] = useState<Category | 'roulette' | 'draw' | null>(null);

  if (selected === 'roulette') {
    return <RoulettePage onBack={() => setSelected(null)} />;
  }

  if (selected === 'draw') {
    return <DrawPage onBack={() => setSelected(null)} />;
  }

  if (selected) {
    return <DetailPage category={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View className="flex-1">
      <View className="px-5 py-4">
        <Text className="text-base font-semibold text-moa-text">추천</Text>
        <Text className="text-xs text-moa-muted mt-0.5">고민하지 말고 추천받아보세요</Text>
      </View>

      <View className="px-5 pb-4 gap-3">
        <TouchableOpacity
          onPress={() => setSelected(CATEGORIES[0])}
          activeOpacity={0.85}
          className="h-44 bg-white border border-moa-border rounded-3xl items-center justify-center gap-3"
        >
          <Text className="text-4xl">{CATEGORIES[0].emoji}</Text>
          <View className="items-center gap-0.5">
            <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[0].title}</Text>
            <Text className="text-xs text-moa-muted">{CATEGORIES[0].subtitle}</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          {CATEGORIES.slice(1).map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelected(cat)}
              activeOpacity={0.85}
              className="flex-1 h-36 bg-white border border-moa-border rounded-3xl items-center justify-center gap-3"
            >
              <Text className="text-3xl">{cat.emoji}</Text>
              <View className="items-center gap-0.5">
                <Text className="text-sm font-semibold text-moa-text">{cat.title}</Text>
                <Text className="text-xs text-moa-muted">{cat.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setSelected('roulette')}
            activeOpacity={0.85}
            className="flex-1 h-36 bg-white border border-moa-border rounded-3xl items-center justify-center gap-3"
          >
            <Text className="text-3xl">🎡</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">나만의 룰렛</Text>
              <Text className="text-xs text-moa-muted">후보를 넣고 뽑아보세요</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelected('draw')}
            activeOpacity={0.85}
            className="flex-1 h-36 bg-white border border-moa-border rounded-3xl items-center justify-center gap-3"
          >
            <Text className="text-3xl">🎴</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">제비뽑기</Text>
              <Text className="text-xs text-moa-muted">카드를 뒤집어 뽑아보세요</Text>
            </View>
          </TouchableOpacity>
        </View>
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
