import React from 'react'
import { View } from 'react-native'
import WheelColumn from './WheelColumn'

type DateVal = { year: number; month: number; day: number }

type Props = {
  value: DateVal
  onChange: (value: DateVal) => void
  minYear?: number
  maxYear?: number
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export default function ScrollDatePicker({
  value,
  onChange,
  minYear = 1970,
  maxYear = new Date().getFullYear() + 5,
}: Props) {
  const today = new Date()
  const year = value?.year ?? today.getFullYear()
  const month = value?.month ?? today.getMonth() + 1
  const day = value?.day ?? today.getDate()

  const years = range(minYear, maxYear)
  const months = range(1, 12)
  const days = range(1, daysInMonth(year, month))

  const handleYear = (y: number) => {
    const maxDay = daysInMonth(y, month)
    onChange({ year: y, month, day: Math.min(day, maxDay) })
  }
  const handleMonth = (m: number) => {
    const maxDay = daysInMonth(year, m)
    onChange({ year, month: m, day: Math.min(day, maxDay) })
  }
  const handleDay = (d: number) => onChange({ year, month, day: d })

  return (
    <View className="flex-row gap-1 px-2">
      <WheelColumn
        items={years}
        selected={year}
        onSelect={handleYear}
        format={(v) => `${v}년`}
      />
      <WheelColumn
        items={months}
        selected={month}
        onSelect={handleMonth}
        format={(v) => `${v}월`}
      />
      <WheelColumn
        items={days}
        selected={day}
        onSelect={handleDay}
        format={(v) => `${v}일`}
      />
    </View>
  )
}
