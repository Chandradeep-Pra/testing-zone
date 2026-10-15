"use client";

import { BookOpen, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export type LessonEntry = {
  id: string;
  title: string;
  sectionTitle?: string;
  completedAt?: string;
  progressPct?: number;
  thumbnailUrl?: string;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface Props {
  lessons: LessonEntry[];
  loading: boolean;
  isLoggedIn: boolean;
}

export default function LessonHistorySection({ lessons, loading, isLoggedIn }: Props) {
  const router = useRouter();

  return (
    <section className="urologics-panel p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Lesson History
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">Recently attended</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push("/courses")}
          className="text-xs font-semibold text-[var(--accent-strong)] hover:underline"
        >
          All courses →
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--accent-soft)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded-full bg-[var(--accent-soft)]" />
                  <div className="h-2.5 w-1/2 rounded-full bg-[var(--accent-soft)]" />
                </div>
              </div>
            ))}
          </div>
        ) : !isLoggedIn ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Sign in to track your lesson history.
          </p>
        ) : lessons.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No lessons attended yet. Start a course to see your history here.
          </p>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:bg-[var(--accent-soft)]"
              >
                {/* Icon / thumb */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  {lesson.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lesson.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <PlayCircle size={18} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {lesson.title}
                  </p>
                  {lesson.sectionTitle && (
                    <p className="truncate text-xs text-[var(--text-tertiary)]">
                      {lesson.sectionTitle}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  {lesson.completedAt && (
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {formatRelative(lesson.completedAt)}
                    </p>
                  )}
                  {typeof lesson.progressPct === "number" && (
                    <p className={`text-[11px] font-semibold ${lesson.progressPct >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--accent-strong)]"}`}>
                      {lesson.progressPct >= 100 ? "Done" : `${lesson.progressPct}%`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

