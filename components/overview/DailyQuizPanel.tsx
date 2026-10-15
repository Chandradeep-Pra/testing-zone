"use client";

import {
  CircleHelp,
  Clock3,
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
  estimatedMinutes?: number;
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
    <section className="overview-card overview-quiz" aria-labelledby="daily-quiz-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon overview-quiz-icon"><CircleHelp size={21} aria-hidden="true" /></span>
        <h2 id="daily-quiz-heading">Question of the day</h2>
        {quiz && <span className="overview-quiz-time"><Clock3 size={12} aria-hidden="true" />{quiz.estimatedMinutes ?? 3} min</span>}
        {quiz?.topic && <span className="overview-quiz-topic">{quiz.topic}</span>}
      </div>
      {quiz ? <div className="overview-quiz-content">
        {quiz.image && <button type="button" className="overview-quiz-exhibit" onClick={() => onImagePreview(quiz.image!)}>
          <ImageIcon size={15} aria-hidden="true" /> View question image
        </button>}
        <p className="overview-quiz-question">{quiz.question}</p>
        <fieldset className="overview-quiz-options" disabled={Boolean(quizResult) || submitting}>
          <legend className="sr-only">Choose your answer</legend>
          {(quiz.options ?? []).map((option, index) => {
            const selected = selectedOption === index;
            const correct = Boolean(quizResult) && quiz.correctIndex === index;
            const wrong = quizResult === "wrong" && selected && !correct;
            return <label key={`${quiz.id}-${index}`} className={`overview-quiz-option ${selected ? "is-selected" : ""} ${correct ? "is-correct" : ""} ${wrong ? "is-wrong" : ""}`}>
              <input type="radio" name="overview-daily-quiz" value={index} checked={selected} onChange={() => onSelect(index)} />
              <span className="overview-option-letter">{String.fromCharCode(65 + index)}</span>
              <span>{option}</span>
              {correct && <CheckCircle2 size={17} className="overview-option-status" aria-label="Correct answer" />}
              {wrong && <XCircle size={17} className="overview-option-status" aria-label="Incorrect answer" />}
            </label>;
          })}
        </fieldset>
        <div aria-live="polite">
          {quizMessage && <div className={`overview-quiz-feedback ${quizResult === "correct" ? "is-correct" : quizResult === "wrong" ? "is-wrong" : ""}`}>
            {quizResult === "correct" ? <CheckCircle2 size={17} /> : quizResult === "wrong" ? <XCircle size={17} /> : <LockKeyhole size={17} />}
            {quizMessage}
          </div>}
          {quizResult && quiz.explanation && <div className="overview-quiz-explanation">{renderMarkdown(quiz.explanation)}</div>}
        </div>
        <button type="button" onClick={onSubmit} disabled={submitting || Boolean(quizResult)} className="overview-submit">
          {submitting ? "Submitting..." : quizResult ? "Answer submitted" : isLoggedIn ? "Submit answer" : "Sign in to answer"}
        </button>
        <p className="overview-quiz-footnote">One question. A daily learning habit.</p>
      </div> : <div className="overview-empty"><CircleHelp size={28} aria-hidden="true" /><h3>A new question is on its way</h3><p>Check back soon for your daily urology challenge.</p></div>}
    </section>
  );
}
