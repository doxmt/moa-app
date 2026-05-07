import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useQuestionData } from '@/hooks/useQuestionData';
import LoadingView from '@/components/ui/LoadingView';
import EmptyState from '@/components/ui/EmptyState';
import QuestionCard from '@/components/features/question/QuestionCard';

export default function QuestionScreen() {
  const router = useRouter();
  const { data, loading, isConnected, submitAnswer, saveReason } = useQuestionData();
  const [showPast, setShowPast] = useState(false);

  if (loading) return <LoadingView />;

  if (!data || data.games.length === 0) {
    return <EmptyState message="아직 표시된 질문이 없어요" />;
  }

  const { games, myNickname, partnerNickname } = data;
  const todayGame = games.find((g) => g.isToday) ?? null;
  const pastGames = games.filter((g) => !g.isToday);

  return (
    <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-xl font-bold text-moa-text">오늘의 질문</Text>

        {!isConnected && (
          <View className="bg-moa-bg border border-moa-border rounded-2xl px-4 py-3 gap-2.5 items-center">
            <Text className="text-xs text-moa-muted text-center leading-5">
              연결하면 서로의 선택과 의견을 볼 수 있어요
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/settings/connect' as never)}
              style={styles.connectButton}
            >
              <Text style={styles.connectButtonText}>연결하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {todayGame && (
          <QuestionCard
            game={todayGame}
            myNickname={myNickname}
            partnerNickname={partnerNickname}
            onSubmitAnswer={submitAnswer}
            onSaveReason={saveReason}
            readOnly={!isConnected}
          />
        )}

        {pastGames.length > 0 && (
          <>
            <TouchableOpacity
              onPress={() => setShowPast((v) => !v)}
              style={styles.toggleBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleText}>이전 질문 보기 ({pastGames.length})</Text>
              <Text style={[styles.toggleArrow, showPast && styles.toggleArrowUp]}>›</Text>
            </TouchableOpacity>

            {showPast && (
              <View className="gap-4">
                {pastGames.map((game) => (
                  <QuestionCard
                    key={game.id}
                    game={game}
                    myNickname={myNickname}
                    partnerNickname={partnerNickname}
                    onSubmitAnswer={submitAnswer}
                    onSaveReason={saveReason}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 20, gap: 16, paddingBottom: 96 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#888888' },
  toggleArrow: { fontSize: 18, color: '#888888', transform: [{ rotate: '90deg' }] },
  toggleArrowUp: { transform: [{ rotate: '-90deg' }] },
  connectButton: { backgroundColor: '#222222', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 7 },
  connectButtonText: { fontSize: 12, color: 'white', fontWeight: '600' },
});
