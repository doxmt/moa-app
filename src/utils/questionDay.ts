export function getQuestionDayIndex(refreshMinutes: number): number {
  const now = new Date();
  const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

  const effectiveDate =
    nowTotalMinutes < refreshMinutes
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    effectiveDate.getFullYear() * 10000 +
    (effectiveDate.getMonth() + 1) * 100 +
    effectiveDate.getDate()
  );
}

export function formatRefreshMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
