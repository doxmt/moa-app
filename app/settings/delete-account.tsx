import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useToast } from '@/hooks/useToast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { signOut } = useAuthStore();
  const { showToast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );

      if (!res.ok) {
        showToast('탈퇴 처리 중 문제가 발생했어요. 다시 시도해주세요.');
        return;
      }

      try {
        await signOut();
      } catch {
        // signOut 실패해도 계정은 삭제됨 — 무시
      }
    } catch {
      showToast('네트워크 오류가 발생했어요. 다시 시도해주세요.');
    } finally {
      setDeleting(false);
      setShowDialog(false);
    }
  };

  return (
    <View className="flex-1 bg-moa-bg" style={{ paddingTop: top }}>
      <View className="flex-row items-center gap-2 px-5 py-4 border-b border-moa-border">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} className="p-1 -ml-1">
          <ChevronLeft size={22} color="#222222" strokeWidth={2} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-moa-text">회원 탈퇴</Text>
      </View>

      <View className="flex-1 px-5 justify-between py-8">
        <View className="gap-3">
          <Text className="text-base font-semibold text-moa-text">탈퇴 전 확인해주세요</Text>
          <View className="gap-2">
            <Text className="text-sm text-moa-sub leading-6">• 탈퇴 시 모든 데이터가 즉시 삭제돼요.</Text>
            <Text className="text-sm text-moa-sub leading-6">• 커플 연결이 해제되고 상대방의 커플 데이터도 삭제돼요.</Text>
            <Text className="text-sm text-moa-sub leading-6">• 삭제된 데이터는 복구할 수 없어요.</Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="flex-1 h-12 rounded-xl items-center justify-center"
            style={styles.cancelBtn}
          >
            <Text className="text-sm text-moa-sub">취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowDialog(true)}
            activeOpacity={0.8}
            className="flex-1 h-12 rounded-xl bg-red-500 items-center justify-center"
          >
            <Text className="text-sm text-white font-medium">탈퇴하기</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showDialog} transparent animationType="fade">
        <View className="flex-1 items-center justify-center" style={styles.overlay}>
          <View className="bg-white rounded-2xl mx-6 p-6 gap-4 w-full">
            <Text className="text-base font-bold text-moa-text text-center">
              정말 탈퇴할까요?
            </Text>
            <Text className="text-xs text-moa-sub text-center leading-5">
              탈퇴하면 모든 데이터가 삭제되고{'\n'}
              <Text style={{ textDecorationLine: 'underline' }}>복구할 수 없어요.</Text>
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setShowDialog(false)}
                activeOpacity={0.7}
                className="flex-1 py-3 rounded-xl items-center"
                style={styles.cancelBtn}
              >
                <Text className="text-sm text-moa-sub">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleting}
                activeOpacity={0.8}
                className="flex-1 py-3 rounded-xl items-center bg-red-500"
                style={{ opacity: deleting ? 0.5 : 1 }}
              >
                <Text className="text-sm text-white font-medium">
                  {deleting ? '처리 중...' : '탈퇴하기'}
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
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});
