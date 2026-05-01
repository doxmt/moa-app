import Holidays from 'date-holidays'

const hd = new Holidays('KR')

type HolidayItem = {
  date: string // YYYY-MM-DD
  name: string
}

export function getKoreanHolidays(year: number, month: number): HolidayItem[] {
  const holidays = hd.getHolidays(year) as { date: string; name: string; type: string }[]
  const monthStr = String(month).padStart(2, '0')

  return holidays
    .filter((h) => h.type === 'public' && h.date.startsWith(`${year}-${monthStr}`))
    .map((h) => ({
      date: h.date.slice(0, 10),
      name: h.name,
    }))
}
