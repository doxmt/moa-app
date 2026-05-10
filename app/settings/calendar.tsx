import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useToast } from '@/hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';

const PRESETS = ['🐻', '🐱', '🐶', '🐰', '🦊', '🐸', '🐼', '🐨', '🦁', '🐯', '🐧', '🐺'];

const EMOJI_RE = /^\p{Emoji_Presentation}/u;

function limitAvatar(text: string): string {
  if (!text) return '';
  return Array.from(text)[0] ?? '';
}

function isEmoji(text: string): boolean {
  return EMOJI_RE.test(text);
}

export default function CalendarAvatarScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { showToast } = useToast();
  const [myAvatar, setMyAvatar] = useState('🐻');
  const [savedAvatar, setSavedAvatar] = useState('🐻');
  const [partnerAvatar, setPartnerAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar, couple_id')
        .eq('user_id', user.id)
        .single();

      if (!profile || cancelled) return;
      const avatar = profile.avatar ?? '🐻';
      setMyAvatar(avatar);
      setSavedAvatar(avatar);

      if (profile.couple_id) {
        const { data: partner } = await supabase
          .from('profiles')
          .select('avatar')
          .eq('couple_id', profile.couple_id)
          .neq('user_id', user.id)
          .maybeSingle();
        if (cancelled) return;
        setPartnerAvatar(partner?.avatar ?? null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!isEmoji(myAvatar)) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('profiles')
      .update({ avatar: myAvatar })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      showToast('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
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
          <Text className="text-sm text-moa-sub mt-1">캘린더 일정에 표시될 아바타를 설정해요</Text>
        </View>

        {/* 프리셋 */}
        <View className="gap-2">
          <Text className="text-xs text-moa-muted">빠른 선택</Text>
          <View className="flex-row flex-wrap gap-2">
            {PRESETS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setMyAvatar(emoji)}
                activeOpacity={0.7}
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: '#F5F5F5',
                  borderWidth: myAvatar === emoji ? 2 : 0,
                  borderColor: '#222222',
                }}
              >
                <Text style={{ fontSize: 22 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-row gap-3 items-center">
          {/* 내 아바타 */}
          <View className="flex-1 items-center gap-3">
            <Text className="text-xs text-moa-muted self-start">내 아바타</Text>
            <TouchableOpacity
              onPress={() => inputRef.current?.focus()}
              activeOpacity={0.7}
              className="w-20 h-20 rounded-2xl bg-[#F5F5F5] items-center justify-center"
            >
              <Text style={{ fontSize: 40 }}>{myAvatar || savedAvatar}</Text>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              value={myAvatar}
              onChangeText={(t) => {
              const v = limitAvatar(t);
              if (!v || isEmoji(v)) setMyAvatar(v);
            }}
              placeholder="이모지 입력"
              placeholderTextColor="#CCCCCC"
              className="w-full h-11 px-4 rounded-xl border border-[#E5E5E5] text-center text-xl"
              style={{ borderColor: '#E5E5E5' }}
            />
          </View>

          <Text className="text-base text-red-400 pb-8">♥</Text>

          {/* 상대방 아바타 */}
          <View className="flex-1 items-center gap-3">
            <Text className="text-xs text-moa-muted self-start">상대방 아바타</Text>
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center"
              style={{ backgroundColor: '#F5F5F5', opacity: 0.5 }}
            >
              {partnerAvatar
                ? <Text style={{ fontSize: 40 }}>{partnerAvatar}</Text>
                : <Text className="text-sm text-moa-placeholder">미연결</Text>
              }
            </View>
            <TextInput
              value={partnerAvatar ?? ''}
              editable={false}
              placeholder="미연결"
              placeholderTextColor="#CCCCCC"
              className="w-full h-11 px-4 rounded-xl border border-[#E5E5E5] text-center text-xl"
              style={{ borderColor: '#E5E5E5', backgroundColor: '#F5F5F5', color: '#888888' }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !isEmoji(myAvatar)}
          activeOpacity={0.8}
          className="h-12 w-full rounded-xl bg-moa-text items-center justify-center"
          style={{ opacity: saving || !isEmoji(myAvatar) ? 0.5 : 1 }}
        >
          <Text className="text-white text-sm font-medium">
            {saving ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
