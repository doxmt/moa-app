import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { getTodayDayNumber } from '@/utils/questionDay';
import { deleteOldCouplePhotos, getLatestPhotoUrl, uploadCouplePhoto } from '@/lib/supabase/photo';

type BalanceGame = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  myPicked: 'a' | 'b' | null;
  partnerPicked: 'a' | 'b' | null;
};

type HomeData = {
  myNickname: string;
  partnerNickname: string | null;
  coupleId: string;
  dDay: number | null;
  latestPhotoUrl: string | null;
  balanceGame: BalanceGame | null;
};

type HomeQueryResult = {
  data: HomeData | null;
  previewGame: BalanceGame | null;
};

async function fetchHomeData(): Promise<HomeQueryResult> {
  const couple = await fetchCoupleBasic();

  if (!couple) {
    const { data: games } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .eq('day_number', 1)
      .single();

    const previewGame: BalanceGame | null = games
      ? { id: games.id, question: games.question, optionA: games.option_a, optionB: games.option_b, myPicked: null, partnerPicked: null }
      : null;

    return { data: null, previewGame };
  }

  const { userId, coupleId, myNickname, partnerNickname } = couple;

  const { data: coupleData } = await supabase
    .from('couples')
    .select('anniversary, question_refresh_minutes, created_at')
    .eq('id', coupleId)
    .single();

  let dDay: number | null = null;
  if (coupleData?.anniversary) {
    const start = new Date(coupleData.anniversary);
    const today = new Date();
    dDay = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  let balanceGame: BalanceGame | null = null;

  if (coupleData?.created_at) {
    const refreshMinutes = coupleData.question_refresh_minutes ?? 0;
    const todayDayNumber = getTodayDayNumber(coupleData.created_at, refreshMinutes);

    const { data: game } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .eq('day_number', todayDayNumber)
      .single();

    if (game) {
      const [{ data: myAnswer }, { data: partnerAnswer }] = await Promise.all([
        supabase
          .from('game_answers')
          .select('selected_option')
          .eq('game_id', game.id)
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .single(),
        supabase
          .from('game_answers')
          .select('selected_option')
          .eq('game_id', game.id)
          .eq('couple_id', coupleId)
          .neq('user_id', userId)
          .single(),
      ]);

      balanceGame = {
        id: game.id,
        question: game.question,
        optionA: game.option_a,
        optionB: game.option_b,
        myPicked: (myAnswer?.selected_option as 'a' | 'b') ?? null,
        partnerPicked: (partnerAnswer?.selected_option as 'a' | 'b') ?? null,
      };
    }
  }

  const latestPhotoUrl = await getLatestPhotoUrl(coupleId);

  return {
    data: { myNickname, partnerNickname, coupleId, dDay, latestPhotoUrl, balanceGame },
    previewGame: null,
  };
}

export function useHomeData() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ['home-data'],
    queryFn: fetchHomeData,
    staleTime: 1000 * 60 * 5,
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (option: 'a' | 'b') => {
      const balanceGame = result?.data?.balanceGame;
      const coupleId = result?.data?.coupleId;
      if (!balanceGame || !coupleId) throw new Error('no data');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('no user');

      await supabase.from('game_answers').upsert({
        game_id: balanceGame.id,
        couple_id: coupleId,
        user_id: user.id,
        selected_option: option,
      });

      return option;
    },
    onSuccess: (option) => {
      queryClient.setQueryData<HomeQueryResult>(['home-data'], (old) => {
        if (!old?.data?.balanceGame) return old;
        return {
          ...old,
          data: { ...old.data, balanceGame: { ...old.data.balanceGame, myPicked: option } },
        };
      });
      queryClient.invalidateQueries({ queryKey: ['question-data'] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (uri: string) => {
      const coupleId = result?.data?.coupleId;
      if (!coupleId) throw new Error('no coupleId');
      setUploading(true);
      try {
        await uploadCouplePhoto(uri, coupleId);
        await deleteOldCouplePhotos(coupleId);
        return await getLatestPhotoUrl(coupleId);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (latestPhotoUrl) => {
      queryClient.setQueryData<HomeQueryResult>(['home-data'], (old) => {
        if (!old?.data) return old;
        return { ...old, data: { ...old.data, latestPhotoUrl } };
      });
    },
  });

  return {
    data: result?.data ?? null,
    loading: isLoading,
    uploading,
    previewGame: result?.previewGame ?? null,
    submitAnswer: (option: 'a' | 'b') => submitAnswerMutation.mutate(option),
    uploadPhoto: (uri: string) => uploadPhotoMutation.mutateAsync(uri),
  };
}
