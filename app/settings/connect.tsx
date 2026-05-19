import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useToast } from '@/hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, Copy, Share2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase/client';

export default function ConnectScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { if (!cancelled) setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;
      if (!profile?.couple_id) { setLoading(false); return; }

      const { data: couple } = await supabase
        .from('couples')
        .select('invite_code')
        .eq('id', profile.couple_id)
        .single();

      if (cancelled) return;
      setInviteCode(couple?.invite_code ?? null);
      setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.couple_id) { setLoading(false); return; }

    const { data: couple } = await supabase
      .from('couples')
      .select('invite_code')
      .eq('id', profile.couple_id)
      .single();

    setInviteCode(couple?.invite_code ?? null);
    setLoading(false);
  }

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile?.couple_id) {
      await load();
      setCreating(false);
      return;
    }

    const { data: couple, error: createErr } = await supabase
      .from('couples')
      .insert({})
      .select('id, invite_code')
      .single();

    if (createErr || !couple) {
      showToast('코드 생성에 실패했어요. 다시 시도해주세요.');
      setCreating(false);
      return;
    }

    await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('user_id', user.id);

    setInviteCode(couple.invite_code);
    setCreating(false);
  };

  const handleJoin = async () => {
    const target = inputCode.trim().toLowerCase();
    if (!target) return;
    setJoining(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setJoining(false); return; }

    // 연결할 커플 찾기
    const { data: newCouple, error: coupleErr } = await supabase
      .from('couples')
      .select('id')
      .eq('invite_code', target)
      .single();

    if (coupleErr || !newCouple) {
      setError('유효하지 않은 초대 코드예요');
      setJoining(false);
      return;
    }

    // 기존 커플 id 가져오기
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('couple_id')
      .eq('user_id', user.id)
      .single();

    const oldCoupleId = currentProfile?.couple_id ?? null;

    if (oldCoupleId === newCouple.id) {
      setError('내 코드예요');
      setJoining(false);
      return;
    }

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', newCouple.id);

    if ((count ?? 0) >= 2) {
      setError('이미 연결된 커플이에요');
      setJoining(false);
      return;
    }

    // 새 커플로 연결
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ couple_id: newCouple.id })
      .eq('user_id', user.id);

    if (profileErr) {
      setError('연결 실패. 다시 시도해주세요');
      setJoining(false);
      return;
    }

    // 기존 커플 정리: 아무도 남아있지 않으면 30일 후 만료
    if (oldCoupleId && oldCoupleId !== newCouple.id) {
      const { count: remaining } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('couple_id', oldCoupleId);

      if ((remaining ?? 0) === 0) {
        await supabase
          .from('couples')
          .update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
          .eq('id', oldCoupleId);
      }
    }

    setJoining(false);
    queryClient.invalidateQueries({ queryKey: ['home-data'] });
    queryClient.invalidateQueries({ queryKey: ['question-data'] });
    router.replace('/(tabs)/home');
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode.toUpperCase());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `모아(MOA)에서 함께 기록을 시작해요 💌\n초대 코드: ${inviteCode.toUpperCase()}`,
      });
    } catch {
      // user dismissed share sheet
    }
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: top }}>
      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ gap: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1 self-start"
          activeOpacity={0.7}
        >
          <ChevronLeft size={16} color="#888888" strokeWidth={2} />
          <Text className="text-sm text-moa-sub">설정</Text>
        </TouchableOpacity>

        <View className="gap-1">
          <Text className="text-xl font-bold text-moa-text">연결하기</Text>
          <Text className="text-sm text-moa-sub">연인에게 코드를 전달하거나, 받은 코드를 입력해요</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#AAAAAA" />
        ) : (
          <View className="gap-6">
            {/* 기존 코드가 있는 경우: QR + 공유 */}
            {inviteCode ? (
              <View className="gap-4">
                <View className="items-center py-8 bg-white rounded-2xl border border-moa-border">
                  <Text className="text-2xl font-bold text-moa-text" style={{ letterSpacing: 6 }}>
                    {inviteCode.toUpperCase()}
                  </Text>
                </View>

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleCopy}
                    activeOpacity={0.7}
                    className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl border border-[#E5E5E5]"
                  >
                    {copied
                      ? <Check size={16} color="#222222" strokeWidth={2} />
                      : <Copy size={16} color="#222222" strokeWidth={2} />
                    }
                    <Text className="text-sm text-moa-text">{copied ? '복사됨' : '복사하기'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShare}
                    activeOpacity={0.7}
                    className="flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl border border-[#E5E5E5]"
                  >
                    <Share2 size={16} color="#222222" strokeWidth={2} />
                    <Text className="text-sm text-moa-text">공유하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* 코드 없는 경우: 새 코드 만들기 */
              <View className="gap-3">
                <Text className="text-sm font-medium text-moa-text">새 초대 코드 만들기</Text>
                <Text className="text-xs text-moa-sub leading-5">코드를 만들고 연인에게 공유해요.</Text>
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={creating}
                  activeOpacity={0.8}
                  className="h-12 rounded-xl bg-moa-text items-center justify-center"
                  style={{ opacity: creating ? 0.5 : 1 }}
                >
                  <Text className="text-white text-sm font-medium">
                    {creating ? '생성 중...' : '코드 만들기'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px bg-moa-border" />
              <Text className="text-xs text-moa-placeholder">또는</Text>
              <View className="flex-1 h-px bg-moa-border" />
            </View>

            {/* 항상 표시: 초대 코드 입력 */}
            <View className="gap-3">
              <Text className="text-sm font-medium text-moa-text">초대 코드 입력하기</Text>
              <Text className="text-xs text-moa-sub leading-5">연인에게 받은 코드를 입력해요.</Text>
              <TextInput
                value={inputCode}
                onChangeText={(t) => setInputCode(t.toUpperCase())}
                placeholder="초대 코드 입력"
                placeholderTextColor="#CCCCCC"
                autoCapitalize="characters"
                className="h-12 px-4 rounded-xl border border-[#E5E5E5] text-center text-lg font-bold text-moa-text"
                style={{ letterSpacing: 4 }}
              />
              {error && <Text className="text-xs text-red-500">{error}</Text>}
              <TouchableOpacity
                onPress={handleJoin}
                disabled={joining || !inputCode.trim()}
                activeOpacity={0.8}
                className="h-12 rounded-xl bg-moa-text items-center justify-center"
                style={{ opacity: joining || !inputCode.trim() ? 0.4 : 1 }}
              >
                <Text className="text-white text-sm font-medium">
                  {joining ? '연결 중...' : '연결하기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
