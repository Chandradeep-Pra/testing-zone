"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronUp } from "lucide-react";
import { appPath } from "@/lib/app-path";

type ExamSchedule = { id: string; examName: string; examDate: string };

function getDaysLeft(examDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${examDate.slice(0, 10)}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function ExamScheduleBanner() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(appPath("/api/exam-schedules"), { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active && Array.isArray(data?.schedules)) setSchedules(data.schedules); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const upcoming = schedules.filter((schedule) => Number.isFinite(getDaysLeft(schedule.examDate)) && getDaysLeft(schedule.examDate) >= 0).sort((a, b) => a.examDate.localeCompare(b.examDate));
  if (!upcoming.length) return null;

  return (
    <section className="overview-exams" aria-label="Upcoming exams">
      <div className="overview-exams-strip">
        <div className="overview-exams-label"><span><CalendarDays size={19} aria-hidden="true" /></span><h2>Upcoming exams</h2></div>
        <div className="overview-exam-countdowns">
          {upcoming.slice(0, 2).map((schedule) => {
            const days = getDaysLeft(schedule.examDate);
            return <p key={schedule.id}>{schedule.examName} <span aria-hidden="true">{String.fromCharCode(183)}</span> <strong>{days === 0 ? "Today" : days === 1 ? "1 day left" : `${days} days left`}</strong></p>;
          })}
        </div>
        <button type="button" className="overview-text-link overview-schedule-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="overview-exam-dates">{expanded ? "Hide schedule" : "View schedule"}{expanded ? <ChevronUp size={16} /> : <ArrowUpRight size={16} />}</button>
      </div>
      {expanded && <div id="overview-exam-dates" className="overview-exam-dates">
        {upcoming.map((schedule) => <div key={schedule.id}><span>{schedule.examName}</span><time dateTime={schedule.examDate}>{new Date(`${schedule.examDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</time></div>)}
      </div>}
    </section>
  );
}
