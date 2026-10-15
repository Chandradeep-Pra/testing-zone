export type OverviewTest = {
  id: string; hasAttempted?: boolean; accessType?: string; durationMinutes: number;
  startTime?: string | number | { _seconds?: number; seconds?: number };
  endTime?: string | number | { _seconds?: number; seconds?: number };
};
function timestamp(value: OverviewTest["startTime"]): number {
  if (value && typeof value === "object") return Number(value._seconds ?? value.seconds ?? 0) * 1000;
  if (!value) return 0;
  return new Date(value).getTime() || 0;
}
export function latestLiveTests<T extends OverviewTest>(mocks: T[], now = Date.now(), filter = "all"): T[] {
  return mocks.filter(mock => {
    const start = timestamp(mock.startTime);
    const end = timestamp(mock.endTime) || start + mock.durationMinutes * 60000;
    return start > 0 && now >= start && now < end && (filter !== "public" || mock.accessType === "public") && (filter !== "attended" || mock.hasAttempted);
  }).sort((a,b) => Number(Boolean(a.hasAttempted)) - Number(Boolean(b.hasAttempted)) || timestamp(b.startTime) - timestamp(a.startTime)).slice(0,3);
}
