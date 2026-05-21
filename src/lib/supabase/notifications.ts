import { supabase } from './client';

export type NotificationType =
  | 'new_question'
  | 'partner_answer'
  | 'partner_reason'
  | 'story'
  | 'calendar_event'
  | 'anniversary'
  | 'birthday'
  | 'question_reminder';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  read: boolean;
  created_at: string;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, data, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error) throw error;
}

export async function deleteAllNotifications(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteOneNotification(notificationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function markOneAsRead(notificationId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function savePushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token, platform }, { onConflict: 'user_id,token' });

  if (error) throw error;
}
