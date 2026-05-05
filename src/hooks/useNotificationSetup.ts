import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { savePushToken } from '@/lib/supabase/notifications';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function getRouteForNotificationType(type: string): string {
  switch (type) {
    case 'new_question':
    case 'partner_answer':
    case 'partner_reason':
    case 'question_reminder':
      return '/(tabs)/question';
    case 'story':
      return '/(tabs)/story';
    case 'anniversary':
    case 'birthday':
      return '/(tabs)/calendar';
    default:
      return '/(tabs)/home';
  }
}

async function registerPushToken() {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await savePushToken(token, platform);
}

async function scheduleDailyQuestionReminder() {
  await Notifications.cancelScheduledNotificationAsync('daily-question-reminder').catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: 'daily-question-reminder',
    content: {
      title: '오늘의 질문',
      body: '아직 오늘의 밸런스 게임에 답하지 않았어요!',
      data: { type: 'question_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

async function scheduleAnniversaryNotifications(createdAt: string) {
  const base = new Date(createdAt);
  const today = new Date();
  const thisYear = today.getFullYear();

  const anniversary = new Date(thisYear, base.getMonth(), base.getDate());
  if (anniversary < today) anniversary.setFullYear(thisYear + 1);

  const configs = [
    {
      id: 'anniversary-d7',
      daysBefore: 7,
      title: '기념일이 일주일 남았어요!',
      body: `${anniversary.getMonth() + 1}월 ${anniversary.getDate()}일이 커플 기념일이에요 🎉`,
    },
    {
      id: 'anniversary-d1',
      daysBefore: 1,
      title: '내일이 기념일이에요!',
      body: '소중한 하루를 함께 준비해보세요 💕',
    },
    {
      id: 'anniversary-d0',
      daysBefore: 0,
      title: '오늘은 기념일이에요!',
      body: '커플 기념일을 축하해요 🎊',
    },
  ];

  for (const config of configs) {
    await Notifications.cancelScheduledNotificationAsync(config.id).catch(() => {});

    const notifDate = new Date(anniversary);
    notifDate.setDate(notifDate.getDate() - config.daysBefore);
    notifDate.setHours(9, 0, 0, 0);

    if (notifDate > today) {
      await Notifications.scheduleNotificationAsync({
        identifier: config.id,
        content: {
          title: config.title,
          body: config.body,
          data: { type: 'anniversary' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notifDate,
        },
      });
    }
  }
}

async function scheduleBirthdayNotifications(birthday: string, partnerName: string) {
  const base = new Date(birthday);
  const today = new Date();
  const thisYear = today.getFullYear();

  const bday = new Date(thisYear, base.getMonth(), base.getDate());
  if (bday < today) bday.setFullYear(thisYear + 1);

  const configs = [
    {
      id: 'birthday-d7',
      daysBefore: 7,
      title: `${partnerName}의 생일이 일주일 남았어요!`,
      body: '미리 선물을 준비해보는 건 어떨까요? 🎁',
    },
    {
      id: 'birthday-d1',
      daysBefore: 1,
      title: `내일은 ${partnerName}의 생일이에요!`,
      body: '축하 준비 다 됐나요? 💝',
    },
    {
      id: 'birthday-d0',
      daysBefore: 0,
      title: `오늘은 ${partnerName}의 생일이에요!`,
      body: '소중한 사람의 특별한 날을 함께해요 🎂',
    },
  ];

  for (const config of configs) {
    await Notifications.cancelScheduledNotificationAsync(config.id).catch(() => {});

    const notifDate = new Date(bday);
    notifDate.setDate(notifDate.getDate() - config.daysBefore);
    notifDate.setHours(9, 0, 0, 0);

    if (notifDate > today) {
      await Notifications.scheduleNotificationAsync({
        identifier: config.id,
        content: {
          title: config.title,
          body: config.body,
          data: { type: 'birthday' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notifDate,
        },
      });
    }
  }
}

async function scheduleLocalNotifications() {
  await scheduleDailyQuestionReminder();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.couple_id) return;

  const { data: coupleData } = await supabase
    .from('couples')
    .select('created_at')
    .eq('id', profile.couple_id)
    .maybeSingle();

  if (coupleData?.created_at) {
    await scheduleAnniversaryNotifications(coupleData.created_at);
  }

  const { data: partnerProfile } = await supabase
    .from('profiles')
    .select('birthday, couple_nickname, name')
    .eq('couple_id', profile.couple_id)
    .neq('user_id', user.id)
    .maybeSingle();

  if (partnerProfile?.birthday) {
    const partnerName = partnerProfile.couple_nickname ?? partnerProfile.name ?? '파트너';
    await scheduleBirthdayNotifications(partnerProfile.birthday, partnerName);
  }
}

export function useNotificationSetup() {
  const { session } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!session) return;
    registerPushToken();
    scheduleLocalNotifications();
  }, [session]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { type?: string };
      const route = getRouteForNotificationType(data?.type ?? '');
      router.push(route as any);
    });
    return () => sub.remove();
  }, []);
}
