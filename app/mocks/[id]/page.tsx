"use client";

import { AlarmClock, Coffee, Send, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { appPath } from "@/lib/app-path";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  questionImage?: string;
}

interface Mock {
  id: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
}

function normalizeQuestion(question: unknown, index: number): Question {
  const source = (question && typeof question === "object" ? question : {}) as Record<string, unknown>;
  return {
    id: typeof source.id === "string" ? source.id : `question-${index + 1}`,
    questionText: typeof source.questionText === "string" ? source.questionText : "",
    options: Array.isArray(source.options)
      ? source.options
          .map((item) => String(item ?? "").replace(/\s+/g, " ").trim())
          .filter((item) => item.length > 0)
      : [],
    correctAnswer:
      typeof source.correctAnswer === "number"
        ? source.correctAnswer
        : Number.isFinite(Number(source.correctAnswer))
          ? Number(source.correctAnswer)
          : 0,
    questionImage: typeof source.questionImage === "string" ? source.questionImage : undefined,
  };
}

function normalizeMock(payload: unknown): Mock | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  return {
    id: typeof source.id === "string" ? source.id : "",
    title: typeof source.title === "string" ? source.title : "Grand Mock",
    durationMinutes:
      typeof source.durationMinutes === "number"
        ? source.durationMinutes
        : Number(source.durationMinutes || 0),
    questions: Array.isArray(source.questions)
      ? source.questions.map(normalizeQuestion)
      : [],
  };
}

function getOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

