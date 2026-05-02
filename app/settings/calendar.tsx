import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';

const AVATARS = ['🐻', '🐱', '🐶', '🐰', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐧', '🐺'];

export default function CalendarAvatarScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [myAvatar, setMyAvatar] = useState('🐻');
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar, couple_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      setMyAvatar(profile.avatar ?? '🐻');

      if (profile.couple_id) {
        const { data: partner } = await supabase
          .from('profiles')
          .select('avatar')
          .eq('couple_id', profile.couple_id)
          .neq('user_id', user.id)
          .single();
        setPartnerAvatar(partner?.avatar ?? null);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase
      .from('profiles')
      .update({ avatar: myAvatar })
      .eq('user_id', user.id);

    setSaving(false);
    router.back();
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

        <View>
          <Text className="text-xl font-bold text-moa-text">캘린더 아바타</Text>
          <Text className="text-sm text-moa-sub mt-1">캘린더 일정에 표시될 아바타를 선택해요</Text>
        </View>

        <View className="flex-row gap-3 items-start">
          <View className="flex-1 gap-2">
            <Text className="text-xs text-moa-muted">내 아바타</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {AVATARS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setMyAvatar(emoji)}
                  activeOpacity={0.7}
                  className="rounded-xl items-center justify-center"
                  style={{
                    width: '14%',
                    aspectRatio: 1,
                    backgroundColor: myAvatar === emoji ? '#222222' : '#F5F5F5',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="pt-6">
            <Text className="text-base text-red-400">♥</Text>
          </View>

          <View className="flex-1 gap-2">
            <Text className="text-xs text-moa-muted">상대방 아바타</Text>
            {partnerAvatar ? (
              <View className="flex-row flex-wrap gap-1.5">
                {AVATARS.map((emoji) => (
                  <View
                    key={emoji}
                    className="rounded-xl items-center justify-center"
                    style={{
                      width: '14%',
                      aspectRatio: 1,
                      backgroundColor: partnerAvatar === emoji ? '#222222' : '#F5F5F5',
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="h-11 px-4 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] justify-center">
                <Text className="text-sm text-moa-placeholder">미연결</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
          className="h-12 w-full rounded-xl bg-moa-text items-center justify-center"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          <Text className="text-white text-sm font-medium">
            {saving ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
