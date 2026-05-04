import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. 서비스 소개',
    body: '모아(MOA)는 커플을 위한 일상 공유 앱입니다. 캘린더, 밸런스 게임, 스토리 등의 기능을 제공합니다.',
  },
  {
    title: '2. 이용 자격',
    body: '본 서비스는 커플 단위로 이용하며, 1인 1계정을 원칙으로 합니다.',
  },
  {
    title: '3. 서비스 이용',
    body: '이용자는 타인의 개인정보를 침해하거나 서비스를 악용해서는 안 됩니다. 서비스 운영에 방해가 되는 행위를 금지합니다.',
  },
  {
    title: '4. 데이터 소유권',
    body: '이용자가 작성한 일정, 답변, 스토리 등의 콘텐츠는 이용자에게 귀속됩니다. 탈퇴 시 모든 데이터는 즉시 삭제됩니다.',
  },
  {
    title: '5. 서비스 변경 및 중단',
    body: '운영상 필요에 따라 서비스 내용이 변경되거나 중단될 수 있습니다. 중요한 변경 사항은 앱을 통해 안내합니다.',
  },
  {
    title: '6. 면책',
    body: '천재지변, 서비스 장애 등 불가항력적 사유로 인한 서비스 중단에 대해서는 책임을 지지 않습니다.',
  },
  {
    title: '7. 문의',
    body: 'salutlesamis0602@gmail.com',
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: top }}>
      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ gap: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1 self-start"
          activeOpacity={0.7}
        >
          <ChevronLeft size={16} color="#888888" strokeWidth={2} />
          <Text className="text-sm text-moa-sub">설정</Text>
        </TouchableOpacity>

        <View>
          <Text className="text-xl font-bold text-moa-text">이용약관</Text>
          <Text className="text-xs text-moa-muted mt-1">최종 수정일: 2026년 5월 3일</Text>
        </View>

        <Text className="text-sm text-moa-sub leading-6">
          모아(MOA) 서비스 이용 전 아래 약관을 확인해주세요.
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} className="gap-2">
            <Text className="text-sm font-semibold text-moa-text">{s.title}</Text>
            <Text className="text-sm text-moa-sub leading-6">{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
