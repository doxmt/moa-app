export function getTodayDayNumber(coupleCreatedAt: string, refreshMinutes: number): number {
  const now = new Date();
  const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

  const effectiveDate =
    nowTotalMinutes < refreshMinutes
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const connected = new Date(coupleCreatedAt);
  const connectedDay = new Date(connected.getFullYear(), connected.getMonth(), connected.getDate());

  const diffDays = Math.floor((effectiveDate.getTime() - connectedDay.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays + 1);
}

export function formatRefreshMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
