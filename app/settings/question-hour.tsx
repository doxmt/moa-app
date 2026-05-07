import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import WheelColumn from '@/components/ui/WheelColumn';
import { supabase } from '@/lib/supabase/client';
import { formatRefreshMinutes } from '@/utils/questionDay';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 6 }, (_, i) => i * 10);

export default function QuestionHourScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;
      if (!profile?.couple_id) return;
      setCoupleId(profile.couple_id);

      const { data: couple } = await supabase
        .from('couples')
        .select('question_refresh_minutes')
        .eq('id', profile.couple_id)
        .single();

      if (cancelled) return;
      const total = couple?.question_refresh_minutes ?? 0;
      setHour(Math.floor(total / 60));
      setMinute(total % 60);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!coupleId) return;
    setSaving(true);

    const { error } = await supabase
      .from('couples')
      .update({ question_refresh_minutes: hour * 60 + minute })
      .eq('id', coupleId);

    setSaving(false);
    if (error) {
      Alert.alert('오류', '저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    router.back();
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: top }}>
      <View className="flex-row items-center gap-2 px-5 py-4 border-b border-moa-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#222222" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-moa-text">질문 갱신 시각</Text>
      </View>

      <View className="px-5 pt-3 pb-2">
        <Text className="text-sm text-moa-sub">설정한 시각 이후로 커플 모두에게 새 질문이 표시돼요</Text>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full rounded-2xl border border-moa-border overflow-hidden bg-moa-bg py-2">
          <View className="flex-row items-center">
            <WheelColumn
              items={HOURS}
              selected={hour}
              onSelect={setHour}
              format={(v) => `${String(v).padStart(2, '0')}시`}
            />
            <WheelColumn
              items={MINUTES}
              selected={minute}
              onSelect={setMinute}
              format={(v) => `${String(v).padStart(2, '0')}분`}
            />
          </View>
        </View>
      </View>

      <View className="px-5 pb-8">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !coupleId}
          activeOpacity={0.8}
          className="h-12 w-full rounded-xl bg-moa-text items-center justify-center"
          style={{ opacity: saving || !coupleId ? 0.5 : 1 }}
        >
          <Text className="text-white text-sm font-medium">
            {saving ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
