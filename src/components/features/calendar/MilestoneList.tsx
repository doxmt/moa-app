import { useCallback } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export type MilestoneItem = {
  label: string;
  date: Date;
  diff: number;
  isToday?: boolean;
};

interface Props {
  milestones: MilestoneItem[];
  totalDays: number;
  onLoadMore: () => void;
}

export default function MilestoneList({ milestones, totalDays, onLoadMore }: Props) {
  const renderItem = useCallback(({ item: m }: { item: MilestoneItem }) => {
    const isPast = m.diff < 0;
    const isToday = m.diff === 0;

    return (
      <View style={[styles.row, isToday ? styles.rowToday : styles.rowNormal]}>
        <Text
          style={[
            styles.label,
            isToday ? styles.textToday : isPast ? styles.textPast : styles.textFuture,
          ]}
        >
          {m.label}
        </Text>
        <Text style={isToday ? styles.dateToday : styles.dateNormal}>
          {m.date.getFullYear()}.
          {String(m.date.getMonth() + 1).padStart(2, '0')}.
          {String(m.date.getDate()).padStart(2, '0')}
        </Text>
        <Text
          style={[
            styles.diff,
            isToday ? styles.diffToday : isPast ? styles.diffPast : styles.diffFuture,
          ]}
        >
          {isToday ? '오늘 💕' : isPast ? `D+${Math.abs(m.diff)}` : `D-${m.diff}`}
        </Text>
      </View>
    );
  }, []);

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-1 mb-2">
        <Text className="text-xs font-medium text-moa-muted uppercase tracking-widest">기념일</Text>
        <Text className="text-xs text-moa-muted">{totalDays}일째 💕</Text>
      </View>
      <FlatList
        data={milestones}
        keyExtractor={(item) => item.label}
        renderItem={renderItem}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-1.5" />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1,
  },
  rowNormal: { backgroundColor: '#FFFFFF', borderColor: '#F0F0F0' },
  rowToday: { backgroundColor: '#FD79A8', borderColor: '#FD79A8' },
  label: { fontSize: 14, fontWeight: '600', flex: 1 },
  textFuture: { color: '#222222' },
  textPast: { color: '#CCCCCC' },
  textToday: { color: '#FFFFFF' },
  dateNormal: { fontSize: 12, color: '#AAAAAA' },
  dateToday: { fontSize: 12, color: '#FFFFFF' },
  diff: { fontSize: 14, fontWeight: '700', minWidth: 48, textAlign: 'right' },
  diffFuture: { color: '#FD79A8' },
  diffPast: { color: '#DDDDDD' },
  diffToday: { color: '#FFFFFF' },
  listContent: { paddingBottom: 16 },
});
