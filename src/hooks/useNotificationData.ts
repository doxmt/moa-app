import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteAllNotifications,
  fetchNotifications,
  markAllAsRead,
  markOneAsRead,
} from '@/lib/supabase/notifications';
import { useAuthStore } from '@/stores/authStore';

export function useNotificationData() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!session,
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: markOneAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any[] = []) =>
        old.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead: () => markAllReadMutation.mutateAsync(),
    deleteAll: () => deleteAllMutation.mutateAsync(),
    markAsRead: (id: string) => markReadMutation.mutateAsync(id),
  };
}
