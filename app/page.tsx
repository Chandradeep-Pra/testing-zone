"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Mic, Sparkles, X } from "lucide-react";
import Link from "next/link";
import "./overview.css";
import OverviewMobileNav from "@/components/overview/OverviewMobileNav";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import CompleteProfilePrompt from "@/components/profile/CompleteProfilePrompt";
import { appPath } from "@/lib/app-path";
import { loadLessonHistory } from "@/lib/lesson-history";
import { readUrologicsJson } from "@/lib/client/urologicsQuery";

// Modular overview sections
import ExamScheduleBanner from "@/components/overview/ExamScheduleBanner";
import AnnouncementsPanel, { type Announcement } from "@/components/overview/AnnouncementsPanel";
import DailyQuizPanel, { type DailyQuiz } from "@/components/overview/DailyQuizPanel";
import LessonHistorySection, { type LessonEntry } from "@/components/overview/LessonHistorySection";
import TestsTabSection, { type MockItem, type VivaCase } from "@/components/overview/TestsTabSection";

// ─── helpers ────────────────────────────────────────────────────────────────

function getFirstName(name?: string | null, email?: string | null) {
  const source = (name || email?.split("@")[0] || "there").trim();
  return source.split(/\s+/)[0] || "there";
}

// ─── page ───────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const firstName = useMemo(
    () => getFirstName(user?.name, user?.email),
    [user?.name, user?.email],
  );
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = !now ? "Welcome back" : now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  // ── Data state ────────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonsError, setLessonsError] = useState("");
  const [lessonsUserId, setLessonsUserId] = useState<string | null>(null);
  const [mocks, setMocks] = useState<MockItem[]>([]);
  const [mocksLoading, setMocksLoading] = useState(true);
  const [vivaCases, setVivaCases] = useState<VivaCase[]>([]);
  const [vivaLoading, setVivaLoading] = useState(false);

  // ── Quiz interaction state ─────────────────────────────────────────────────
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | "submitted" | null>(null);
  const [quizMessage, setQuizMessage] = useState("");
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // ── Lightbox ───────────────────────────────────────────────────────────────
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!previewImage) return;
    const dialog = previewDialog.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [previewImage]);

  // ── Fetch: announcements + daily quiz (always) ────────────────────────────
  useEffect(() => {
    let active = true;

    async function loadPublicContent() {
      const [annoRes, quizRes] = await Promise.allSettled([
        fetch(appPath("/api/urologics/announcements"), { cache: "no-store" }).then((r) => r.json()),
        fetch(appPath("/api/urologics/daily-quiz"), { cache: "no-store" }).then((r) => r.json()),
      ]);

      if (!active) return;

      if (annoRes.status === "fulfilled") {
        setAnnouncements(
          Array.isArray(annoRes.value?.announcements) ? annoRes.value.announcements : [],
        );
      }
      if (quizRes.status === "fulfilled") {
        setDailyQuiz(quizRes.value?.quiz ?? null);
      }
    }

    void loadPublicContent();
    return () => { active = false; };
  }, []);

  // ── Fetch: mocks (public) ─────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    setMocksLoading(true);

    fetch(appPath("/api/mocks"), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setMocks(Array.isArray(data?.mocks) ? data.mocks : []);
      })
      .catch(() => { if (active) setMocks([]); })
      .finally(() => { if (active) setMocksLoading(false); });

    return () => { active = false; };
  }, [user?.uid]);

  // ── Fetch: lesson history + viva cases (auth-gated) ───────────────────────
  useEffect(() => {
    if (!user?.idToken) {
      setLessons([]);
      setLessonsError("");
      setLessonsLoading(false);
      setLessonsUserId(null);
      return;
    }

    let active = true;
    const historyController = new AbortController();
    setLessons([]);
    setLessonsError("");
    setLessonsUserId(user.uid);
    setLessonsLoading(true);
    setVivaLoading(true);

    void loadLessonHistory(path => readUrologicsJson(path, user, historyController.signal))
      .then((history) => {
        if (active) setLessons(history);
      })
      .catch(() => {
        if (active) setLessonsError("Your learning history is temporarily unavailable.");
      })
      .finally(() => { if (active) setLessonsLoading(false); });

    // Viva cases
    fetch(appPath("/api/urologics/viva-cases"), {
      headers: { Authorization: `Bearer ${user.idToken}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const raw = Array.isArray(data?.cases)
          ? data.cases
          : Array.isArray(data?.vivaCases)
            ? data.vivaCases
            : [];
        setVivaCases(raw as VivaCase[]);
      })
      .catch(() => { if (active) setVivaCases([]); })
      .finally(() => { if (active) setVivaLoading(false); });

    return () => {
      active = false;
      historyController.abort();
    };
  }, [user]);

  // ── Quiz submit ───────────────────────────────────────────────────────────
  async function submitQuiz() {
    if (!user?.idToken) {
      window.location.assign("/login?redirect=%2Fweb");
      return;
    }
    if (selectedOption === null) {
      setQuizMessage("Choose one option first.");
      return;
    }

    setSubmittingQuiz(true);
    setQuizMessage("");

    try {
      const res = await fetch(appPath("/api/urologics/daily-quiz/submit-quiz"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedIndex: selectedOption }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(payload?.error || "Unable to submit quiz.");

      setQuizResult(
        payload?.correct === true ? "correct" : payload?.correct === false ? "wrong" : "submitted",
      );
      setQuizMessage(payload?.correct === true ? "Correct answer." : payload?.correct === false ? "Not quite. Review the explanation below." : "Answer submitted.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to submit quiz.";
      setQuizMessage(msg);
      if (msg === "Already submitted") setQuizResult("submitted");
    } finally {
      setSubmittingQuiz(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="urologics-shell overview-experience">
      <div className="overview-container">
        <UrologicsHeader current="Overview" product="Platform" tag="AI Viva, Mocks, and Grand Mocks" />
        <OverviewMobileNav />
        <section className="overview-content" aria-label="Your learning overview">
          <ExamScheduleBanner />
          <div className="overview-greeting">
            <div>
              <p className="overview-eyebrow">Overview</p>
              <h1>{greeting}, {firstName}</h1>
              <p className="overview-intro">Pick up where you left off, or try today&apos;s question.</p>
            </div>
            {now && <time dateTime={now.toISOString()} className="overview-date">
              {now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </time>}
          </div>
          <CompleteProfilePrompt />
          <div className="overview-feature-grid">
            <AnnouncementsPanel announcements={announcements} onImagePreview={setPreviewImage} />
            <DailyQuizPanel
              quiz={dailyQuiz}
              selectedOption={selectedOption}
              quizResult={quizResult}
              quizMessage={quizMessage}
              submitting={submittingQuiz}
              isLoggedIn={Boolean(user)}
              onSelect={setSelectedOption}
              onSubmit={submitQuiz}
              onImagePreview={setPreviewImage}
            />
          </div>
          <div className="overview-section-gap">
            <LessonHistorySection
              lessons={user?.uid === lessonsUserId ? lessons : []}
              loading={authLoading || Boolean(user && (lessonsLoading || user.uid !== lessonsUserId))}
              isLoggedIn={Boolean(user)}
              hasPurchasedCourses={Boolean(user?.activeCourseIds?.length)}
              error={user?.uid === lessonsUserId ? lessonsError : ""}
            />
          </div>
          <div className="overview-section-gap">
            <TestsTabSection
              mocks={mocks}
              vivaCases={vivaCases}
              mocksLoading={mocksLoading}
              vivaLoading={vivaLoading}
              isLoggedIn={Boolean(user)}
            />
          </div>
          <aside className="overview-viva-callout" aria-labelledby="urologics-ai-heading">
            <span className="overview-viva-icon" aria-hidden="true"><Mic size={27} /></span>
            <div className="overview-viva-copy">
              <h2 id="urologics-ai-heading">Practice with <span>Urologics AI</span></h2>
              <p>Speak your thinking. Sharpen your clinical reasoning.</p>
            </div>
            <Link href="/ai-viva/cases" className="overview-viva-link">Start practice <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </aside>
          <p className="overview-footer-note">A little progress, every day. Your next step starts here.</p>
        </section>
      </div>
      {previewImage && (
        <dialog ref={previewDialog} role="dialog" aria-label="Image preview" className="overview-lightbox" onCancel={() => setPreviewImage(null)} onClose={() => setPreviewImage(null)} onClick={(event) => { if (event.target === event.currentTarget) setPreviewImage(null); }}>
          <button type="button" onClick={() => setPreviewImage(null)} aria-label="Close preview" className="overview-lightbox-close" autoFocus>
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage} alt="Preview" className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain" />
        </dialog>
      )}
    </main>
  );
}
