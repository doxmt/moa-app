import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useToast } from '@/hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

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

export default function ProfileEditScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<DateValue>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, birthday')
        .eq('user_id', user.id)
        .single();

      if (!profile || cancelled) return;
      setName(profile.name ?? '');
      setBirthday(fromIsoDate(profile.birthday));
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), birthday: toIsoDate(birthday) })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      showToast('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['home-data'] });
    queryClient.invalidateQueries({ queryKey: ['question-data'] });
    router.back();
  };

  const togglePicker = () => {
    if (!birthday) setBirthday({ year: 2000, month: 1, day: 1 });
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

        <Text className="text-xl font-bold text-moa-text">내 정보 편집</Text>

        <View className="gap-4">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-moa-text">이름</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={10}
              className="h-11 px-4 rounded-xl border border-[#E5E5E5] text-sm text-moa-text"
              style={{ borderColor: '#E5E5E5' }}
              placeholderTextColor="#CCCCCC"
            />
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-medium text-moa-text">생일</Text>
            <TouchableOpacity
              onPress={togglePicker}
              activeOpacity={0.7}
              className="h-11 px-4 rounded-xl border justify-center"
              style={{ borderColor: pickerOpen ? '#222222' : '#E5E5E5' }}
            >
              <Text className={birthday ? 'text-sm text-moa-text' : 'text-sm text-moa-placeholder'}>
                {formatDate(birthday) ?? '년 · 월 · 일'}
              </Text>
            </TouchableOpacity>
            {pickerOpen && birthday && (
              <View className="rounded-2xl border border-[#E5E5E5] bg-moa-bg py-2">
                <ScrollDatePicker
                  value={birthday}
                  onChange={setBirthday}
                  minYear={1970}
                  maxYear={today.getFullYear()}
                />
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          activeOpacity={0.8}
          className="h-12 w-full rounded-xl bg-moa-text items-center justify-center"
          style={{ opacity: saving || !name.trim() ? 0.5 : 1 }}
        >
          <Text className="text-white text-sm font-medium">
            {saving ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
