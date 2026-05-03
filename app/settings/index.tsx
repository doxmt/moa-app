import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { formatRefreshMinutes } from '@/utils/questionDay';

type Profile = {
  name: string;
  partnerName: string | null;
};

function Row({
  label,
  value,
  onPress,
  danger,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between px-4 py-3.5 bg-white"
    >
      <Text className={`text-sm ${danger ? 'text-red-500' : 'text-moa-text'}`}>
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        {value && <Text className="text-sm text-moa-muted">{value}</Text>}
        {!danger && <ChevronRight size={16} color="#CCCCCC" strokeWidth={2} />}
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const childArray = React.Children.toArray(children);
  return (
    <View className="flex-col gap-0">
      <Text className="text-xs text-moa-muted px-4 pb-2 pt-5 uppercase tracking-widest">
        {title}
      </Text>
      <View className="rounded-2xl overflow-hidden border border-moa-border">
        {childArray.map((child, index) => (
          <View key={index}>
            {index > 0 && <View style={styles.divider} />}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { signOut } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [refreshMinutes, setRefreshMinutes] = useState(0);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: myProfile } = await supabase
          .from('profiles')
          .select('name, couple_id')
          .eq('user_id', user.id)
          .single();

        if (!myProfile) return;

        let partnerName: string | null = null;
        if (myProfile.couple_id) {
          const [{ data: partner }, { data: couple }] = await Promise.all([
            supabase
              .from('profiles')
              .select('name')
              .eq('couple_id', myProfile.couple_id)
              .neq('user_id', user.id)
              .single(),
            supabase
              .from('couples')
              .select('question_refresh_minutes')
              .eq('id', myProfile.couple_id)
              .single(),
          ]);
          partnerName = partner?.name ?? null;
          setRefreshMinutes(couple?.question_refresh_minutes ?? 0);
        }

        setProfile({ name: myProfile.name, partnerName });
      }
      load();
    }, [])
  );

  return (
    <View className="flex-1 bg-moa-bg" style={{ paddingTop: top }}>
      <View className="flex-row items-center gap-2 px-5 py-4 border-b border-moa-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#222222" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-moa-text">설정</Text>
      </View>
      <View className="flex-1 px-4">
        <Section title="프로필">
          <Row
            label="내 정보 편집"
            value={profile?.name}
            onPress={() => router.push('/settings/profile')}
          />
          <Row
            label="커플 정보"
            value={profile?.partnerName ? `${profile.partnerName}님과 연결됨` : '미연결'}
            onPress={() => router.push('/settings/couple')}
          />
          <Row
            label="캘린더 아바타"
            value="변경하기"
            onPress={() => router.push('/settings/calendar')}
          />
          <Row
            label="연결하기"
            onPress={() => router.push('/settings/connect')}
          />
        </Section>

        <Section title="앱">
          <Row
            label="질문 갱신 시각"
            value={formatRefreshMinutes(refreshMinutes)}
            onPress={() => router.push('/settings/question-hour')}
          />
          <Row label="알림 설정" onPress={() => {}} />
          <Row label="문의하기" onPress={() => {}} />
          <Row label="버전 정보" value="1.0.0" onPress={() => {}} />
        </Section>

        <Section title="계정">
          <Row label="로그아웃" onPress={signOut} danger />
          <Row label="회원 탈퇴" onPress={() => {}} danger />
        </Section>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F0F0',
  },
});
