import { useEffect, useRef } from 'react';
import { Alert, Animated, FlatList, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { X, MessageCircle, Check, MessageSquare, Camera, Heart, Gift, Clock, Bell, Trash2 } from 'lucide-react-native';

import { AppNotification, NotificationType } from '@/lib/supabase/notifications';
import { useNotificationData } from '@/hooks/useNotificationData';
import { getRouteForNotificationType } from '@/hooks/useNotificationSetup';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type IconConfig = {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  bg: string;
  color: string;
};

const TYPE_ICON: Record<NotificationType, IconConfig> = {
  new_question:      { icon: MessageCircle, bg: '#EEF2FF', color: '#6366F1' },
  partner_answer:    { icon: Check,         bg: '#F0FDF4', color: '#22C55E' },
  partner_reason:    { icon: MessageSquare, bg: '#FAF5FF', color: '#A855F7' },
  story:             { icon: Camera,        bg: '#FFF7ED', color: '#F97316' },
  anniversary:       { icon: Heart,         bg: '#FFF1F2', color: '#F43F5E' },
  birthday:          { icon: Gift,          bg: '#FDF2F8', color: '#EC4899' },
  question_reminder: { icon: Clock,         bg: '#FFFBEB', color: '#F59E0B' },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const DELETE_WIDTH = 72;

function NotificationItem({
  item,
  onPress,
  onDelete,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
  onDelete: (id: string) => void;
}) {
  const iconConfig = TYPE_ICON[item.type] ?? { icon: Bell, bg: '#F3F4F6', color: '#9CA3AF' };
  const IconComponent = iconConfig.icon;
  const translateX = useRef(new Animated.Value(0)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);

  const close = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 6,
      onPanResponderMove: (_, g) => {
        const next = Math.max(-DELETE_WIDTH, Math.min(0, g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const open = g.dx < -DELETE_WIDTH / 2;
        Animated.spring(translateX, {
          toValue: open ? -DELETE_WIDTH : 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
        if (open) {
          if (closeTimer.current) clearTimeout(closeTimer.current);
          closeTimer.current = setTimeout(close, 2000);
        }
      },
    }),
  ).current;

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* 삭제 버튼 (뒤에 배치) */}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: DELETE_WIDTH,
          backgroundColor: '#EF4444',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => { close(); onDelete(item.id); }}
          activeOpacity={0.8}
          style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
        >
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* 아이템 (앞에 배치) */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <TouchableOpacity
          onPress={() => onPress(item)}
          activeOpacity={0.7}
          className="flex-row items-center px-5 py-4"
          style={{ backgroundColor: item.read ? '#FFFFFF' : '#FAFBFF' }}
        >
          {/* 안읽음 인디케이터 */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: item.read ? 'transparent' : '#6366F1',
              borderRadius: 2,
            }}
          />

          {/* 아이콘 */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: iconConfig.bg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <IconComponent size={20} color={iconConfig.color} strokeWidth={2} />
          </View>

          {/* 텍스트 */}
          <View style={{ flex: 1 }}>
            <View className="flex-row items-center justify-between mb-0.5">
              <Text
                className="text-sm text-moa-text flex-1 mr-2"
                style={{ fontWeight: item.read ? '500' : '700' }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text className="text-xs text-moa-placeholder">{formatRelativeTime(item.created_at)}</Text>
            </View>
            <Text className="text-sm text-moa-sub leading-5" numberOfLines={2}>
              {item.body}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function NotificationModal({ visible, onClose }: Props) {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, isLoading, markAllAsRead, deleteAll, deleteOne, markAsRead } = useNotificationData();

  const handleItemPress = (item: AppNotification) => {
    if (!item.read) markAsRead(item.id).catch((e) => console.error('[markAsRead]', e));
    onClose();
    const route = getRouteForNotificationType(item.type);
    router.push(route as Href);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      '전체 삭제',
      '모든 알림을 삭제하시겠어요?\n삭제된 알림은 복구할 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => deleteAll().catch((e) => console.error('[deleteAll]', e)) },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: top }}>

        {/* 헤더 */}
        <View className="flex-row items-center justify-between px-5 pt-5 pb-4">
          <Text className="text-xl font-bold text-moa-text">알림</Text>
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={22} color="#888888" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* 액션 버튼 */}
        {notifications.length > 0 && (
          <View className="flex-row gap-2 px-5 pb-3">
            <TouchableOpacity
              onPress={markAllAsRead}
              activeOpacity={0.7}
              className="flex-1 h-9 items-center justify-center rounded-xl border border-moa-border"
            >
              <Text className="text-xs font-medium text-moa-sub">전체 읽음</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteAll}
              activeOpacity={0.7}
              className="flex-1 h-9 items-center justify-center rounded-xl border border-moa-border"
            >
              <Text className="text-xs font-medium text-moa-sub">전체 삭제</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="h-px bg-moa-border" />

        {/* 알림 목록 */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-moa-sub">불러오는 중...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3">
            <View style={styles.emptyBellWrap}>
              <Bell size={28} color="#D1D5DB" strokeWidth={1.5} />
            </View>
            <View className="items-center gap-1">
              <Text className="text-sm font-medium text-moa-text">알림이 없어요</Text>
              <Text className="text-xs text-moa-sub">새로운 알림이 오면 여기에 표시돼요</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem item={item} onPress={handleItemPress} onDelete={deleteOne} />
            )}
            ItemSeparatorComponent={() => <View className="h-px bg-moa-border mx-5" />}
          />
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  emptyBellWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
