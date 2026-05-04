import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { supabase } from '@/lib/supabase/client';

export default function ConnectScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inputCode, setInputCode] = useState('');

  useEffect(() => {
    load();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { data: couple, error } = await supabase
      .from('couples')
      .insert({})
      .select('id, invite_code')
      .single();

    if (error || !couple) {
      Alert.alert('오류', '코드 생성에 실패했어요. 다시 시도해주세요.');
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
    if (!inputCode.trim()) return;
    setJoining(true);

    const { data: couple, error } = await supabase
      .from('couples')
      .select('id')
      .eq('invite_code', inputCode.trim().toUpperCase())
      .single();

    if (error || !couple) {
      Alert.alert('오류', '유효하지 않은 초대 코드예요.');
      setJoining(false);
      return;
    }

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', couple.id);

    if ((count ?? 0) >= 2) {
      Alert.alert('오류', '이미 연결된 커플이에요.');
      setJoining(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setJoining(false); return; }

    await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('user_id', user.id);

    setJoining(false);
    router.replace('/(tabs)/home');
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    await Share.share({
      message: `모아(MOA)에서 함께 기록을 시작해요 💌\n초대 코드: ${inviteCode}`,
    });
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
          <Text className="text-sm text-moa-sub">연인에게 QR 또는 코드를 전달해주세요</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#AAAAAA" />
        ) : inviteCode ? (
          <View className="gap-4">
            <View className="items-center gap-5 py-8 bg-white rounded-2xl border border-moa-border">
              <QRCode value={inviteCode} size={160} backgroundColor="#FFFFFF" color="#222222" />
              <View className="flex-row items-center gap-3 px-6 w-full">
                <View className="flex-1 h-px bg-moa-border" />
                <Text className="text-xs text-moa-placeholder">또는</Text>
                <View className="flex-1 h-px bg-moa-border" />
              </View>
              <Text className="text-2xl font-bold text-moa-text" style={{ letterSpacing: 6 }}>
                {inviteCode}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.7}
              className="flex-row items-center justify-center gap-2 h-12 w-full rounded-xl border border-[#E5E5E5]"
            >
              <Share2 size={16} color="#222222" strokeWidth={2} />
              <Text className="text-sm text-moa-text">공유하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-6">
            {/* 새 코드 생성 */}
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

            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px bg-moa-border" />
              <Text className="text-xs text-moa-placeholder">또는</Text>
              <View className="flex-1 h-px bg-moa-border" />
            </View>

            {/* 코드 입력으로 합류 */}
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
