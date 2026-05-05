import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';
import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { getTodayDayNumber } from '@/utils/questionDay';

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
  isConnected: boolean;
};

async function fetchQuestionData(): Promise<QuestionData> {
  const couple = await fetchCoupleBasic();

  if (!couple) {
    const { data: game } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .eq('day_number', 1)
      .single();

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
        isConnected: false,
      };
    }

    return { games: [], myNickname: '', partnerNickname: null, coupleId: '', isConnected: false };
  }

  const { userId, coupleId, myNickname, partnerNickname } = couple;

  const { data: coupleData } = await supabase
    .from('couples')
    .select('question_refresh_minutes, created_at')
    .eq('id', coupleId)
    .single();

  if (!coupleData?.created_at) {
    return { games: [], myNickname, partnerNickname, coupleId, isConnected: true };
  }

  const refreshMinutes = coupleData.question_refresh_minutes ?? 0;
  const todayDayNumber = getTodayDayNumber(coupleData.created_at, refreshMinutes);

  const { data: games } = await supabase
    .from('balance_games')
    .select('id, question, option_a, option_b, day_number')
    .lte('day_number', todayDayNumber)
    .order('day_number', { ascending: true });

  if (!games || games.length === 0) {
    return { games: [], myNickname, partnerNickname, coupleId, isConnected: true };
  }

  const { data: answers } = await supabase
    .from('game_answers')
    .select('game_id, user_id, selected_option, reason')
    .eq('couple_id', coupleId);

  type AnswerInfo = { option: 'a' | 'b'; reason: string | null };

  const myAnswers = new Map<string, AnswerInfo>(
    (answers ?? [])
      .filter((a) => a.user_id === userId)
      .map((a) => [a.game_id, { option: a.selected_option as 'a' | 'b', reason: a.reason ?? null }]),
  );
  const partnerAnswers = new Map<string, AnswerInfo>(
    (answers ?? [])
      .filter((a) => a.user_id !== userId)
      .map((a) => [a.game_id, { option: a.selected_option as 'a' | 'b', reason: a.reason ?? null }]),
  );

  const gameItems: GameItem[] = games.map((g) => {
    const mine = myAnswers.get(g.id) ?? null;
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
    isConnected: true,
  };
}

export function useQuestionData() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['question-data'],
    queryFn: fetchQuestionData,
    staleTime: 1000 * 60 * 5,
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ gameId, option }: { gameId: string; option: 'a' | 'b' }) => {
      const coupleId = data?.coupleId;
      if (!coupleId) throw new Error('no coupleId');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('no user');

      await supabase.from('game_answers').upsert({
        game_id: gameId,
        couple_id: coupleId,
        user_id: user.id,
        selected_option: option,
      });

      return { gameId, option };
    },
    onSuccess: ({ gameId, option }) => {
      queryClient.setQueryData<QuestionData>(['question-data'], (old) => {
        if (!old) return old;
        return {
          ...old,
          games: old.games.map((g) => (g.id === gameId ? { ...g, myPicked: option } : g)),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['home-data'] });
    },
  });

  const saveReasonMutation = useMutation({
    mutationFn: async ({ gameId, reason }: { gameId: string; reason: string }) => {
      const coupleId = data?.coupleId;
      if (!coupleId) throw new Error('no coupleId');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('no user');

      await supabase
        .from('game_answers')
        .update({ reason: reason.trim() || null })
        .eq('game_id', gameId)
        .eq('user_id', user.id);

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
