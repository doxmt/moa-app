import { supabase } from './client'

export type CalendarEvent = {
  id: string
  couple_id: string
  title: string
  color: string
  is_all_day: boolean
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD
  start_time: string | null // HH:MM
  end_time: string | null   // HH:MM
  description: string | null
  created_by: string
  created_at: string
}

export type CreateEventInput = {
  coupleId: string
  userId: string
  title: string
  color: string
  isAllDay: boolean
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  description?: string
}

export async function getEventsByMonth(coupleId: string, year: number, month: number) {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('couple_id', coupleId)
    .lte('start_date', monthEnd)
    .gte('end_date', monthStart)
    .order('start_date', { ascending: true })

  if (error) throw error
  return data as CalendarEvent[]
}

export async function addEvent(input: CreateEventInput) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      couple_id: input.coupleId,
      created_by: input.userId,
      title: input.title,
      color: input.color,
      is_all_day: input.isAllDay,
      start_date: input.startDate,
      end_date: input.endDate,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      description: input.description ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data as CalendarEvent
}

export async function deleteEvent(eventId: string) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
  if (error) throw error
}

export type UpdateEventInput = {
  eventId: string
  title: string
  color: string
  isAllDay: boolean
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  description?: string
}

export async function updateEvent(input: UpdateEventInput) {
  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      title: input.title,
      color: input.color,
      is_all_day: input.isAllDay,
      start_date: input.startDate,
      end_date: input.endDate,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      description: input.description ?? null,
    })
    .eq('id', input.eventId)
    .select()
    .single()

  if (error) throw error
  return data as CalendarEvent
}
