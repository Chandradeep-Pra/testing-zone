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
  const [pageSize, setPageSize] = useState(2);
  const [rotation, setRotation] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(appPath("/api/exam-schedules"), { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => { if (active && Array.isArray(data?.schedules)) setSchedules(data.schedules); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setPageSize(desktop.matches ? 2 : 1);
      setReducedMotion(reduced.matches);
    };
    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  const upcoming = schedules.filter((schedule) => Number.isFinite(getDaysLeft(schedule.examDate)) && getDaysLeft(schedule.examDate) >= 0).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const pages = Array.from({ length: Math.ceil(upcoming.length / pageSize) }, (_, index) => upcoming.slice(index * pageSize, (index + 1) * pageSize));
  const pageCount = pages.length;
  const currentPage = pageCount ? rotation % pageCount : 0;
  useEffect(() => {
    if (pageCount < 2 || expanded || hovered || focused || reducedMotion) return;
    const timer = window.setInterval(() => setRotation((current) => current + 1), 2000);
    return () => window.clearInterval(timer);
  }, [pageCount, expanded, hovered, focused, reducedMotion]);

  if (!upcoming.length) return null;

  const renderExam = (schedule: ExamSchedule) => {
    const days = getDaysLeft(schedule.examDate);
    return (
      <p key={schedule.id}>
        <span className="overview-exam-detail">
          <span className="overview-exam-name" title={schedule.examName}>{schedule.examName}</span>
          <time dateTime={schedule.examDate}>
            {new Date(`${schedule.examDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </time>
        </span>
        <strong className="overview-exam-remaining">
          <span>{days === 0 ? "Today" : days}</span>
          {days > 0 && <span>{days === 1 ? "day left" : "days left"}</span>}
        </strong>
      </p>
    );
  };

  return (
    <section className="overview-exams" aria-label="Upcoming exams" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      <div className="overview-exams-strip">
        <div className="overview-exams-label">
          <span><CalendarDays size={20} strokeWidth={1.6} aria-hidden="true" /></span>
          <div><h2>Upcoming exams</h2><p>{upcoming.length} {upcoming.length === 1 ? "exam scheduled" : "exams scheduled"}</p></div>
        </div>
        <div className="overview-exam-countdowns" aria-live="off" data-exam-page={currentPage + 1}>
          {rotation > 0 && pageCount > 1 && <div key={`out-${rotation}-${pageSize}`} className="overview-exam-page is-previous" aria-hidden="true">{pages[(currentPage + pageCount - 1) % pageCount].map(renderExam)}</div>}
          <div key={`in-${rotation}-${pageSize}`} className={`overview-exam-page${rotation > 0 && pageCount > 1 ? " is-entering" : ""}`}>{pages[currentPage].map(renderExam)}</div>
        </div>
        <button type="button" className="overview-text-link overview-schedule-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="overview-exam-dates">{expanded ? "Show less" : "See all"}{expanded ? <ChevronUp size={16} /> : <ArrowUpRight size={16} />}</button>
      </div>
      {expanded && <div id="overview-exam-dates" className="overview-exam-dates">
        {upcoming.map((schedule) => <div key={schedule.id}><span>{schedule.examName}</span><time dateTime={schedule.examDate}>{new Date(`${schedule.examDate.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</time></div>)}
      </div>}
    </section>
  );
}
