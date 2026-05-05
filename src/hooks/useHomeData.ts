import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { getTodayDayNumber } from '@/utils/questionDay';
import { deleteOldCouplePhotos, getLatestPhotoUrl, uploadCouplePhoto } from '@/lib/supabase/photo';
import { useAuthStore } from '@/stores/authStore';

type BalanceGame = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  myPicked: 'a' | 'b' | null;
  partnerPicked: 'a' | 'b' | null;
};

export type HomeData = {
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
    const { data: game, error } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .eq('day_number', 1)
      .maybeSingle();
    if (error) throw error;

    const previewGame: BalanceGame | null = game
      ? { id: game.id, question: game.question, optionA: game.option_a, optionB: game.option_b, myPicked: null, partnerPicked: null }
      : null;

    return { data: null, previewGame };
  }

  const { userId, coupleId, myNickname, partnerNickname } = couple;

  const { data: coupleData, error: coupleError } = await supabase
    .from('couples')
    .select('anniversary, question_refresh_minutes, created_at')
    .eq('id', coupleId)
    .maybeSingle();
  if (coupleError) throw coupleError;

  let dDay: number | null = null;
  if (coupleData?.anniversary) {
    const a = new Date(coupleData.anniversary);
    const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    dDay = diff >= 0 ? diff + 1 : null;
  }

  let balanceGame: BalanceGame | null = null;

  if (coupleData?.created_at) {
    const refreshMinutes = coupleData.question_refresh_minutes ?? 0;
    const todayDayNumber = getTodayDayNumber(coupleData.created_at, refreshMinutes);

    const { data: game, error: gameError } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .eq('day_number', todayDayNumber)
      .maybeSingle();
    if (gameError) throw gameError;

    if (game) {
      const [{ data: myAnswer, error: myErr }, { data: partnerAnswer, error: partnerErr }] = await Promise.all([
        supabase
          .from('game_answers')
          .select('selected_option')
          .eq('game_id', game.id)
          .eq('couple_id', coupleId)
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('game_answers')
          .select('selected_option')
          .eq('game_id', game.id)
          .eq('couple_id', coupleId)
          .neq('user_id', userId)
          .maybeSingle(),
      ]);
      if (myErr) throw myErr;
      if (partnerErr) throw partnerErr;

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
  const { session } = useAuthStore();

  const { data: result, isLoading } = useQuery({
    queryKey: ['home-data'],
    queryFn: fetchHomeData,
    enabled: !!session,
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async (option: 'a' | 'b') => {
      const cached = queryClient.getQueryData<HomeQueryResult>(['home-data']);
      const balanceGame = cached?.data?.balanceGame;
      const coupleId = cached?.data?.coupleId;
      if (!balanceGame || !coupleId) throw new Error('no data');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('no user');

      const { error } = await supabase.from('game_answers').upsert({
        game_id: balanceGame.id,
        couple_id: coupleId,
        user_id: user.id,
        selected_option: option,
      });
      if (error) throw error;

      return option;
    },
    onMutate: async (option) => {
      await queryClient.cancelQueries({ queryKey: ['home-data'] });
      const prev = queryClient.getQueryData<HomeQueryResult>(['home-data']);
      queryClient.setQueryData<HomeQueryResult>(['home-data'], (old) => {
        if (!old?.data?.balanceGame) return old;
        return { ...old, data: { ...old.data, balanceGame: { ...old.data.balanceGame, myPicked: option } } };
      });
      return { prev };
    },
    onError: (_err, _option, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['home-data'], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['home-data'] });
      queryClient.invalidateQueries({ queryKey: ['question-data'] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (uri: string) => {
      const cached = queryClient.getQueryData<HomeQueryResult>(['home-data']);
      const coupleId = cached?.data?.coupleId;
      if (!coupleId) throw new Error('no coupleId');

      await uploadCouplePhoto(uri, coupleId);
      await deleteOldCouplePhotos(coupleId);
      return await getLatestPhotoUrl(coupleId);
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
    uploading: uploadPhotoMutation.isPending,
    previewGame: result?.previewGame ?? null,
    submitAnswer: (option: 'a' | 'b') => submitAnswerMutation.mutate(option),
    uploadPhoto: (uri: string) => uploadPhotoMutation.mutateAsync(uri),
  };
}
