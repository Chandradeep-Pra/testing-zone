"use client";

import { CheckCircle2, ShieldCheck, Trophy, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import { appPath } from "@/lib/app-path";

type MockQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation?: {
    text?: string;
    image?: string;
  };
};

type MockDetail = {
  title?: string;
  accessType?: "private" | "public" | string;
  questions: MockQuestion[];
};

function normalizeOption(option: unknown) {
  return String(option ?? "").replace(/\s+/g, " ").trim();
}

function normalizeQuestion(question: unknown, index: number): MockQuestion {
  const source = (question && typeof question === "object" ? question : {}) as Record<string, unknown>;
  const explanation =
    source.explanation && typeof source.explanation === "object"
      ? (source.explanation as Record<string, unknown>)
      : null;

  return {
    id: typeof source.id === "string" ? source.id : `question-${index + 1}`,
    questionText: typeof source.questionText === "string" ? source.questionText : "",
    options: Array.isArray(source.options)
      ? source.options.map(normalizeOption).filter((option) => option.length > 0)
      : [],
    correctAnswer:
      typeof source.correctAnswer === "number"
        ? source.correctAnswer
        : Number.isFinite(Number(source.correctAnswer))
          ? Number(source.correctAnswer)
          : -1,
    explanation: explanation
      ? {
          text: typeof explanation.text === "string" ? explanation.text : undefined,
          image: typeof explanation.image === "string" ? explanation.image : undefined,
        }
      : undefined,
  };
}

function normalizeMock(payload: unknown): MockDetail | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  return {
    title: typeof source.title === "string" ? source.title : "Grand Mock",
    accessType: source.accessType === "public" ? "public" : "private",
    questions: Array.isArray(source.questions)
      ? source.questions.map(normalizeQuestion)
      : [],
  };
}

function getOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const [mock, setMock] = useState<MockDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [submittedAttempt, setSubmittedAttempt] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(appPath(`/api/mocks/${id}`));
      const data = (await res.json()) as { mock?: MockDetail };
      setMock(normalizeMock(data.mock));

      const saved = localStorage.getItem(`mock-${id}-final`);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, unknown>;
        const normalizedAnswers = Object.fromEntries(
          Object.entries(parsed).map(([questionId, value]) => [questionId, Number(value)])
        ) as Record<string, number>;
        setAnswers(normalizedAnswers);
      }
    };

    void load();
  }, [id]);

  const score = useMemo(() => {
    if (!mock) {
      return 0;
    }

    return mock.questions.reduce((total, question) => {
      const selectedIndex = answers[question.id];
      const isValidCorrectAnswer =
        Number.isInteger(question.correctAnswer) &&
        question.correctAnswer >= 0 &&
        question.correctAnswer < question.options.length;

      if (!isValidCorrectAnswer) {
        return total;
      }

      return selectedIndex === question.correctAnswer ? total + 1 : total;
    }, 0);
  }, [answers, mock]);

  useEffect(() => {
    if (!mock || submittedAttempt) {
      return;
    }

    const alreadySubmitted = sessionStorage.getItem(`mock-${id}-attempt-submitted`);
    if (alreadySubmitted === "true") {
      setSubmittedAttempt(true);
      return;
    }

    const marks = Math.max(0, Math.min(score, mock.questions.length));

    const submitAttempt = async () => {
      toast.loading("Submitting mock attempt...", { id: "mock-attempt" });

      try {
        const res = await fetch(appPath(`/api/mocks/${id}/attempts`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            marks,
            correctCount: marks,
            totalQuestions: mock.questions.length,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409 && data?.hasAttempted) {
            sessionStorage.setItem(`mock-${id}-attempt-submitted`, "true");
            setSubmittedAttempt(true);
            toast.error(
              `You have already attended this test. Marks: ${
                data?.attempt?.score ?? data?.attempt?.marks ?? 0
              }`,
              { id: "mock-attempt" },
            );
            return;
          }

          const message =
            typeof data?.error === "string" ? data.error : "Failed to submit mock attempt";
          throw new Error(message);
        }

        localStorage.setItem(
          `mock-${id}-attempt-summary`,
          JSON.stringify({
            mockId: id,
            title: mock.title || "Grand Mock",
            marks,
            attemptsCount: data.attemptsCount ?? null,
            attempt: data.attempt ?? null,
          })
        );
        sessionStorage.setItem(`mock-${id}-attempt-submitted`, "true");
        setSubmittedAttempt(true);
        toast.success("Mock submitted successfully", { id: "mock-attempt" });
      } catch (error) {
        console.error("Mock attempt submission failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to submit mock attempt",
          { id: "mock-attempt" }
        );
      }
    };

    void submitAttempt();
  }, [id, mock, score, submittedAttempt]);

  if (!mock) {
    return null;
  }

  return (
    <>
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
        >
          <img
            src={preview}
            alt="Explanation preview"
            className="max-h-[90%] max-w-[90%] object-contain"
          />
        </div>
      )}

      <main className="urologics-shell px-3 py-3 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-3 sm:space-y-6">
          <header className="urologics-header flex flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
            <UrologicsBrand product="Grand Mocks" tag="Session results" />
            <div className="urologics-chip">Completed Review</div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[1fr_0.38fr]">
            <div className="urologics-panel p-5 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] sm:h-14 sm:w-14">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent-strong)]">Urologics Mock Review</div>
                  <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:mt-3 sm:text-3xl">
                    {mock.title || "Grand Mock"}
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Analysis of your performance in this mock session, along with explanations for each question.
                  </p>
                </div>
              </div>
            </div>

            <div className="urologics-panel flex flex-col items-center justify-center p-5 text-center sm:p-8">
              <Trophy className="text-[var(--accent-strong)]" size={22} />
              <div className="mt-4 text-4xl font-semibold text-[var(--accent-strong)] sm:text-5xl">
                {score}/{mock.questions.length}
              </div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">Final mock score</div>
            </div>
          </section>

          <section className="space-y-5">
            {mock.questions.map((question, index) => {
              const selectedIndex = answers[question.id];
              const correctIndex = question.correctAnswer;
              const selectedAnswer =
                Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < question.options.length
                  ? question.options[selectedIndex]
                  : null;
              const correctAnswer =
                Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < question.options.length
                  ? question.options[correctIndex]
                  : null;
              const isCorrect = selectedIndex === correctIndex && correctAnswer !== null;

              return (
                <article key={question.id} className="urologics-panel p-4 sm:p-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`mt-1 rounded-full p-2 ${isCorrect ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-rose-50 text-rose-600"}`}>
                      {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold leading-7 text-[var(--text-primary)] sm:text-lg sm:leading-8">
                        {index + 1}. {question.questionText}
                      </div>

                      <div className="mt-4 grid gap-2 sm:gap-3 md:grid-cols-2">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = selectedIndex === optionIndex;
                          const isCorrectOption = correctIndex === optionIndex;

                          return (
                            <div
                              key={`${question.id}-${optionIndex}`}
                              className={`rounded-[24px] border p-2.5 sm:rounded-[28px] sm:p-3 ${
                                isCorrectOption
                                  ? "border-emerald-300 bg-emerald-50"
                                  : isSelected
                                    ? "border-rose-200 bg-rose-50"
                                    : "border-[var(--border)] bg-[var(--surface)]"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                                    isCorrectOption
                                      ? "border-emerald-300 bg-emerald-500 text-white"
                                      : isSelected
                                        ? "border-rose-200 bg-rose-500 text-white"
                                        : "border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                                  }`}
                                >
                                  {getOptionLabel(optionIndex)}
                                </span>
                                <span
                                  className={`flex-1 rounded-[22px] px-4 py-3 text-sm font-medium leading-6 ${
                                    isCorrectOption
                                      ? "bg-white/80 text-emerald-900"
                                      : isSelected
                                        ? "bg-white/80 text-rose-700"
                                        : "bg-[var(--surface-muted)] text-[var(--text-primary)]"
                                  }`}
                                >
                                  {option}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 space-y-2 text-sm leading-6">
                        <p className="text-[var(--text-secondary)]">
                          Your answer:{" "}
                          <span className={isCorrect ? "text-[var(--accent-strong)]" : "text-rose-600"}>
                            {selectedAnswer ? `${getOptionLabel(selectedIndex)}. ${selectedAnswer}` : "Not answered"}
                          </span>
                        </p>
                        <p className="text-[var(--text-secondary)]">
                          Correct answer:{" "}
                          <span className="text-[var(--accent-strong)]">
                            {correctAnswer ? `${getOptionLabel(correctIndex)}. ${correctAnswer}` : "Not available"}
                          </span>
                        </p>
                      </div>

                      {question.explanation && (
                        <div className="urologics-subpanel mt-5 p-4">
                          {question.explanation.text && (
                            <p className="text-sm leading-7 text-[var(--text-secondary)]">{question.explanation.text}</p>
                          )}

                          {question.explanation.image && (
                            <div className="mt-4 flex justify-center">
                              <button type="button" onClick={() => setPreview(question.explanation?.image || null)}>
                                <img
                                  src={question.explanation.image}
                                  alt="Explanation"
                                  className="max-h-[220px] rounded-[28px] object-contain transition hover:scale-[1.02] sm:max-h-[300px]"
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </div>
      </main>
    </>
  );
}
