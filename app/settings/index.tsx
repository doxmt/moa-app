import React, { useCallback, useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useToast } from '@/hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

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
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [refreshMinutes, setRefreshMinutes] = useState(0);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: myProfile } = await supabase
          .from('profiles')
          .select('name, couple_id')
          .eq('user_id', user.id)
          .single();

        if (!myProfile || cancelled) return;

        let partnerName: string | null = null;
        if (myProfile.couple_id) {
          setCoupleId(myProfile.couple_id);
          const [{ data: partner }, { data: couple }] = await Promise.all([
            supabase
              .from('profiles')
              .select('name')
              .eq('couple_id', myProfile.couple_id)
              .neq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('couples')
              .select('question_refresh_minutes, invite_code')
              .eq('id', myProfile.couple_id)
              .single(),
          ]);
          if (cancelled) return;
          partnerName = partner?.name ?? null;
          setRefreshMinutes(couple?.question_refresh_minutes ?? 0);
          setInviteCode(couple?.invite_code ?? null);
        } else {
          setCoupleId(null);
          setInviteCode(null);
        }

        setProfile({ name: myProfile.name, partnerName });
      }

      load();
      return () => { cancelled = true; };
    }, [])
  );

  const handleDisconnect = async () => {
    if (!coupleId) return;
    setDisconnecting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDisconnecting(false); return; }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ couple_id: null })
      .eq('user_id', user.id);

    if (updateErr) {
      setDisconnecting(false);
      showToast('연결 끊기에 실패했어요. 다시 시도해주세요.');
      return;
    }

    // 상대방도 이미 끊었는지 확인
    const { data: stillConnected } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('couple_id', coupleId)
      .maybeSingle();

    if (!stillConnected) {
      // 둘 다 끊김 → 30일 후 만료
      await supabase
        .from('couples')
        .update({ expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', coupleId);
    }

    setDisconnecting(false);
    setShowDisconnectDialog(false);
    queryClient.invalidateQueries({ queryKey: ['home-data'] });
    queryClient.invalidateQueries({ queryKey: ['question-data'] });
    router.replace('/(tabs)/home');
  };

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
          {!profile?.partnerName && (
            <Row
              label="연결하기"
              onPress={() => router.push('/settings/connect')}
            />
          )}
        </Section>

        <Section title="앱">
          <Row
            label="질문 갱신 시각"
            value={formatRefreshMinutes(refreshMinutes)}
            onPress={() => router.push('/settings/question-hour')}
          />
          <Row label="알림 설정" onPress={() => Linking.openSettings()} />
          <Row label="문의하기" onPress={() => Linking.openURL('mailto:team.moa.app@gmail.com')} />
          <Row
            label="버전 정보"
            value={Constants.expoConfig?.version ?? '1.0.0'}
          />
        </Section>

        <Section title="계정">
          <Row label="내 정보" onPress={() => router.push('/settings/account')} />
          {coupleId && (
            <Row label="커플 연결 끊기" onPress={() => setShowDisconnectDialog(true)} danger />
          )}
          <Row label="로그아웃" onPress={signOut} danger />
        </Section>
      </View>

      {/* 연결 끊기 다이얼로그 */}
      <Modal visible={showDisconnectDialog} transparent animationType="fade">
        <View className="flex-1 items-center justify-center" style={styles.overlay}>
          <View className="bg-white rounded-2xl mx-6 p-6 gap-4 w-full">
            <Text className="text-base font-bold text-moa-text text-center">
              커플 연결을 끊을까요?
            </Text>
            <Text className="text-xs text-moa-sub text-center leading-5">
              나중에 재연결하려면 초대 코드가 필요해요.{'\n'}
              코드를 저장해두세요.{'\n\n'}
              <Text style={{ textDecorationLine: 'underline' }}>
                두 분 모두 연결을 끊으면 30일 후{'\n'}
                모든 데이터가 삭제돼요.
              </Text>
            </Text>

            {inviteCode && (
              <View className="bg-moa-bg rounded-xl px-4 py-3 items-center gap-2">
                <Text className="text-xs text-moa-muted">초대 코드</Text>
                <Text className="text-xl font-bold text-moa-text tracking-widest">{inviteCode.toUpperCase()}</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(inviteCode);
                    setCopied(true);
                    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
                    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-1"
                >
                  {copied
                    ? <Check size={12} color="#888888" strokeWidth={2} />
                    : <Copy size={12} color="#888888" strokeWidth={2} />
                  }
                  <Text className="text-xs text-moa-sub">{copied ? '복사됨' : '복사하기'}</Text>
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowDisconnectDialog(false)}
                activeOpacity={0.7}
                className="flex-1 py-3 rounded-xl items-center"
                style={styles.cancelBtn}
              >
                <Text className="text-sm text-moa-sub">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDisconnect}
                disabled={disconnecting}
                activeOpacity={0.8}
                className="flex-1 py-3 rounded-xl items-center bg-red-500"
                style={{ opacity: disconnecting ? 0.5 : 1 }}
              >
                <Text className="text-sm text-white font-medium">
                  {disconnecting ? '처리 중...' : '연결 끊기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#F0F0F0',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});
