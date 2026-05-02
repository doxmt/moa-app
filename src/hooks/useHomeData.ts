import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { fetchCoupleBasic } from '@/lib/supabase/profile';
import { deleteOldCouplePhotos, getLatestPhotoUrl, uploadCouplePhoto } from '@/lib/supabase/photo';

type HomeData = {
  myNickname: string;
  partnerNickname: string | null;
  coupleId: string;
  dDay: number | null;
  latestPhotoUrl: string | null;
  balanceGame: {
    id: string;
    question: string;
    optionA: string;
    optionB: string;
    myPicked: 'a' | 'b' | null;
    partnerPicked: 'a' | 'b' | null;
  } | null;
};

export function useHomeData() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const couple = await fetchCoupleBasic();
      if (!couple) {
        setLoading(false);
        return;
      }

      const { userId, coupleId, myNickname, partnerNickname } = couple;

      const { data: coupleData } = await supabase
        .from('couples')
        .select('anniversary')
        .eq('id', coupleId)
        .single();

      let dDay: number | null = null;
      if (coupleData?.anniversary) {
        const start = new Date(coupleData.anniversary);
        const today = new Date();
        dDay = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      let balanceGame: HomeData['balanceGame'] = null;
      const { data: games } = await supabase
        .from('balance_games')
        .select('id, question, option_a, option_b');

      if (games && games.length > 0) {
        const idx = Math.floor(Date.now() / 86400000) % games.length;
        const game = games[idx];

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

      const latestPhotoUrl = await getLatestPhotoUrl(coupleId);

      setData({
        myNickname,
        partnerNickname,
        coupleId,
        dDay,
        latestPhotoUrl,
        balanceGame,
      });
      setLoading(false);
    }

    load();
  }, []);

  const uploadPhoto = async (uri: string) => {
    if (!data?.coupleId) return;
    setUploading(true);
    try {
      await uploadCouplePhoto(uri, data.coupleId);
      await deleteOldCouplePhotos(data.coupleId);
      const latestPhotoUrl = await getLatestPhotoUrl(data.coupleId);
      setData((prev) => (prev ? { ...prev, latestPhotoUrl } : prev));
    } finally {
      setUploading(false);
    }
  };

  const submitAnswer = async (option: 'a' | 'b') => {
    if (!data?.balanceGame || !data.coupleId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('game_answers').upsert({
      game_id: data.balanceGame.id,
      couple_id: data.coupleId,
      user_id: user.id,
      selected_option: option,
    });

    setData((prev) =>
      prev?.balanceGame ? { ...prev, balanceGame: { ...prev.balanceGame, myPicked: option } } : prev
    );
  };

  return { data, loading, uploading, submitAnswer, uploadPhoto };
}
