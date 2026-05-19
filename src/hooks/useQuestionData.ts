import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { getTodayDayNumber } from '@/utils/questionDay';
import { useAuthStore } from '@/stores/authStore';

export type GameItem = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  myPicked: 'a' | 'b' | null;
  myReason: string | null;
  partnerPicked: 'a' | 'b' | null;
  partnerReason: string | null;
  isToday: boolean;
};

type QuestionData = {
  games: GameItem[];
  myNickname: string;
  partnerNickname: string | null;
  coupleId: string;
  userId: string;
  isConnected: boolean;
};

async function fetchQuestionData(): Promise<QuestionData> {
  const couple = await fetchCoupleBasic();

  if (!couple) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: game, error } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .eq('day_number', 1)
      .maybeSingle();
    if (error) throw error;

    if (game) {
      return {
        games: [{
          id: game.id,
          question: game.question,
          optionA: game.option_a,
          optionB: game.option_b,
          myPicked: null,
          myReason: null,
          partnerPicked: null,
          partnerReason: null,
          isToday: true,
        }],
        myNickname: '',
        partnerNickname: null,
        coupleId: '',
        userId: user?.id ?? '',
        isConnected: false,
      };
    }

    return { games: [], myNickname: '', partnerNickname: null, coupleId: '', userId: user?.id ?? '', isConnected: false };
  }

  const { userId, coupleId, myNickname, partnerNickname } = couple;

  const { data: coupleData, error: coupleError } = await supabase
    .from('couples')
    .select('question_refresh_minutes, created_at')
    .eq('id', coupleId)
    .maybeSingle();
  if (coupleError) throw coupleError;

  if (!coupleData?.created_at) {
    return { games: [], myNickname, partnerNickname, coupleId, userId, isConnected: true };
  }

  const refreshMinutes = coupleData.question_refresh_minutes ?? 0;
  const computed = getTodayDayNumber(coupleData.created_at, refreshMinutes);
  const dayKey = `balance_game_max_day_${coupleId}`;
  const stored = await AsyncStorage.getItem(dayKey);
  const storedMax = stored ? parseInt(stored, 10) : 0;
  const todayDayNumber = Math.max(computed, storedMax);
  if (todayDayNumber > storedMax) {
    await AsyncStorage.setItem(dayKey, String(todayDayNumber));
  }

  const { data: games, error: gamesError } = await supabase
    .from('balance_games')
    .select('id, question, option_a, option_b, day_number')
    .lte('day_number', todayDayNumber)
    .order('day_number', { ascending: true });
  if (gamesError) throw gamesError;

  if (!games || games.length === 0) {
    return { games: [], myNickname, partnerNickname, coupleId, userId, isConnected: true };
  }

  const { data: answers, error: answersError } = await supabase
    .from('game_answers')
    .select('game_id, user_id, selected_option, reason')
    .eq('couple_id', coupleId);
  if (answersError) throw answersError;

  type AnswerInfo = { option: 'a' | 'b'; reason: string | null };

  const myAnswers = new Map<string, AnswerInfo>(
    (answers ?? [])
      .filter((a) => a.user_id === userId && (a.selected_option === 'a' || a.selected_option === 'b'))
      .map((a) => [a.game_id, { option: a.selected_option as 'a' | 'b', reason: a.reason ?? null }]),
  );
  const partnerAnswers = new Map<string, AnswerInfo>(
    (answers ?? [])
      .filter((a) => a.user_id !== userId && (a.selected_option === 'a' || a.selected_option === 'b'))
      .map((a) => [a.game_id, { option: a.selected_option as 'a' | 'b', reason: a.reason ?? null }]),
  );

  const gameItems: GameItem[] = games.map((g) => {
    const mine = myAnswers.get(g.id) ?? null;
    // 내가 먼저 답하기 전엔 파트너 답 노출 금지
    const partnerAns = mine ? (partnerAnswers.get(g.id) ?? null) : null;
    return {
      id: g.id,
      question: g.question,
      optionA: g.option_a,
      optionB: g.option_b,
      myPicked: mine?.option ?? null,
      myReason: mine?.reason ?? null,
      partnerPicked: partnerAns?.option ?? null,
      partnerReason: partnerAns?.reason ?? null,
      isToday: g.day_number === todayDayNumber,
    };
  });

  const todayGame = gameItems.find((g) => g.isToday) ?? null;
  const pastGames = gameItems.filter((g) => !g.isToday).reverse();

  return {
    games: todayGame ? [todayGame, ...pastGames] : pastGames,
    myNickname,
    partnerNickname,
    coupleId,
    userId,
    isConnected: true,
  };
}

export function useQuestionData() {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['question-data'],
    queryFn: fetchQuestionData,
    enabled: !!session,
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ gameId, option }: { gameId: string; option: 'a' | 'b' }) => {
      const cached = queryClient.getQueryData<QuestionData>(['question-data']);
      const coupleId = cached?.coupleId;
      const userId = cached?.userId;
      if (!coupleId || !userId) throw new Error('no data');

      const { error } = await supabase.from('game_answers').upsert({
        game_id: gameId,
        couple_id: coupleId,
        user_id: userId,
        selected_option: option,
      });
      if (error) throw error;

      return { gameId, option };
    },
    onMutate: async ({ gameId, option }) => {
      await queryClient.cancelQueries({ queryKey: ['question-data'] });
      const prev = queryClient.getQueryData<QuestionData>(['question-data']);
      const isToday = prev?.games.find((g) => g.id === gameId)?.isToday ?? false;
      queryClient.setQueryData<QuestionData>(['question-data'], (old) => {
        if (!old) return old;
        return { ...old, games: old.games.map((g) => (g.id === gameId ? { ...g, myPicked: option } : g)) };
      });
      return { prev, isToday };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['question-data'], ctx.prev);
    },
    onSettled: (_data, _err, _vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['question-data'] });
      if (ctx?.isToday) queryClient.invalidateQueries({ queryKey: ['home-data'] });
    },
  });

  const saveReasonMutation = useMutation({
    mutationFn: async ({ gameId, reason }: { gameId: string; reason: string }) => {
      const cached = queryClient.getQueryData<QuestionData>(['question-data']);
      const coupleId = cached?.coupleId;
      const userId = cached?.userId;
      if (!coupleId || !userId) throw new Error('no data');

      const { data: updated, error } = await supabase
        .from('game_answers')
        .update({ reason: reason.trim() || null })
        .eq('game_id', gameId)
        .eq('couple_id', coupleId)
        .eq('user_id', userId)
        .select('game_id');
      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error('답변이 없어 이유를 저장할 수 없어요');

      return { gameId, reason };
    },
    onSuccess: ({ gameId, reason }) => {
      queryClient.setQueryData<QuestionData>(['question-data'], (old) => {
        if (!old) return old;
        return {
          ...old,
          games: old.games.map((g) =>
            g.id === gameId ? { ...g, myReason: reason.trim() || null } : g,
          ),
        };
      });
    },
  });

  return {
    data: data ?? null,
    loading: isLoading,
    isConnected: data?.isConnected ?? false,
    submitAnswer: async (gameId: string, option: 'a' | 'b') => {
      await submitAnswerMutation.mutateAsync({ gameId, option });
    },
    saveReason: async (gameId: string, reason: string) => {
      await saveReasonMutation.mutateAsync({ gameId, reason });
    },
  };
}
