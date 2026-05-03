import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { getQuestionDayIndex } from '@/utils/questionDay';

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
};

export function useQuestionData() {
  const [data, setData] = useState<QuestionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);

    const couple = await fetchCoupleBasic();
    if (!couple) {
      setLoading(false);
      return;
    }

    const { userId, coupleId, myNickname, partnerNickname } = couple;

    const { data: games } = await supabase
      .from('balance_games')
      .select('id, question, option_a, option_b')
      .order('created_at', { ascending: true });

    if (!games || games.length === 0) {
      setData({
        games: [],
        myNickname,
        partnerNickname,
        coupleId,
      });
      setLoading(false);
      return;
    }

    const { data: coupleRefresh } = await supabase
      .from('couples')
      .select('question_refresh_minutes')
      .eq('id', coupleId)
      .single();
    const refreshMinutes = coupleRefresh?.question_refresh_minutes ?? 0;
    const todayIdx = getQuestionDayIndex(refreshMinutes) % games.length;

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

    const gameItems: GameItem[] = games.map((g, i) => {
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
        isToday: i === todayIdx,
      };
    });

    const shownGames = gameItems.slice(0, todayIdx + 1);
    const todayGame = shownGames.find((g) => g.isToday) ?? null;
    const otherGames = shownGames.filter((g) => !g.isToday).reverse();

    setData({
      games: todayGame ? [todayGame, ...otherGames] : otherGames,
      myNickname,
      partnerNickname,
      coupleId,
    });
    setLoading(false);
  }

  const submitAnswer = async (gameId: string, option: 'a' | 'b') => {
    if (!data?.coupleId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('game_answers').upsert({
      game_id: gameId,
      couple_id: data.coupleId,
      user_id: user.id,
      selected_option: option,
    });

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        games: prev.games.map((g) => (g.id === gameId ? { ...g, myPicked: option } : g)),
      };
    });
  };

  const saveReason = async (gameId: string, reason: string) => {
    if (!data?.coupleId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('game_answers')
      .update({ reason: reason.trim() || null })
      .eq('game_id', gameId)
      .eq('user_id', user.id);

    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        games: prev.games.map((g) =>
          g.id === gameId ? { ...g, myReason: reason.trim() || null } : g,
        ),
      };
    });
  };

  return { data, loading, submitAnswer, saveReason };
}
