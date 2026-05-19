import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: '이메일 주소, 닉네임, 생년월일, 커플 관련 정보(사귄 날, 상대방 닉네임), 캘린더 일정, 밸런스 게임 답변',
  },
  {
    title: '2. 개인정보 수집 및 이용 목적',
    body: '서비스 제공 및 운영, 커플 간 데이터 공유, 서비스 개선',
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    body: '회원 탈퇴 시 즉시 삭제합니다. 단, 커플 연결 데이터는 양측 모두 연결 해제 시 30일 후 삭제됩니다.',
  },
  {
    title: '4. 개인정보의 제3자 제공',
    body: '서비스 운영을 위해 Supabase(인증 및 데이터베이스)를 이용합니다. 그 외 제3자에게 개인정보를 제공하지 않습니다.',
  },
  {
    title: '5. 이용자의 권리',
    body: '이용자는 언제든지 개인정보 조회, 수정, 삭제를 요청할 수 있습니다. 앱 내 회원 탈퇴를 통해 모든 정보를 즉시 삭제할 수 있습니다.',
  },
  {
    title: '6. 문의',
    body: 'salutlesamis0602@gmail.com',
  },
];

export default function PrivacyScreen() {
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
          <Text className="text-xl font-bold text-moa-text">개인정보처리방침</Text>
          <Text className="text-xs text-moa-muted mt-1">최종 수정일: 2026년 5월 3일</Text>
        </View>

        <Text className="text-sm text-moa-sub leading-6">
          모아(MOA)는 이용자의 개인정보를 소중히 여기며, 아래와 같이 처리합니다.
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
