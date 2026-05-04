import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import ScrollDatePicker from '@/components/ui/ScrollDatePicker';

type Step = 'profile' | 'couple';
type CoupleMode = 'create' | 'join' | null;
type DateVal = { year: number; month: number; day: number } | null;

function toIsoDate(d: DateVal) {
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const setProfileComplete = useAuthStore((s) => s.setProfileComplete);

  const [step, setStep] = useState<Step>('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 프로필 스텝
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<DateVal>(null);
  const [showPicker, setShowPicker] = useState(false);

  // 커플 연결 스텝
  const [coupleMode, setCoupleMode] = useState<CoupleMode>(null);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');

  const today = new Date();
  const defaultBirthday = { year: 2000, month: 1, day: 1 };

  const formatDate = (d: DateVal) =>
    d ? `${d.year}년 ${d.month}월 ${d.day}일` : null;

  const handleProfileNext = async () => {
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('로그인이 필요합니다'); setLoading(false); return; }

    const { error: err } = await supabase
      .from('profiles')
      .update({ name: name.trim(), birthday: toIsoDate(birthday) })
      .eq('user_id', user.id);

    if (err) { setError(err.message); setLoading(false); return; }

    setProfileComplete(true);
    setLoading(false);
    setStep('couple');
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: couple, error: err } = await supabase
      .from('couples')
      .insert({})
      .select('id, invite_code')
      .single();

    if (err || !couple) {
      Alert.alert('오류', '코드 생성에 실패했어요. 다시 시도해주세요.');
      setLoading(false);
      return;
    }

    await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('user_id', user.id);

    setMyCode(couple.invite_code);
    setCoupleMode('create');
    setLoading(false);
  };

  const handleJoin = async () => {
    const target = inputCode.trim().toUpperCase();
    if (!target) { setError('초대 코드를 입력해주세요'); return; }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: couple, error: coupleErr } = await supabase
      .from('couples')
      .select('id')
      .eq('invite_code', target)
      .single();

    if (coupleErr || !couple) {
      setError('유효하지 않은 초대 코드예요');
      setLoading(false);
      return;
    }

    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('couple_id', couple.id);

    if ((count ?? 0) >= 2) {
      setError('이미 연결된 커플이에요');
      setLoading(false);
      return;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('user_id', user.id);

    if (profileErr) {
      setError('연결 실패. 다시 시도해주세요');
      setLoading(false);
      return;
    }

    setLoading(false);
    router.replace('/(tabs)/home');
  };

  const handleShare = async () => {
    if (!myCode) return;
    await Share.share({
      message: `모아(MOA)에서 함께 기록을 시작해요 💌\n초대 코드: ${myCode}`,
    });
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ paddingTop: top }}
    >
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 32, paddingBottom: bottom + 32, gap: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 스텝 인디케이터 */}
        <View className="flex-row gap-2">
          <View className="flex-1 h-1 rounded-full bg-moa-text" />
          <View
            className="flex-1 h-1 rounded-full"
            style={{ backgroundColor: step === 'couple' ? '#222222' : '#E5E5E5' }}
          />
        </View>

        {/* ── Step 1: 프로필 ── */}
        {step === 'profile' && (
          <View style={styles.section}>
            <View style={styles.titleGroup}>
              <Text className="text-xl font-bold text-moa-text">프로필을 설정해요</Text>
              <Text className="text-sm text-moa-sub">나중에 언제든 바꿀 수 있어요</Text>
            </View>

            <View style={styles.fieldGroup}>
              {/* 이름 */}
              <View style={styles.field}>
                <Text className="text-sm font-medium text-moa-text">이름 *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="본명을 입력해주세요"
                  placeholderTextColor="#CCCCCC"
                  maxLength={10}
                  className="h-11 px-4 rounded-xl border border-[#E5E5E5] text-sm text-moa-text"
                />
              </View>

              {/* 생일 */}
              <View style={styles.field}>
                <Text className="text-sm font-medium text-moa-text">생일</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!birthday) setBirthday(defaultBirthday);
                    setShowPicker((v) => !v);
                  }}
                  activeOpacity={0.7}
                  className="h-11 px-4 rounded-xl border justify-center"
                  style={{ borderColor: showPicker ? '#222222' : '#E5E5E5' }}
                >
                  <Text
                    className="text-sm"
                    style={{ color: birthday ? '#222222' : '#CCCCCC' }}
                  >
                    {formatDate(birthday) ?? '년 · 월 · 일'}
                  </Text>
                </TouchableOpacity>
                {showPicker && (
                  <View className="rounded-2xl border border-moa-border bg-moa-bg py-2">
                    <ScrollDatePicker
                      value={birthday ?? defaultBirthday}
                      onChange={setBirthday}
                      minYear={1970}
                      maxYear={today.getFullYear()}
                    />
                  </View>
                )}
              </View>
            </View>

            {error && <Text className="text-xs text-red-500">{error}</Text>}

            <TouchableOpacity
              onPress={handleProfileNext}
              disabled={loading}
              activeOpacity={0.8}
              className="h-12 rounded-xl bg-moa-text items-center justify-center"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text className="text-white text-sm font-medium">다음</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: 커플 연결 선택 ── */}
        {step === 'couple' && !coupleMode && (
          <View style={styles.section}>
            <View style={styles.titleGroup}>
              <Text className="text-xl font-bold text-moa-text">연인과 연결해요</Text>
              <Text className="text-sm text-moa-sub">초대 코드로 서로 연결하면 함께 기록을 시작할 수 있어요</Text>
            </View>

            <View style={styles.fieldGroup}>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                activeOpacity={0.8}
                className="h-12 rounded-xl bg-moa-text items-center justify-center"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text className="text-white text-sm font-medium">초대 코드 만들기</Text>
                }
              </TouchableOpacity>

              <View className="flex-row items-center gap-3">
                <View className="flex-1 h-px bg-moa-border" />
                <Text className="text-xs text-moa-placeholder">또는</Text>
                <View className="flex-1 h-px bg-moa-border" />
              </View>

              {/* 코드 입력 */}
              <View style={styles.rowInput}>
                <TextInput
                  value={inputCode}
                  onChangeText={(t) => setInputCode(t.toUpperCase())}
                  placeholder="초대 코드 입력"
                  placeholderTextColor="#CCCCCC"
                  autoCapitalize="characters"
                  maxLength={8}
                  className="flex-1 h-11 px-4 rounded-xl border border-[#E5E5E5] text-sm text-moa-text text-center"
                  style={{ letterSpacing: 4 }}
                />
                <TouchableOpacity
                  onPress={handleJoin}
                  disabled={loading || !inputCode.trim()}
                  activeOpacity={0.8}
                  className="h-11 px-5 rounded-xl border border-moa-text items-center justify-center"
                  style={{ opacity: loading || !inputCode.trim() ? 0.4 : 1 }}
                >
                  <Text className="text-sm font-medium text-moa-text">연결</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error && <Text className="text-xs text-red-500">{error}</Text>}

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/home')}
              activeOpacity={0.7}
              className="items-center py-2"
            >
              <Text className="text-sm text-moa-sub">나중에 하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: 코드 공유 화면 ── */}
        {step === 'couple' && coupleMode === 'create' && myCode && (
          <View style={styles.section}>
            <View style={styles.titleGroup}>
              <Text className="text-xl font-bold text-moa-text">코드를 공유해요</Text>
              <Text className="text-sm text-moa-sub">연인에게 QR 또는 코드를 전달해주세요</Text>
            </View>

            <View className="items-center gap-5 py-8 bg-white rounded-2xl border border-moa-border">
              <QRCode value={myCode} size={160} backgroundColor="#FFFFFF" color="#222222" />
              <View className="flex-row items-center gap-3 px-6 w-full">
                <View className="flex-1 h-px bg-moa-border" />
                <Text className="text-xs text-moa-placeholder">또는</Text>
                <View className="flex-1 h-px bg-moa-border" />
              </View>
              <Text
                className="text-2xl font-bold text-moa-text"
                style={{ letterSpacing: 6 }}
              >
                {myCode}
              </Text>
            </View>

            {error && <Text className="text-xs text-red-500">{error}</Text>}

            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.7}
              className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-[#E5E5E5]"
            >
              <Text className="text-sm text-moa-text">공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)/home')}
              activeOpacity={0.8}
              className="h-12 rounded-xl bg-moa-text items-center justify-center"
            >
              <Text className="text-white text-sm font-medium">시작하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  section: { gap: 24 },
  titleGroup: { gap: 4 },
  fieldGroup: { gap: 16 },
  field: { gap: 6 },
  rowInput: { flexDirection: 'row', gap: 8 },
});
