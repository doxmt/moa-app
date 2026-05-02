import { useEffect, useState } from 'react';
import { ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import { supabase } from '@/lib/supabase/client';

export default function ConnectScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.couple_id) return;

      const { data: couple } = await supabase
        .from('couples')
        .select('invite_code')
        .eq('id', profile.couple_id)
        .single();

      setInviteCode(couple?.invite_code ?? null);
    }
    load();
  }, []);

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

        {inviteCode ? (
          <View className="gap-4">
            <View className="items-center gap-5 py-8 bg-white rounded-2xl border border-moa-border">
              <QRCode value={inviteCode} size={160} backgroundColor="#FFFFFF" color="#222222" />

              <View className="flex-row items-center gap-3 px-6 w-full">
                <View className="flex-1 h-px bg-moa-border" />
                <Text className="text-xs text-moa-placeholder">또는</Text>
                <View className="flex-1 h-px bg-moa-border" />
              </View>

              <View className="items-center gap-2">
                <Text className="text-2xl font-bold text-moa-text" style={{ letterSpacing: 6 }}>
                  {inviteCode}
                </Text>
              </View>
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
          <Text className="text-sm text-moa-placeholder text-center py-8">
            코드를 불러오는 중...
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
