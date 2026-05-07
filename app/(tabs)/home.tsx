import { useCallback } from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useHomeData } from '@/hooks/useHomeData';
import LoadingView from '@/components/ui/LoadingView';
import PolaroidCard from '@/components/features/home/PolaroidCard';
import BalanceGameCard from '@/components/features/home/BalanceGameCard';

export default function HomeScreen() {
  const { data, loading, uploading, isSubmitting, previewGame, submitAnswer, uploadPhoto } = useHomeData();
  const router = useRouter();

  const handlePhotoPress = useCallback(async () => {
    if (uploading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진을 업로드하려면 갤러리 접근 권한이 필요해요.', [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await uploadPhoto(result.assets[0].uri);
      } catch (e) {
        Alert.alert('업로드 오류', e instanceof Error ? e.message : '사진 업로드에 실패했습니다.');
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
          <Text className="text-base font-semibold text-moa-text tracking-wide">
            {data?.myNickname ?? '나'}
            <Text className="text-red-400"> ♥ </Text>
            {data?.partnerNickname != null ? (
              <Text>{data.partnerNickname}</Text>
            ) : (
              <Text
                className="text-moa-placeholder underline font-semibold"
                onPress={() => router.push('/settings/connect' as never)}
              >
                연결하기
              </Text>
            )}
          </Text>

          <View className="mt-1">
            {data?.dDay != null ? (
              <Text className="text-sm text-moa-sub">
                사랑한 지{' '}
                <Text className="font-semibold text-moa-text">{data.dDay}일</Text>
              </Text>
            ) : (
              <Text
                className="text-sm text-moa-muted underline"
                onPress={() => router.push('/settings/couple' as never)}
              >
                사귄 날을 설정해보세요
              </Text>
            )}
          </View>

          <PolaroidCard
            photoUrl={data?.latestPhotoUrl}
            uploading={uploading}
            onPress={!data ? () => router.push('/settings/connect' as never) : handlePhotoPress}
            notConnected={!data}
          />
        </View>

        {/* 밸런스게임 카드 */}
        <View className="mt-4">
          <BalanceGameCard
            game={data?.balanceGame ?? previewGame}
            partnerNickname={data?.partnerNickname}
            onSubmitAnswer={submitAnswer}
            onNavigateToQuestion={() => router.push('/(tabs)/question')}
            readOnly={!data || isSubmitting}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
