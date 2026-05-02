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

import { useQuestionData } from '@/hooks/useQuestionData';
import LoadingView from '@/components/ui/LoadingView';
import EmptyState from '@/components/ui/EmptyState';
import QuestionCard from '@/components/features/question/QuestionCard';

export default function QuestionScreen() {
  const { data, loading, submitAnswer, saveReason } = useQuestionData();
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
        <Text style={styles.title}>밸런스 게임</Text>

        {todayGame && (
          <QuestionCard
            game={todayGame}
            myNickname={myNickname}
            partnerNickname={partnerNickname}
            onSubmitAnswer={submitAnswer}
            onSaveReason={saveReason}
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
  title: { fontSize: 20, fontWeight: '700', color: '#222222' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleText: { fontSize: 14, fontWeight: '500', color: '#888888' },
  toggleArrow: { fontSize: 18, color: '#888888', transform: [{ rotate: '90deg' }] },
  toggleArrowUp: { transform: [{ rotate: '-90deg' }] },
});
