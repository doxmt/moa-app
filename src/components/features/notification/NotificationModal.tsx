import { useRouter } from 'expo-router';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { AppNotification, NotificationType } from '@/lib/supabase/notifications';
import { useNotificationData } from '@/hooks/useNotificationData';
import { getRouteForNotificationType } from '@/hooks/useNotificationSetup';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const TYPE_EMOJI: Record<NotificationType, string> = {
  new_question: '💬',
  partner_answer: '✅',
  partner_reason: '💭',
  story: '📷',
  anniversary: '🎉',
  birthday: '🎂',
  question_reminder: '⏰',
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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

function NotificationItem({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      className="flex-row items-start gap-3 px-5 py-4 border-b border-moa-border"
      style={{ backgroundColor: item.read ? '#FFFFFF' : '#F8F8FF' }}
    >
      <Text style={{ fontSize: 22, lineHeight: 28 }}>
        {TYPE_EMOJI[item.type] ?? '🔔'}
      </Text>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-moa-text flex-1 mr-2" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-xs text-moa-sub">{formatRelativeTime(item.created_at)}</Text>
        </View>
        <Text className="text-sm text-moa-sub" numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {!item.read && (
        <View className="w-2 h-2 rounded-full bg-red-400 mt-1.5" />
      )}
    </TouchableOpacity>
  );
}

export default function NotificationModal({ visible, onClose }: Props) {
  const { top } = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, isLoading, markAllAsRead, deleteAll, markAsRead } = useNotificationData();

  const handleItemPress = async (item: AppNotification) => {
    if (!item.read) await markAsRead(item.id);
    onClose();
    const route = getRouteForNotificationType(item.type);
    router.push(route as any);
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
  };

  const handleDeleteAll = async () => {
    await deleteAll();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white" style={{ paddingTop: top }}>
        {/* 헤더 */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-moa-border">
          <TouchableOpacity onPress={onClose} className="p-1">
            <X size={22} color="#222222" strokeWidth={1.8} />
          </TouchableOpacity>
          <Text className="text-base font-bold text-moa-text">알림</Text>
          <View className="w-8" />
        </View>

        {/* 액션 버튼 */}
        {notifications.length > 0 && (
          <View className="flex-row justify-end gap-3 px-5 py-2 border-b border-moa-border">
            <TouchableOpacity onPress={handleMarkAll} activeOpacity={0.7}>
              <Text className="text-sm text-moa-sub">전체 읽음</Text>
            </TouchableOpacity>
            <Text className="text-sm text-moa-placeholder">|</Text>
            <TouchableOpacity onPress={handleDeleteAll} activeOpacity={0.7}>
              <Text className="text-sm text-moa-sub">전체 삭제</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 알림 목록 */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-sm text-moa-sub">불러오는 중...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2">
            <Text style={{ fontSize: 40 }}>🔔</Text>
            <Text className="text-sm text-moa-sub">알림이 없어요</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem item={item} onPress={handleItemPress} />
            )}
          />
        )}
      </View>
    </Modal>
  );
}
