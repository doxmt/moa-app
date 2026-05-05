import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, LogOut, Settings } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { fetchNotifications } from '@/lib/supabase/notifications';
import NotificationModal from '@/components/features/notification/NotificationModal';

export default function Header() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { session, signOut } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!session,
    select: (data) => data.filter((n) => !n.read).length,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return (
    <>
      <View style={{ paddingTop: top }} className="border-b border-moa-border bg-moa-bg">
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-row items-center gap-2">
            <Image source={require('../../../../assets/images/icon.png')} style={styles.logo} />
            <Text className="text-base font-bold text-moa-text">모아</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="p-1" onPress={() => setModalVisible(true)}>
              <View>
                <Bell size={24} color="#222222" strokeWidth={1.8} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                  </View>
                )}
              </View>
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

      <NotificationModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 28,
    height: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
