import { View, Text, TouchableOpacity } from 'react-native';

import { useAuthStore } from '@/stores/authStore';

export default function Screen() {
  const { signOut } = useAuthStore();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>home</Text>
      <TouchableOpacity
        onPress={signOut}
        style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#ef4444', borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}
