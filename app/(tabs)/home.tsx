import { useCallback } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageIcon } from 'lucide-react-native';

import { useHomeData } from '@/hooks/useHomeData';

export default function HomeScreen() {
  const { data, loading, uploading, submitAnswer, uploadPhoto } = useHomeData();
  const router = useRouter();

  const handlePhotoPress = useCallback(async () => {
    if (uploading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await uploadPhoto(result.assets[0].uri);
      } catch (e) {
        Alert.alert('업로드 오류', String(e));
      }
    }
  }, [uploading, uploadPhoto]);

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#888888" />
        <Text className="text-sm text-[#CCCCCC] mt-2">불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  const game = data?.balanceGame;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
      <View className="flex-1 px-5 py-4">
        {/* 커플 섹션 */}
        <View style={styles.coupleSection} className="items-center">
          <Text className="text-base font-semibold text-[#222222] tracking-wide">
            {data?.myNickname ?? '나'}
            <Text className="text-red-400"> ♥ </Text>
            {data?.partnerNickname != null ? (
              <Text>{data.partnerNickname}</Text>
            ) : (
              <Text
                className="text-[#CCCCCC] underline font-semibold"
                onPress={() => router.push('/settings/connect' as never)}
              >
                연결하기
              </Text>
            )}
          </Text>

          <View className="mt-1">
            {data?.dDay != null ? (
              <Text className="text-sm text-[#888888]">
                사랑한 지{' '}
                <Text className="font-semibold text-[#222222]">{data.dDay}일</Text>
              </Text>
            ) : (
              <Text
                className="text-sm text-[#AAAAAA] underline"
                onPress={() => router.push('/settings/couple' as never)}
              >
                사귄 날을 설정해보세요
              </Text>
            )}
          </View>

          {/* 폴라로이드 */}
          <View className="flex-1 items-center justify-center w-full mt-3">
            <TouchableOpacity onPress={handlePhotoPress} style={styles.polaroid} activeOpacity={0.9}>
              {data?.latestPhotoUrl ? (
                <Image source={{ uri: data.latestPhotoUrl }} style={styles.polaroidImage} resizeMode="cover" />
              ) : (
                <View className="flex-1 bg-[#F0F0F0] items-center justify-center gap-2">
                  <ImageIcon size={40} color="#CCCCCC" strokeWidth={1.5} />
                  <Text className="text-xs text-[#CCCCCC]">사진을 추가해보세요</Text>
                </View>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="white" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 밸런스게임 카드 */}
        <View style={styles.gameSection} className="mt-4">
          <View style={styles.gameCard}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
                Balance Game
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/question')}>
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
                        onPress={() => submitAnswer(opt)}
                        style={[styles.optionButton, isPicked ? styles.optionPicked : styles.optionDefault]}
                        activeOpacity={0.8}
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
                    {data?.partnerNickname ?? '상대방'}님의 선택 :{' '}
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
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  coupleSection: {
    flex: 1,
  },
  gameSection: {},
  polaroid: {
    backgroundColor: 'white',
    padding: 12,
    paddingBottom: 40,
    transform: [{ rotate: '1deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    aspectRatio: 3 / 4,
    maxHeight: 384,
    width: '75%',
  },
  polaroidImage: {
    flex: 1,
    width: '100%',
  },
  gameCard: {
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
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
