import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

import { useStoryData } from '@/hooks/useStoryData';
import { Story } from '@/lib/supabase/stories';

const PREVIEW_COUNT = 3;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const todayKey = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

function groupByDate(stories: Story[]): { key: string; dateLabel: string; stories: Story[] }[] {
  const map: Record<string, Story[]> = {};
  for (const story of stories) {
    const d = new Date(story.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map[key]) map[key] = [];
    map[key].push(story);
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, stories]) => {
      const [y, m, d] = key.split('-');
      return { key, dateLabel: `${Number(y)}년 ${Number(m)}월 ${Number(d)}일`, stories };
    });
}

function DateGroup({
  dateLabel,
  stories,
  onOpen,
}: {
  dateLabel: string;
  stories: Story[];
  onOpen: (group: Story[], index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? stories : stories.slice(0, PREVIEW_COUNT);
  const hasMore = stories.length > PREVIEW_COUNT;
  const cellSize = SCREEN_WIDTH / 3;

  return (
    <View className="flex flex-col gap-1.5">
      <Text className="text-xs text-moa-muted font-medium px-5">{dateLabel}</Text>
      <View className="flex-row flex-wrap">
        {visible.map((story, i) => (
          <TouchableOpacity
            key={story.id}
            onPress={() => onOpen(stories, i)}
            style={{ width: cellSize, height: cellSize * (4 / 3) }}
            className="bg-moa-border"
          >
            {story.signed_url ? (
              <Image
                source={{ uri: story.signed_url }}
                style={{ width: cellSize, height: cellSize * (4 / 3) }}
                resizeMode="cover"
              />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
      {hasMore && (
        <TouchableOpacity onPress={() => setExpanded((v) => !v)} className="py-1.5">
          <Text className="text-xs text-moa-sub text-center">
            {expanded ? '접기' : `더보기 +${stories.length - PREVIEW_COUNT}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StorySection({
  nickname,
  stories,
  onOpen,
}: {
  nickname: string;
  stories: Story[];
  onOpen: (group: Story[], index: number) => void;
}) {
  const [showPast, setShowPast] = useState(false);
  const allGroups = groupByDate(stories);
  const groups = showPast ? allGroups : allGroups.filter((g) => g.key === todayKey);
  const hasPast = allGroups.some((g) => g.key !== todayKey);

  return (
    <View className="flex-1">
      <View className="flex-row items-center px-5 py-3">
        <Text className="text-sm font-semibold text-moa-text">{nickname}님의 스토리</Text>
        {hasPast && (
          <TouchableOpacity onPress={() => setShowPast((v) => !v)} className="ml-auto">
            <Text className="text-xs text-moa-sub">
              {showPast ? '접기' : '이전 스토리 보기'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {groups.length === 0 ? (
        <Text className="text-sm text-moa-placeholder px-5">오늘 스토리가 없어요</Text>
      ) : (
        <View className="gap-4 pb-2">
          {groups.map((g) => (
            <DateGroup key={g.key} dateLabel={g.dateLabel} stories={g.stories} onOpen={onOpen} />
          ))}
        </View>
      )}
    </View>
  );
}

export default function StoryScreen() {
  const {
    userId,
    myNickname,
    partnerNickname,
    stories,
    loading,
    submitting,
    uploadStory,
    editCaption,
    removeStory,
  } = useStoryData();

  // 업로드 모달
  const [uploadUri, setUploadUri] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');

  // 뷰어
  const [viewerGroup, setViewerGroup] = useState<Story[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editCaptionValue, setEditCaptionValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = () => {
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const selected = viewerGroup ? viewerGroup[viewerIndex] : null;
  const isMyStory = selected ? selected.created_by === userId : false;

  const myStories = stories.filter((s) => s.created_by === userId);
  const partnerStories = stories.filter((s) => s.created_by !== userId);

  const openViewer = (group: Story[], index: number) => {
    setViewerGroup(group);
    setViewerIndex(index);
    setEditingCaption(false);
  };

  const closeViewer = () => {
    setViewerGroup(null);
    setEditingCaption(false);
  };

  const goPrev = () => {
    if (!viewerGroup) return;
    setViewerIndex((i) => (i > 0 ? i - 1 : i));
    setEditingCaption(false);
  };

  const goNext = () => {
    if (!viewerGroup) return;
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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadUri(result.assets[0].uri);
      setUploadCaption('');
    }
  };

  const handleUpload = async () => {
    if (!uploadUri) return;
    await uploadStory(uploadUri, uploadCaption.trim() || null);
    setUploadUri(null);
    setUploadCaption('');
  };

  const handleCaptionSave = async () => {
    if (!selected || !viewerGroup) return;
    await editCaption(selected.id, editCaptionValue.trim() || null);
    const newCaption = editCaptionValue.trim() || null;
    setViewerGroup(viewerGroup.map((s, i) => (i === viewerIndex ? { ...s, caption: newCaption } : s)));
    setEditingCaption(false);
  };

  const handleDelete = async () => {
    if (!selected || !viewerGroup) return;
    await removeStory(selected.id, selected.storage_path);
    setShowDeleteConfirm(false);
    const newGroup = viewerGroup.filter((_, i) => i !== viewerIndex);
    if (newGroup.length === 0) {
      closeViewer();
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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-white">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-base font-semibold text-moa-text">스토리</Text>
        <TouchableOpacity
          onPress={pickImage}
          className="w-8 h-8 rounded-full bg-moa-text items-center justify-center"
        >
          <Svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="white" strokeWidth={2.5}>
            <Path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* 본문 */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#CCCCCC" />
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <StorySection nickname={partnerNickname} stories={partnerStories} onOpen={openViewer} />
          <View className="h-px bg-moa-border mx-5 my-2" />
          <StorySection nickname={myNickname} stories={myStories} onOpen={openViewer} />
        </ScrollView>
      )}

      {/* 업로드 모달 */}
      <Modal visible={!!uploadUri} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
        <View className="flex-1 bg-black/80 items-center justify-center px-5 gap-4">
          {uploadUri && (
            <Image
              source={{ uri: uploadUri }}
              style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40, borderRadius: 16 }}
              resizeMode="cover"
            />
          )}
          <TextInput
            placeholder="캡션을 입력해주세요 (선택)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={uploadCaption}
            onChangeText={setUploadCaption}
            maxLength={80}
            multiline
            blurOnSubmit={false}
            className="w-full rounded-xl px-4 py-3 text-sm text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          />
          <View className="flex-row gap-3 w-full">
            <TouchableOpacity
              onPress={() => { setUploadUri(null); setUploadCaption(''); }}
              className="flex-1 py-3 rounded-xl items-center justify-center"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Text className="text-white text-sm font-medium">취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUpload}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-white items-center justify-center"
              style={{ opacity: submitting ? 0.5 : 1 }}
            >
              <Text className="text-moa-text text-sm font-medium">
                {submitting ? '올리는 중...' : '올리기'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 풀스크린 뷰어 */}
      <Modal visible={!!selected} transparent animationType="fade">
        {selected && viewerGroup && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
          <View className="flex-1" {...panResponder.panHandlers}>
            {/* 배경 */}
            <View className="absolute inset-0 bg-black/70" style={{ backdropFilter: 'blur(8px)' }} />

            {/* 상단 바 */}
            <View className="flex-row items-center justify-between px-4 pt-12 pb-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-white text-sm font-medium">
                  {selected.created_by === userId ? myNickname : partnerNickname}
                </Text>
                <Text className="text-white/60 text-sm">{formatDate(selected.created_at)}</Text>
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
                <TouchableOpacity onPress={closeViewer}>
                  <Svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="white" strokeWidth={2}>
                    <Path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            {/* 사진 */}
            <View style={{ flex: 1, maxHeight: SCREEN_HEIGHT * 0.7 }} className="items-center justify-center">
              {selected.signed_url && (
                <Image
                  key={selected.id}
                  source={{ uri: selected.signed_url }}
                  style={{ width: SCREEN_WIDTH, flex: 1 }}
                  resizeMode="contain"
                />
              )}
              {viewerIndex > 0 && (
                <TouchableOpacity
                  onPress={goPrev}
                  className="absolute left-3 w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
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
                  style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
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
                  <View
                    key={i}
                    className="rounded-full"
                    style={{
                      width: i === viewerIndex ? 8 : 6,
                      height: i === viewerIndex ? 8 : 6,
                      backgroundColor: i === viewerIndex ? 'white' : 'rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </View>
            )}

            {/* 캡션 */}
            <View className="px-5 pb-12 pt-3" style={{ minHeight: 80, maxHeight: 160 }}>
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
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  />
                  <TouchableOpacity
                    onPress={() => setEditingCaption(false)}
                    className="px-3 py-2 rounded-xl"
                    style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
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

            {/* 삭제 확인 모달 */}
            {showEditConfirm && (
              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="bg-white rounded-2xl mx-6 w-full p-6 gap-4">
                  <Text className="text-sm font-semibold text-moa-text text-center">
                    캡션을 수정하시겠습니까?
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setShowEditConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl items-center"
                      style={{ borderWidth: 1, borderColor: '#E0E0E0' }}
                    >
                      <Text className="text-sm text-moa-sub">취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setShowEditConfirm(false); handleCaptionSave(); }}
                      className="flex-1 py-2.5 rounded-xl bg-moa-text items-center"
                    >
                      <Text className="text-sm text-white font-medium">수정</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {showDeleteConfirm && (
              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="bg-white rounded-2xl mx-6 w-full p-6 gap-4">
                  <Text className="text-sm font-semibold text-moa-text text-center">
                    스토리를 삭제하시겠습니까?
                  </Text>
                  <Text className="text-xs text-moa-muted text-center">
                    삭제한 스토리는 복구할 수 없어요
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl items-center"
                      style={{ borderWidth: 1, borderColor: '#E0E0E0' }}
                    >
                      <Text className="text-sm text-moa-sub">취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDelete}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 items-center"
                    >
                      <Text className="text-sm text-white font-medium">삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

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
        )}
      </Modal>
    </View>
  );
}
