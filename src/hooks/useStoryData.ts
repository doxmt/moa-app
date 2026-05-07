import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { FREE_DAILY_LIMIT, Story, addStory, deleteStory, getStories, updateCaption } from '@/lib/supabase/stories';

export { FREE_DAILY_LIMIT } from '@/lib/supabase/stories';

const isPremium = false; // TODO: 결제 시스템 연동 시 교체

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type State = {
  coupleId: string;
  userId: string;
  myNickname: string;
  partnerNickname: string;
  stories: Story[];
  loading: boolean;
  submitting: boolean;
  isConnected: boolean;
};

export function useStoryData() {
  const [state, setState] = useState<State>({
    coupleId: '',
    userId: '',
    myNickname: '나',
    partnerNickname: '상대방',
    stories: [],
    loading: true,
    submitting: false,
    isConnected: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const couple = await fetchCoupleBasic();
      if (cancelled) return;
      if (!couple) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const stories = await getStories(couple.coupleId, isPremium);
      if (cancelled) return;

      setState((prev) => ({
        ...prev,
        coupleId: couple.coupleId,
        userId: couple.userId,
        myNickname: couple.myNickname || '나',
        partnerNickname: couple.partnerNickname ?? '상대방',
        stories,
        loading: false,
        isConnected: true,
      }));
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const uploadStory = useCallback(
    async (uri: string, caption: string | null) => {
      if (!state.coupleId) return;
      setState((prev) => ({ ...prev, submitting: true }));
      try {
        const newStory = await addStory(state.coupleId, uri, caption);
        setState((prev) => ({
          ...prev,
          stories: [newStory, ...prev.stories],
          submitting: false,
        }));
      } catch (e) {
        setState((prev) => ({ ...prev, submitting: false }));
        Alert.alert('업로드 실패', e instanceof Error ? e.message : '스토리를 업로드하지 못했어요.');
      }
    },
    [state.coupleId]
  );

  const editCaption = useCallback(async (storyId: string, caption: string | null) => {
    let prevCaption: string | null = null;
    setState((prev) => {
      prevCaption = prev.stories.find((s) => s.id === storyId)?.caption ?? null;
      return { ...prev, stories: prev.stories.map((s) => (s.id === storyId ? { ...s, caption } : s)) };
    });
    try {
      await updateCaption(storyId, caption);
    } catch (e) {
      setState((prev) => ({
        ...prev,
        stories: prev.stories.map((s) => (s.id === storyId ? { ...s, caption: prevCaption } : s)),
      }));
      Alert.alert('저장 실패', e instanceof Error ? e.message : '캡션을 저장하지 못했어요.');
    }
  }, []);

  const removeStory = useCallback(
    async (storyId: string, storagePath: string) => {
      setState((prev) => ({
        ...prev,
        stories: prev.stories.filter((s) => s.id !== storyId),
      }));
      try {
        await deleteStory(storyId, storagePath);
      } catch (e) {
        const stories = await getStories(state.coupleId);
        setState((prev) => ({ ...prev, stories }));
        Alert.alert('삭제 실패', e instanceof Error ? e.message : '스토리를 삭제하지 못했어요.');
      }
    },
    [state.coupleId]
  );

  const todayUploadCount = state.stories.filter(
    (s) => s.created_by === state.userId && isToday(s.created_at)
  ).length;

  const uploadLimitReached = !isPremium && todayUploadCount >= FREE_DAILY_LIMIT;

  return {
    userId: state.userId,
    myNickname: state.myNickname,
    partnerNickname: state.partnerNickname,
    stories: state.stories,
    loading: state.loading,
    submitting: state.submitting,
    isConnected: state.isConnected,
    isPremium,
    todayUploadCount,
    uploadLimitReached,
    uploadStory,
    editCaption,
    removeStory,
  };
}
