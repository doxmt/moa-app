import { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  uri: string | null;
  submitting: boolean;
  onUpload: (uri: string, caption: string | null) => Promise<void>;
  onCancel: () => void;
}

export default function StoryUploadModal({ uri, submitting, onUpload, onCancel }: Props) {
  const [caption, setCaption] = useState('');

  const handleCancel = () => {
    setCaption('');
    onCancel();
  };

  const handleUpload = async () => {
    if (!uri) return;
    await onUpload(uri, caption.trim() || null);
    setCaption('');
  };

  return (
    <Modal visible={!!uri} transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 bg-black/80">
          {/* 이미지 영역 — 남은 공간 채움 */}
          <View className="flex-1 items-center justify-center px-5">
            {uri && (
              <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
            )}
          </View>

          {/* 캡션 + 버튼 — 하단 고정 */}
          <View className="px-5 pb-10 gap-3">
            <TextInput
              placeholder="캡션을 입력해주세요 (선택)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={caption}
              onChangeText={setCaption}
              maxLength={80}
              multiline
              scrollEnabled
              blurOnSubmit={false}
              className="w-full rounded-xl px-4 py-3 text-sm text-white"
              style={styles.input}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 py-3 rounded-xl items-center justify-center"
                style={styles.cancelBtn}
              >
                <Text className="text-white text-sm font-medium">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpload}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-white items-center justify-center"
                style={submitting ? styles.submitBtnDisabled : undefined}
              >
                <Text className="text-moa-text text-sm font-medium">
                  {submitting ? '올리는 중...' : '올리기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  preview: { width: SCREEN_WIDTH - 40, aspectRatio: 1, borderRadius: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', maxHeight: 120 },
  cancelBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  submitBtnDisabled: { opacity: 0.5 },
});
