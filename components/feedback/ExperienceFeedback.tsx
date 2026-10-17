"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, MessageSquareText, Star } from "lucide-react";
import { appPath } from "@/lib/app-path";

type Props = {
  kind: "mock" | "viva";
  contextId: string;
  contextTitle: string;
  submissionId: string;
  candidate?: { name?: string; email?: string };
  onContinue: () => void;
};

const RATING_LABELS = ["Very poor", "Could be better", "Okay", "Good", "Excellent"];

function StarRating({ label, name, value, onChange, disabled }: {
  label: string; name: string; value: number; onChange: (value: number) => void; disabled: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 sm:p-6">
      <legend className="sr-only">{label}</legend>
      <p aria-hidden="true" className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
      <div className="mt-3 flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
        {[1, 2, 3, 4, 5].map(star => <label key={star} className="cursor-pointer">
          <input className="peer sr-only" type="radio" name={name} value={star} checked={value === star} onChange={() => onChange(star)} aria-label={`${star} ${star === 1 ? "star" : "stars"} — ${RATING_LABELS[star - 1]}`} />
          <span className="flex h-11 w-11 items-center justify-center rounded-xl transition hover:bg-amber-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] peer-disabled:opacity-60">
            <Star aria-hidden="true" size={30} strokeWidth={1.7} className={star <= value ? "fill-amber-400 text-amber-500" : "text-amber-400/70"} />
          </span>
        </label>)}
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-xs text-[var(--text-secondary)]">{value ? RATING_LABELS[value - 1] : "Choose 1 to 5 stars"}</p>
    </fieldset>
  );
}

export default function ExperienceFeedback({ kind, contextId, contextTitle, submissionId, candidate, onContinue }: Props) {
  const [rating, setRating] = useState(0);
  const [appRating, setAppRating] = useState(0);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const continued = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const isMock = kind === "mock";
  const canSubmit = rating > 0 && (!isMock || appRating > 0);

  useEffect(() => {
    heading.current?.focus();
    return () => { controller.current?.abort(); };
  }, []);

  function continueFlow() {
    if (continued.current) return;
    continued.current = true;
    controller.current?.abort();
    onContinue();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || saving || continued.current) return;
    setSaving(true); setError("");
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort(), 12_000);
    try {
      const response = await fetch(appPath("/api/experience-feedback"), {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
        body: JSON.stringify({
          kind, contextId, submissionId, candidate,
          ...(isMock ? { questionsRating: rating, appRating, reason: rating < 3 ? reason : undefined } : { vivaRating: rating, comment }),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "We could not save your feedback. Please retry or skip.");
      }
      continueFlow();
    } catch (error) {
      if (!continued.current) setError(request.signal.aborted ? "This is taking longer than expected. Please retry or skip." : error instanceof Error ? error.message : "Unable to save feedback. Please retry or skip.");
    } finally {
      clearTimeout(timeout);
      if (!continued.current) setSaving(false);
    }
  }

  return (
    <main className="urologics-shell flex min-h-dvh items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium text-[var(--accent-strong)]"><CheckCircle2 size={18} />{isMock ? "Mock submitted" : "Viva completed"}</div>
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_16px_50px_var(--shadow-soft)] sm:p-8">
          <span className="inline-flex rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]"><MessageSquareText size={25} /></span>
          <h1 ref={heading} tabIndex={-1} className="mt-5 text-2xl font-semibold tracking-tight text-[var(--text-primary)] outline-none">How was your experience?</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{isMock ? "A quick check-in before you see your rankings." : "Share a quick review before we prepare your report."} You can skip this step.</p>
          <p className="mt-3 truncate text-xs text-[var(--text-tertiary)]" title={contextTitle}>{contextTitle}</p>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <StarRating name="assessment-rating" label={isMock ? "How did you find the questions?" : "How was your AI viva?"} value={rating} onChange={setRating} disabled={saving} />
            {isMock && rating > 0 && rating < 3 && <div>
              <label htmlFor="feedback-reason" className="text-sm font-medium text-[var(--text-primary)]">What could we improve? <span className="font-normal text-[var(--text-tertiary)]">(optional)</span></label>
              <textarea id="feedback-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} rows={3} disabled={saving} placeholder="Tell us what did not work for you…" className="mt-2 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus)]" />
            </div>}
            {isMock ? <StarRating name="app-rating" label="Overall app experience" value={appRating} onChange={setAppRating} disabled={saving} /> : <div>
              <label htmlFor="feedback-comment" className="text-sm font-medium text-[var(--text-primary)]">Anything you would like to share? <span className="font-normal text-[var(--text-tertiary)]">(optional)</span></label>
              <textarea id="feedback-comment" value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} rows={3} disabled={saving} placeholder="Your feedback helps us improve future vivas…" className="mt-2 w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--focus)]" />
            </div>}
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-5 text-rose-800">{error}</p>}
            <button type="submit" disabled={!canSubmit || saving} className="urologics-button-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <><Loader2 size={18} className="animate-spin" />Saving feedback…</> : <>{isMock ? "Submit & view rankings" : "Submit & generate report"}<ArrowRight size={17} /></>}</button>
            <button type="button" onClick={continueFlow} className="w-full rounded-full px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">{isMock ? "Skip to rankings" : "Skip & generate report"}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
