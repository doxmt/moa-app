import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SLIP_COLORS, SlipItem } from './constants';

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
      <View style={{ marginTop: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.15)' }} />
      {linePositions.map((pos, i) => (
        <View key={i} style={{ position: 'absolute', left: 12, right: 12, height: 1, top: height * pos, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      ))}
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

export function DrawPage({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<'input' | 'draw'>('input');
  const [slips, setSlips] = useState<SlipItem[]>([]);
  const [input, setInput] = useState('');
  const [shuffled, setShuffled] = useState<SlipItem[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const flipAnims = useRef(Array.from({ length: 9 }, () => new Animated.Value(1))).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    return () => { flipAnims.forEach((anim) => anim.stopAnimation()); };
  }, [flipAnims]);

  const MAX = 9;
  const GRID_GAP = 10;
  const slipW = Math.floor((width - 40 - GRID_GAP * 2) / 3);
  const inputSlipW = Math.floor((width - 72 - GRID_GAP * 2) / 3);
  const slipH = Math.floor(slipW * 1.38);
  const inputSlipH = Math.floor(inputSlipW * 1.38);

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
                      <SlipNote color={slip.color} showText text={slip.text} width={inputSlipW} height={inputSlipH} />
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
