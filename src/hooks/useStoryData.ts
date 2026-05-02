import { useCallback, useEffect, useState } from 'react';

import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { Story, addStory, deleteStory, getStories, updateCaption } from '@/lib/supabase/stories';

type State = {
  coupleId: string;
  userId: string;
  myNickname: string;
  partnerNickname: string;
  stories: Story[];
  loading: boolean;
  submitting: boolean;
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
  });

  useEffect(() => {
    async function init() {
      const couple = await fetchCoupleBasic();
      if (!couple) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const stories = await getStories(couple.coupleId);

      setState((prev) => ({
        ...prev,
        coupleId: couple.coupleId,
        userId: couple.userId,
        myNickname: couple.myNickname || '나',
        partnerNickname: couple.partnerNickname ?? '상대방',
        stories,
        loading: false,
      }));
    }
    init();
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
      } catch {
        setState((prev) => ({ ...prev, submitting: false }));
      }
    },
    [state.coupleId]
  );

  const editCaption = useCallback(async (storyId: string, caption: string | null) => {
    setState((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => (s.id === storyId ? { ...s, caption } : s)),
    }));
    try {
      await updateCaption(storyId, caption);
    } catch {
      // 실패 시 롤백 생략
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
      } catch {
        const stories = await getStories(state.coupleId);
        setState((prev) => ({ ...prev, stories }));
      }
    },
    [state.coupleId]
  );

  return {
    userId: state.userId,
    myNickname: state.myNickname,
    partnerNickname: state.partnerNickname,
    stories: state.stories,
    loading: state.loading,
    submitting: state.submitting,
    uploadStory,
    editCaption,
    removeStory,
  };
}
