import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { GameItem, useQuestionData } from '@/hooks/useQuestionData';

export default function QuestionScreen() {
  const { data, loading, submitAnswer, saveReason } = useQuestionData();
  const [editingReason, setEditingReason] = useState<Record<string, string>>({});
  const [showPast, setShowPast] = useState(false);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#CCCCCC" />
      </View>
    );
  }

  if (!data || data.games.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-sm text-moa-placeholder">아직 표시된 질문이 없어요</Text>
      </View>
    );
  }

  const { games, myNickname, partnerNickname } = data;
  const todayGame = games.find((g) => g.isToday) ?? null;
  const pastGames = games.filter((g) => !g.isToday);

  const handleReasonSave = async (gameId: string) => {
    const reason = editingReason[gameId] ?? '';
    await saveReason(gameId, reason);
    setEditingReason((prev) => {
      const next = { ...prev };
      delete next[gameId];
      return next;
    });
  };

  const renderCard = (game: GameItem) => {
    const answered = game.myPicked !== null;
    const editing = editingReason[game.id] !== undefined;
    const reasonValue = editing ? editingReason[game.id] : (game.myReason ?? '');

    return (
      <View key={game.id} style={styles.card}>
        {/* 배지 */}
        <View className="flex-row items-center gap-2">
          {game.isToday ? (
            <View style={styles.badgeToday}>
              <Text style={styles.badgeTodayText}>오늘</Text>
            </View>
          ) : answered ? (
            <View style={styles.badgeDone}>
              <Text style={styles.badgeDoneText}>완료</Text>
            </View>
          ) : (
            <View style={styles.badgePending}>
              <Text style={styles.badgePendingText}>미답변</Text>
            </View>
          )}
        </View>

        {/* 질문 */}
        <Text style={styles.question}>{game.question}</Text>

        {/* 선택지 */}
        <View className="flex-row gap-3">
          {(['a', 'b'] as const).map((opt) => {
            const rawText = (opt === 'a' ? game.optionA : game.optionB).replace(/\s+/g, ' ').trim();
            const label = `${opt.toUpperCase()}. ${rawText}`;
            const isMyPick = game.myPicked === opt;
            const isPartnerPick = game.partnerPicked === opt;

            return (
              <TouchableOpacity
                key={opt}
                onPress={() => submitAnswer(game.id, opt)}
                style={[styles.optionBtn, isMyPick ? styles.optionBtnActive : styles.optionBtnInactive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, isMyPick && styles.optionTextActive]}>
                  {label}
                </Text>
                {isMyPick && (
                  <Text style={styles.optionNicknameActive}>{myNickname}</Text>
                )}
                {isPartnerPick && partnerNickname && (
                  <Text style={isMyPick ? styles.optionNicknameActive : styles.optionNicknameInactive}>
                    {partnerNickname}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 이유 섹션 (내 이유 + 상대방 이유) */}
        {(answered || game.partnerPicked) && (
          <View style={styles.reasonSection}>
            {/* 내 이유 */}
            {answered && (
              <View style={styles.reasonItem}>
                <Text style={styles.nicknameLabel}>{myNickname}</Text>
                {editing ? (
                  <>
                    <TextInput
                      value={reasonValue}
                      onChangeText={(v) => setEditingReason((prev) => ({ ...prev, [game.id]: v }))}
                      placeholder="이유를 적어봐요"
                      placeholderTextColor="#CCCCCC"
                      maxLength={100}
                      multiline
                      numberOfLines={2}
                      style={styles.reasonInput}
                    />
                    <View className="flex-row justify-end gap-2">
                      <TouchableOpacity
                        onPress={() =>
                          setEditingReason((prev) => {
                            const next = { ...prev };
                            delete next[game.id];
                            return next;
                          })
                        }
                        style={styles.cancelBtn}
                      >
                        <Text style={styles.cancelBtnText}>취소</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleReasonSave(game.id)} style={styles.saveBtn}>
                        <Text style={styles.saveBtnText}>저장</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() =>
                      setEditingReason((prev) => ({ ...prev, [game.id]: game.myReason ?? '' }))
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.reasonBox}>
                      {game.myReason ? (
                        <Text style={styles.reasonText}>{game.myReason}</Text>
                      ) : (
                        <Text style={styles.reasonPlaceholder}>이유를 적어주세요.</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 상대방 이유 */}
            {game.partnerPicked && (
              <View style={styles.reasonItem}>
                <Text style={styles.nicknameLabel}>{partnerNickname ?? '상대방'}</Text>
                {game.partnerReason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonText}>{game.partnerReason}</Text>
                  </View>
                ) : (
                  <Text style={styles.partnerNoReason}>   아직 이유를 적지 않았어요</Text>
                )}
              </View>
            )}

            {/* 내가 답했지만 상대 미답변 */}
            {answered && !game.partnerPicked && (
              <Text style={styles.waitingText}>
                {partnerNickname ?? '상대방'}님이 아직 답하지 않았어요
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>밸런스 게임</Text>

        {/* 오늘 질문 */}
        {todayGame && renderCard(todayGame)}

        {/* 이전 질문 토글 */}
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
                {pastGames.map((game) => renderCard(game))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
    paddingBottom: 96,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  badgeToday: {
    backgroundColor: '#222222',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTodayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badgeDone: {
    backgroundColor: '#F0F0F0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeDoneText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888888',
  },
  badgePending: {
    backgroundColor: '#FFF0F0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F87171',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    lineHeight: 22,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionBtnActive: {
    backgroundColor: '#222222',
    borderColor: '#222222',
  },
  optionBtnInactive: {
    borderColor: '#222222',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
    lineHeight: 18,
    textAlign: 'left',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  optionNicknameActive: {
    fontSize: 10,
    marginTop: 4,
    color: '#FFFFFF',
  },
  optionNicknameInactive: {
    fontSize: 10,
    marginTop: 4,
    color: '#222222',
  },
  reasonSection: {
    gap: 12,
  },
  reasonItem: {
    gap: 4,
  },
  nicknameLabel: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#222222',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  saveBtn: {
    backgroundColor: '#222222',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  reasonBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#444444',
  },
  reasonPlaceholder: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  partnerNoReason: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  waitingText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888888',
  },
  toggleArrow: {
    fontSize: 18,
    color: '#888888',
    transform: [{ rotate: '90deg' }],
  },
  toggleArrowUp: {
    transform: [{ rotate: '-90deg' }],
  },
});
