"use client";

import { Flag, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import UrologicsBrand from "@/components/brand/UrologicsBrand";

export type MockQuestion = {
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

export type MockDetail = {
  title?: string;
  accessType?: "private" | "public" | string;
  questions: MockQuestion[];
};

function getOptionLabel(index: number) {
  return String.fromCharCode(65 + index);
}

type ImagePreviewHandler = (src: string | null) => void;
export type RankComparison = { official: number; effective: number } | null;

function getReviewStatus(question: MockQuestion, selectedIndex: number | undefined, hasSavedAnswers: boolean) {
  if (!hasSavedAnswers || !Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) return "unavailable";
  if (selectedIndex === undefined) return "unanswered";
  return selectedIndex === question.correctAnswer ? "correct" : "incorrect";
}

function QuestionReviewNavigation({ questions, answers, flaggedQuestionIds, hasSavedAnswers, activeQuestion, onSelect }: {
  questions: MockQuestion[];
  answers: Record<string, number>;
  flaggedQuestionIds: string[];
  hasSavedAnswers: boolean;
  activeQuestion: number;
  onSelect: (questionNumber: number) => void;
}) {
  const numberList = useRef<HTMLDivElement>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [jumpValue, setJumpValue] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const flaggedQuestions = new Set(flaggedQuestionIds);
  const parsedJump = Number(jumpValue);
  const jumpInvalid = jumpValue !== "" && (!Number.isInteger(parsedJump) || parsedJump < 1 || parsedJump > questions.length);

  useEffect(() => {
    const list = numberList.current;
    const button = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !button) return;
    const listBounds = list.getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();
    if (buttonBounds.left < listBounds.left || buttonBounds.right > listBounds.right) {
      list.scrollLeft += buttonBounds.left - listBounds.left - (list.clientWidth - buttonBounds.width) / 2;
    }
  }, [activeQuestion, flaggedOnly]);

  useEffect(() => () => {
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
  }, []);

  if (!questions.length) return null;

  const selectQuestion = (questionNumber: number) => {
    if (questionNumber < 1 || questionNumber > questions.length) return;
    if (flaggedOnly && !flaggedQuestions.has(questions[questionNumber - 1].id)) setFlaggedOnly(false);
    onSelect(questionNumber);
    window.history.replaceState(window.history.state, "", `#review-question-${questionNumber}`);
  };

  const questionButtons = questions.map((question, index) => ({ question, index })).filter(({ question }) => !flaggedOnly || flaggedQuestions.has(question.id)).map(({ question, index }) => {
    const status = getReviewStatus(question, answers[question.id], hasSavedAnswers);
    const isFlagged = flaggedQuestions.has(question.id);
    return (
      <button
        type="button"
        key={question.id}
        aria-label={`Question ${index + 1}: ${status === "unavailable" ? "answer unavailable" : status}${isFlagged ? ", flagged" : ""}`}
        aria-current={activeQuestion === index + 1 ? "location" : undefined}
        onClick={() => selectQuestion(index + 1)}
        className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] motion-reduce:transform-none motion-reduce:transition-none ${activeQuestion === index + 1 ? "ring-2 ring-[var(--accent-strong)] ring-offset-2 ring-offset-[var(--surface-raised)]" : ""} ${
          status === "correct"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
            : status === "incorrect"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
              : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
        }`}
      >
        {index + 1}
        {isFlagged && <Flag size={10} fill="currentColor" className="absolute right-0.5 top-0.5 text-amber-500" aria-hidden="true" />}
      </button>
    );
  });

  return (
    <nav aria-label="Review question navigation" className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-[0_2px_8px_var(--shadow-soft)]">
      <div ref={numberList} className="urologics-minimal-scrollbar flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain p-1 [&::-webkit-scrollbar]:h-1">
        {questionButtons.length > 0 ? questionButtons : (
          <span className="flex h-11 items-center px-2 text-sm text-[var(--text-secondary)]">No flagged questions</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-l border-[var(--border)] pl-3">
        <label className="relative flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <span className="hidden sm:inline">Jump to</span>
          <span className="sr-only sm:hidden">Jump to question</span>
          <input
            value={jumpValue}
            onChange={(event) => {
              const value = event.target.value.replace(/\D/g, "").slice(0, String(questions.length).length);
              setJumpValue(value);
              if (jumpTimer.current) clearTimeout(jumpTimer.current);
              const questionNumber = Number(value);
              if (value && questionNumber >= 1 && questionNumber <= questions.length) {
                jumpTimer.current = setTimeout(() => selectQuestion(questionNumber), 150);
              }
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (jumpTimer.current) clearTimeout(jumpTimer.current);
              if (!jumpInvalid && jumpValue) selectQuestion(parsedJump);
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Jump to question, 1 to ${questions.length}`}
            aria-invalid={jumpInvalid}
            aria-describedby="review-jump-range"
            placeholder="#"
            className={`h-10 w-12 rounded-xl border bg-[var(--surface)] px-2 text-center text-sm font-semibold tabular-nums text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--focus)] ${jumpInvalid ? "border-red-400" : "border-[var(--border)]"}`}
          />
          <span id="review-jump-range" className={`absolute right-0 top-full mt-1 whitespace-nowrap text-[10px] text-red-600 dark:text-red-300 ${jumpInvalid ? "block" : "hidden"}`}>1–{questions.length}</span>
        </label>
        <button
          type="button"
          aria-label={flaggedOnly ? "Show all question numbers" : `Show ${flaggedQuestionIds.length} flagged question numbers`}
          aria-pressed={flaggedOnly}
          title={flaggedOnly ? "Show all questions" : "Show flagged questions"}
          onClick={() => {
            const nextFlaggedOnly = !flaggedOnly;
            setFlaggedOnly(nextFlaggedOnly);
            if (nextFlaggedOnly) {
              const firstFlaggedIndex = questions.findIndex((question) => flaggedQuestions.has(question.id));
              if (firstFlaggedIndex >= 0) selectQuestion(firstFlaggedIndex + 1);
            }
          }}
          className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold tabular-nums transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 motion-reduce:transform-none motion-reduce:transition-none ${flaggedOnly ? "border-amber-500 bg-amber-400 text-amber-950 shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-amber-950" : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-amber-300 hover:text-amber-700 dark:hover:text-amber-300"}`}
        >
          <Flag size={15} fill={flaggedOnly ? "currentColor" : "none"} aria-hidden="true" />
          <span>{flaggedQuestionIds.length}</span>
        </button>
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

function ReviewHeader({ title, score, total, ranks }: {
  title?: string;
  score: number;
  total: number;
  ranks: RankComparison;
}) {
  return (
    <header className="urologics-header flex shrink-0 items-center gap-3 px-3 py-2 sm:gap-4 sm:px-4 sm:py-2.5">
      <UrologicsBrand product="Grand Mocks" compact />
      <div className="h-7 w-px shrink-0 bg-[var(--border)]" aria-hidden="true" />
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
        {title || "Grand Mock"}
      </h1>
      {ranks && (
        <dl className="hidden shrink-0 items-center gap-4 text-right md:flex">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Official</dt>
            <dd className="text-sm font-semibold text-[var(--text-primary)]">#{ranks.official}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Effective</dt>
            <dd className="text-sm font-semibold text-[var(--accent-strong)]">#{ranks.effective}</dd>
          </div>
        </dl>
      )}
      <div className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--accent-soft)] px-3 text-[var(--accent-strong)]">
        <Trophy size={16} aria-hidden="true" />
        <span className="text-sm font-semibold tabular-nums">{score}/{total}</span>
        <span className="sr-only">Current attempt score</span>
      </div>
    </header>
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
  isFlagged,
  onPreview,
}: {
  question: MockQuestion;
  index: number;
  selectedIndex: number | undefined;
  hasSavedAnswers: boolean;
  isFlagged: boolean;
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
      className={`relative min-w-0 scroll-mt-0.5 rounded-[24px] md:scroll-mt-6 border bg-[var(--surface-raised)] p-4 sm:rounded-[28px] sm:p-6 ${
        status === "correct"
          ? "border-emerald-300 shadow-[0_3px_14px_rgba(16,185,129,0.055)] dark:border-emerald-500/40 dark:shadow-[0_3px_14px_rgba(16,185,129,0.035)]"
          : status === "unavailable"
            ? "border-[var(--border)] shadow-none"
            : "border-red-200 shadow-[0_3px_14px_rgba(239,68,68,0.045)] dark:border-red-500/40 dark:shadow-[0_3px_14px_rgba(239,68,68,0.035)]"
      }`}
    >
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <div className="flex items-start gap-3">
          <h2 id={`review-question-heading-${index + 1}`} className="min-w-0 flex-1 text-base font-semibold leading-7 text-[var(--text-primary)] sm:text-lg sm:leading-8">
            {index + 1}. {question.questionText}
            <span className="sr-only"> — {status === "unavailable" ? "Your answer is unavailable" : status}{isFlagged ? ", flagged during test" : ""}</span>
          </h2>
          {isFlagged && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-200">
              <Flag size={13} fill="currentColor" aria-hidden="true" />
              <span className="hidden sm:inline">Flagged</span>
            </span>
          )}
        </div>

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

export default function ReviewAnswers({ mock, answers, flaggedQuestionIds = [], hasSavedAnswers, score, ranks }: {
  mock: MockDetail;
  answers: Record<string, number>;
  flaggedQuestionIds?: string[];
  hasSavedAnswers: boolean;
  score: number;
  ranks: RankComparison;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [displayedQuestion, setDisplayedQuestion] = useState(1);
  const [cardVisible, setCardVisible] = useState(true);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrame = useRef<number | null>(null);
  const questionViewport = useRef<HTMLDivElement>(null);
  const total = mock.questions.length;
  const flaggedQuestions = new Set(flaggedQuestionIds);

  const selectQuestion = (questionNumber: number) => {
    if (questionNumber < 1 || questionNumber > total || questionNumber === activeQuestion) return;

    setActiveQuestion(questionNumber);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayedQuestion(questionNumber);
      setCardVisible(true);
      questionViewport.current?.scrollTo({ top: 0 });
      return;
    }

    setCardVisible(false);
    transitionTimer.current = setTimeout(() => {
      setDisplayedQuestion(questionNumber);
      questionViewport.current?.scrollTo({ top: 0 });
      animationFrame.current = requestAnimationFrame(() => setCardVisible(true));
    }, 150);
  };

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
  }, []);

  const displayed = mock.questions[displayedQuestion - 1];

  return (
    <>
      {preview && <ReviewImagePreview src={preview} onClose={() => setPreview(null)} />}
      <main className="urologics-shell h-dvh overflow-hidden px-3 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3">
          <ReviewHeader title={mock.title} score={score} total={total} ranks={ranks} />
          <QuestionReviewNavigation
            questions={mock.questions}
            answers={answers}
            flaggedQuestionIds={flaggedQuestionIds}
            hasSavedAnswers={hasSavedAnswers}
            activeQuestion={activeQuestion}
            onSelect={selectQuestion}
          />
          {!hasSavedAnswers && <MissingAnswersNotice />}
          <div ref={questionViewport} className="urologics-minimal-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-1">
            {displayed ? (
              <section
                aria-live="polite"
                aria-busy={!cardVisible}
                className={`transition-opacity duration-150 ease-in-out motion-reduce:transition-none ${cardVisible ? "opacity-100" : "opacity-0"}`}
              >
                <QuestionReviewCard
                  key={displayed.id}
                  question={displayed}
                  index={displayedQuestion - 1}
                  selectedIndex={answers[displayed.id]}
                  hasSavedAnswers={hasSavedAnswers}
                  isFlagged={flaggedQuestions.has(displayed.id)}
                  onPreview={setPreview}
                />
              </section>
            ) : (
              <div className="urologics-panel p-6 text-center text-sm text-[var(--text-secondary)]">No questions are available for this review.</div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
