import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { GameItem } from '@/hooks/useQuestionData';

interface Props {
  game: GameItem;
  myNickname: string;
  partnerNickname: string | null | undefined;
  onSubmitAnswer: (gameId: string, opt: 'a' | 'b') => Promise<void>;
  onSaveReason: (gameId: string, reason: string) => Promise<void>;
  readOnly?: boolean;
}

export default function QuestionCard({ game, myNickname, partnerNickname, onSubmitAnswer, onSaveReason, readOnly }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const answered = game.myPicked !== null;

  const handleSave = async () => {
    await onSaveReason(game.id, editValue);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditValue(game.myReason ?? '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  return (
    <View style={styles.card}>
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
              onPress={() => !readOnly && onSubmitAnswer(game.id, opt)}
              style={[styles.optionBtn, isMyPick ? styles.optionBtnActive : styles.optionBtnInactive, readOnly && { opacity: 0.5 }]}
              activeOpacity={readOnly ? 1 : 0.7}
            >
              <Text style={[styles.optionText, isMyPick && styles.optionTextActive]}>
                {label}
              </Text>
              {isMyPick && <Text style={styles.optionNicknameActive}>{myNickname}</Text>}
              {isPartnerPick && partnerNickname && (
                <Text style={isMyPick ? styles.optionNicknameActive : styles.optionNicknameInactive}>
                  {partnerNickname}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 이유 섹션 */}
      {(answered || game.partnerPicked) && (
        <View style={styles.reasonSection}>
          {answered && (
            <View style={styles.reasonItem}>
              <Text style={styles.nicknameLabel}>{myNickname}</Text>
              {isEditing ? (
                <>
                  <TextInput
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder="이유를 적어봐요"
                    placeholderTextColor="#CCCCCC"
                    maxLength={100}
                    multiline
                    numberOfLines={2}
                    style={styles.reasonInput}
                  />
                  <View className="flex-row justify-end gap-2">
                    <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                      <Text style={styles.saveBtnText}>저장</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity onPress={handleStartEdit} activeOpacity={0.7}>
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

          {game.partnerPicked && (
            <View style={styles.reasonItem}>
              <Text style={styles.nicknameLabel}>{partnerNickname ?? '상대방'}</Text>
              {game.partnerReason ? (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>{game.partnerReason}</Text>
                </View>
              ) : (
                <Text style={styles.partnerNoReason}>아직 이유를 적지 않았어요</Text>
              )}
            </View>
          )}

          {answered && !game.partnerPicked && (
            <Text style={styles.waitingText}>
              {partnerNickname ?? '상대방'}님이 아직 답하지 않았어요
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  badgeToday: { backgroundColor: '#222222', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTodayText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  badgeDone: { backgroundColor: '#F0F0F0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeDoneText: { fontSize: 10, fontWeight: '600', color: '#888888' },
  badgePending: { backgroundColor: '#FFF0F0', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgePendingText: { fontSize: 10, fontWeight: '600', color: '#F87171' },
  question: { fontSize: 16, fontWeight: '600', color: '#222222', lineHeight: 22 },
  optionBtn: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 2 },
  optionBtnActive: { backgroundColor: '#222222', borderColor: '#222222' },
  optionBtnInactive: { borderColor: '#222222' },
  optionText: { fontSize: 14, fontWeight: '500', color: '#222222', lineHeight: 18, textAlign: 'left' },
  optionTextActive: { color: '#FFFFFF' },
  optionNicknameActive: { fontSize: 10, marginTop: 4, color: '#FFFFFF' },
  optionNicknameInactive: { fontSize: 10, marginTop: 4, color: '#222222' },
  reasonSection: { gap: 12 },
  reasonItem: { gap: 4 },
  nicknameLabel: { fontSize: 12, color: '#AAAAAA' },
  reasonInput: {
    borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#222222',
    minHeight: 60, textAlignVertical: 'top',
  },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { fontSize: 12, color: '#AAAAAA' },
  saveBtn: { backgroundColor: '#222222', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  saveBtnText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  reasonBox: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  reasonText: { fontSize: 14, color: '#444444' },
  reasonPlaceholder: { fontSize: 14, color: '#CCCCCC' },
  partnerNoReason: { fontSize: 14, color: '#CCCCCC' },
  waitingText: { fontSize: 12, color: '#CCCCCC' },
});
