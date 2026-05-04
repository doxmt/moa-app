import { supabase } from './client';

export type CoupleBasic = {
  userId: string;
  coupleId: string;
  myNickname: string;
  partnerNickname: string | null;
};

export async function fetchCoupleBasic(): Promise<CoupleBasic | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('couple_id, couple_nickname, name')
    .eq('user_id', user.id)
    .single();

  if (!profile?.couple_id) return null;

  const { data: partner } = await supabase
    .from('profiles')
    .select('couple_nickname, name')
    .eq('couple_id', profile.couple_id)
    .neq('user_id', user.id)
    .single();

  if (!partner) return null;

  return {
    userId: user.id,
    coupleId: profile.couple_id,
    myNickname: profile.couple_nickname ?? profile.name ?? '',
    partnerNickname: partner?.couple_nickname ?? partner?.name ?? null,
  };
}
