"use client";

import { ShieldCheck, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import { appPath } from "@/lib/app-path";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMockCandidateEmail, readCompletedMockAttempt, resolveMockAttempt } from "@/lib/mock-session";
import { firstAttemptRankings, mockEffectiveRank } from "@/lib/mock-ranking";

type MockQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  questionImage?: string;
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
    questionImage:
      typeof source.questionImage === "string" && source.questionImage.trim() ? source.questionImage : undefined,
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

type ImagePreviewHandler = (src: string | null) => void;
type RankComparison = { official: number; effective: number } | null;

function getReviewStatus(question: MockQuestion, selectedIndex: number | undefined, hasSavedAnswers: boolean) {
  if (!hasSavedAnswers || !Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) return "unavailable";
  if (selectedIndex === undefined) return "unanswered";
  return selectedIndex === question.correctAnswer ? "correct" : "incorrect";
}

function QuestionReviewNavigation({ questions, answers, hasSavedAnswers }: {
  questions: MockQuestion[];
  answers: Record<string, number>;
  hasSavedAnswers: boolean;
}) {
  if (!questions.length) return null;

  return (
    <nav aria-label="Review question numbers" className="sticky top-0 z-30 min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-[0_2px_8px_var(--shadow-soft)] md:hidden">
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:thin] [scrollbar-color:var(--border-strong)_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--border-strong)]">
        {questions.map((question, index) => {
          const status = getReviewStatus(question, answers[question.id], hasSavedAnswers);
          return (
            <a
              key={question.id}
              href={`#review-question-${index + 1}`}
              aria-label={`Question ${index + 1}: ${status === "unavailable" ? "answer unavailable" : status}`}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] ${
                status === "correct"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : status === "incorrect"
                    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
                    : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
              }`}
            >
              #{index + 1}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function ReviewImagePreview({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
    >
      <img
        src={src}
        alt="Explanation preview"
        className="max-h-[90%] max-w-[90%] object-contain"
      />
    </div>
  );
}

function ReviewHeader() {
  return (
    <header className="urologics-header flex flex-col items-start gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <UrologicsBrand product="Grand Mocks" tag="Session results" />
      <div className="urologics-chip">Completed Review</div>
    </header>
  );
}

function ReviewIntroduction({ title }: { title?: string }) {
  return (
    <div className="urologics-panel p-5 sm:p-8">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] sm:h-14 sm:w-14">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-[var(--accent-strong)]">Urologics Mock Review</div>
          <h1 className="mt-2 text-xl font-semibold text-[var(--text-primary)] sm:mt-3 sm:text-3xl">
            {title || "Grand Mock"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Analysis of your performance in this mock session, along with explanations for each question.
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ score, total, ranks }: { score: number; total: number; ranks: RankComparison }) {
  return (
    <div className="urologics-panel flex flex-col items-center justify-center p-5 text-center sm:p-8">
      <Trophy className="text-[var(--accent-strong)]" size={22} />
      <div className="mt-4 text-4xl font-semibold text-[var(--accent-strong)] sm:text-5xl">
        {score}/{total}
      </div>
      <div className="mt-2 text-sm text-[var(--text-secondary)]">Current attempt score</div>
      {ranks && <ReviewRankComparison ranks={ranks} />}
    </div>
  );
}

function ReviewRankComparison({ ranks }: { ranks: NonNullable<RankComparison> }) {
  return (
    <div className="mt-5 w-full border-t border-[var(--border)] pt-4">
      <dl className="grid grid-cols-2 gap-3">
        <div><dt className="text-xs text-[var(--text-secondary)]">Official rank</dt><dd className="mt-1 text-xl font-semibold text-[var(--text-primary)]">#{ranks.official}</dd></div>
        <div><dt className="text-xs text-[var(--text-secondary)]">Effective rank</dt><dd className="mt-1 text-xl font-semibold text-[var(--accent-strong)]">#{ranks.effective}</dd></div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">Effective rank compares this attempt with other candidates’ first attempts. Faster completion breaks score ties. Official rank remains based on your first attempt.</p>
    </div>
  );
}

function ReviewSummary({ title, score, total, ranks }: { title?: string; score: number; total: number; ranks: RankComparison }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_0.38fr]">
      <ReviewIntroduction title={title} />
      <ScoreCard score={score} total={total} ranks={ranks} />
    </section>
  );
}

function MissingAnswersNotice() {
  return (
    <div className="urologics-panel p-4 text-sm text-[var(--text-secondary)]">
      Your selected answers are unavailable for this earlier attempt. You can still review every correct answer and explanation below.
    </div>
  );
}

function QuestionImage({ src, onPreview }: { src: string; onPreview: ImagePreviewHandler }) {
  return (
    <button
      type="button"
      onClick={() => onPreview(src)}
      className="mt-4 block w-full overflow-hidden rounded-[20px] border border-[var(--border)] bg-[#ffffff] p-2 sm:p-3"
      aria-label="Open question image"
    >
      <img
        src={src}
        alt="Question exhibit"
        className="mx-auto max-h-[50vh] w-full object-contain"
      />
    </button>
  );
}

function AnswerOption({
  option,
  optionIndex,
  isSelected,
  isCorrectOption,
}: {
  option: string;
  optionIndex: number;
  isSelected: boolean;
  isCorrectOption: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-2.5 sm:rounded-[28px] sm:p-3 ${
        isCorrectOption
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/10"
          : isSelected
            ? "border-rose-200 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/10"
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
          className={`min-w-0 flex-1 rounded-[22px] px-3 py-3 text-sm font-medium leading-6 [overflow-wrap:anywhere] sm:px-4 ${
            isCorrectOption
              ? "bg-[#ffffff]/80 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100"
              : isSelected
                ? "bg-[#ffffff]/80 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200"
                : "bg-[var(--surface-muted)] text-[var(--text-primary)]"
          }`}
        >
          {option}
        </span>
      </div>
    </div>
  );
}

function QuestionOptions({
  question,
  selectedIndex,
}: {
  question: MockQuestion;
  selectedIndex: number | undefined;
}) {
  return (
    <div className="mt-4 grid gap-2 sm:gap-3 md:grid-cols-2">
      {question.options.map((option, optionIndex) => (
        <AnswerOption
          key={`${question.id}-${optionIndex}`}
          option={option}
          optionIndex={optionIndex}
          isSelected={selectedIndex === optionIndex}
          isCorrectOption={question.correctAnswer === optionIndex}
        />
      ))}
    </div>
  );
}

function AnswerSummary({
  selectedIndex,
  selectedAnswer,
  correctIndex,
  correctAnswer,
  isCorrect,
}: {
  selectedIndex: number | undefined;
  selectedAnswer: string | null;
  correctIndex: number;
  correctAnswer: string | null;
  isCorrect: boolean;
}) {
  return (
    <div className="mt-4 space-y-2 text-sm leading-6">
      <p className="text-[var(--text-secondary)]">
        Your answer:{" "}
        <span className={isCorrect ? "text-[var(--accent-strong)]" : "text-rose-600 dark:text-rose-300"}>
          {selectedAnswer && selectedIndex !== undefined ? `${getOptionLabel(selectedIndex)}. ${selectedAnswer}` : "Not answered"}
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        Correct answer:{" "}
        <span className="text-[var(--accent-strong)]">
          {correctAnswer ? `${getOptionLabel(correctIndex)}. ${correctAnswer}` : "Not available"}
        </span>
      </p>
    </div>
  );
}

function QuestionExplanation({
  explanation,
  onPreview,
}: {
  explanation: MockQuestion["explanation"];
  onPreview: ImagePreviewHandler;
}) {
  if (!explanation) return null;

  return (
    <div className="urologics-subpanel mt-5 p-4">
      {explanation.text && (
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{explanation.text}</p>
      )}

      {explanation.image && (
        <div className="mt-4 flex justify-center">
          <button type="button" className="min-w-0 max-w-full" onClick={() => onPreview(explanation?.image || null)}>
            <img
              src={explanation.image}
              alt="Explanation"
              className="max-h-[220px] max-w-full rounded-[28px] object-contain transition hover:scale-[1.02] motion-reduce:transition-none sm:max-h-[300px]"
            />
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionReviewCard({
  question,
  index,
  selectedIndex,
  hasSavedAnswers,
  onPreview,
}: {
  question: MockQuestion;
  index: number;
  selectedIndex: number | undefined;
  hasSavedAnswers: boolean;
  onPreview: ImagePreviewHandler;
}) {
  const correctIndex = question.correctAnswer;
  const selectedAnswer =
    selectedIndex !== undefined && Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < question.options.length
      ? question.options[selectedIndex]
      : null;
  const correctAnswer =
    Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < question.options.length
      ? question.options[correctIndex]
      : null;
  const isCorrect = selectedIndex === correctIndex && correctAnswer !== null;
  const status = getReviewStatus(question, selectedIndex, hasSavedAnswers);

  return (
    <article
      id={`review-question-${index + 1}`}
      aria-labelledby={`review-question-heading-${index + 1}`}
      data-review-status={status}
      className={`relative min-w-0 scroll-mt-2 rounded-[24px] md:scroll-mt-24 border bg-[var(--surface-raised)] p-4 sm:rounded-[28px] sm:p-6 ${
        status === "correct"
          ? "border-emerald-300 shadow-[0_3px_14px_rgba(16,185,129,0.055)] dark:border-emerald-500/40 dark:shadow-[0_3px_14px_rgba(16,185,129,0.035)]"
          : status === "unavailable"
            ? "border-[var(--border)] shadow-none"
            : "border-red-200 shadow-[0_3px_14px_rgba(239,68,68,0.045)] dark:border-red-500/40 dark:shadow-[0_3px_14px_rgba(239,68,68,0.035)]"
      }`}
    >
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <h2 id={`review-question-heading-${index + 1}`} className="text-base font-semibold leading-7 text-[var(--text-primary)] sm:text-lg sm:leading-8">
          {index + 1}. {question.questionText}
          <span className="sr-only"> — {status === "unavailable" ? "Your answer is unavailable" : status}</span>
        </h2>

        {question.questionImage && <QuestionImage src={question.questionImage} onPreview={onPreview} />}

        <QuestionOptions question={question} selectedIndex={selectedIndex} />

        <AnswerSummary
          selectedIndex={selectedIndex}
          selectedAnswer={selectedAnswer}
          correctIndex={correctIndex}
          correctAnswer={correctAnswer}
          isCorrect={isCorrect}
        />

        <QuestionExplanation explanation={question.explanation} onPreview={onPreview} />
      </div>
    </article>
  );
}

function QuestionReviewList({
  questions,
  answers,
  hasSavedAnswers,
  onPreview,
}: {
  questions: MockQuestion[];
  answers: Record<string, number>;
  hasSavedAnswers: boolean;
  onPreview: ImagePreviewHandler;
}) {
  return (
    <section className="space-y-5">
      {questions.map((question, index) => (
        <QuestionReviewCard
          key={question.id}
          question={question}
          index={index}
          selectedIndex={answers[question.id]}
          hasSavedAnswers={hasSavedAnswers}
          onPreview={onPreview}
        />
      ))}
    </section>
  );
}

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [mock, setMock] = useState<MockDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [hasSavedAnswers, setHasSavedAnswers] = useState(false);
  const [recordedScore, setRecordedScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [ranks, setRanks] = useState<RankComparison>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setRanks(null);
    const load = async () => {
      try {
        let res = await fetch(appPath(`/api/mocks/${id}`), { cache: "no-store" });
        if (res.status === 401) res = await fetch(appPath(`/api/public/mocks/${id}`), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load this review");
        if (!active) return;
        setMock(normalizeMock(data.mock));
        const candidateEmail = getMockCandidateEmail(user?.email);
        const attempt = resolveMockAttempt(data.mock, readCompletedMockAttempt(id, candidateEmail), candidateEmail);
        setRecordedScore(attempt?.marks ?? null);
        const parsed = attempt?.answers;
        setAnswers({});
        setHasSavedAnswers(false);
        if (parsed && typeof parsed === "object") {
          setAnswers(Object.fromEntries(Object.entries(parsed).filter(([, value]) => Number.isInteger(value) && Number(value) >= 0).map(([key, value]) => [key, Number(value)])));
          setHasSavedAnswers(true);
        }
        if (candidateEmail) {
          try {
            const rankingsResponse = await fetch(appPath(`/api/mocks/${id}/results`), { cache: "no-store" });
            if (!rankingsResponse.ok) return;
            const rankings = firstAttemptRankings(await rankingsResponse.json());
            const me = rankings.find((row) => row.email === candidateEmail);
            if (active && me) {
              const effective = mockEffectiveRank(attempt?.marks ?? me.marks, rankings.filter((row) => row.email !== candidateEmail), attempt ? attempt.timeTakenSeconds : me.timeTakenSeconds);
              if (effective !== null) setRanks({ official: me.rank, effective });
            }
          } catch { /* Answer review remains available if the leaderboard is unavailable. */ }
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load this review");
      }
    };

    void load();
    return () => { active = false; };
  }, [authLoading, id, user?.email]);

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

  if (!mock) {
    return <main className="urologics-shell min-h-screen p-8 text-center text-[var(--text-secondary)]">{error || "Loading answer review..."}</main>;
  }

  return (
    <>
      {preview && <ReviewImagePreview src={preview} onClose={() => setPreview(null)} />}

      <main className="urologics-shell px-3 py-3 sm:px-6 sm:py-8" style={{ overflowX: "clip" }}>
        <div className="mx-auto max-w-6xl space-y-3 sm:space-y-6">
          <ReviewHeader />
          <ReviewSummary
            title={mock.title}
            score={recordedScore ?? score}
            total={mock.questions.length}
            ranks={ranks}
          />
          <QuestionReviewNavigation questions={mock.questions} answers={answers} hasSavedAnswers={hasSavedAnswers} />
          {!hasSavedAnswers && <MissingAnswersNotice />}
          <QuestionReviewList questions={mock.questions} answers={answers} hasSavedAnswers={hasSavedAnswers} onPreview={setPreview} />
        </div>
      </main>
    </>
  );
}
