"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Image as ImageIcon,
  LockKeyhole,
  Megaphone,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import UrologicsHeader from "@/components/brand/UrologicsHeader";

type Announcement = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  kind?: "general" | "grand-mock";
  media?: { type?: "image" | "youtube"; src?: string } | null;
};

type DailyQuiz = {
  id?: string;
  question?: string;
  image?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  topic?: string;
  examTrack?: string;
};

const actionCards = [
  {
    title: "Go to your courses",
    copy: "Continue your video library and course sections.",
    icon: BookOpenCheck,
    href: "/courses",
  },
  {
    title: "AI Vivas",
    copy: "Browse all viva sets. Locked cases stay visible until access is granted.",
    icon: BrainCircuit,
    href: "/ai-viva/cases",
  },
  {
    title: "Mocks",
    copy: "Open timed mock and exam rehearsal sessions.",
    icon: ClipboardCheck,
    href: "/mocks",
  },
];

function getFirstName(name?: string | null, email?: string | null) {
  const source = (name || email?.split("@")[0] || "there").trim();
  return source.split(/\s+/)[0] || "there";
}

function getAnnouncementBadge(kind?: Announcement["kind"]) {
  return kind === "grand-mock" ? "Grand Mock" : "Announcement";
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState(0);
  const [dailyQuiz, setDailyQuiz] = useState<DailyQuiz | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | "submitted" | null>(null);
  const [quizMessage, setQuizMessage] = useState("");
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const firstName = useMemo(() => getFirstName(user?.name, user?.email), [user?.email, user?.name]);
  const announcement = announcements[activeAnnouncement] ?? null;

  useEffect(() => {
    let active = true;

    async function loadOverviewContent() {
      const [announcementResult, quizResultResponse] = await Promise.allSettled([
        fetch("/api/urologics/announcements", { cache: "no-store" }).then((res) => res.json()),
        fetch("/api/urologics/daily-quiz", { cache: "no-store" }).then((res) => res.json()),
      ]);

      if (!active) return;

      if (announcementResult.status === "fulfilled") {
        setAnnouncements(
          Array.isArray(announcementResult.value?.announcements)
            ? announcementResult.value.announcements
            : []
        );
      }

      if (quizResultResponse.status === "fulfilled") {
        setDailyQuiz(quizResultResponse.value?.quiz ?? null);
      }
    }

    void loadOverviewContent();

    return () => {
      active = false;
    };
  }, []);

  function moveAnnouncement(direction: 1 | -1) {
    if (!announcements.length) return;
    setActiveAnnouncement((current) => (current + direction + announcements.length) % announcements.length);
  }

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
      const response = await fetch("/api/urologics/daily-quiz/submit-quiz", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selectedIndex: selectedOption }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to submit quiz.");
      }

      setQuizResult(payload?.correct === true ? "correct" : payload?.correct === false ? "wrong" : "submitted");
      setQuizMessage(payload?.correct === true ? "Correct answer." : "Submitted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to submit quiz.";
      setQuizMessage(message);

      if (message === "Already submitted") {
        setQuizResult("submitted");
      }
    } finally {
      setSubmittingQuiz(false);
    }
  }

  return (
    <main className="urologics-shell overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6">
        <UrologicsHeader current="Overview" product="Platform" tag="AI Viva, Mocks, and Grand Mocks" />

        <section className="py-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">Overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              Hi, {firstName}
            </h1>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-5">
              <section className="urologics-panel overflow-hidden p-5 sm:p-6 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <Megaphone size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                      Announcements
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {announcements.length ? `${activeAnnouncement + 1} of ${announcements.length}` : "Latest updates"}
                    </p>
                  </div>
                </div>

                {announcements.length > 1 ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => moveAnnouncement(-1)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                      aria-label="Previous announcement"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveAnnouncement(1)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                      aria-label="Next announcement"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </div>
                ) : null}
              </div>

              {announcement ? (
                <div className="mt-6 flex flex-col gap-5">
                  <div className="overflow-hidden rounded-[26px] border border-[var(--border)] bg-[var(--surface-muted)]">
                    {announcement.media?.type === "image" && announcement.media.src ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(announcement.media?.src || null)}
                        className="block w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={announcement.media.src}
                          alt={announcement.title}
                          className="max-h-[420px] w-full object-contain"
                        />
                      </button>
                    ) : announcement.media?.type === "youtube" && announcement.media.src ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${announcement.media.src}`}
                        title={announcement.title}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex min-h-48 items-center justify-center text-[var(--accent-strong)]">
                        <Megaphone size={42} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <span className="w-fit rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                      {getAnnouncementBadge(announcement.kind)}
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                      {announcement.title}
                    </h2>
                    {announcement.subtitle ? (
                      <p className="mt-2 text-sm font-semibold text-[var(--accent-strong)]">{announcement.subtitle}</p>
                    ) : null}
                    {announcement.description ? (
                      <p className="mt-3 line-clamp-4 text-sm leading-7 text-[var(--text-secondary)]">{announcement.description}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm leading-7 text-[var(--text-secondary)]">
                  No active announcement right now. New updates will appear here when published.
                </p>
              )}

              {announcements.length > 1 ? (
                <div className="mt-5 flex justify-center gap-2">
                  {announcements.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveAnnouncement(index)}
                      className={`h-2 rounded-full transition ${
                        index === activeAnnouncement ? "w-8 bg-[var(--accent)]" : "w-2 bg-[var(--accent-muted)]"
                      }`}
                      aria-label={`Show announcement ${index + 1}`}
                    />
                  ))}
                </div>
              ) : null}
              </section>

              <section className="grid gap-3">
                {actionCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => router.push(card.href)}
                      className="urologics-subpanel group flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 sm:gap-5 sm:p-5"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[var(--accent-soft)] text-[var(--accent-strong)] sm:h-16 sm:w-16">
                        <Icon size={27} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
                          {card.title}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{card.copy}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--accent-strong)] transition group-hover:translate-x-1" />
                    </button>
                  );
                })}
              </section>
            </div>

            <section className="urologics-panel p-5 sm:p-6 md:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                    Quiz of the day
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">{dailyQuiz?.examTrack || "Daily practice"}</p>
                </div>
              </div>

              {dailyQuiz ? (
                <div className="mt-5">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {dailyQuiz.topic ? (
                      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
                        {dailyQuiz.topic}
                      </span>
                    ) : null}
                    {dailyQuiz.image ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(dailyQuiz.image || null)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                      >
                        <ImageIcon size={13} />
                        Open image
                      </button>
                    ) : null}
                  </div>

                  {dailyQuiz.image ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(dailyQuiz.image || null)}
                      className="mt-4 block overflow-hidden rounded-[22px] border border-[var(--border)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dailyQuiz.image} alt="Quiz exhibit" className="max-h-44 w-full object-cover" />
                    </button>
                  ) : null}

                  <h2 className="mt-4 text-lg font-semibold leading-7 text-[var(--text-primary)]">{dailyQuiz.question}</h2>

                  <div className="mt-4 space-y-2">
                    {(dailyQuiz.options || []).map((option, index) => {
                      const selected = selectedOption === index;
                      const isCorrect = quizResult && dailyQuiz.correctIndex === index;

                      return (
                        <button
                          key={`${option}-${index}`}
                          type="button"
                          onClick={() => !quizResult && setSelectedOption(index)}
                          disabled={Boolean(quizResult)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm transition ${
                            isCorrect
                              ? "border-emerald-500/30 bg-emerald-50 text-emerald-700"
                              : selected
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                          }`}
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--accent-text)]">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizMessage ? (
                    <div
                      className={`mt-4 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${
                        quizResult === "correct"
                          ? "bg-emerald-50 text-emerald-700"
                          : quizResult === "wrong"
                            ? "bg-red-50 text-red-700"
                            : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      }`}
                    >
                      {quizResult === "correct" ? <CheckCircle2 size={16} /> : quizResult === "wrong" ? <XCircle size={16} /> : <LockKeyhole size={16} />}
                      {quizMessage}
                    </div>
                  ) : null}

                  {quizResult && dailyQuiz.explanation ? (
                    <p className="mt-3 rounded-2xl bg-[var(--surface-muted)] p-3 text-sm leading-6 text-[var(--text-secondary)]">
                      {dailyQuiz.explanation}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={submitQuiz}
                    disabled={submittingQuiz || Boolean(quizResult)}
                    className="urologics-button-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submittingQuiz ? "Submitting..." : quizResult ? "Submitted" : user ? "Submit answer" : "Login to answer"}
                  </button>
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
                  Today&apos;s quiz will appear here once it is available.
                </p>
              )}
            </section>
          </div>

        </section>
      </div>

      {previewImage ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-raised)] text-[var(--text-primary)]"
            aria-label="Close image preview"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage} alt="Quiz exhibit preview" className="max-h-[86vh] max-w-[92vw] rounded-[24px] object-contain shadow-2xl" />
        </div>
      ) : null}
    </main>
  );
}
