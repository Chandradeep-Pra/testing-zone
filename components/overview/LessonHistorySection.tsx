"use client";

import { ArrowRight, ArrowUpRight, BookOpen, Play } from "lucide-react";
import Link from "next/link";

export type LessonEntry = {
  id: string;
  title: string;
  sectionTitle?: string;
  completedAt?: string;
  progressPct?: number;
  thumbnailUrl?: string;
  remainingMinutes?: number;
};

interface Props {
  lessons: LessonEntry[];
  loading: boolean;
  isLoggedIn: boolean;
  hasPurchasedCourses?: boolean;
  error?: string;
}

function LearningPathIllustration() {
  return (
    <svg className="overview-learning-empty-art" viewBox="0 0 252 164" fill="none" aria-hidden="true" focusable="false">
      <ellipse cx="125" cy="89" rx="106" ry="67" fill="var(--accent-soft)" />
      <path d="M48 110C19 72 84 36 123 52C163 68 138 130 199 117" stroke="var(--accent-strong)" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" opacity=".4" />
      <circle cx="46" cy="109" r="5" fill="var(--accent-strong)" />
      <circle cx="203" cy="116" r="6" fill="var(--surface-raised)" stroke="var(--accent-strong)" strokeWidth="2" />
      <path d="M191 30V40M186 35H196M39 49V57M35 53H43M213 72V80M209 76H217" stroke="var(--accent-strong)" strokeWidth="2" strokeLinecap="round" opacity=".65" />
      <g transform="rotate(-7 95 104)">
        <path d="M47 83C64 76 82 78 96 86C109 78 127 76 145 83V130C127 123 110 125 96 133C82 125 64 123 47 130V83Z" fill="var(--surface-raised)" stroke="var(--accent-strong)" strokeWidth="2" strokeLinejoin="round" />
        <path d="M96 86V133M57 94C67 91 77 92 85 96M57 104C67 101 77 102 85 106M57 114C67 111 77 112 85 116M107 96C116 92 126 91 135 94M107 106C116 102 126 101 135 104M107 116C116 112 126 111 135 114" stroke="var(--accent-strong)" strokeWidth="2" strokeLinecap="round" opacity=".55" />
        <path d="M125 79V99L130 95L135 99V80" fill="var(--accent)" />
      </g>
      <g transform="rotate(6 167 57)">
        <rect x="132" y="24" width="68" height="65" rx="12" fill="var(--surface-raised)" stroke="var(--accent-strong)" strokeWidth="2" />
        <rect x="140" y="32" width="52" height="35" rx="7" fill="var(--accent-soft)" />
        <path d="M162 42L174 49.5L162 57V42Z" fill="var(--accent-strong)" stroke="var(--accent-strong)" strokeLinejoin="round" />
        <path d="M142 77H190" stroke="var(--surface-muted)" strokeWidth="4" strokeLinecap="round" />
        <path d="M142 77H169" stroke="var(--accent-strong)" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="165" cy="127" r="17" fill="var(--surface-raised)" stroke="var(--accent-soft)" strokeWidth="5" />
      <path d="M165 110A17 17 0 1 1 148 127" stroke="var(--accent-strong)" strokeWidth="5" strokeLinecap="round" />
      <path d="M159 127L163 131L171 123" stroke="var(--accent-strong)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LessonHistorySection({ lessons, loading, isLoggedIn, hasPurchasedCourses = false, error }: Props) {
  const hasLessons = isLoggedIn && lessons.length > 0;
  const hasCourses = isLoggedIn && hasPurchasedCourses;
  return (
    <section className="overview-card overview-learning" aria-labelledby="learning-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon"><BookOpen size={20} aria-hidden="true" /></span>
        <h2 id="learning-heading">Continue learning</h2>
        {hasLessons && <span className="overview-heading-caption">Lesson history</span>}
        {hasLessons && <Link href="/courses" className="overview-text-link overview-heading-link">View history <ArrowUpRight size={16} aria-hidden="true" /></Link>}
      </div>
      {loading ? <div className="overview-lesson-grid" aria-label="Loading lesson history" aria-busy="true">{[1, 2, 3].map((key) => <div key={key} className="overview-skeleton" />)}</div>
      : !hasLessons ? <div className="overview-learning-empty" data-learning-state={error ? "unavailable" : hasCourses ? "not-started" : "explore"}>
        <LearningPathIllustration />
        <div className="overview-learning-empty-copy">
          <span className="overview-learning-empty-eyebrow">Learn with Urologics</span>
          <h3>{error ? "Let’s get you back to learning" : hasCourses ? "Your courses are ready when you are" : "Your next chapter starts here"}</h3>
          <p role={error ? "status" : undefined}>{error ? "Your learning history is temporarily unavailable." : hasCourses ? "You haven’t started a lesson with Urologics yet." : "Explore our comprehensive courses and start your learning journey."}</p>
          <Link href={error || hasCourses ? "/courses" : "/plans"} className="overview-learning-empty-action">{error || hasCourses ? "Your courses" : "Explore courses"}<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      : <div className="overview-lesson-grid">
        {lessons.slice(0, 3).map((lesson) => {
          const progress = Math.min(100, Math.max(0, lesson.progressPct ?? 0));
          return <article key={lesson.id} className="overview-lesson">
            <Link href="/courses" className="overview-lesson-thumb" aria-label={`Continue ${lesson.title}`}>
              {lesson.thumbnailUrl ? <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={lesson.thumbnailUrl} alt="" loading="lazy" />
              </> : <BookOpen size={26} aria-hidden="true" />}
              <span><Play size={12} fill="currentColor" aria-hidden="true" /></span>
            </Link>
            <div className="overview-lesson-body">
              <h3>{lesson.title}</h3>
              {lesson.sectionTitle && <p>{lesson.sectionTitle}</p>}
              <div className="overview-lesson-progress">
                <div role="progressbar" aria-label={`${lesson.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
                <span>{progress >= 100 ? "Completed" : lesson.remainingMinutes !== undefined ? `${lesson.remainingMinutes} min left` : `${Math.round(progress)}% complete`}</span>
              </div>
            </div>
            <Link href="/courses" className="overview-text-link overview-resume" aria-label={`${progress >= 100 ? "Review" : "Resume"} ${lesson.title}`}>{progress >= 100 ? "Review" : "Resume"}<ArrowRight size={15} aria-hidden="true" /></Link>
          </article>;
        })}
      </div>}
    </section>
  );
}
