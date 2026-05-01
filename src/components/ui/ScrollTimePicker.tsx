import React from 'react'
import { View } from 'react-native'
import WheelColumn from './WheelColumn'

type TimeVal = { hour: number; minute: number }

type Props = {
  value: TimeVal
  onChange: (value: TimeVal) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

export default function ScrollTimePicker({ value, onChange }: Props) {
  return (
    <View className="flex-row items-center gap-1 px-2">
      <WheelColumn
        items={HOURS}
        selected={value.hour}
        onSelect={(h) => onChange({ ...value, hour: h })}
        format={(v) => `${String(v).padStart(2, '0')}시`}
      />
      <WheelColumn
        items={MINUTES}
        selected={value.minute}
        onSelect={(m) => onChange({ ...value, minute: m })}
        format={(v) => `${String(v).padStart(2, '0')}분`}
      />
    </View>
  )
}
