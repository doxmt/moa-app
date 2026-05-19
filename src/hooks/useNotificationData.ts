import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AppNotification,
  deleteAllNotifications,
  deleteOneNotification,
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
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => console.error('[deleteAll error]', error),
  });

  const deleteOneMutation = useMutation({
    mutationFn: deleteOneNotification,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications']);
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old = []) =>
        old.filter((n) => n.id !== id),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markReadMutation = useMutation({
    mutationFn: markOneAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<AppNotification[]>(['notifications']);
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old = []) =>
        old.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead: () => markAllReadMutation.mutateAsync(),
    deleteAll: () => deleteAllMutation.mutateAsync(),
    deleteOne: (id: string) => deleteOneMutation.mutateAsync(id),
    markAsRead: (id: string) => markReadMutation.mutateAsync(id),
  };
}
