"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import CompleteProfilePrompt from "@/components/profile/CompleteProfilePrompt";
import { appPath } from "@/lib/app-path";

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
  const router = useRouter();
  const { user } = useAuth();
  const firstName = useMemo(
    () => getFirstName(user?.name, user?.email),
    [user?.name, user?.email],
  );

  // ── Data state ────────────────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
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
  }, []);

  // ── Fetch: lesson history + viva cases (auth-gated) ───────────────────────
  useEffect(() => {
    if (!user?.idToken) return;

    let active = true;
    setLessonsLoading(true);
    setVivaLoading(true);

    // Lesson history via progress endpoint
    fetch(appPath("/api/urologics/me/progress"), {
      headers: { Authorization: `Bearer ${user.idToken}` },
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        // Progress API returns { recentLessons?: LessonEntry[] } or similar
        const raw: LessonEntry[] = Array.isArray(data?.recentLessons)
          ? data.recentLessons
          : Array.isArray(data?.history)
            ? data.history
            : [];
        setLessons(raw);
      })
      .catch(() => { if (active) setLessons([]); })
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

    return () => { active = false; };
  }, [user?.idToken]);

  // ── Quiz submit ───────────────────────────────────────────────────────────
  async function submitQuiz() {
    if (!user?.idToken) {
      router.push("/login");
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
      setQuizMessage(payload?.correct === true ? "Correct answer." : "Submitted.");
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
    <main className="urologics-shell overflow-hidden">
      <div className="mobile-native-page mx-auto flex min-h-screen w-full max-w-7xl flex-col sm:px-6 sm:py-4">
        <UrologicsHeader current="Overview" product="Platform" tag="AI Viva, Mocks, and Grand Mocks" />

        <section className="py-4 sm:py-8">
          {/* Greeting */}
          <div className="mb-5 rounded-[30px] border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[0_12px_30px_var(--shadow-soft)] sm:mb-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Overview
            </p>
            <h1 className="mobile-native-title mt-2 font-semibold text-[var(--text-primary)] sm:text-4xl sm:tracking-[-0.04em] md:text-5xl">
              Hi, {firstName}
            </h1>
          </div>

          <CompleteProfilePrompt />

          {/* ── Part 1: Exam Countdown Banner (full-width) ─────────────────── */}
          <ExamScheduleBanner />

          {/* ── Part 2: Announcements + Daily Quiz (side-by-side on md+) ──── */}
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <AnnouncementsPanel
              announcements={announcements}
              onImagePreview={(src) => setPreviewImage(src)}
            />
            <DailyQuizPanel
              quiz={dailyQuiz}
              selectedOption={selectedOption}
              quizResult={quizResult}
              quizMessage={quizMessage}
              submitting={submittingQuiz}
              isLoggedIn={Boolean(user)}
              onSelect={setSelectedOption}
              onSubmit={submitQuiz}
              onImagePreview={(src) => setPreviewImage(src)}
            />
          </div>

          {/* ── Part 3: Lesson History (full-width) ───────────────────────── */}
          <div className="mt-4 sm:mt-5">
            <LessonHistorySection
              lessons={lessons}
              loading={lessonsLoading}
              isLoggedIn={Boolean(user)}
            />
          </div>

          {/* ── Part 4: Tests Tab (Mocks + AI Vivas) ─────────────────────── */}
          <div className="mt-4 sm:mt-5">
            <TestsTabSection
              mocks={mocks}
              vivaCases={vivaCases}
              mocksLoading={mocksLoading}
              vivaLoading={vivaLoading}
              isLoggedIn={Boolean(user)}
            />
          </div>
        </section>
      </div>

      {/* Image lightbox */}
      {previewImage && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            aria-label="Close preview"
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-lg"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[86vh] max-w-[92vw] rounded-[24px] object-contain shadow-2xl"
          />
        </div>
      )}
    </main>
  );
}
