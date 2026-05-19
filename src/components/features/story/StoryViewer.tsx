import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { ChevronLeft, ChevronRight, Download, Pencil, Trash2, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Story } from '@/lib/supabase/stories';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { formatDateDot, formatTime } from '@/utils/date';
import StoryUploadModal from './StoryUploadModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  group: Story[];
  initialIndex: number;
  userId: string;
  myNickname: string;
  partnerNickname: string;
  onClose: () => void;
  onEditCaption: (id: string, caption: string | null) => Promise<void>;
  onDelete: (id: string, storagePath: string) => Promise<void>;
}

export default function StoryViewer({
  group: initialGroup,
  initialIndex,
  userId,
  myNickname,
  partnerNickname,
  onClose,
  onEditCaption,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const [viewerGroup, setViewerGroup] = useState<Story[]>(initialGroup);
  const [viewerIndex, setViewerIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionValue, setEditCaptionValue] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const { showToast } = useToast();
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const selected = viewerGroup[viewerIndex] ?? null;
  const isMyStory = selected ? selected.created_by === userId : false;

  const showSavedToast = () => {
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const goPrev = () => {
    setViewerIndex((i) => (i > 0 ? i - 1 : i));
    setEditingCaption(false);
  };

  const goNext = () => {
    setViewerIndex((i) => (i < viewerGroup.length - 1 ? i + 1 : i));
    setEditingCaption(false);
  };

  const viewerGroupRef = useRef(viewerGroup);
  const viewerIndexRef = useRef(viewerIndex);
  useEffect(() => {
    viewerGroupRef.current = viewerGroup;
    viewerIndexRef.current = viewerIndex;
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,
      onPanResponderRelease: (_, g) => {
        const group = viewerGroupRef.current;
        const index = viewerIndexRef.current;
        if (!group) return;
        if (g.dx < -50 && index < group.length - 1) {
          setViewerIndex((i) => i + 1);
          setEditingCaption(false);
        } else if (g.dx > 50 && index > 0) {
          setViewerIndex((i) => i - 1);
          setEditingCaption(false);
        }
      },
    })
  ).current;

  const handleCaptionSave = async (captionValue?: string | null) => {
    if (!selected) return;
    const newCaption = captionValue !== undefined ? captionValue : editCaptionValue.trim() || null;
    setSavingCaption(true);
    try {
      await onEditCaption(selected.id, newCaption);
      setViewerGroup((g) => g.map((s, i) => (i === viewerIndex ? { ...s, caption: newCaption } : s)));
      setEditingCaption(false);
    } finally {
      setSavingCaption(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await onDelete(selected.id, selected.storage_path);
    setShowDeleteConfirm(false);
    const newGroup = viewerGroup.filter((_, i) => i !== viewerIndex);
    if (newGroup.length === 0) {
      onClose();
    } else {
      setViewerGroup(newGroup);
      setViewerIndex((i) => Math.min(i, newGroup.length - 1));
    }
  };

  const handleSaveToGallery = async () => {
    if (!selected?.signed_url) return;
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      setShowPermissionDialog(true);
      return;
    }
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;
    const filename = selected.storage_path.split('/').pop() ?? 'story.jpg';
    const localUri = cacheDir + filename;
    try {
      await FileSystem.downloadAsync(selected.signed_url, localUri);
      await MediaLibrary.saveToLibraryAsync(localUri);
      showSavedToast();
    } catch {
      showToast('사진을 갤러리에 저장하지 못했어요.');
    } finally {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    }
  };

  const getDotStyle = (active: boolean) => ({
    width: active ? 18 : 6,
    height: 6,
    backgroundColor: active ? '#222222' : '#E0E0E0',
  });

  if (!selected) return null;

  return (
    <Modal visible animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 bg-white" {...panResponder.panHandlers}>
          <View className="flex-row items-center justify-between px-5 pt-16 pb-4 border-b border-moa-border">
            <View className="w-10 h-10" />
            <View className="items-center">
              <Text className="text-moa-text text-base font-semibold">
                {selected.created_by === userId ? myNickname : partnerNickname}
              </Text>
              <Text className="text-moa-sub text-xs">
                {formatDateDot(selected.created_at)} {formatTime(selected.created_at)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-[#F6F6F6] items-center justify-center">
              <X size={21} color="#222222" strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-5 pb-3">
            <View style={styles.imageWrap} className="items-center justify-center rounded-2xl bg-moa-bg overflow-hidden">
            {selected.signed_url && (
              <Image
                key={selected.id}
                source={{ uri: selected.signed_url }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
            {viewerIndex > 0 && (
              <TouchableOpacity
                onPress={goPrev}
                className="absolute left-3 w-9 h-9 rounded-full bg-white/90 items-center justify-center"
                style={styles.navBtn}
              >
                <ChevronLeft size={22} color="#222222" strokeWidth={2.3} />
              </TouchableOpacity>
            )}
            {viewerIndex < viewerGroup.length - 1 && (
              <TouchableOpacity
                onPress={goNext}
                className="absolute right-3 w-9 h-9 rounded-full bg-white/90 items-center justify-center"
                style={styles.navBtn}
              >
                <ChevronRight size={22} color="#222222" strokeWidth={2.3} />
              </TouchableOpacity>
            )}
            </View>

            {viewerGroup.length > 1 && (
              <View className="flex-row items-center justify-center gap-1.5 pt-4">
                {viewerGroup.map((_, i) => (
                  <View key={i} className="rounded-full" style={getDotStyle(i === viewerIndex)} />
                ))}
              </View>
            )}
          </View>

          <View className="px-5 pt-1 pb-3 bg-white">
            <View style={styles.captionArea}>
              {selected.caption ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text className="text-moa-text text-sm leading-relaxed">{selected.caption}</Text>
                </ScrollView>
              ) : (
                <Text className="text-moa-placeholder text-sm">캡션이 없어요</Text>
              )}
            </View>
          </View>

          <View className="flex-1" />

          {!editingCaption && (
            <View
              className="px-5 pt-3 border-t border-moa-border bg-white"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <View className="flex-row gap-3">
                {isMyStory ? (
                  <>
                    <TouchableOpacity
                      onPress={() => { setEditCaptionValue(selected.caption ?? ''); setEditingCaption(true); }}
                      className="flex-1 h-11 rounded-2xl border border-moa-border items-center justify-center"
                    >
                      <View className="flex-row items-center gap-2">
                        <Pencil size={15} color="#222222" strokeWidth={2.2} />
                        <Text className="text-moa-text text-sm font-semibold">수정</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowDeleteConfirm(true)}
                      className="flex-1 h-11 rounded-2xl border border-moa-border items-center justify-center"
                    >
                      <View className="flex-row items-center gap-2">
                        <Trash2 size={15} color="#222222" strokeWidth={2.2} />
                        <Text className="text-moa-text text-sm font-semibold">삭제</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={handleSaveToGallery}
                    className="h-11 rounded-2xl bg-moa-text items-center justify-center flex-1"
                  >
                    <View className="flex-row items-center gap-2">
                      <Download size={15} color="white" strokeWidth={2.2} />
                      <Text className="text-white text-sm font-semibold">사진 저장</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <StoryUploadModal
            visible={editingCaption}
            uri={selected.signed_url ?? null}
            submitting={savingCaption}
            todayUploadCount={0}
            dailyLimit={0}
            isPremium
            title="스토리 수정"
            subtitle={`${formatDateDot(selected.created_at)} ${formatTime(selected.created_at)}`}
            submitText="저장"
            initialCaption={editCaptionValue}
            showSourceActions={false}
            showRemaining={false}
            onUpload={async (_uri, caption) => {
              await handleCaptionSave(caption);
            }}
            onCancel={() => setEditingCaption(false)}
          />

          {/* 갤러리 권한 */}
          <ConfirmDialog
            visible={showPermissionDialog}
            title="갤러리 접근 권한 필요"
            subtitle="사진 저장을 위해 갤러리 접근 권한이 필요해요."
            confirmText="설정 열기"
            onConfirm={() => { setShowPermissionDialog(false); Linking.openSettings(); }}
            onCancel={() => setShowPermissionDialog(false)}
          />

          {/* 삭제 확인 */}
          <ConfirmDialog
            visible={showDeleteConfirm}
            title="스토리를 삭제하시겠습니까?"
            subtitle="삭제한 스토리는 복구할 수 없어요"
            confirmText="삭제"
            destructive
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />

          {/* 저장 완료 토스트 */}
          <Animated.View
            style={{ opacity: toastOpacity }}
            className="absolute bottom-16 left-0 right-0 items-center"
            pointerEvents="none"
          >
            <View className="bg-black/70 px-5 py-2.5 rounded-full">
              <Text className="text-white text-sm">저장 완료</Text>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageWrap: { width: SCREEN_WIDTH - 40, height: SCREEN_HEIGHT * 0.52 },
  image: { width: '100%', height: '100%' },
  navBtn: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  captionArea: { minHeight: 44, maxHeight: 120 },
});
