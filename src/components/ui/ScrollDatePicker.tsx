import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type DateValue = { year: number; month: number; day: number };

type Props = {
  value: DateValue | null;
  onChange: (value: DateValue) => void;
  minYear?: number;
  maxYear?: number;
};

const ITEM_HEIGHT = 44;
const VISIBLE = 5;
const PADDING = Math.floor(VISIBLE / 2); // 2

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function Column({
  items,
  selected,
  onSelect,
  format,
}: {
  items: number[];
  selected: number;
  onSelect: (v: number) => void;
  format: (v: number) => string;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const didScrollByUser = useRef(false);

  useEffect(() => {
    if (didScrollByUser.current) {
      didScrollByUser.current = false;
      return;
    }
    const idx = items.indexOf(selected);
    if (idx >= 0) {
      // 마운트 이후 약간 지연해야 ScrollView가 준비됨
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false });
      }, 0);
    }
  }, [selected, items]);

  const handleScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true });
      didScrollByUser.current = true;
      onSelect(items[clamped]);
    },
    [items, onSelect],
  );

  return (
    <View style={styles.column}>
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PADDING * ITEM_HEIGHT }}
      >
        {items.map((v) => (
          <TouchableOpacity key={v} onPress={() => onSelect(v)} style={styles.item} activeOpacity={0.7}>
            <Text style={[styles.itemText, v === selected && styles.selectedText]}>{format(v)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ScrollDatePicker({
  value,
  onChange,
  minYear = 1970,
  maxYear = new Date().getFullYear(),
}: Props) {
  const today = new Date();
  const year = value?.year ?? today.getFullYear();
  const month = value?.month ?? today.getMonth() + 1;
  const day = value?.day ?? today.getDate();

  const years = range(minYear, maxYear);
  const months = range(1, 12);
  const days = range(1, daysInMonth(year, month));

  return (
    <View style={styles.container}>
      <Column
        items={years}
        selected={year}
        onSelect={(y) => onChange({ year: y, month, day: Math.min(day, daysInMonth(y, month)) })}
        format={(v) => `${v}년`}
      />
      <Column
        items={months}
        selected={month}
        onSelect={(m) => onChange({ year, month: m, day: Math.min(day, daysInMonth(year, m)) })}
        format={(v) => `${v}월`}
      />
      <Column
        items={days}
        selected={day}
        onSelect={(d) => onChange({ year, month, day: d })}
        format={(v) => `${v}일`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
  },
  column: {
    flex: 1,
    height: ITEM_HEIGHT * VISIBLE,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 14,
    color: '#AAAAAA',
  },
  selectedText: {
    fontSize: 16,
    color: '#222222',
    fontWeight: '600',
  },
});
