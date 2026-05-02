import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id, couple_nickname, name')
        .eq('user_id', user.id)
        .single();

      if (!profile?.couple_id) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      const { data: partner } = await supabase
        .from('profiles')
        .select('couple_nickname, name')
        .eq('couple_id', profile.couple_id)
        .neq('user_id', user.id)
        .single();

      const stories = await getStories(profile.couple_id);

      setState((prev) => ({
        ...prev,
        coupleId: profile.couple_id,
        userId: user.id,
        myNickname: profile.couple_nickname ?? profile.name ?? '나',
        partnerNickname: partner?.couple_nickname ?? partner?.name ?? '상대방',
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
