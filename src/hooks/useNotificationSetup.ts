import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { markOneAsRead, savePushToken } from '@/lib/supabase/notifications';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
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
    const { status } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
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

  // Expo Go에서는 getExpoPushTokenAsync가 실패함 — 조용히 건너뜀
  let expoPushToken: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    expoPushToken = result.data;
  } catch {
    return;
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await savePushToken(expoPushToken, platform);
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
  today.setHours(0, 0, 0, 0);

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

    if (notifDate > new Date()) {
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
  today.setHours(0, 0, 0, 0);

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

    if (notifDate > new Date()) {
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
  const queryClient = useQueryClient();
  const routerRef = useRef(router);
  routerRef.current = router;
  const handledIds = useRef(new Set<string>());

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        await registerPushToken();
        if (cancelled) return;
        await scheduleLocalNotifications();
      } catch (e) {
        if (!cancelled) console.error('[push] setup failed', e);
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleResponse(response: Notifications.NotificationResponse) {
      const id = response.notification.request.identifier;
      if (handledIds.current.has(id)) return;
      handledIds.current.add(id);

      const data = response.notification.request.content.data as { type?: string; notificationId?: string };
      if (data?.notificationId) {
        markOneAsRead(data.notificationId).catch(() => {});
      }
      const route = getRouteForNotificationType(data?.type ?? '');
      routerRef.current.push(route as Href);
    }

    // 콜드 스타트: 앱이 종료된 상태에서 푸시 탭으로 실행된 경우 처리
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => {
      receivedSub.remove();
      sub.remove();
    };
  }, []);
}
