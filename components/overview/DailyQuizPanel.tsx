"use client";

import {
  BookOpenCheck,
  CheckCircle2,
  Image as ImageIcon,
  LockKeyhole,
  XCircle,
} from "lucide-react";

export type DailyQuiz = {
  id?: string;
  question?: string;
  image?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  topic?: string;
  examTrack?: string;
};

function renderInlineMarkdown(text: string) {
  const tokens = text.split(/(\*\*[\s\S]+?\*\*|`[^`]+`|\*[^*]+\*)/g);
  return tokens.map((token, i) => {
    if (!token) return null;
    if (token.startsWith("**") && token.endsWith("**"))
      return <strong key={i} className="font-semibold text-[var(--text-primary)]">{token.slice(2, -2)}</strong>;
    if (token.startsWith("`") && token.endsWith("`"))
      return <code key={i} className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--accent-strong)]">{token.slice(1, -1)}</code>;
    if (token.startsWith("*") && token.endsWith("*"))
      return <em key={i} className="italic">{token.slice(1, -1)}</em>;
    return token;
  });
}

function renderMarkdown(text: string) {
  const lines = text.replace(/\r\n/g, "\n").trim().split("\n");
  const blocks: Array<{ type: "p"; text: string } | { type: "ul"; items: string[] }> = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => { if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: "ul", items: [...list] }); list = []; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); continue; }
    const li = line.match(/^[-*]\s+(.+)$/)?.[1];
    if (li) { flushPara(); list.push(li); continue; }
    flushList(); para.push(line);
  }
  flushPara(); flushList();

  return blocks.map((b, i) =>
    b.type === "p"
      ? <p key={i} className="leading-7">{renderInlineMarkdown(b.text)}</p>
      : <ul key={i} className="list-disc space-y-1 pl-5">{b.items.map((item, j) => <li key={j} className="leading-6">{renderInlineMarkdown(item)}</li>)}</ul>
  );
}

interface Props {
  quiz: DailyQuiz | null;
  selectedOption: number | null;
  quizResult: "correct" | "wrong" | "submitted" | null;
  quizMessage: string;
  submitting: boolean;
  isLoggedIn: boolean;
  onSelect: (index: number) => void;
  onSubmit: () => void;
  onImagePreview: (src: string) => void;
}

export default function DailyQuizPanel({
  quiz,
  selectedOption,
  quizResult,
  quizMessage,
  submitting,
  isLoggedIn,
  onSelect,
  onSubmit,
  onImagePreview,
}: Props) {
  return (
    <section className="urologics-panel p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <BookOpenCheck size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
            Quiz of the Day
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">FRCS Urology</p>
        </div>
      </div>

      {quiz ? (
        <div className="mt-4 space-y-4">
          {/* Topic + image toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {quiz.topic && (
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
                {quiz.topic}
              </span>
            )}
            {quiz.image && (
              <button
                type="button"
                onClick={() => onImagePreview(quiz.image!)}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
              >
                <ImageIcon size={12} /> Open image
              </button>
            )}
          </div>

          {/* Inline image thumbnail */}
          {quiz.image && (
            <button
              type="button"
              onClick={() => onImagePreview(quiz.image!)}
              className="block overflow-hidden rounded-xl border border-[var(--border)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={quiz.image} alt="Quiz exhibit" className="max-h-40 w-full object-cover" />
            </button>
          )}

          <h2 className="text-base font-semibold leading-7 text-[var(--text-primary)]">
            {quiz.question}
          </h2>

          {/* Options */}
          <div className="space-y-2">
            {(quiz.options ?? []).map((option, index) => {
              const selected = selectedOption === index;
              const correct = quizResult && quiz.correctIndex === index;
              return (
                <button
                  key={`${option}-${index}`}
                  type="button"
                  onClick={() => !quizResult && onSelect(index)}
                  disabled={Boolean(quizResult)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    correct
                      ? "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : selected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]"
                  }`}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--accent-text)]">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback message */}
          {quizMessage && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
              quizResult === "correct"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : quizResult === "wrong"
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            }`}>
              {quizResult === "correct" ? <CheckCircle2 size={15} /> : quizResult === "wrong" ? <XCircle size={15} /> : <LockKeyhole size={15} />}
              {quizMessage}
            </div>
          )}

          {/* Explanation */}
          {quizResult && quiz.explanation && (
            <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-secondary)]">
              <div className="space-y-2">{renderMarkdown(quiz.explanation)}</div>
            </div>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || Boolean(quizResult)}
            className="urologics-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : quizResult ? "Submitted ✓" : isLoggedIn ? "Submit answer" : "Login to answer"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
          Today&apos;s quiz will appear here once it is available.
        </p>
      )}
    </section>
  );
}

