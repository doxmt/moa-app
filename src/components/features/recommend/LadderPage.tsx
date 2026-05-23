import { useState, useRef, useEffect } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import Svg, { Path, Text as SvgText, G, Rect, Circle } from 'react-native-svg';
import { generateLadder, LADDER_ROWS } from './constants';
import { fetchCoupleBasic } from '@/lib/supabase/profile';

const ANIM_INTERVAL = 150;
const ACCENT = '#E8736A';

export function LadderPage({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<'players' | 'results' | 'ladder'>('players');
  const [players, setPlayers] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [bridges, setBridges] = useState<{ row: number; col: number }[]>([]);
  const [map, setMap] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [animPath, setAnimPath] = useState<{ x: number; y: number }[]>([]);
  const [animDone, setAnimDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [myName, setMyName] = useState('');
  const [partnerName, setPartnerName] = useState('');

  const { width } = useWindowDimensions();
  const MAX = 6;

  useEffect(() => {
    fetchCoupleBasic().then((couple) => {
      if (!couple) return;
      setMyName(couple.myNickname);
      setPartnerName(couple.partnerNickname ?? '');
    });
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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
    setSelectedPlayer(null);
    setAnimPath([]);
    setAnimDone(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('ladder');
  };

  const resetGame = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedPlayer(null);
    setAnimPath([]);
    setAnimDone(false);
    setPhase('players');
    setPlayers([]);
    setResults([]);
    setInput('');
  };

  const handleBack = () => {
    if (phase === 'players') onBack();
    else if (phase === 'results') { setPhase('players'); setInput(''); }
    else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onBack();
    }
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

  const handlePlayerTap = (playerIndex: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAnimDone(false);
    setSelectedPlayer(playerIndex);

    // 경로 계산
    let pos = playerIndex;
    const pts: { x: number; y: number }[] = [{ x: xOf(playerIndex), y: TOP }];
    for (let row = 0; row < LADDER_ROWS; row++) {
      const y = yOfRow(row);
      pts.push({ x: xOf(pos), y });
      if (bridges.some((b) => b.row === row && b.col === pos)) {
        pos++;
        pts.push({ x: xOf(pos), y });
      } else if (bridges.some((b) => b.row === row && b.col === pos - 1)) {
        pos--;
        pts.push({ x: xOf(pos), y });
      }
    }
    pts.push({ x: xOf(pos), y: BOTTOM });

    // 순차적으로 경로 공개
    setAnimPath([pts[0]]);
    let step = 1;
    intervalRef.current = setInterval(() => {
      if (step >= pts.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setAnimDone(true);
        return;
      }
      setAnimPath(pts.slice(0, step + 1));
      step++;
    }, ANIM_INTERVAL);
  };

  const animPathD =
    animPath.length > 1
      ? animPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';
  const head = animPath.length > 0 ? animPath[animPath.length - 1] : null;
  const destResult = selectedPlayer !== null && animDone ? map[selectedPlayer] : -1;

  const hintText =
    phase === 'ladder'
      ? selectedPlayer === null
        ? '이름을 눌러 사다리를 타보세요'
        : animDone
          ? `${players[selectedPlayer]} → ${results[map[selectedPlayer]]}`
          : '사다리 타는 중...'
      : '';

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
        {phase === 'players' && myName ? (
          <TouchableOpacity
            onPress={() => { if (players.length < MAX) setPlayers(prev => [...prev, myName]); }}
            disabled={players.length >= MAX}
            className="px-3 py-1.5 rounded-full bg-[#E8736A] disabled:opacity-40"
          >
            <Text className="text-xs font-semibold text-white">{myName} 추가</Text>
          </TouchableOpacity>
        ) : null}
        {phase === 'players' && partnerName ? (
          <TouchableOpacity
            onPress={() => { if (players.length < MAX) setPlayers(prev => [...prev, partnerName]); }}
            disabled={players.length >= MAX}
            className="px-3 py-1.5 rounded-full bg-[#E8736A] disabled:opacity-40"
          >
            <Text className="text-xs font-semibold text-white">{partnerName} 추가</Text>
          </TouchableOpacity>
        ) : null}
        {phase === 'results' && myName ? (
          <TouchableOpacity
            onPress={() => { if (results.length < players.length) setResults(prev => [...prev, myName]); }}
            disabled={results.length >= players.length}
            className="px-3 py-1.5 rounded-full bg-[#E8736A] disabled:opacity-40"
          >
            <Text className="text-xs font-semibold text-white">{myName} 추가</Text>
          </TouchableOpacity>
        ) : null}
        {phase === 'results' && partnerName ? (
          <TouchableOpacity
            onPress={() => { if (results.length < players.length) setResults(prev => [...prev, partnerName]); }}
            disabled={results.length >= players.length}
            className="px-3 py-1.5 rounded-full bg-[#E8736A] disabled:opacity-40"
          >
            <Text className="text-xs font-semibold text-white">{partnerName} 추가</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          onPress={resetGame}
          className="px-3 py-1.5 rounded-full bg-moa-text"
        >
          <Text className="text-xs font-semibold text-white">초기화</Text>
        </TouchableOpacity>
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
                  <Text className="shrink text-sm text-moa-text" numberOfLines={1} ellipsizeMode="tail">{p}</Text>
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
                  <Text className="shrink text-sm text-moa-text" numberOfLines={1} ellipsizeMode="tail">{r}</Text>
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
        <View className="flex-1 px-5 pb-5 gap-3">
          {selectedPlayer === null && (
            <Text className="text-sm text-moa-text text-center font-medium">이름을 클릭해서 결과를 확인해보세요</Text>
          )}
          <View className="flex-1 rounded-3xl border border-moa-border bg-white items-center justify-center py-4">
            <Svg width={svgW} height={svgH}>
              {/* 세로선 */}
              {players.map((_, i) => (
                <Path key={`vl-${i}`} d={`M ${xOf(i)} ${TOP} L ${xOf(i)} ${BOTTOM}`} stroke="#E0E0E0" strokeWidth={2} />
              ))}

              {/* 가로 bridge */}
              {bridges.map((b, i) => (
                <Path
                  key={`br-${i}`}
                  d={`M ${xOf(b.col)} ${yOfRow(b.row)} L ${xOf(b.col + 1)} ${yOfRow(b.row)}`}
                  stroke="#CCCCCC"
                  strokeWidth={2}
                />
              ))}

              {/* 애니메이션 경로 */}
              {animPathD ? (
                <Path
                  d={animPathD}
                  stroke={ACCENT}
                  strokeWidth={3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {/* 경로 선두 원 */}
              {head && (
                <Circle cx={head.x} cy={head.y} r={5} fill={ACCENT} />
              )}

              {/* 결과 텍스트 */}
              {results.map((r, i) => (
                <SvgText
                  key={`rn-${i}`}
                  x={xOf(i)}
                  y={svgH - 8}
                  fontSize={11}
                  textAnchor="middle"
                  fill={destResult === i ? ACCENT : '#888888'}
                  fontWeight={destResult === i ? '700' : '400'}
                >
                  {r.length > 5 ? r.slice(0, 4) + '…' : r}
                </SvgText>
              ))}

              {/* 참가자 이름 (터치 레이어 — 마지막에 렌더) */}
              {players.map((p, i) => (
                <G key={`player-${i}`} onPress={() => handlePlayerTap(i)}>
                  <Rect x={xOf(i) - 22} y={0} width={44} height={TOP} fill="transparent" />
                  <SvgText
                    x={xOf(i)}
                    y={22}
                    fontSize={11}
                    textAnchor="middle"
                    fill={selectedPlayer === i ? ACCENT : '#222222'}
                    fontWeight="600"
                  >
                    {p.length > 5 ? p.slice(0, 4) + '…' : p}
                  </SvgText>
                </G>
              ))}
            </Svg>
          </View>


          <TouchableOpacity
            onPress={() => setShowResults(true)}
            className="w-full py-4 rounded-2xl bg-moa-text items-center"
          >
            <Text className="text-white text-sm font-semibold">전체 결과 확인</Text>
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
    </TouchableWithoutFeedback>
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
