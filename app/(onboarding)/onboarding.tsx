import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import ScrollDatePicker from '@/components/ui/ScrollDatePicker';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

type Step = 'profile' | 'couple';
type DateValue = { year: number; month: number; day: number } | null;
type CoupleMode = 'create' | 'join' | null;

function toIsoDate(d: DateValue) {
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuthStore();
  const [step, setStep] = useState<Step>('profile');

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<DateValue>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [mode, setMode] = useState<CoupleMode>(null);
  const [myCode, setMyCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (d: DateValue) =>
    d ? `${d.year}년 ${d.month}월 ${d.day}일` : null;

  const handleProfileNext = async () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요');
      return;
    }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('로그인이 필요합니다');
      setLoading(false);
      return;
    }

    const { error: err } = await supabase
      .from('profiles')
      .update({ name: name.trim(), birthday: toIsoDate(birthday) })
      .eq('user_id', user.id);

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep('couple');
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('로그인이 필요합니다');
      setLoading(false);
      return;
    }

    const { data: couple, error: err } = await supabase
      .from('couples')
      .insert({})
      .select('id, invite_code')
      .single();

    if (err || !couple) {
      setError(err?.message ?? '커플 생성 실패');
      setLoading(false);
      return;
    }

    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ couple_id: couple.id })
      .eq('user_id', user.id);

    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    setMyCode(couple.invite_code);
    setMode('create');
    setLoading(false);
  };

  const handleJoin = async () => {
    const target = inputCode.trim();
    if (!target) {
      setError('초대 코드를 입력해주세요');
      return;
    }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('로그인이 필요합니다');
      setLoading(false);
      return;
    }

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
    await handleDone();
  };

  const handleDone = async () => {
    await refreshProfile();
    router.replace('/(tabs)/home');
  };

  const handleShare = async () => {
    if (!myCode) return;
    try {
      await Share.share({ message: `모아(MOA)에서 함께 기록을 시작해요 💌\n초대 코드: ${myCode}` });
    } catch {
      // 취소 시 무시
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 스텝 인디케이터 */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepBar} />
          <View style={[styles.stepBar, step !== 'couple' && styles.stepBarInactive]} />
        </View>

        {/* ── 1단계: 프로필 ── */}
        {step === 'profile' && (
          <View style={styles.stepContent}>
            <View style={styles.headingGroup}>
              <Text style={styles.heading}>프로필을 설정해요</Text>
              <Text style={styles.subheading}>나중에 언제든 바꿀 수 있어요</Text>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.field}>
                <Text style={styles.label}>이름 *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="본명을 입력해주세요"
                  placeholderTextColor="#CCCCCC"
                  maxLength={10}
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>생일</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!birthday) setBirthday({ year: 2000, month: 1, day: 1 });
                    setShowDatePicker((v) => !v);
                  }}
                  style={[styles.input, styles.dateButton]}
                  activeOpacity={0.7}
                >
                  <Text style={birthday ? styles.dateText : styles.datePlaceholder}>
                    {formatDate(birthday) ?? '년 · 월 · 일'}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={styles.datePickerWrapper}>
                    <ScrollDatePicker
                      value={birthday}
                      onChange={setBirthday}
                      minYear={1970}
                      maxYear={new Date().getFullYear()}
                    />
                  </View>
                )}
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              onPress={handleProfileNext}
              disabled={loading}
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{loading ? '저장 중...' : '다음'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── 2단계: 커플 연결 선택 ── */}
        {step === 'couple' && !mode && (
          <View style={styles.stepContent}>
            <View style={styles.headingGroup}>
              <Text style={styles.heading}>연인과 연결해요</Text>
              <Text style={styles.subheading}>초대 코드로 서로 연결하면 함께 기록을 시작할 수 있어요</Text>
            </View>

            <View style={styles.fieldGroup}>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>{loading ? '생성 중...' : '초대 코드 만들기'}</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.joinRow}>
                <TextInput
                  value={inputCode}
                  onChangeText={setInputCode}
                  placeholder="초대 코드 입력"
                  placeholderTextColor="#CCCCCC"
                  maxLength={8}
                  autoCapitalize="characters"
                  style={[styles.input, styles.joinInput]}
                />
                <TouchableOpacity
                  onPress={handleJoin}
                  disabled={loading}
                  style={[styles.outlineButton, loading && styles.buttonDisabled]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.outlineButtonText}>연결</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        )}

        {/* ── 2단계: 초대 코드 + QR 공유 ── */}
        {step === 'couple' && mode === 'create' && myCode && (
          <View style={styles.stepContent}>
            <View style={styles.headingGroup}>
              <Text style={styles.heading}>코드를 공유해요</Text>
              <Text style={styles.subheading}>연인에게 QR 또는 코드를 전달해주세요</Text>
            </View>

            <View style={styles.codeCard}>
              <QRCode value={myCode} size={160} color="#222222" backgroundColor="#FFFFFF" />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.inviteCode}>{myCode}</Text>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity onPress={handleShare} style={styles.shareButton} activeOpacity={0.8}>
              <Text style={styles.shareButtonText}>공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDone}
              style={styles.primaryButton}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>시작하기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#222222',
  },
  stepBarInactive: {
    backgroundColor: '#E5E5E5',
  },
  stepContent: {
    gap: 24,
  },
  headingGroup: {
    gap: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
  },
  subheading: {
    fontSize: 14,
    color: '#888888',
  },
  fieldGroup: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  input: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    fontSize: 14,
    color: '#222222',
  },
  dateButton: {
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#222222',
  },
  datePlaceholder: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  datePickerWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    overflow: 'hidden',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  dividerText: {
    fontSize: 12,
    color: '#CCCCCC',
  },
  joinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  joinInput: {
    flex: 1,
    letterSpacing: 4,
  },
  outlineButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
  codeCard: {
    alignItems: 'center',
    gap: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  inviteCode: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#222222',
  },
  shareButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222222',
  },
});
