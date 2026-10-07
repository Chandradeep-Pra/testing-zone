"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { appPath } from "@/lib/app-path";

type Candidate = { name: string; email: string };

export default function CandidateForm({
  candidate,
  onChange,
  onSubmit,
  vivaTitle,
  modeLabel,
}: {
  candidate: Candidate;
  onChange: (candidate: Candidate) => void;
  onSubmit: (candidate: Candidate) => void | Promise<void>;
  vivaTitle: string;
  modeLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const name = candidate.name.trim();
    const email = candidate.email.trim().toLowerCase();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email or leave it blank.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ name, email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save candidate details. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-8 shadow-[0_16px_40px_rgba(1,136,136,0.09)]">
        <img src={appPath("/logo.png")} alt="Urologics" className="mx-auto mb-3 h-16 w-16 object-contain" />
        <p className="text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
          Urologics AI
        </p>
        <h1 className="mt-4 text-center text-[28px] font-bold leading-8 tracking-tight">Candidate Information</h1>
        <p className="mt-2 text-center text-[15px] text-[var(--text-secondary)]">{vivaTitle}</p>
        <p className="mt-1 text-center text-[13px] uppercase tracking-[0.22em] text-[var(--accent)]">{modeLabel}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-[15px] font-medium text-[var(--text-secondary)]">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={candidate.name}
              onChange={(e) => onChange({ ...candidate, name: e.target.value })}
              className="urologics-input text-[17px]"
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-[15px] font-medium text-[var(--text-secondary)]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={candidate.email}
              onChange={(e) => onChange({ ...candidate, email: e.target.value })}
              className="urologics-input text-[17px]"
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>
          {error && (
            <p role="alert" className="text-[15px] text-rose-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-[17px] font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Continue"}
            {!saving && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
