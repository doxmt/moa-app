import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  CalendarEvent,
  CreateEventInput,
  getEventsByMonth,
  addEvent,
  deleteEvent,
  updateEvent,
} from '@/lib/supabase/calendar'
import { getKoreanHolidays } from '@/utils/holidays'

export type DisplayEvent = CalendarEvent & { isBirthday?: boolean }

type State = {
  coupleId: string
  userId: string
  myAvatar: string
  partnerAvatar: string
  myNickname: string
  partnerNickname: string
  myBirthday: string | null
  partnerBirthday: string | null
  anniversary: string | null
  events: CalendarEvent[]
  loading: boolean
  submitting: boolean
  year: number
  month: number
  isConnected: boolean
}

function makeVirtualEvent(
  id: string,
  title: string,
  color: string,
  mmdd: string,
  year: number,
  createdBy: string,
): CalendarEvent & { isBirthday: true } {
  const date = `${year}-${mmdd}`
  return {
    id,
    couple_id: '',
    title,
    color,
    is_all_day: true,
    start_date: date,
    end_date: date,
    start_time: null,
    end_time: null,
    description: null,
    created_by: createdBy,
    created_at: '',
    isBirthday: true,
  }
}

export function useCalendarData() {
  const today = new Date()
  const [state, setState] = useState<State>({
    coupleId: '',
    userId: '',
    myAvatar: '🐻',
    partnerAvatar: '🐱',
    myNickname: '',
    partnerNickname: '',
    myBirthday: null,
    partnerBirthday: null,
    anniversary: null,
    events: [],
    loading: true,
    submitting: false,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    isConnected: false,
  })

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id, avatar, couple_nickname, name, birthday')
        .eq('user_id', user.id)
        .single()

      if (cancelled) return
      if (!profile?.couple_id) {
        setState((prev) => ({ ...prev, loading: false, isConnected: false }))
        return
      }

      const [{ data: partner }, { data: couple }] = await Promise.all([
        supabase
          .from('profiles')
          .select('avatar, couple_nickname, name, birthday')
          .eq('couple_id', profile.couple_id)
          .neq('user_id', user.id)
          .single(),
        supabase
          .from('couples')
          .select('anniversary')
          .eq('id', profile.couple_id)
          .single(),
      ])

      if (cancelled) return
      const toMMDD = (s: string | null) => (s ? s.slice(5) : null)

      setState((prev) => ({
        ...prev,
        coupleId: profile.couple_id,
        userId: user.id,
        myAvatar: profile.avatar ?? '🐻',
        partnerAvatar: partner?.avatar ?? '🐱',
        myNickname: profile.couple_nickname ?? profile.name ?? '나',
        partnerNickname: partner?.couple_nickname ?? partner?.name ?? '상대방',
        myBirthday: toMMDD(profile.birthday ?? null),
        partnerBirthday: toMMDD(partner?.birthday ?? null),
        anniversary: couple?.anniversary ?? null,
        isConnected: true,
      }))
    }
    init()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!state.coupleId) return
    let cancelled = false

    async function load() {
      setState((prev) => ({ ...prev, loading: true }))
      try {
        const events = await getEventsByMonth(state.coupleId, state.year, state.month)
        if (cancelled) return
        setState((prev) => ({ ...prev, events, loading: false }))
      } catch (e) {
        if (cancelled) return
        console.error('[calendar] load events failed', e)
        setState((prev) => ({ ...prev, loading: false }))
      }
    }

    load()
    return () => { cancelled = true }
  }, [state.coupleId, state.year, state.month])

  const goToPrevMonth = useCallback(() => {
    setState((prev) => {
      const d = new Date(prev.year, prev.month - 2, 1)
      return { ...prev, year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }, [])

  const goToNextMonth = useCallback(() => {
    setState((prev) => {
      const d = new Date(prev.year, prev.month, 1)
      return { ...prev, year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }, [])

  const createEvent = useCallback(
    async (input: Omit<CreateEventInput, 'coupleId' | 'userId'>) => {
      if (!state.coupleId || !state.userId) return
      setState((prev) => ({ ...prev, submitting: true }))
      try {
        const newEvent = await addEvent({ ...input, coupleId: state.coupleId, userId: state.userId })
        setState((prev) => ({
          ...prev,
          events: [...prev.events, newEvent].sort((a, b) =>
            a.start_date.localeCompare(b.start_date)
          ),
          submitting: false,
        }))
      } catch (e) {
        console.error('[calendar] createEvent failed', e)
        setState((prev) => ({ ...prev, submitting: false }))
      }
    },
    [state.coupleId, state.userId]
  )

  const removeEvent = useCallback(
    async (eventId: string) => {
      const { coupleId, year, month } = state
      setState((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== eventId) }))
      try {
        await deleteEvent(eventId)
      } catch (e) {
        console.error('[calendar] removeEvent failed', e)
        const events = await getEventsByMonth(coupleId, year, month)
        setState((prev) => {
          if (prev.coupleId !== coupleId || prev.year !== year || prev.month !== month) return prev
          return { ...prev, events }
        })
      }
    },
    [state.coupleId, state.year, state.month]
  )

  const editEvent = useCallback(
    async (eventId: string, input: Omit<CreateEventInput, 'coupleId' | 'userId'>) => {
      setState((prev) => ({ ...prev, submitting: true }))
      try {
        await updateEvent({
          eventId,
          title: input.title,
          color: input.color,
          isAllDay: input.isAllDay,
          startDate: input.startDate,
          endDate: input.endDate,
          startTime: input.startTime,
          endTime: input.endTime,
          description: input.description,
        })
        setState((prev) => ({
          ...prev,
          events: prev.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  title: input.title,
                  color: input.color,
                  is_all_day: input.isAllDay,
                  start_date: input.startDate,
                  end_date: input.endDate,
                  start_time: input.startTime ?? null,
                  end_time: input.endTime ?? null,
                  description: input.description ?? null,
                }
              : e
          ),
          submitting: false,
        }))
      } catch (e) {
        console.error('[calendar] editEvent failed', e)
        setState((prev) => ({ ...prev, submitting: false }))
      }
    },
    []
  )

  // 생일 + 기념일 + 마일스톤 가상 이벤트 생성
  const birthdayEvents: DisplayEvent[] = []
  const monthStr = String(state.month).padStart(2, '0')
  const monthEnd = `${state.year}-${monthStr}-${String(new Date(state.year, state.month, 0).getDate()).padStart(2, '0')}`
  const monthStart = `${state.year}-${monthStr}-01`

  if (state.anniversary) {
    const anniversaryYear = Number(state.anniversary.slice(0, 4))
    const mmdd = state.anniversary.slice(5)
    if (anniversaryYear === state.year && mmdd.startsWith(monthStr)) {
      birthdayEvents.push(makeVirtualEvent('bday-anniversary', '처음 만난 날', '#FD79A8', mmdd, state.year, ''))
    }

    const start = new Date(state.anniversary)
    start.setHours(0, 0, 0, 0)
    const mStart = new Date(monthStart)
    const mEnd = new Date(monthEnd)

    const dayTargets = [10, 50]
    const maxLookAhead = Math.ceil((mEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    for (let d = 100; d <= maxLookAhead; d += 100) dayTargets.push(d)
    for (const d of dayTargets) {
      const date = new Date(start)
      date.setDate(date.getDate() + d - 1)
      if (date >= mStart && date <= mEnd) {
        const dm = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        birthdayEvents.push(makeVirtualEvent(`milestone-${d}d`, `${d}일`, '#FD79A8', dm, state.year, ''))
      }
    }

    for (let y = 1; y <= 50; y++) {
      const date = new Date(start)
      date.setFullYear(date.getFullYear() + y)
      if (date >= mStart && date <= mEnd) {
        const dm = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        birthdayEvents.push(makeVirtualEvent(`milestone-${y}yr`, `${y}주년`, '#FD79A8', dm, state.year, ''))
      }
      if (date > mEnd) break
    }
  }

  if (state.myBirthday?.startsWith(monthStr)) {
    birthdayEvents.push(makeVirtualEvent('bday-my', '생일 🎂', '#FF6B6B', state.myBirthday, state.year, state.userId))
  }
  if (state.partnerBirthday?.startsWith(monthStr)) {
    birthdayEvents.push(makeVirtualEvent('bday-partner', '생일 🎂', '#FF6B6B', state.partnerBirthday, state.year, 'partner'))
  }

  const holidayEvents: DisplayEvent[] = getKoreanHolidays(state.year, state.month).map((h) => ({
    id: `holiday-${h.date}`,
    couple_id: '',
    title: h.name,
    color: '#FF4757',
    is_all_day: true,
    start_date: h.date,
    end_date: h.date,
    start_time: null,
    end_time: null,
    description: null,
    created_by: '',
    created_at: '',
    isBirthday: true,
  }))

  const allEvents: DisplayEvent[] = [...state.events, ...birthdayEvents, ...holidayEvents]

  const eventsByDate = allEvents.reduce<Record<string, DisplayEvent[]>>((acc, event) => {
    const start = new Date(`${event.start_date}T00:00:00`)
    const end = new Date(`${event.end_date}T00:00:00`)
    const cursor = new Date(start)

    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      if (!acc[key]) acc[key] = []
      acc[key].push(event)
      cursor.setDate(cursor.getDate() + 1)
    }

    return acc
  }, {})

  return {
    year: state.year,
    month: state.month,
    userId: state.userId,
    myAvatar: state.myAvatar,
    partnerAvatar: state.partnerAvatar,
    myNickname: state.myNickname,
    partnerNickname: state.partnerNickname,
    anniversary: state.anniversary,
    eventsByDate,
    loading: state.loading,
    submitting: state.submitting,
    isConnected: state.isConnected,
    goToPrevMonth,
    goToNextMonth,
    createEvent,
    removeEvent,
    editEvent,
  }
}
