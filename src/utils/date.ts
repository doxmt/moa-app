export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dateToDateStr(d: Date): string {
  return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function formatDateDot(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
