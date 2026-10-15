import type { LessonEntry } from "@/components/overview/LessonHistorySection";

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value !== "number" && !(typeof value === "string" && value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Map the main app's persisted videoProgress records to Overview lessons. */
export function normalizeLessonHistory(payload: unknown): LessonEntry[] {
  const source = record(payload);
  const rows = Array.isArray(payload) ? payload : source
    ? [source.continueWatching, source.items, source.recentLessons, source.history]
      .flatMap(value => Array.isArray(value) ? value : [])
    : [];
  const lessons = new Map<string, { lesson: LessonEntry; watchedAt: number }>();

  for (const row of rows) {
    const item = record(row);
    if (!item) continue;
    const id = text(item.videoId) || text(item.id);
    if (!id) continue;
    const duration = number(item.durationSeconds);
    const watched = number(item.watchedSeconds);
    const position = number(item.lastPositionSeconds) ?? watched;
    const percentage = number(item.percentComplete) ?? number(item.progressPct)
      ?? (duration && duration > 0 && watched !== undefined ? watched / duration * 100 : 0);
    const progressPct = item.completed === true ? 100 : Math.min(100, Math.max(0, percentage));
    const explicitRemaining = number(item.remainingMinutes);
    const remainingMinutes = progressPct >= 100 ? 0
      : duration !== undefined && duration > 0 && position !== undefined
        ? Math.ceil(Math.max(0, duration - Math.max(0, position)) / 60)
        : explicitRemaining !== undefined ? Math.ceil(Math.max(0, explicitRemaining)) : undefined;
    const watchedAt = Date.parse(text(item.lastWatchedAt) || text(item.completedAt) || "") || 0;
    const existing = lessons.get(id);
    if (existing && existing.watchedAt >= watchedAt) continue;
    lessons.set(id, {
      watchedAt,
      lesson: {
        id,
        title: text(item.title) || "Untitled lesson",
        sectionTitle: text(item.sectionTitle),
        thumbnailUrl: text(item.thumbnailUrl),
        completedAt: text(item.completedAt),
        progressPct,
        remainingMinutes,
      },
    });
  }

  return [...lessons.values()].sort((a, b) => b.watchedAt - a.watchedAt).map(item => item.lesson);
}

/** The summary excludes completed videos; consult full history before declaring it empty. */
export async function loadLessonHistory(read: (path: string) => Promise<unknown>): Promise<LessonEntry[]> {
  const lessons = normalizeLessonHistory(await read("/api/urologics/me/progress"));
  return lessons.length ? lessons : normalizeLessonHistory(await read("/api/urologics/me/video-progress"));
}
