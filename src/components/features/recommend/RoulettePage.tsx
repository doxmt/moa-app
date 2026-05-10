import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  useWindowDimensions,
  Modal,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { WHEEL_COLORS } from './constants';
import { fetchCoupleBasic } from '@/lib/supabase/profile';

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

export function RoulettePage({ onBack }: { onBack: () => void }) {
  const [input, setInput] = useState('');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const rotationRef = useRef(0);
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');

  const { width } = useWindowDimensions();
  const wheelSize = Math.min(width - 80, 280);
  const chipWidth = Math.floor((width - 56) / 3);

  useEffect(() => {
    fetchCoupleBasic().then((couple) => {
      if (!couple) return;
      setMyName(couple.myNickname);
      setPartnerName(couple.partnerNickname ?? '');
    });
  }, []);

  useEffect(() => {
    return () => { rotationAnim.stopAnimation(); };
  }, [rotationAnim]);

  useEffect(() => {
    if (spinning) return;
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View className="flex-1">
      <View className="flex-row items-center gap-3 px-5 py-4">
        <TouchableOpacity
          onPress={onBack}
          className="w-8 h-8 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-base font-semibold text-moa-text">원판 돌리기</Text>
        {myName ? (
          <TouchableOpacity
            onPress={() => { if (!spinning && candidates.length < 8) setCandidates(prev => [...prev, myName]); }}
            disabled={spinning || candidates.length >= 8}
            className="px-3 py-1.5 rounded-full bg-[#E8736A] disabled:opacity-40"
          >
            <Text className="text-xs font-semibold text-white">{myName} 추가</Text>
          </TouchableOpacity>
        ) : null}
        {partnerName ? (
          <TouchableOpacity
            onPress={() => { if (!spinning && candidates.length < 8) setCandidates(prev => [...prev, partnerName]); }}
            disabled={spinning || candidates.length >= 8}
            className="px-3 py-1.5 rounded-full bg-[#E8736A] disabled:opacity-40"
          >
            <Text className="text-xs font-semibold text-white">{partnerName} 추가</Text>
          </TouchableOpacity>
        ) : null}
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
            editable={!spinning && candidates.length < 8}
            className="flex-1 px-4 py-3 rounded-2xl border border-moa-border bg-white text-sm text-moa-text"
          />
          <TouchableOpacity
            onPress={addCandidate}
            disabled={spinning || !input.trim() || candidates.length >= 8}
            className="px-4 py-3 rounded-2xl bg-moa-text items-center justify-center disabled:opacity-40"
          >
            <Text className="text-white text-sm font-semibold">추가</Text>
          </TouchableOpacity>
        </View>

        {candidates.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {candidates.map((item, i) => (
              <View key={i} className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-moa-border" style={{ maxWidth: 140 }}>
                <Text className="shrink text-sm text-moa-text" numberOfLines={1} ellipsizeMode="tail">{item}</Text>
                <TouchableOpacity onPress={() => removeCandidate(i)} disabled={spinning} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
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
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
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