export default function Page() {
  const { id } = useParams();
  const router = useRouter();
  const [mock, setMock] = useState<Mock | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [breakLeft, setBreakLeft] = useState(10 * 60);
  const [breakUsed, setBreakUsed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      const publicRes = await fetch(appPath(`/api/public/mocks/${id}`));
      if (publicRes.ok) {
        const publicData = await publicRes.json();
        const nextMock = normalizeMock(publicData.mock);
        setMock(nextMock);
        setTimeLeft((nextMock?.durationMinutes || 0) * 60);
      } else {
        const res = await fetch(appPath(`/api/mocks/${id}`));
        const data = await res.json();
        const nextMock = normalizeMock(data.mock);
        setMock(nextMock);
        setTimeLeft((nextMock?.durationMinutes || 0) * 60);
      }

      const saved = localStorage.getItem(`mock-${id}-answers`);
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
    };

    void load();
  }, [id]);

  const select = (qid: string, index: number) => {
    const updated = { ...answers, [qid]: index };
    setAnswers(updated);
    localStorage.setItem(`mock-${id}-answers`, JSON.stringify(updated));

    if (currentQ < mock!.questions.length - 1) {
      setCurrentQ((value) => value + 1);
    }
  };

  const submit = useCallback(() => {
    localStorage.setItem(`mock-${id}-final`, JSON.stringify(answers));
    router.push(`/mocks/${id}/result`);
  }, [answers, id, router]);

  useEffect(() => {
    if (!mock) return;

    const timer = setInterval(() => {
      if (isBreak) {
        setBreakLeft((value) => {
          if (value <= 1) {
            setIsBreak(false);
            return 0;
          }

          return value - 1;
        });
      } else {
        setTimeLeft((value) => {
          if (value <= 1) {
            submit();
            return 0;
          }

          return value - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mock, isBreak, submit]);

  const format = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (!mock) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-[var(--text-primary)]">Loading session...</div>
      </main>
    );
  }

  const q = mock.questions[currentQ];
  const options = Array.isArray(q?.options) ? q.options : [];

  return (
    <>
      {isBreak && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 px-4 backdrop-blur-xl">
          <div className="urologics-chip">Break Active</div>
          <h2 className="mt-6 text-5xl font-semibold text-teal-300 sm:text-6xl">{format(breakLeft)}</h2>
          <button onClick={() => setIsBreak(false)} className="urologics-button-primary mt-8 w-full sm:w-auto">
            Resume Mock
          </button>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-center shadow-[0_24px_60px_var(--shadow-medium)] sm:p-8">
            <div className="text-2xl font-semibold text-[var(--text-primary)]">Submit mock?</div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              This will end the current Urologics mock session and move you to the results page.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-text)]"
              >
                Cancel
              </button>

              <button
                onClick={submit}
                className="flex-1 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex min-h-screen flex-col gap-3 bg-[var(--background)] p-3 text-[var(--text-primary)] sm:p-4 lg:flex-row">
        <aside className="order-1 flex w-full shrink-0 flex-col rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[0_16px_40px_var(--shadow-soft)] lg:w-[300px] lg:p-5">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <ShieldCheck size={18} />
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">
                Urologics Grand Mocks
              </div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{mock.title}</div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--accent-soft)] p-4 sm:mt-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              <AlarmClock size={14} />
              Session Timer
            </div>

            <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--accent-strong)] sm:text-4xl">
              {format(isBreak ? breakLeft : timeLeft)}
            </div>

            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Question {currentQ + 1} of {mock.questions.length}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-6 gap-2 sm:mt-6 sm:grid-cols-5">
            {mock.questions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => setCurrentQ(index)}
                className={`rounded-xl px-0 py-2 text-sm font-semibold transition ${
                  index === currentQ
                    ? "bg-[var(--accent)] text-[var(--accent-text)] shadow-[0_8px_20px_var(--shadow-brand)]"
                    : answers[question.id] !== undefined
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "bg-[var(--surface-muted)] text-[var(--text-tertiary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 pt-0 lg:mt-auto lg:space-y-3 lg:pt-6">
            {!breakUsed && (
              <button
                onClick={() => {
                  setIsBreak(true);
                  setBreakUsed(true);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-text)]"
              >
                <Coffee size={16} />
                Take Break
              </button>
            )}

            <button
              onClick={() => setShowConfirm(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
            >
              <Send size={16} />
              Submit Mock
            </button>
          </div>
        </aside>

        <section className="order-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)]">
          <div className="flex flex-1 flex-col lg:flex-row">
            <div className="flex flex-1 flex-col justify-between p-4 sm:p-6 md:p-10">
              <div>
                <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)] sm:text-xs sm:tracking-[0.18em]">
                  Question : {currentQ + 1}
                </div>

                <h1 className="mt-5 text-lg font-semibold leading-8 text-[var(--text-primary)] sm:mt-6 sm:text-xl">
                  {q.questionText}
                </h1>

                <div className="mt-6 grid gap-3 sm:mt-8 md:grid-cols-2">
                  {options.map((opt, i) => {
                    const isSelected = answers[q.id] === i;

                    return (
                      <button
                        key={i}
                        onClick={() => select(q.id, i)}
                        className={`rounded-[28px] border p-3 text-left transition ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_12px_28px_var(--shadow-brand)]"
                            : "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--accent)] hover:bg-[var(--surface-raised)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                              isSelected
                                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-text)]"
                                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--accent-strong)]"
                            }`}
                          >
                            {getOptionLabel(i)}
                          </span>
                          <span
                            className={`flex-1 rounded-[22px] px-4 py-3 text-sm font-medium leading-6 ${
                              isSelected
                                ? "bg-[var(--accent)] text-[var(--accent-text)]"
                                : "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                            }`}
                          >
                            {opt}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)] sm:mt-10">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                  style={{
                    width: `${((currentQ + 1) / mock.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {q?.questionImage && (
              <div className="border-t border-[var(--border)] p-4 sm:p-5 lg:w-[42%] lg:border-l lg:border-t-0 lg:p-6">
                <div className="flex h-full min-h-[220px] items-center justify-center rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:min-h-[280px] sm:p-5">
                  <img src={q.questionImage} alt="Question exhibit" className="max-h-[70vh] rounded-2xl object-contain" />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
