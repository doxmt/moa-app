import React, { useMemo } from 'react'
import { View } from 'react-native'
import WheelColumn from './WheelColumn'

export type DateTimeVal = {
  date: string  // YYYY-MM-DD
  hour: number  // 0-23
  minute: number // 0, 5, 10, ..., 55
}

type Props = {
  value: DateTimeVal
  onChange: (v: DateTimeVal) => void
  baseDate: string // YYYY-MM-DD — 날짜 컬럼의 중심
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const AMPM_ITEMS = [0, 1]
const HOUR_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTE_ITEMS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
const PAST_DAYS = 30
const FUTURE_DAYS = 90

function generateDates(baseDate: string): string[] {
  const base = new Date(baseDate + 'T00:00:00')
  const dates: string[] = []
  for (let i = -PAST_DAYS; i <= FUTURE_DAYS; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }
  return dates
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`
}

function to12h(hour24: number): { ampm: number; hour12: number } {
  if (hour24 === 0) return { ampm: 0, hour12: 12 }
  if (hour24 < 12) return { ampm: 0, hour12: hour24 }
  if (hour24 === 12) return { ampm: 1, hour12: 12 }
  return { ampm: 1, hour12: hour24 - 12 }
}

function to24h(ampm: number, hour12: number): number {
  if (ampm === 0) return hour12 === 12 ? 0 : hour12
  return hour12 === 12 ? 12 : hour12 + 12
}

function snapMinute(m: number): number {
  return MINUTE_ITEMS.reduce((prev, curr) =>
    Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev,
  )
}

export default function DateTimeWheelPicker({ value, onChange, baseDate }: Props) {
  const dates = useMemo(() => generateDates(baseDate), [baseDate])
  const dateIndices = useMemo(() => dates.map((_, i) => i), [dates])

  const selectedDateIdx = Math.max(0, dates.indexOf(value.date))
  const { ampm, hour12 } = to12h(value.hour)
  const minute = snapMinute(value.minute)

  const handleDate = (idx: number) =>
    onChange({ ...value, date: dates[idx] ?? value.date })

  const handleAmpm = (newAmpm: number) =>
    onChange({ ...value, hour: to24h(newAmpm, hour12) })

  const handleHour = (newHour12: number) =>
    onChange({ ...value, hour: to24h(ampm, newHour12) })

  const handleMinute = (newMinute: number) =>
    onChange({ ...value, minute: newMinute })

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
      <View style={{ flex: 5 }}>
        <WheelColumn
          items={dateIndices}
          selected={selectedDateIdx}
          onSelect={handleDate}
          format={(i) => formatDate(dates[i] ?? baseDate)}
        />
      </View>
      <View style={{ flex: 2 }}>
        <WheelColumn
          items={AMPM_ITEMS}
          selected={ampm}
          onSelect={handleAmpm}
          format={(v) => (v === 0 ? '오전' : '오후')}
        />
      </View>
      <View style={{ flex: 2 }}>
        <WheelColumn
          items={HOUR_ITEMS}
          selected={hour12}
          onSelect={handleHour}
          format={(v) => String(v)}
        />
      </View>
      <View style={{ flex: 2 }}>
        <WheelColumn
          items={MINUTE_ITEMS}
          selected={minute}
          onSelect={handleMinute}
          format={(v) => String(v).padStart(2, '0')}
        />
      </View>
    </View>
  )
}
