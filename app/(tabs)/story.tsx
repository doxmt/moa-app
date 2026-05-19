import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ImagePlus } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

import { FREE_DAILY_LIMIT, useStoryData } from '@/hooks/useStoryData';
import { useToast } from '@/hooks/useToast';
import { LOCK_AFTER_DAYS, Story } from '@/lib/supabase/stories';
import { styles } from '@/components/features/story/story.styles';
import StoryUploadModal from '@/components/features/story/StoryUploadModal';
import StoryViewer from '@/components/features/story/StoryViewer';
import { dateToDateStr } from '@/utils/date';

function isDateLocked(dateKey: string, premium: boolean): boolean {
  if (premium) return false;
  const diffMs = Date.now() - new Date(dateKey).getTime();
  return diffMs / (1000 * 60 * 60 * 24) > LOCK_AFTER_DAYS;
}

const PREVIEW_COUNT = 3;

function groupByDate(stories: Story[]): { key: string; dateLabel: string; stories: Story[] }[] {
  const map: Record<string, Story[]> = {};
  for (const story of stories) {
    const key = dateToDateStr(new Date(story.created_at));
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

function UploadPrompt({
  todayUploadCount,
  dailyLimit,
  isPremium,
  limitReached,
  onPress,
}: {
  todayUploadCount: number;
  dailyLimit: number;
  isPremium: boolean;
  limitReached: boolean;
  onPress: () => void;
}) {
  return (
    <View className="px-5 pb-5">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="rounded-2xl border border-moa-border bg-[#FBFBFB] overflow-hidden"
        style={uploadPromptStyles.wrap}
      >
        <View className="flex-row items-center p-4 gap-4">
          <View className="w-[72px] h-[72px] rounded-2xl bg-white border border-moa-border items-center justify-center">
            <ImagePlus size={30} color="#222222" strokeWidth={1.9} />
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-semibold text-moa-text">오늘의 순간 추가</Text>
              <View className="rounded-full bg-moa-text px-2.5 py-1">
                <Text className="text-[11px] text-white font-semibold">
                  {isPremium ? '무제한' : `${todayUploadCount}/${dailyLimit}`}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-moa-sub leading-5">
              사진을 선택하거나 바로 촬영해서 기록해보세요
            </Text>
            <View className="flex-row items-center gap-1.5 pt-1">
              <Camera size={14} color={limitReached ? '#AAAAAA' : '#222222'} strokeWidth={2.1} />
              <Text className={`text-xs font-medium ${limitReached ? 'text-moa-muted' : 'text-moa-text'}`}>
                {limitReached ? '오늘 업로드 제한 도달' : '스토리 추가하기'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function DateGroup({
  dateLabel,
  dateKey,
  stories,
  onOpen,
  isPremium,
  onLockedPress,
}: {
  dateLabel: string;
  dateKey: string;
  stories: Story[];
  onOpen: (group: Story[], index: number) => void;
  isPremium: boolean;
  onLockedPress: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const locked = isDateLocked(dateKey, isPremium);
  const visible = expanded ? stories : stories.slice(0, PREVIEW_COUNT);
  const hasMore = stories.length > PREVIEW_COUNT;

  return (
    <View className="flex flex-col gap-1.5">
      <Text className="text-xs text-moa-muted font-medium px-5">{dateLabel}</Text>
      <View className="flex-row flex-wrap">
        {visible.map((story, i) =>
          locked ? (
            <TouchableOpacity
              key={story.id}
              onPress={onLockedPress}
              style={[styles.cell, lockedCellStyle.wrap]}
            >
              <View style={lockedCellStyle.overlay}>
                <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2}>
                  <Path d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={story.id}
              onPress={() => onOpen(stories, i)}
              style={styles.cell}
              className="bg-moa-border"
            >
              {story.signed_url ? (
                <Image source={{ uri: story.signed_url }} style={styles.cell} resizeMode="cover" />
              ) : null}
            </TouchableOpacity>
          )
        )}
      </View>
      {hasMore && !locked && (
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
  isPremium,
  onLockedPress,
}: {
  nickname: string;
  stories: Story[];
  onOpen: (group: Story[], index: number) => void;
  isPremium: boolean;
  onLockedPress: () => void;
}) {
  const [showPast, setShowPast] = useState(false);
  const todayKey = dateToDateStr(new Date());
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
            <DateGroup
              key={g.key}
              dateKey={g.key}
              dateLabel={g.dateLabel}
              stories={g.stories}
              onOpen={onOpen}
              isPremium={isPremium}
              onLockedPress={onLockedPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function StoryScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    userId,
    myNickname,
    partnerNickname,
    stories,
    loading,
    submitting,
    isConnected,
    isPremium,
    todayUploadCount,
    uploadLimitReached,
    uploadStory,
    editCaption,
    removeStory,
  } = useStoryData();

  const handleLockedPress = () => {
    showToast('7일 이전 기록은 프리미엄 이용자만 볼 수 있어요');
  };

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadUri, setUploadUri] = useState<string | null>(null);
  const [viewerGroup, setViewerGroup] = useState<Story[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);

  const myStories = stories.filter((s) => s.created_by === userId);
  const partnerStories = stories.filter((s) => s.created_by !== userId);

  const openViewer = (group: Story[], index: number) => {
    setViewerGroup(group);
    setViewerIndex(index);
  };

  const closeViewer = () => setViewerGroup(null);

  const openUpload = () => {
    if (uploadLimitReached) {
      showToast(`하루 ${FREE_DAILY_LIMIT}장까지 업로드할 수 있어요`);
      return;
    }
    setUploadOpen(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showToast('촬영하려면 카메라 권한이 필요해요');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadUri(result.assets[0].uri);
    }
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setUploadUri(null);
  };

  return (
    <View className="flex-1 bg-white">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-base font-semibold text-moa-text">스토리</Text>
        <View className="w-8 h-8" />
      </View>

      {/* 본문 */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#AAAAAA" />
        </View>
      ) : !isConnected ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Text className="text-base font-semibold text-moa-text text-center">연결 후 스토리를 기록해보세요</Text>
          <Text className="text-sm text-moa-sub text-center leading-5">
            연결하면 서로의 일상을 사진으로 공유할 수 있어요
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/connect' as never)}
            className="bg-moa-text rounded-[20px] px-6 py-2 mt-1"
          >
            <Text className="text-sm text-white font-semibold">연결하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <UploadPrompt
            todayUploadCount={todayUploadCount}
            dailyLimit={FREE_DAILY_LIMIT}
            isPremium={isPremium}
            limitReached={uploadLimitReached}
            onPress={openUpload}
          />
          <StorySection
            nickname={partnerNickname}
            stories={partnerStories}
            onOpen={openViewer}
            isPremium={isPremium}
            onLockedPress={handleLockedPress}
          />
          <View className="h-px bg-moa-border mx-5 my-2" />
          <StorySection
            nickname={myNickname}
            stories={myStories}
            onOpen={openViewer}
            isPremium={isPremium}
            onLockedPress={handleLockedPress}
          />
        </ScrollView>
      )}

      {/* 업로드 모달 */}
      <StoryUploadModal
        visible={uploadOpen}
        uri={uploadUri}
        submitting={submitting}
        todayUploadCount={todayUploadCount}
        dailyLimit={FREE_DAILY_LIMIT}
        isPremium={isPremium}
        onPickImage={pickImage}
        onTakePhoto={takePhoto}
        onUpload={async (uri, caption) => {
          await uploadStory(uri, caption);
          closeUpload();
        }}
        onCancel={closeUpload}
      />

      {/* 풀스크린 뷰어 */}
      {viewerGroup && (
        <StoryViewer
          group={viewerGroup}
          initialIndex={viewerIndex}
          userId={userId}
          myNickname={myNickname}
          partnerNickname={partnerNickname}
          onClose={closeViewer}
          onEditCaption={editCaption}
          onDelete={removeStory}
        />
      )}
    </View>
  );
}

const lockedCellStyle = StyleSheet.create({
  wrap: { backgroundColor: '#E8E8E8', overflow: 'hidden' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const uploadPromptStyles = StyleSheet.create({
  wrap: {
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
});
