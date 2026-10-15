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

interface Props { lessons: LessonEntry[]; loading: boolean; isLoggedIn: boolean }

export default function LessonHistorySection({ lessons, loading, isLoggedIn }: Props) {
  if (!isLoggedIn || (!loading && lessons.length === 0)) return null;
  return (
    <section className="overview-card overview-learning" aria-labelledby="learning-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon"><BookOpen size={20} aria-hidden="true" /></span>
        <h2 id="learning-heading">Continue learning</h2>
        <span className="overview-heading-caption">Lesson history</span>
        <Link href="/courses" className="overview-text-link overview-heading-link">View history <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      {loading ? <div className="overview-lesson-grid" aria-label="Loading lesson history" aria-busy="true">{[1, 2, 3].map((key) => <div key={key} className="overview-skeleton" />)}</div>
      : !isLoggedIn || !lessons.length ? <div className="overview-empty-inline"><p>{!isLoggedIn ? "Sign in to pick up where you left off." : "Your next chapter starts here. Explore a course to begin learning."}</p><Link href={!isLoggedIn ? "/login" : "/courses"} className="overview-text-link">{!isLoggedIn ? "Sign in" : "Explore courses"}<ArrowRight size={16} /></Link></div>
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
