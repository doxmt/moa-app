import React, { useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'

export const ITEM_HEIGHT = 44
export const VISIBLE = 5
const PADDING = Math.floor(VISIBLE / 2)

type Props = {
  items: number[]
  selected: number
  onSelect: (v: number) => void
  format: (v: number) => string
}

export default function WheelColumn({ items, selected, onSelect, format }: Props) {
  const scrollRef = useRef<ScrollView>(null)
  const prevSelectedRef = useRef(selected)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    const idx = items.indexOf(selected)
    if (idx < 0) return
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false })
    }, 50)
    return () => clearTimeout(timer)
  }, [items, selected])

  useEffect(() => {
    if (prevSelectedRef.current === selected || isDraggingRef.current) return
    prevSelectedRef.current = selected
    const idx = items.indexOf(selected)
    if (idx >= 0) {
      scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true })
    }
  }, [selected, items])

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isDraggingRef.current = false
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      prevSelectedRef.current = items[clamped]
      onSelect(items[clamped])
    },
    [items, onSelect],
  )

  return (
    <View style={styles.container}>
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={() => { isDraggingRef.current = true }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
      >
        {items.map((v) => (
          <TouchableOpacity
            key={v}
            style={styles.item}
            activeOpacity={0.6}
            onPress={() => {
              prevSelectedRef.current = v;
              onSelect(v);
              const idx = items.indexOf(v);
              scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true });
            }}
          >
            <Text style={v === selected ? styles.selectedText : styles.unselectedText}>
              {format(v)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: ITEM_HEIGHT * VISIBLE,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: ITEM_HEIGHT * PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    zIndex: 0,
  },
  content: {
    paddingTop: ITEM_HEIGHT * PADDING,
    paddingBottom: ITEM_HEIGHT * PADDING,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
  },
  unselectedText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#AAAAAA',
  },
})
