import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. 서비스 소개',
    body: '모아(MOA)는 커플이 일상과 기념일을 함께 기록하고 공유할 수 있도록 캘린더, 밸런스 게임, 스토리, 알림 등의 기능을 제공하는 모바일 앱입니다.',
  },
  {
    title: '2. 계정 및 커플 연결',
    body: '이용자는 본인 계정으로 서비스를 이용해야 하며, 초대 코드를 통해 상대방과 커플 연결을 만들 수 있습니다. 초대 코드를 공유한 상대방은 커플 공간의 일부 정보를 함께 볼 수 있습니다.',
  },
  {
    title: '3. 서비스 이용',
    body: '이용자는 타인의 개인정보를 침해하거나, 상대방의 동의 없이 민감한 정보를 게시하거나, 서비스를 악용하거나, 서비스 운영을 방해하는 행위를 해서는 안 됩니다.',
  },
  {
    title: '4. 이용자 콘텐츠',
    body: '이용자가 작성한 일정, 답변, 사진, 스토리, 캡션 등의 콘텐츠는 이용자에게 귀속됩니다. 다만 커플 연결 상태에서 작성한 일부 콘텐츠는 상대방에게 공유될 수 있습니다.',
  },
  {
    title: '5. 연결 해제 및 탈퇴',
    body: '이용자는 언제든지 커플 연결을 해제하거나 계정을 탈퇴할 수 있습니다. 탈퇴 시 본인 계정과 프로필 정보는 삭제되며, 커플 공동 데이터는 상대방의 이용 상태 및 서비스 운영 정책에 따라 일정 기간 보관 후 삭제될 수 있습니다.',
  },
  {
    title: '6. 서비스 변경 및 중단',
    body: '운영상 필요에 따라 서비스 내용이 변경되거나 일시 중단될 수 있습니다. 중요한 변경 사항은 앱 또는 별도 공지 수단을 통해 안내합니다.',
  },
  {
    title: '7. 유료 서비스',
    body: '현재 모아는 앱 내 유료 결제 기능을 제공하지 않습니다. 향후 유료 기능이 추가되는 경우 가격, 결제 방식, 환불 조건 등을 별도로 안내합니다.',
  },
  {
    title: '8. 면책',
    body: '천재지변, 통신 장애, 외부 서비스 장애 등 회사의 합리적인 통제 범위를 벗어난 사유로 서비스 이용이 제한될 수 있습니다.',
  },
  {
    title: '9. 문의',
    body: 'team.moa.app@gmail.com',
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
          <Text className="text-xs text-moa-muted mt-1">최종 수정일: 2026년 5월 19일</Text>
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
