import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

import { Story } from '@/lib/supabase/stories';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDateDot } from '@/utils/date';

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
  const [viewerGroup, setViewerGroup] = useState<Story[]>(initialGroup);
  const [viewerIndex, setViewerIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionValue, setEditCaptionValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const selected = viewerGroup[viewerIndex] ?? null;
  const isMyStory = selected ? selected.created_by === userId : false;

  const showToast = () => {
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
  viewerGroupRef.current = viewerGroup;
  viewerIndexRef.current = viewerIndex;

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

  const handleCaptionSave = async () => {
    if (!selected) return;
    await onEditCaption(selected.id, editCaptionValue.trim() || null);
    const newCaption = editCaptionValue.trim() || null;
    setViewerGroup((g) => g.map((s, i) => (i === viewerIndex ? { ...s, caption: newCaption } : s)));
    setEditingCaption(false);
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
    if (status !== 'granted') return;
    const filename = selected.storage_path.split('/').pop() ?? 'story.jpg';
    const localUri = FileSystem.cacheDirectory + filename;
    await FileSystem.downloadAsync(selected.signed_url, localUri);
    await MediaLibrary.saveToLibraryAsync(localUri);
    showToast();
  };

  const getDotStyle = (active: boolean) => ({
    width: active ? 8 : 6,
    height: active ? 8 : 6,
    backgroundColor: active ? 'white' : 'rgba(255,255,255,0.3)',
  });

  if (!selected) return null;

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1" {...panResponder.panHandlers}>
          {/* 배경 */}
          <View className="absolute inset-0 bg-black/70" />

          {/* 상단 바 */}
          <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-sm font-medium">
                {selected.created_by === userId ? myNickname : partnerNickname}
              </Text>
              <Text className="text-white/60 text-sm">{formatDateDot(selected.created_at)}</Text>
            </View>
            <View className="flex-row items-center gap-3">
              {isMyStory && (
                <>
                  <TouchableOpacity
                    onPress={() => { setEditCaptionValue(selected.caption ?? ''); setEditingCaption(true); }}
                  >
                    <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2}>
                      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowDeleteConfirm(true)}>
                    <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2}>
                      <Polyline points="3 6 5 6 21 6" strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M10 11v6M14 11v6" strokeLinecap="round" />
                      <Path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </TouchableOpacity>
                </>
              )}
              {!isMyStory && (
                <TouchableOpacity onPress={handleSaveToGallery}>
                  <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2}>
                    <Path d="M12 15V3M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M20 21H4" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose}>
                <Svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="white" strokeWidth={2}>
                  <Path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* 사진 */}
          <View style={styles.imageWrap} className="items-center justify-center">
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
                className="absolute left-3 w-8 h-8 rounded-full items-center justify-center"
                style={styles.navBtn}
              >
                <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2}>
                  <Path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            )}
            {viewerIndex < viewerGroup.length - 1 && (
              <TouchableOpacity
                onPress={goNext}
                className="absolute right-3 w-8 h-8 rounded-full items-center justify-center"
                style={styles.navBtn}
              >
                <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="white" strokeWidth={2}>
                  <Path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            )}
          </View>

          {/* 점 인디케이터 */}
          {viewerGroup.length > 1 && (
            <View className="flex-row items-center justify-center gap-1.5 pt-3">
              {viewerGroup.map((_, i) => (
                <View key={i} className="rounded-full" style={getDotStyle(i === viewerIndex)} />
              ))}
            </View>
          )}

          {/* 캡션 */}
          <View className="px-5 pb-12 pt-3" style={styles.captionArea}>
            {editingCaption ? (
              <View className="flex-row gap-2 items-start">
                <TextInput
                  value={editCaptionValue}
                  onChangeText={setEditCaptionValue}
                  maxLength={80}
                  autoFocus
                  multiline
                  blurOnSubmit={false}
                  placeholder="캡션 입력"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-white"
                  style={styles.captionInput}
                />
                <TouchableOpacity
                  onPress={() => setEditingCaption(false)}
                  className="px-3 py-2 rounded-xl"
                  style={styles.captionCancelBtn}
                >
                  <Text className="text-white/70 text-sm">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEditConfirm(true)}
                  className="px-3 py-2 rounded-xl bg-white"
                >
                  <Text className="text-moa-text text-sm font-medium">저장</Text>
                </TouchableOpacity>
              </View>
            ) : (
              selected.caption ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text className="text-white text-sm leading-relaxed">{selected.caption}</Text>
                </ScrollView>
              ) : null
            )}
          </View>

          {/* 캡션 수정 확인 */}
          <ConfirmDialog
            visible={showEditConfirm}
            title="캡션을 수정하시겠습니까?"
            confirmText="수정"
            onConfirm={() => { setShowEditConfirm(false); handleCaptionSave(); }}
            onCancel={() => setShowEditConfirm(false)}
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
  imageWrap: { flex: 1, maxHeight: SCREEN_HEIGHT * 0.7 },
  image: { width: SCREEN_WIDTH, flex: 1 },
  navBtn: { backgroundColor: 'rgba(0,0,0,0.4)' },
  captionArea: { minHeight: 80, maxHeight: 160 },
  captionInput: { backgroundColor: 'rgba(255,255,255,0.1)' },
  captionCancelBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});
