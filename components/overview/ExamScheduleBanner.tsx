"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { appPath } from "@/lib/app-path";

type ExamSchedule = {
  id: string;
  examName: string;
  examDate: string; // "YYYY-MM-DD"
};

function getDaysLeft(examDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(examDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDaysLeft(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `${days} days`;
}

function urgencyClass(days: number): string {
  if (days <= 7) return "text-red-600 dark:text-red-400";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-[var(--accent-strong)]";
}

export default function ExamScheduleBanner() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);

  useEffect(() => {
    fetch(appPath("/api/exam-schedules"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.schedules)) setSchedules(data.schedules);
      })
      .catch(() => {});
  }, []);

  if (!schedules.length) return null;

  return (
    <div className="mb-4 w-full overflow-x-auto sm:mb-5">
      <div className="flex min-w-0 gap-3 sm:gap-4">
        {schedules.map((s) => {
          const days = getDaysLeft(s.examDate);
          return (
            <div
              key={s.id}
              className="flex min-w-[200px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-3 shadow-[0_4px_14px_var(--shadow-soft)] sm:min-w-[220px]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <CalendarDays size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {s.examName}
                </p>
                <p className={`text-xs font-semibold ${urgencyClass(days)}`}>
                  {formatDaysLeft(days)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-2xl font-bold tabular-nums leading-none ${urgencyClass(days)}`}>
                  {days >= 0 ? days : "—"}
                </p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  days left
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

