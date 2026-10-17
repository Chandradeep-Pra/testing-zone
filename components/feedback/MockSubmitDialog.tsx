"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

export type MockFeedbackRatings = { difficulty: number; experience: number };

const DIFFICULTY_LABELS = ["Very easy", "Easy", "Moderate", "Hard", "Very hard"];
const EXPERIENCE_LABELS = ["Very poor", "Poor", "Okay", "Good", "Excellent"];
const DIFFICULTY_COLORS = [
  "text-emerald-600 dark:text-emerald-400",
  "text-lime-600 dark:text-lime-400",
  "text-yellow-600 dark:text-yellow-400",
  "text-orange-600 dark:text-orange-400",
  "text-red-600 dark:text-red-400",
];

function RatingQuestion({ question, name, value, onChange, difficulty, required }: {
  question: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  difficulty?: boolean;
  required: boolean;
}) {
  const [preview, setPreview] = useState(0);
  const labels = difficulty ? DIFFICULTY_LABELS : EXPERIENCE_LABELS;

  return (
    <fieldset className="min-w-0">
      <legend className="text-[13px] font-medium leading-5 text-[var(--text-secondary)]">{question}</legend>
      <div className="mt-2 flex w-fit gap-1" onPointerLeave={() => setPreview(0)}>
        {labels.map((label, index) => {
          const star = index + 1;
          const selected = star <= (preview || value);
          return (
            <label
              key={label}
              className="cursor-pointer"
              onPointerEnter={event => { if (event.pointerType === "mouse") setPreview(star); }}
            >
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                required={required}
                aria-label={`${star} of 5 — ${label}`}
                className="peer sr-only"
              />
              <span className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-muted)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent-strong)] motion-reduce:transition-none">
                <Star
                  aria-hidden="true"
                  size={25}
                  strokeWidth={1.5}
                  className={`transition-[color,fill] duration-150 motion-reduce:transition-none ${difficulty ? DIFFICULTY_COLORS[index] : "text-amber-600 dark:text-amber-400"} ${selected ? "fill-current" : "fill-transparent opacity-65"}`}
                />
              </span>
            </label>
          );
        })}
      </div>
      <div className="mt-0.5 flex w-[236px] max-w-full justify-between px-2 text-[10px] text-[var(--text-tertiary)]" aria-hidden="true">
        <span>{difficulty ? "Easy" : "Poor"}</span><span>{difficulty ? "Hard" : "Excellent"}</span>
      </div>
    </fieldset>
  );
}

export default function MockSubmitDialog({ flaggedCount, ratings, onRatingsChange, onSubmit, onCancel }: {
  flaggedCount: number;
  ratings: MockFeedbackRatings;
  onRatingsChange: (ratings: MockFeedbackRatings) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const hasRating = ratings.difficulty > 0 || ratings.experience > 0;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="mock-submit-heading"
      aria-describedby="mock-submit-description"
      onCancel={event => { event.preventDefault(); onCancel(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-[var(--text-primary)] shadow-[0_24px_60px_var(--shadow-medium)] backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:p-8"
    >
      <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <h2 id="mock-submit-heading" className="text-center text-2xl font-semibold">
          {flaggedCount > 0 ? "Review flagged questions?" : "Submit mock?"}
        </h2>
        <p id="mock-submit-description" className="mt-3 text-center text-sm leading-6 text-[var(--text-secondary)]">
          {flaggedCount > 0
            ? `You have ${flaggedCount} flagged question${flaggedCount > 1 ? "s" : ""}, do you want to review them?`
            : "This will end the current Urologics mock session and move you to the results page."}
        </p>

        <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-5">
          <RatingQuestion
            question="How do you rate the difficulty level of the questions?"
            name="mock-difficulty"
            value={ratings.difficulty}
            onChange={difficulty => onRatingsChange({ ...ratings, difficulty })}
            difficulty
            required={hasRating}
          />
          <RatingQuestion
            question="How was your mock platform experience?"
            name="mock-platform-experience"
            value={ratings.experience}
            onChange={experience => onRatingsChange({ ...ratings, experience })}
            required={hasRating}
          />
          <div className="flex min-h-5 items-center justify-between gap-3 text-[11px] text-[var(--text-tertiary)]">
            <span>Ratings are optional</span>
            {hasRating && <button type="button" onClick={() => onRatingsChange({ difficulty: 0, experience: 0 })} className="rounded px-2 py-1 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--accent-strong)]">Clear ratings</button>}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="submit" className="min-h-11 flex-1 rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--border)] focus-visible:outline-2 focus-visible:outline-[var(--accent-strong)] motion-reduce:transition-none">
            {flaggedCount > 0 ? "Submit Anyway" : "Submit"}
          </button>
          <button type="button" autoFocus onClick={onCancel} className="min-h-11 flex-1 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]">
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
