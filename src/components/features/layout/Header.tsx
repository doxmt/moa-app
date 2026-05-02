import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, LogOut, Settings } from 'lucide-react-native';

import { useAuthStore } from '@/stores/authStore';

export default function Header() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { signOut } = useAuthStore();

  return (
    <View style={{ paddingTop: top }} className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
      <View className="flex-row items-center justify-between px-5 py-4">
        <View className="flex-row items-center gap-2">
          <Image source={require('../../../../assets/images/icon.png')} style={styles.logo} />
          <Text className="text-base font-bold text-[#222222]">모아</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <TouchableOpacity className="p-1">
            <Bell size={24} color="#222222" strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity className="p-1" onPress={() => router.push('/settings' as never)}>
            <Settings size={24} color="#222222" strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity className="p-1" onPress={signOut}>
            <LogOut size={24} color="#888888" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 28,
    height: 28,
  },
});
