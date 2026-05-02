import { useCallback } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useHomeData } from '@/hooks/useHomeData';
import LoadingView from '@/components/ui/LoadingView';
import PolaroidCard from '@/components/features/home/PolaroidCard';
import BalanceGameCard from '@/components/features/home/BalanceGameCard';
import { Text, View } from 'react-native';

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
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <LoadingView color="#888888" message="불러오는 중..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
      <View className="flex-1 px-5 py-4">
        {/* 커플 섹션 */}
        <View className="flex-1 items-center">
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

          <PolaroidCard
            photoUrl={data?.latestPhotoUrl}
            uploading={uploading}
            onPress={handlePhotoPress}
          />
        </View>

        {/* 밸런스게임 카드 */}
        <View className="mt-4">
          <BalanceGameCard
            game={data?.balanceGame ?? null}
            partnerNickname={data?.partnerNickname}
            onSubmitAnswer={submitAnswer}
            onNavigateToQuestion={() => router.push('/(tabs)/question')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
