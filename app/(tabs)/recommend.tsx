import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { CATEGORIES, Category } from '@/components/features/recommend/constants';
import { DetailPage } from '@/components/features/recommend/DetailPage';
import { DrawPage } from '@/components/features/recommend/DrawPage';
import { LadderPage } from '@/components/features/recommend/LadderPage';
import { RoulettePage } from '@/components/features/recommend/RoulettePage';

export default function RecommendScreen() {
  const [selected, setSelected] = useState<Category | 'roulette' | 'draw' | 'ladder' | null>(null);

  if (selected === 'roulette') {
    return <RoulettePage onBack={() => setSelected(null)} />;
  }

  if (selected === 'draw') {
    return <DrawPage onBack={() => setSelected(null)} />;
  }

  if (selected === 'ladder') {
    return <LadderPage onBack={() => setSelected(null)} />;
  }

  if (selected) {
    return <DetailPage category={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 10 }}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <View style={styles.sectionBar} />
          <Text className="text-xs font-semibold text-moa-text">추천</Text>
        </View>

        <TouchableOpacity
          onPress={() => setSelected(CATEGORIES[0])}
          activeOpacity={0.85}
          className="h-44 rounded-3xl items-center justify-center gap-3"
          style={styles.cardFood}
        >
          <Text className="text-5xl">{CATEGORIES[0].emoji}</Text>
          <View className="items-center gap-1">
            <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[0].title}</Text>
            <Text className="text-xs text-moa-muted">{CATEGORIES[0].subtitle}</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setSelected(CATEGORIES[1])}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardActivity}
          >
            <Text className="text-4xl">{CATEGORIES[1].emoji}</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[1].title}</Text>
              <Text className="text-xs text-moa-muted">{CATEGORIES[1].subtitle}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelected(CATEGORIES[2])}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardLocation}
          >
            <Text className="text-4xl">{CATEGORIES[2].emoji}</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">{CATEGORIES[2].title}</Text>
              <Text className="text-xs text-moa-muted">{CATEGORIES[2].subtitle}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-2 mt-3 mb-1">
          <View style={styles.sectionBar} />
          <Text className="text-xs font-semibold text-moa-text">뽑기</Text>
        </View>

        <TouchableOpacity
          onPress={() => setSelected('roulette')}
          activeOpacity={0.85}
          className="h-44 rounded-3xl items-center justify-center gap-3"
          style={styles.cardRoulette}
        >
          <Text className="text-5xl">🎰</Text>
          <View className="items-center gap-1">
            <Text className="text-sm font-semibold text-moa-text">나만의 룰렛</Text>
            <Text className="text-xs text-moa-muted">후보를 넣고 뽑아보세요</Text>
          </View>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setSelected('draw')}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardDraw}
          >
            <Text className="text-4xl">✉️</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">제비뽑기</Text>
              <Text className="text-xs text-moa-muted">카드를 뒤집어 뽑아보세요</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelected('ladder')}
            activeOpacity={0.85}
            className="flex-1 h-36 rounded-3xl items-center justify-center gap-2.5"
            style={styles.cardLadder}
          >
            <Text className="text-4xl">🪜</Text>
            <View className="items-center gap-0.5">
              <Text className="text-sm font-semibold text-moa-text">사다리타기</Text>
              <Text className="text-xs text-moa-muted">공평하게 정해볼까요</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBar: {
    width: 3,
    height: 13,
    backgroundColor: '#222222',
    borderRadius: 2,
  },
  cardFood: {
    backgroundColor: '#FFF6EE',
  },
  cardActivity: {
    backgroundColor: '#EEFAF4',
  },
  cardLocation: {
    backgroundColor: '#EEF3FF',
  },
  cardRoulette: {
    backgroundColor: '#F3EEFF',
  },
  cardDraw: {
    backgroundColor: '#FFEEF5',
  },
  cardLadder: {
    backgroundColor: '#EEFAF4',
  },
});
