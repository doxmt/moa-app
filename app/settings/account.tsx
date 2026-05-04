import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

function Row({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between px-4 py-3.5 bg-white"
    >
      <Text className={`text-sm ${danger ? 'text-red-500' : 'text-moa-text'}`}>{label}</Text>
      {!danger && <ChevronRight size={16} color="#CCCCCC" strokeWidth={2} />}
    </TouchableOpacity>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-moa-bg" style={{ paddingTop: top }}>
      <View className="flex-row items-center gap-2 px-5 py-4 border-b border-moa-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#222222" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-moa-text">내 정보</Text>
      </View>

      <View className="flex-1 px-4">
        <View className="flex-col gap-0 mt-5">
          <View className="rounded-2xl overflow-hidden border border-moa-border">
            <Row label="개인정보처리방침" onPress={() => router.push('/settings/privacy')} />
            <View style={styles.divider} />
            <Row label="이용약관" onPress={() => router.push('/settings/terms')} />
            <View style={styles.divider} />
            <Row label="회원 탈퇴" onPress={() => router.push('/settings/delete-account')} danger />
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F0F0',
  },
});
