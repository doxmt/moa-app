import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCalendarData, DisplayEvent } from '@/hooks/useCalendarData'
import ScrollDatePicker from '@/components/ui/ScrollDatePicker'
import DateTimeWheelPicker, { DateTimeVal } from '@/components/ui/DateTimeWheelPicker'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const COLORS = [
  '#222222',
  '#FF6B6B',
  '#FF9F43',
  '#FECA57',
  '#1DD1A1',
  '#54A0FF',
  '#A29BFE',
  '#FD79A8',
]

type DateVal = { year: number; month: number; day: number }

function formatDateTimeDisplay(dt: DateTimeVal): string {
  const d = new Date(`${dt.date}T00:00:00`)
  const m = d.getMonth() + 1
  const day = d.getDate()
  const wd = WEEKDAYS[d.getDay()]
  const ampm = dt.hour < 12 ? '오전' : '오후'
  const h12 = dt.hour === 0 ? 12 : dt.hour > 12 ? dt.hour - 12 : dt.hour
  const min = String(dt.minute).padStart(2, '0')
  return `${m}월 ${day}일 ${wd} ${ampm} ${h12}:${min}`
}

function formatDateOnlyDisplay(dv: DateVal): string {
  return `${dv.year}년 ${dv.month}월 ${dv.day}일`
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function dateValToStr(d: DateVal) {
  return toDateStr(d.year, d.month, d.day)
}

function strToDateVal(s: string): DateVal {
  const [year, month, day] = s.split('-').map(Number)
  return { year, month, day }
}

function dateTimeValToTimeStr(dt: DateTimeVal) {
  return `${String(dt.hour).padStart(2, '0')}:${String(dt.minute).padStart(2, '0')}`
}

function formatTimeLabel(event: DisplayEvent) {
  if (event.is_all_day) {
    return event.start_date !== event.end_date
      ? `${event.start_date.slice(5).replace('-', '/')} ~ ${event.end_date.slice(5).replace('-', '/')}`
      : '하루종일'
  }
  const s = event.start_time?.slice(0, 5) ?? ''
  const e = event.end_time?.slice(0, 5) ?? ''
  return s && e ? `${s} ~ ${e}` : s
}

type MilestoneItem = {
  label: string
  date: Date
  diff: number
  isToday?: boolean
}

export default function CalendarScreen() {
  const {
    year,
    month,
    userId,
    myAvatar,
    partnerAvatar,
    myNickname,
    partnerNickname,
    anniversary,
    eventsByDate,
    loading,
    submitting,
    goToPrevMonth,
    goToNextMonth,
    createEvent,
    removeEvent,
  } = useCalendarData()

  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const insets = useSafeAreaInsets()

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [isAllDay, setIsAllDay] = useState(false)
  const [startDateTime, setStartDateTime] = useState<DateTimeVal>({ date: todayStr, hour: 9, minute: 0 })
  const [endDateTime, setEndDateTime] = useState<DateTimeVal>({ date: todayStr, hour: 10, minute: 0 })
  const [startDateOnly, setStartDateOnly] = useState<DateVal>({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() })
  const [endDateOnly, setEndDateOnly] = useState<DateVal>({ year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() })
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [description, setDescription] = useState('')
  const [maxFutureDays, setMaxFutureDays] = useState(1000)

  // 달력 셀 배열
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  // rows of 7
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  const openForm = (date: string) => {
    const dv = strToDateVal(date)
    setTitle('')
    setColor(COLORS[0])
    setIsAllDay(false)
    setStartDateTime({ date, hour: 9, minute: 0 })
    setEndDateTime({ date, hour: 10, minute: 0 })
    setStartDateOnly(dv)
    setEndDateOnly(dv)
    setShowStartPicker(false)
    setShowEndPicker(false)
    setDescription('')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return

    await createEvent({
      title: title.trim(),
      color,
      isAllDay,
      startDate: isAllDay ? dateValToStr(startDateOnly) : startDateTime.date,
      endDate: isAllDay ? dateValToStr(endDateOnly) : endDateTime.date,
      startTime: isAllDay ? undefined : dateTimeValToTimeStr(startDateTime),
      endTime: isAllDay ? undefined : dateTimeValToTimeStr(endDateTime),
      description: description.trim() || undefined,
    })

    setShowForm(false)
  }

  // 마일스톤 계산
  const milestoneList = (() => {
    if (!anniversary) return null

    const todayD = new Date()
    todayD.setHours(0, 0, 0, 0)
    const start = new Date(anniversary)
    start.setHours(0, 0, 0, 0)
    const totalDays =
      Math.floor((todayD.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const milestones: MilestoneItem[] = []

    milestones.push({
      label: '처음 만난 날',
      date: new Date(start),
      diff: Math.floor((start.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24)),
    })

    const dayTargets = [10, 50]
    const maxDay = totalDays + maxFutureDays
    for (let d = 100; d <= maxDay; d += 100) dayTargets.push(d)
    for (const d of dayTargets) {
      const date = new Date(start)
      date.setDate(date.getDate() + d - 1)
      milestones.push({
        label: `${d}일`,
        date,
        diff: Math.floor((date.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24)),
      })
    }

    const maxYear = Math.ceil((totalDays + maxFutureDays) / 365)
    for (let y = 1; y <= maxYear; y++) {
      const date = new Date(start)
      date.setFullYear(date.getFullYear() + y)
      milestones.push({
        label: `${y}주년`,
        date,
        diff: Math.floor((date.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24)),
      })
    }

    milestones.sort((a, b) => a.date.getTime() - b.date.getTime())

    const exactMatch = milestones.find((m) => m.diff === 0)
    if (exactMatch) {
      exactMatch.isToday = true
    } else {
      const futureIdx = milestones.findIndex((m) => m.diff > 0)
      milestones.splice(futureIdx >= 0 ? futureIdx : milestones.length, 0, {
        label: `오늘 · ${totalDays}일`,
        date: new Date(todayD),
        diff: 0,
        isToday: true,
      })
    }

    return { milestones, totalDays }
  })()

  const renderMilestoneItem = useCallback(
    ({ item: m }: { item: MilestoneItem }) => {
      const isPast = m.diff < 0
      const isToday = m.diff === 0
      return (
        <View
          style={[
            styles.milestoneRow,
            isToday ? styles.milestoneTodayBg : styles.milestoneBg,
          ]}
        >
          <Text
            style={[
              styles.milestoneLabel,
              isToday
                ? styles.milestoneTextToday
                : isPast
                  ? styles.milestoneTextPast
                  : styles.milestoneTextFuture,
            ]}
          >
            {m.label}
          </Text>
          <Text style={isToday ? styles.milestoneDateToday : styles.milestoneDateNormal}>
            {m.date.getFullYear()}.
            {String(m.date.getMonth() + 1).padStart(2, '0')}.
            {String(m.date.getDate()).padStart(2, '0')}
          </Text>
          <Text
            style={[
              styles.milestoneDiff,
              isToday
                ? styles.milestoneDiffToday
                : isPast
                  ? styles.milestoneDiffPast
                  : styles.milestoneDiffFuture,
            ]}
          >
            {isToday
              ? '오늘 💕'
              : isPast
                ? `D+${Math.abs(m.diff)}`
                : `D-${m.diff}`}
          </Text>
        </View>
      )
    },
    [],
  )

  const getEventIcon = (event: DisplayEvent) => {
    if (event.id.startsWith('holiday-')) return '⚪️'
    if (event.id === 'bday-anniversary' || event.id.startsWith('milestone-')) return '💕'
    if (event.id === 'bday-my') return myAvatar
    if (event.id === 'bday-partner') return partnerAvatar
    return event.created_by === userId ? myAvatar : partnerAvatar
  }

  const getEventOwnerLabel = (event: DisplayEvent) => {
    if (event.id.startsWith('holiday-')) return '공휴일'
    if (event.id === 'bday-anniversary' || event.id.startsWith('milestone-')) return '기념일'
    if (event.id === 'bday-my' || event.id === 'bday-partner') return myNickname
    return event.created_by === userId ? myNickname : partnerNickname
  }

  return (
    <View className="flex-1 px-4 pt-2 pb-2">
      {/* 월 헤더 */}
      <View className="flex-row items-center justify-between mb-2">
        <TouchableOpacity
          onPress={goToPrevMonth}
          className="w-8 h-8 items-center justify-center"
        >
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-moa-text">
          {year}년 {month}월
        </Text>
        <TouchableOpacity
          onPress={goToNextMonth}
          className="w-8 h-8 items-center justify-center"
        >
          <Text className="text-xl text-moa-text">›</Text>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View className="flex-row mb-1">
        {WEEKDAYS.map((d, i) => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={[
                styles.weekdayText,
                i === 0 ? styles.sundayText : i === 6 ? styles.saturdayText : styles.weekdayDefault,
              ]}
            >
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* 달력 그리드 */}
      {loading ? (
        <View className="items-center justify-center py-6">
          <ActivityIndicator color="#CCCCCC" />
        </View>
      ) : (
        <View className="mb-2">
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} className="flex-row">
              {row.map((day, colIdx) => {
                if (day === null) {
                  return <View key={`e-${rowIdx}-${colIdx}`} style={[styles.cell, { flex: 1 }]} />
                }

                const dateStr = toDateStr(year, month, day)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDate
                const dayEvents = eventsByDate[dateStr] ?? []
                const isHoliday = dayEvents.some((e) => e.id.startsWith('holiday-'))
                const isSunday = colIdx === 0
                const isSaturday = colIdx === 6

                return (
                  <TouchableOpacity
                    key={dateStr}
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedDate(isSelected ? null : dateStr)
                      setShowForm(false)
                    }}
                  >
                    <View style={styles.cell}>
                      <View
                        style={[
                          styles.dayBadge,
                          isSelected
                            ? styles.dayBadgeSelected
                            : isToday
                              ? styles.dayBadgeToday
                              : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isSelected
                              ? styles.dayTextSelected
                              : isToday
                                ? styles.dayTextToday
                                : isHoliday || isSunday
                                  ? styles.sundayText
                                  : isSaturday
                                    ? styles.saturdayText
                                    : styles.dayTextNormal,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                      <View style={styles.eventDots}>
                        {dayEvents.slice(0, 2).map((ev) => (
                          <View
                            key={ev.id}
                            style={[styles.eventChip, { backgroundColor: ev.color }]}
                          >
                            <Text style={styles.eventIcon}>
                              {ev.id.startsWith('holiday-')
                                ? '⚪'
                                : ev.id === 'bday-anniversary' || ev.id.startsWith('milestone-')
                                  ? '💕'
                                  : ev.id === 'bday-my'
                                    ? myAvatar
                                    : ev.id === 'bday-partner'
                                      ? partnerAvatar
                                      : ev.created_by === userId
                                        ? myAvatar
                                        : partnerAvatar}
                            </Text>
                            <Text style={styles.eventChipText} numberOfLines={1}>
                              {ev.title}
                            </Text>
                          </View>
                        ))}
                        {dayEvents.length > 2 && (
                          <Text style={styles.moreEvents}>+{dayEvents.length - 2}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {/* 기념일 패널 — 날짜 미선택 시 */}
      {!selectedDate && milestoneList && (
        <View className="flex-1">
          <View className="flex-row items-center justify-between px-1 mb-2">
            <Text className="text-xs font-medium text-moa-muted uppercase tracking-widest">
              기념일
            </Text>
            <Text className="text-xs text-moa-muted">{milestoneList.totalDays}일째 💕</Text>
          </View>
          <FlatList
            data={milestoneList.milestones}
            keyExtractor={(item) => item.label}
            renderItem={renderMilestoneItem}
            onEndReached={() => setMaxFutureDays((v) => v + 1000)}
            onEndReachedThreshold={0.1}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View className="h-1.5" />}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        </View>
      )}

      {/* 선택 날짜 패널 */}
      {selectedDate && (
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-moa-text">
              {selectedDate.slice(5).replace('-', '월 ')}일
            </Text>
            <TouchableOpacity
              onPress={() => openForm(selectedDate)}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>+ 일정 추가</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* 일정 목록 */}
            {selectedEvents.length === 0 ? (
              <Text className="text-sm text-moa-placeholder text-center py-2">
                일정이 없어요
              </Text>
            ) : (
              <View className="gap-2 pb-4">
                {selectedEvents.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View className="flex-row items-start gap-2.5 flex-1">
                      <View
                        style={[styles.eventColorDot, { backgroundColor: event.color }]}
                      />
                      <View className="flex-1">
                        <Text className="text-sm font-medium text-moa-text">{event.title}</Text>
                        <Text className="text-xs text-moa-muted mt-0.5">
                          {formatTimeLabel(event)}
                        </Text>
                        {event.description ? (
                          <Text className="text-xs text-moa-sub mt-0.5">{event.description}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View className="items-center gap-0.5 ml-3">
                      <View style={styles.avatarBadge}>
                        <Text style={styles.avatarText}>{getEventIcon(event)}</Text>
                      </View>
                      <Text style={styles.ownerLabel}>{getEventOwnerLabel(event)}</Text>
                      {!event.isBirthday && (
                        <TouchableOpacity
                          onPress={() =>
                            Alert.alert('일정 삭제', '이 일정을 삭제할까요?', [
                              { text: '취소', style: 'cancel' },
                              { text: '삭제', style: 'destructive', onPress: () => removeEvent(event.id) },
                            ])
                          }
                        >
                          <Text style={styles.deleteIcon}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* 일정 추가 모달 */}
      <Modal
        visible={showForm}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowForm(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#F2F2F7' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          pointerEvents={submitting ? 'none' : 'auto'}
        >
          {/* 상단바 */}
          <View style={[styles.formNavBar, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setShowForm(false)} style={styles.formNavBtn}>
              <Text style={styles.formNavCancel}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.formNavTitle}>일정 추가</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !title.trim()}
              style={styles.formNavBtn}
            >
              <Text style={[styles.formNavSave, (submitting || !title.trim()) && { opacity: 0.3 }]}>
                {submitting ? '저장 중' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
          >
            {/* 제목 */}
            <View style={styles.formSection}>
              <TextInput
                placeholder="일정 제목"
                placeholderTextColor="#CCCCCC"
                value={title}
                onChangeText={setTitle}
                style={styles.formTitleInput}
              />
            </View>

            {/* 색상 */}
            <View style={styles.formSection}>
              <View style={styles.formRow}>
                <Text style={styles.formRowLabel}>색상</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {COLORS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setColor(c)}
                      style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                    >
                      {color === c && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* 시작 / 종료 / 하루종일 */}
            <View style={styles.formSection}>
              {/* 시작 */}
              <TouchableOpacity
                style={styles.formRow}
                onPress={() => {
                  setShowStartPicker((v) => !v)
                  setShowEndPicker(false)
                }}
              >
                <Text style={styles.formRowLabel}>시작</Text>
                <Text style={styles.formRowValue}>
                  {isAllDay
                    ? formatDateOnlyDisplay(startDateOnly)
                    : formatDateTimeDisplay(startDateTime)}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <View style={styles.pickerBox}>
                  {isAllDay ? (
                    <ScrollDatePicker
                      value={startDateOnly}
                      onChange={(v) => {
                        setStartDateOnly(v)
                        if (dateValToStr(v) > dateValToStr(endDateOnly)) setEndDateOnly(v)
                      }}
                      minYear={2020}
                      maxYear={today.getFullYear() + 5}
                    />
                  ) : (
                    <DateTimeWheelPicker
                      value={startDateTime}
                      onChange={(v) => {
                        setStartDateTime(v)
                        const startMs = new Date(`${v.date}T${String(v.hour).padStart(2,'0')}:${String(v.minute).padStart(2,'0')}`).getTime()
                        const endMs = new Date(`${endDateTime.date}T${String(endDateTime.hour).padStart(2,'0')}:${String(endDateTime.minute).padStart(2,'0')}`).getTime()
                        if (endMs <= startMs) {
                          const newEnd = new Date(startMs + 60 * 60 * 1000)
                          setEndDateTime({
                            date: newEnd.toISOString().slice(0, 10),
                            hour: newEnd.getHours(),
                            minute: Math.round(newEnd.getMinutes() / 5) * 5 % 60,
                          })
                        }
                      }}
                      baseDate={selectedDate ?? todayStr}
                    />
                  )}
                </View>
              )}

              <View style={styles.formDivider} />

              {/* 종료 */}
              <TouchableOpacity
                style={styles.formRow}
                onPress={() => {
                  setShowEndPicker((v) => !v)
                  setShowStartPicker(false)
                }}
              >
                <Text style={styles.formRowLabel}>종료</Text>
                <Text style={styles.formRowValue}>
                  {isAllDay
                    ? formatDateOnlyDisplay(endDateOnly)
                    : formatDateTimeDisplay(endDateTime)}
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <View style={styles.pickerBox}>
                  {isAllDay ? (
                    <ScrollDatePicker
                      value={endDateOnly}
                      onChange={setEndDateOnly}
                      minYear={2020}
                      maxYear={today.getFullYear() + 5}
                    />
                  ) : (
                    <DateTimeWheelPicker
                      value={endDateTime}
                      onChange={setEndDateTime}
                      baseDate={selectedDate ?? todayStr}
                    />
                  )}
                </View>
              )}

              <View style={styles.formDivider} />

              {/* 하루종일 */}
              <View style={styles.formRow}>
                <Text style={styles.formRowLabel}>하루종일</Text>
                <Switch
                  value={isAllDay}
                  onValueChange={(v) => {
                    setIsAllDay(v)
                    setShowStartPicker(false)
                    setShowEndPicker(false)
                  }}
                  trackColor={{ false: '#E0E0E0', true: '#222222' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* 메모 */}
            <View style={styles.formSection}>
              <TextInput
                placeholder="메모"
                placeholderTextColor="#CCCCCC"
                value={description}
                onChangeText={setDescription}
                style={styles.formMemoInput}
                multiline
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  formNavBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C8C8C8',
  },
  formNavBtn: {
    minWidth: 56,
    paddingVertical: 8,
  },
  formNavTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222222',
  },
  formNavCancel: {
    fontSize: 16,
    color: '#888888',
  },
  formNavSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222222',
    textAlign: 'right',
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  formRowLabel: {
    fontSize: 15,
    color: '#222222',
  },
  formRowValue: {
    fontSize: 14,
    color: '#888888',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8E8',
    marginLeft: 16,
  },
  formTitleInput: {
    fontSize: 17,
    color: '#222222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  formMemoInput: {
    fontSize: 15,
    color: '#222222',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 80,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '500',
    paddingBottom: 4,
  },
  weekdayDefault: {
    color: '#AAAAAA',
  },
  sundayText: {
    color: '#F87171',
  },
  saturdayText: {
    color: '#60A5FA',
  },
  cell: {
    minHeight: 56,
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeSelected: {
    backgroundColor: '#222222',
  },
  dayBadgeToday: {
    borderWidth: 1,
    borderColor: '#222222',
  },
  dayText: {
    fontSize: 13,
  },
  dayTextNormal: {
    color: '#222222',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayTextToday: {
    color: '#222222',
    fontWeight: '600',
  },
  eventDots: {
    width: '100%',
    paddingHorizontal: 2,
    gap: 2,
    marginTop: 2,
  },
  eventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
    gap: 2,
    overflow: 'hidden',
  },
  eventIcon: {
    fontSize: 7,
    lineHeight: 9,
  },
  eventChipText: {
    fontSize: 8,
    lineHeight: 11,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  moreEvents: {
    fontSize: 8,
    lineHeight: 11,
    color: '#AAAAAA',
    paddingHorizontal: 3,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  milestoneBg: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F0F0F0',
  },
  milestoneTodayBg: {
    backgroundColor: '#FD79A8',
    borderColor: '#FD79A8',
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  milestoneTextFuture: {
    color: '#222222',
  },
  milestoneTextPast: {
    color: '#CCCCCC',
  },
  milestoneTextToday: {
    color: '#FFFFFF',
  },
  milestoneDateNormal: {
    fontSize: 12,
    color: '#AAAAAA',
  },
  milestoneDateToday: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  milestoneDiff: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
  },
  milestoneDiffFuture: {
    color: '#FD79A8',
  },
  milestoneDiffPast: {
    color: '#DDDDDD',
  },
  milestoneDiffToday: {
    color: '#FFFFFF',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addButtonText: {
    fontSize: 12,
    color: '#888888',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 6,
    color: '#222222',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.25 }],
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  typeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    marginTop: 12,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  typeTabActive: {
    backgroundColor: '#222222',
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#888888',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },
  pickerLabel: {
    fontSize: 11,
    color: '#AAAAAA',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  pickerBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FAFAFA',
    paddingVertical: 4,
  },
  rangeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
  },
  rangeTabActive: {
    backgroundColor: '#F0F0F0',
  },
  rangeTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#AAAAAA',
  },
  rangeTabTextActive: {
    color: '#222222',
  },
  saveButton: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#222222',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  avatarBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
  },
  ownerLabel: {
    fontSize: 9,
    color: '#AAAAAA',
    lineHeight: 12,
  },
  deleteIcon: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 4,
  },
})
