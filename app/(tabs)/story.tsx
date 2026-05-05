import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';

import { FREE_DAILY_LIMIT, useStoryData } from '@/hooks/useStoryData';
import { Story } from '@/lib/supabase/stories';
import { styles } from '@/components/features/story/story.styles';
import StoryUploadModal from '@/components/features/story/StoryUploadModal';
import StoryViewer from '@/components/features/story/StoryViewer';
import { dateToDateStr } from '@/utils/date';

const LOCK_AFTER_DAYS = 7;

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
  const {
    userId,
    myNickname,
    partnerNickname,
    stories,
    loading,
    submitting,
    isConnected,
    isPremium,
    uploadLimitReached,
    uploadStory,
    editCaption,
    removeStory,
  } = useStoryData();

  const handleLockedPress = () => {
    Alert.alert(
      '잠긴 스토리',
      `7일 이전 기록은 프리미엄 이용자만 볼 수 있어요\n우리의 소중한 추억을 모두 확인해보세요`,
      [{ text: '확인' }]
    );
  };

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

  const pickImage = async () => {
    if (uploadLimitReached) {
      Alert.alert('업로드 한도', `하루 ${FREE_DAILY_LIMIT}장까지 업로드할 수 있어요`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadUri(result.assets[0].uri);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-base font-semibold text-moa-text">스토리</Text>
        <TouchableOpacity
          onPress={isConnected ? pickImage : undefined}
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: isConnected && !uploadLimitReached ? '#222222' : '#CCCCCC' }}
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
      ) : !isConnected ? (
        <View className="flex-1 items-center justify-center px-8" style={{ gap: 12 }}>
          <Text style={storyBannerStyles.emptyTitle}>연결 후 스토리를 기록해보세요</Text>
          <Text style={storyBannerStyles.emptyDesc}>
            연결하면 서로의 일상을 사진으로 공유할 수 있어요
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/connect' as never)}
            style={storyBannerStyles.connectButton}
          >
            <Text style={storyBannerStyles.connectButtonText}>연결하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
        uri={uploadUri}
        submitting={submitting}
        onUpload={async (uri, caption) => {
          await uploadStory(uri, caption);
          setUploadUri(null);
        }}
        onCancel={() => setUploadUri(null)}
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

const storyBannerStyles = StyleSheet.create({
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#222222',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 9,
    marginTop: 4,
  },
  connectButtonText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
  },
});
