import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type BalanceGame = {
  question: string;
  optionA: string;
  optionB: string;
  myPicked: 'a' | 'b' | null;
  partnerPicked: 'a' | 'b' | null;
};

interface Props {
  game: BalanceGame | null;
  partnerNickname: string | null | undefined;
  onSubmitAnswer: (opt: 'a' | 'b') => void;
  onNavigateToQuestion: () => void;
  readOnly?: boolean;
}

export default function BalanceGameCard({ game, partnerNickname, onSubmitAnswer, onNavigateToQuestion, readOnly }: Props) {
  return (
    <View style={styles.card}>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
          Balance Game
        </Text>
        <TouchableOpacity onPress={onNavigateToQuestion}>
          <Text className="text-xs text-[#888888] underline">이유 적으러 가기</Text>
        </TouchableOpacity>
      </View>

      {game ? (
        <>
          <Text className="text-base font-semibold text-[#222222] text-center leading-snug mb-3">
            {game.question}
          </Text>
          <View className="flex-row gap-3">
            {(['a', 'b'] as const).map((opt) => {
              const label = opt === 'a' ? `A. ${game.optionA}` : `B. ${game.optionB}`;
              const isPicked = game.myPicked === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => !readOnly && onSubmitAnswer(opt)}
                  style={[styles.optionButton, isPicked ? styles.optionPicked : styles.optionDefault, readOnly && { opacity: 0.5 }]}
                  activeOpacity={readOnly ? 1 : 0.8}
                >
                  <Text
                    style={isPicked ? styles.optionTextPicked : styles.optionTextDefault}
                    className="text-sm font-medium text-center"
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {game.myPicked && (
            <Text className="text-xs text-[#888888] text-center mt-3">
              {partnerNickname ?? '상대방'}님의 선택 :{' '}
              <Text className="font-semibold text-[#222222]">
                {game.partnerPicked
                  ? `${game.partnerPicked.toUpperCase()}. ${game.partnerPicked === 'a' ? game.optionA : game.optionB}`
                  : '아직 선택 안 함'}
              </Text>
            </Text>
          )}
        </>
      ) : (
        <Text className="text-sm text-[#CCCCCC] text-center py-2">게임을 불러오는 중...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    padding: 20,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionDefault: {
    borderColor: '#222222',
    backgroundColor: 'transparent',
  },
  optionPicked: {
    borderColor: '#222222',
    backgroundColor: '#222222',
  },
  optionTextDefault: {
    color: '#222222',
  },
  optionTextPicked: {
    color: 'white',
  },
});
