import React, { useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useCalendarData, DisplayEvent } from '@/hooks/useCalendarData'
import CalendarGrid from '@/components/features/calendar/CalendarGrid'
import MilestoneList, { MilestoneItem } from '@/components/features/calendar/MilestoneList'
import EventForm, { EventData } from '@/components/features/calendar/EventForm'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { toDateStr } from '@/utils/date'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

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

export default function CalendarScreen() {
  const router = useRouter()
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
    isConnected,
    goToPrevMonth,
    goToNextMonth,
    createEvent,
    removeEvent,
    editEvent,
  } = useCalendarData()

  const todayStr = useMemo(() => {
    const t = new Date()
    return toDateStr(t.getFullYear(), t.getMonth() + 1, t.getDate())
  }, [])

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formInitialDate, setFormInitialDate] = useState(todayStr)
  const [editingEvent, setEditingEvent] = useState<DisplayEvent | null>(null)
  const [maxFutureDays, setMaxFutureDays] = useState(1000)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  // 달력 셀 배열
  const rows = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    const r: (number | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) r.push(cells.slice(i, i + 7))
    return r
  }, [year, month])

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : []

  const openForm = (date: string) => {
    setEditingEvent(null)
    setFormInitialDate(date)
    setShowForm(true)
  }

  const openEditForm = (event: DisplayEvent) => {
    setEditingEvent(event)
    setFormInitialDate(event.start_date)
    setShowForm(true)
  }

  const handleSubmit = async (data: EventData) => {
    if (editingEvent) {
      await editEvent(editingEvent.id, {
        title: data.title,
        color: data.color,
        isAllDay: data.isAllDay,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
      })
      setEditingEvent(null)
    } else {
      await createEvent({
        title: data.title,
        color: data.color,
        isAllDay: data.isAllDay,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
      })
    }
    setShowForm(false)
  }

  // 마일스톤 계산
  const milestoneList = useMemo(() => {
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
  }, [anniversary, maxFutureDays])

  const getEventIcon = (event: DisplayEvent) => {
    if (event.id.startsWith('holiday-')) return '🔴'
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
        <TouchableOpacity onPress={goToPrevMonth} className="w-8 h-8 items-center justify-center">
          <Text className="text-xl text-moa-text">‹</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-moa-text">
          {year}년 {month}월
        </Text>
        <TouchableOpacity onPress={goToNextMonth} className="w-8 h-8 items-center justify-center">
          <Text className="text-xl text-moa-text">›</Text>
        </TouchableOpacity>
      </View>

      {/* 미연결 배너 */}
      {!isConnected && !loading && (
        <View style={styles.notConnectedBanner}>
          <Text style={styles.notConnectedText}>연결하면 함께 일정을 관리할 수 있어요</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings/connect' as never)}
            style={styles.connectButton}
          >
            <Text style={styles.connectButtonText}>연결하기</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 달력 그리드 */}
      <CalendarGrid
        rows={rows}
        loading={loading}
        eventsByDate={eventsByDate}
        selectedDate={selectedDate}
        todayStr={todayStr}
        userId={userId}
        myAvatar={myAvatar}
        partnerAvatar={partnerAvatar}
        year={year}
        month={month}
        onDayPress={(date) => {
          setSelectedDate((prev) => (prev === date ? null : date))
          setShowForm(false)
        }}
      />

      {/* 기념일 패널 — 날짜 미선택 시 */}
      {!selectedDate && milestoneList && (
        <MilestoneList
          milestones={milestoneList.milestones}
          totalDays={milestoneList.totalDays}
          onLoadMore={() => setMaxFutureDays((v) => v + 1000)}
        />
      )}

      {/* 선택 날짜 패널 */}
      {selectedDate && (
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-moa-text">
              {selectedDate.slice(5).replace('-', '월 ')}일
            </Text>
            {isConnected && (
              <TouchableOpacity onPress={() => openForm(selectedDate)} style={styles.addButton}>
                <Text style={styles.addButtonText}>+ 일정 추가</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.selectedDateScroll}>
            {selectedEvents.length === 0 ? (
              <Text className="text-sm text-moa-placeholder text-center py-2">일정이 없어요</Text>
            ) : (
              <View className="gap-2 pb-4">
                {selectedEvents.map((event) => {
                  const isMyEvent = !event.isBirthday && event.created_by === userId
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => isMyEvent ? openEditForm(event) : undefined}
                      activeOpacity={isMyEvent ? 0.7 : 1}
                    >
                      <View className="flex-row items-start gap-2.5 flex-1">
                        <View style={[styles.eventColorDot, { backgroundColor: event.color }]} />
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-moa-text">{event.title}</Text>
                          <Text className="text-xs text-moa-muted mt-0.5">{formatTimeLabel(event)}</Text>
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
                        {isMyEvent && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation()
                              setDeletingEventId(event.id)
                              setShowDeleteConfirm(true)
                            }}
                          >
                            <Text style={styles.deleteIcon}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="일정을 삭제할까요?"
        confirmText="삭제"
        destructive
        onConfirm={() => { setShowDeleteConfirm(false); if (deletingEventId) removeEvent(deletingEventId) }}
        onCancel={() => { setShowDeleteConfirm(false); setDeletingEventId(null) }}
      />

      {/* 일정 추가/수정 폼 */}
      <EventForm
        visible={showForm}
        initialDate={formInitialDate}
        submitting={submitting}
        initialData={editingEvent ? {
          title: editingEvent.title,
          color: editingEvent.color,
          isAllDay: editingEvent.is_all_day,
          startDate: editingEvent.start_date,
          endDate: editingEvent.end_date,
          startTime: editingEvent.start_time ?? undefined,
          endTime: editingEvent.end_time ?? undefined,
          description: editingEvent.description ?? undefined,
        } : undefined}
        onClose={() => { setEditingEvent(null); setShowForm(false) }}
        onSubmit={handleSubmit}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  notConnectedBanner: {
    backgroundColor: '#FFF9F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    alignItems: 'center',
    gap: 10,
  },
  notConnectedText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: '#222222',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 7,
  },
  connectButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  addButton: {
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  addButtonText: { fontSize: 12, color: '#888888' },
  selectedDateScroll: { flex: 1 },
  eventCard: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F0F0F0',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  eventColorDot: { width: 10, height: 10, borderRadius: 5, marginTop: 3 },
  avatarBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14 },
  ownerLabel: { fontSize: 9, color: '#AAAAAA', lineHeight: 12 },
  deleteIcon: { fontSize: 14, color: '#CCCCCC', marginTop: 4 },
})
