import React, { useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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
  const isScrollingRef = useRef(false)
  const prevSelectedRef = useRef(selected)

  useEffect(() => {
    const idx = items.indexOf(selected)
    if (idx < 0) return
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: false })
    }, 50)
  }, [])

  useEffect(() => {
    if (prevSelectedRef.current === selected) return
    prevSelectedRef.current = selected
    if (isScrollingRef.current) return
    const idx = items.indexOf(selected)
    if (idx >= 0) {
      scrollRef.current?.scrollTo({ y: idx * ITEM_HEIGHT, animated: true })
    }
  }, [selected, items])

  const snapToIndex = useCallback(
    (y: number) => {
      const idx = Math.round(y / ITEM_HEIGHT)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      scrollRef.current?.scrollTo({ y: clamped * ITEM_HEIGHT, animated: true })
      prevSelectedRef.current = items[clamped]
      onSelect(items[clamped])
    },
    [items, onSelect],
  )

  const onScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true
  }, [])

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrollingRef.current = false
      snapToIndex(e.nativeEvent.contentOffset.y)
    },
    [snapToIndex],
  )

  const onScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      snapToIndex(e.nativeEvent.contentOffset.y)
      setTimeout(() => {
        isScrollingRef.current = false
      }, 200)
    },
    [snapToIndex],
  )

  return (
    <View style={styles.container}>
      <View style={styles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        contentContainerStyle={styles.content}
        nestedScrollEnabled
      >
        {items.map((v) => (
          <View key={v} style={styles.item}>
            <Text style={v === selected ? styles.selectedText : styles.unselectedText}>
              {format(v)}
            </Text>
          </View>
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
