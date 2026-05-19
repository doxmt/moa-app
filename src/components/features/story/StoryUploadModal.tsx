import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, ImagePlus, Send, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_CAPTION_LENGTH = 80;

interface Props {
  visible: boolean;
  uri: string | null;
  submitting: boolean;
  todayUploadCount: number;
  dailyLimit: number;
  isPremium: boolean;
  title?: string;
  subtitle?: string;
  submitText?: string;
  initialCaption?: string;
  showSourceActions?: boolean;
  showRemaining?: boolean;
  onPickImage?: () => Promise<void>;
  onTakePhoto?: () => Promise<void>;
  onUpload: (uri: string, caption: string | null) => Promise<void>;
  onCancel: () => void;
}

export default function StoryUploadModal({
  visible,
  uri,
  submitting,
  todayUploadCount,
  dailyLimit,
  isPremium,
  title = '스토리 올리기',
  subtitle,
  submitText = '올리기',
  initialCaption = '',
  showSourceActions = true,
  showRemaining = true,
  onPickImage,
  onTakePhoto,
  onUpload,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const captionInputRef = useRef<TextInput>(null);
  const [caption, setCaption] = useState('');
  const [captionFocused, setCaptionFocused] = useState(false);
  const trimmedCaption = caption.trim();
  const remaining = Math.max(dailyLimit - todayUploadCount, 0);

  useEffect(() => {
    if (!visible) {
      setCaption('');
      setCaptionFocused(false);
      return;
    }
    setCaption(initialCaption);
  }, [initialCaption, visible]);

  useEffect(() => {
    if (!captionFocused) return;
    const timer = setTimeout(() => {
      captionInputRef.current?.focus();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 220);
    return () => clearTimeout(timer);
  }, [captionFocused]);

  const handleCancel = () => {
    if (submitting) return;
    setCaption('');
    setCaptionFocused(false);
    onCancel();
  };

  const handleUpload = async () => {
    if (!uri) return;
    await onUpload(uri, trimmedCaption || null);
    setCaption('');
    setCaptionFocused(false);
  };

  const handleCaptionFocus = () => {
    setCaptionFocused(true);
  };

  const dismissKeyboard = () => {
    setCaptionFocused(false);
    Keyboard.dismiss();
  };

  const mediaBlock = uri ? (
    <View style={styles.previewWrap} className="rounded-2xl overflow-hidden bg-moa-bg">
      <Image source={{ uri }} style={styles.preview} resizeMode="cover" />
    </View>
  ) : (
    <View style={styles.emptyPreview} className="rounded-2xl border border-moa-border bg-moa-bg">
      <View className="w-14 h-14 rounded-full bg-white border border-moa-border items-center justify-center">
        <ImagePlus size={26} color="#222222" strokeWidth={1.9} />
      </View>
      <Text className="text-base font-semibold text-moa-text mt-4">사진을 추가해주세요</Text>
      <Text className="text-sm text-moa-sub mt-1">갤러리에서 고르거나 바로 촬영할 수 있어요</Text>
    </View>
  );

  const sourceButtons = (
    <View className="flex-row gap-3">
      <TouchableOpacity
        onPress={onPickImage}
        disabled={submitting}
        className="flex-1 h-12 rounded-2xl border border-moa-border bg-white items-center justify-center"
      >
        <View className="flex-row items-center gap-2">
          <ImagePlus size={17} color="#222222" strokeWidth={2.2} />
          <Text className="text-sm font-semibold text-moa-text">사진 선택</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onTakePhoto}
        disabled={submitting}
        className="flex-1 h-12 rounded-2xl border border-moa-border bg-white items-center justify-center"
      >
        <View className="flex-row items-center gap-2">
          <Camera size={17} color="#222222" strokeWidth={2.2} />
          <Text className="text-sm font-semibold text-moa-text">촬영하기</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const captionBlock = (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-moa-text">내용</Text>
        <Text className="text-xs text-moa-sub">
          {trimmedCaption.length}/{MAX_CAPTION_LENGTH}
        </Text>
      </View>
      <View style={styles.composer} className="rounded-2xl bg-[#F6F6F6]">
        <TextInput
          ref={captionInputRef}
          placeholder="오늘의 순간을 짧게 남겨보세요"
          placeholderTextColor="#AAAAAA"
          value={caption}
          onChangeText={setCaption}
          maxLength={MAX_CAPTION_LENGTH}
          multiline
          scrollEnabled
          blurOnSubmit={false}
          onFocus={handleCaptionFocus}
          className="w-full px-4 py-3 text-[15px] text-moa-text leading-5"
          style={styles.input}
        />
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
          <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-moa-border">
              <Pressable
                onPress={handleCancel}
                disabled={submitting}
                className="w-10 h-10 rounded-full bg-[#F6F6F6] items-center justify-center"
                hitSlop={10}
              >
                <X size={21} color="#222222" strokeWidth={2.2} />
              </Pressable>

              <View className="items-center">
                <Text className="text-moa-text text-base font-semibold">{title}</Text>
                <Text className="text-moa-sub text-xs">
                  {subtitle ?? (isPremium ? '무제한 업로드' : `오늘 ${todayUploadCount}/${dailyLimit}장`)}
                </Text>
              </View>

              <View className="w-10 h-10" />
            </View>

            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerStyle={styles.content}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {captionFocused ? captionBlock : null}
              {mediaBlock}
              {showSourceActions ? sourceButtons : null}
              {!captionFocused ? captionBlock : null}
            </ScrollView>

            <View
              className="px-5 pt-3 gap-2 border-t border-moa-border bg-white"
              style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
            >
              <TouchableOpacity
                onPress={handleUpload}
                disabled={!uri || submitting}
                className="h-12 rounded-2xl bg-moa-text items-center justify-center"
                style={!uri || submitting ? styles.disabled : undefined}
              >
                <View className="flex-row items-center gap-2">
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Send size={16} color="white" strokeWidth={2.4} />
                  )}
                  <Text className="text-white text-sm font-semibold">
                    {submitting ? '저장 중' : submitText}
                  </Text>
                </View>
              </TouchableOpacity>

              {showRemaining && !isPremium && <Text className="text-xs text-moa-sub text-center">{remaining}장 남음</Text>}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  previewWrap: {
    width: SCREEN_WIDTH - 40,
    aspectRatio: 1,
  },
  emptyPreview: {
    width: SCREEN_WIDTH - 40,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: '100%' },
  composer: { overflow: 'hidden' },
  input: { minHeight: 104, maxHeight: 150, textAlignVertical: 'top' },
  disabled: { opacity: 0.45 },
});
