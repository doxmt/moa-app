import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';
import ScrollDatePicker from '@/components/ui/ScrollDatePicker';

type DateValue = { year: number; month: number; day: number } | null;

function toIsoDate(d: DateValue) {
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

function fromIsoDate(s: string | null): DateValue {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function formatDate(d: DateValue) {
  if (!d) return null;
  return `${d.year}년 ${d.month}월 ${d.day}일`;
}

export default function CoupleInfoScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [myName, setMyName] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [partnerNickname, setPartnerNickname] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [anniversary, setAnniversary] = useState<DateValue>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, couple_nickname, couple_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;
      setMyName(profile.name ?? '');
      setMyNickname(profile.couple_nickname ?? '');
      setCoupleId(profile.couple_id);

      if (profile.couple_id) {
        const { data: couple } = await supabase
          .from('couples')
          .select('anniversary')
          .eq('id', profile.couple_id)
          .single();
        setAnniversary(fromIsoDate(couple?.anniversary ?? null));

        const { data: partner } = await supabase
          .from('profiles')
          .select('user_id, name, couple_nickname')
          .eq('couple_id', profile.couple_id)
          .neq('user_id', user.id)
          .single();
        setPartnerName(partner?.name ?? null);
        setPartnerNickname(partner?.couple_nickname ?? '');
        setPartnerId(partner?.user_id ?? null);
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
      .update({ couple_nickname: myNickname.trim() || null })
      .eq('user_id', user.id);

    if (coupleId) {
      await supabase
        .from('couples')
        .update({ anniversary: toIsoDate(anniversary) })
        .eq('id', coupleId);
    }

    if (partnerId && coupleId) {
      await supabase.rpc('update_partner_nickname', {
        p_couple_id: coupleId,
        p_partner_id: partnerId,
        p_nickname: partnerNickname.trim() || null,
      });
    }

    setSaving(false);
    router.back();
  };

  const togglePicker = () => {
    if (!anniversary) {
      setAnniversary({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() });
    }
    setPickerOpen((v) => !v);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: top }}
    >
      <ScrollView className="flex-1 px-5 py-6" contentContainerStyle={{ gap: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-1 self-start"
          activeOpacity={0.7}
        >
          <ChevronLeft size={16} color="#888888" strokeWidth={2} />
          <Text className="text-sm text-moa-sub">설정</Text>
        </TouchableOpacity>

        <Text className="text-xl font-bold text-moa-text">커플 정보</Text>

        <View className="gap-5">
          {/* 이름 (읽기 전용) */}
          <View className="flex-row gap-3 items-end">
            <View className="flex-1 gap-1.5">
              <Text className="text-xs text-moa-muted">내 이름</Text>
              <View className="h-11 px-4 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] justify-center">
                {myName
                  ? <Text className="text-sm text-moa-text">{myName}</Text>
                  : <Text className="text-sm text-moa-placeholder">미설정</Text>
                }
              </View>
            </View>
            <View className="pb-2.5">
              <Text className="text-base text-red-400">♥</Text>
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-xs text-moa-muted">상대방 이름</Text>
              <View className="h-11 px-4 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] justify-center">
                {partnerName
                  ? <Text className="text-sm text-moa-text">{partnerName}</Text>
                  : <Text className="text-sm text-moa-placeholder">미연결</Text>
                }
              </View>
            </View>
          </View>

          {/* 별명 */}
          <View className="flex-row gap-3 items-end">
            <View className="flex-1 gap-1.5">
              <Text className="text-xs text-moa-muted">내 별명</Text>
              <TextInput
                value={myNickname}
                onChangeText={setMyNickname}
                placeholder="별명"
                maxLength={10}
                placeholderTextColor="#CCCCCC"
                className="h-11 px-4 rounded-xl border border-[#E5E5E5] text-sm text-moa-text"
                style={{ borderColor: '#E5E5E5' }}
              />
            </View>
            <View className="pb-2.5">
              <Text className="text-base text-red-400">♥</Text>
            </View>
            <View className="flex-1 gap-1.5">
              <Text className="text-xs text-moa-muted">상대방 별명</Text>
              <TextInput
                value={partnerNickname}
                onChangeText={setPartnerNickname}
                placeholder="별명"
                maxLength={10}
                placeholderTextColor="#CCCCCC"
                className="h-11 px-4 rounded-xl border border-[#E5E5E5] text-sm text-moa-text"
                style={{ borderColor: '#E5E5E5' }}
              />
            </View>
          </View>

          {/* 사귄 날 */}
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-moa-text">사귄 날</Text>
            <TouchableOpacity
              onPress={togglePicker}
              activeOpacity={0.7}
              className="h-11 px-4 rounded-xl border justify-center"
              style={{ borderColor: pickerOpen ? '#222222' : '#E5E5E5' }}
            >
              <Text className={anniversary ? 'text-sm text-moa-text' : 'text-sm text-moa-placeholder'}>
                {formatDate(anniversary) ?? '년 · 월 · 일'}
              </Text>
            </TouchableOpacity>
            {pickerOpen && anniversary && (
              <View className="rounded-2xl border border-[#E5E5E5] bg-moa-bg py-2">
                <ScrollDatePicker
                  value={anniversary}
                  onChange={(d) => {
                    const selected = new Date(d.year, d.month - 1, d.day);
                    if (selected <= today) setAnniversary(d);
                  }}
                  minYear={2000}
                  maxYear={today.getFullYear()}
                />
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
    </KeyboardAvoidingView>
  );
}
