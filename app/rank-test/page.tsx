"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import ResultsLoader from "@/components/ui/ResultsLoader";
import ConfettiOnLoad from "@/components/ui/ConfettiOnLoad";
import YourRankCard from "@/components/ui/YourRankCard";
import ThemeToggle from "@/components/theme/ThemeToggle";

// Temporary preview page with sample data; safe to delete.
const SAMPLE = [
  { name: "Aarav Sharma", marks: 96, createdAt: "2026-10-08T09:41:00Z" },
  { name: "Diya Patel", marks: 96, createdAt: "2026-10-08T09:55:00Z" },
  { name: "Rohan Mehta", marks: 91, createdAt: "2026-10-08T10:02:00Z" },
  { name: "Ananya Iyer", marks: 88, createdAt: "2026-10-08T10:15:00Z" },
  { name: "Kabir Singh", marks: 86, createdAt: "2026-10-08T10:20:00Z" },
  { name: "Meera Nair", marks: 84, createdAt: "2026-10-08T10:31:00Z" },
  { name: "Vikram Rao", marks: 81, createdAt: "2026-10-08T10:44:00Z" },
  { name: "Sneha Gupta", marks: 79, createdAt: "2026-10-08T10:52:00Z" },
  { name: "Arjun Das", marks: 77, createdAt: "2026-10-08T11:05:00Z" },
  { name: "Isha Verma", marks: 74, createdAt: "2026-10-08T11:18:00Z" },
].map((item, index) => ({ ...item, rank: index + 1 }));

export default function RankTestPage() {
  const [showLoader, setShowLoader] = useState(false);
  const [first, second, third] = SAMPLE;
  const podium = [
    { entry: second, height: "h-32", color: "text-slate-300" },
    { entry: first, height: "h-44", color: "text-yellow-300" },
    { entry: third, height: "h-24", color: "text-amber-600" },
  ];

  return (
    <main className="urologics-shell min-h-screen px-4 py-10">
      {showLoader && <ResultsLoader />}
      <ConfettiOnLoad />
      <div className="fixed right-4 top-4 z-[110] flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setShowLoader(true);
            setTimeout(() => setShowLoader(false), 5000);
          }}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"
        >
          Preview loader
        </button>
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <div className="urologics-chip">Leaderboard</div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">Your Rank</h1>
        </header>

        <YourRankCard
          stats={{ rank: 7, totalAttendees: 42, marks: 31, totalQuestions: 50, correct: 31, wrong: 14, skipped: 5 }}
        />

        <section className="flex items-end justify-center gap-3">
          {podium.map(({ entry, height, color }) => (
            <div key={entry.rank} className="w-1/3 text-center">
              <Trophy className={`mx-auto h-8 w-8 ${color}`} />
              <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{entry.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">{entry.marks} marks</div>
              <div
                className={`${height} mt-2 flex items-start justify-center rounded-t-2xl border border-[var(--border)] bg-[var(--surface-raised)] pt-3 text-5xl font-extrabold sm:text-6xl ${color}`}
              >
                #{entry.rank}
              </div>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)]">
          <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
            Last 10 attendees
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-2 font-medium">Rank</th>
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Marks</th>
                <th className="px-5 py-2 font-medium">Attempted</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              {SAMPLE.map((row) => (
                <tr key={row.rank} className="border-t border-[var(--border)]">
                  <td className="px-5 py-2">#{row.rank}</td>
                  <td className="px-5 py-2">{row.name}</td>
                  <td className="px-5 py-2">{row.marks}</td>
                  <td className="px-5 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/mocks" className="urologics-button-primary flex-1 text-center">
            Review your answers
          </Link>
          <Link
            href="/mocks"
            className="flex-1 rounded-full bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
          >
            Attend another mock
          </Link>
        </div>
      </div>
    </main>
  );
}
