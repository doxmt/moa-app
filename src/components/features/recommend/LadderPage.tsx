import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Modal,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { generateLadder, LADDER_ROWS } from './constants';

export function LadderPage({ onBack }: { onBack: () => void }) {
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
});
