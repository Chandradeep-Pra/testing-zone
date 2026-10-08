"use client";

import { Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ResultsLoader from "@/components/ui/ResultsLoader";
import ConfettiOnLoad from "@/components/ui/ConfettiOnLoad";
import YourRankCard from "@/components/ui/YourRankCard";
import { useAuth } from "@/components/auth/AuthProvider";
import { appPath } from "@/lib/app-path";

type Result = { name: string; email: string; marks: number; createdAt: string | null };
type RankedResult = Result & { rank: number };
type Summary = { total: number; correct: number; wrong: number; skipped: number };

const MIN_LOADER_MS = 4500;

export default function RankPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADER_MS));

    const saveAttempt = async () => {
      try {
        const runId =
          localStorage.getItem(`mock-${id}-run-id`) ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(`mock-${id}-run-id`, runId);
        const submittedKey = `mock-${id}-${runId}-attempt-submitted`;
        const res = await fetch(appPath(`/api/mocks/${id}`));
        const data = await res.json();
        const questions: Array<{ id?: string; correctAnswer?: unknown }> = data?.mock?.questions ?? [];
        const saved = JSON.parse(localStorage.getItem(`mock-${id}-final`) || "{}") as Record<string, unknown>;
        let correct = 0;
        let skipped = 0;
        for (const question of questions) {
          const answer = question.id !== undefined ? saved[question.id] : undefined;
          if (answer === undefined || answer === null || answer === "") skipped += 1;
          else if (Number(answer) === Number(question.correctAnswer)) correct += 1;
        }
        const marks = correct;
        setSummary({ total: questions.length, correct, wrong: questions.length - correct - skipped, skipped });

        if (sessionStorage.getItem(submittedKey) !== "true") {
          const attemptRes = await fetch(appPath(`/api/mocks/${id}/attempts`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ marks, correctCount: marks, totalQuestions: questions.length }),
          });
          if (attemptRes.ok) sessionStorage.setItem(submittedKey, "true");
        }
      } catch (error) {
        console.error("Mock attempt submission failed:", error);
      }

      try {
        const res = await fetch(appPath(`/api/public/mocks/${id}/results`), { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data?.results)) setResults(data.results);
      } catch (error) {
        console.error("Failed to load results:", error);
      }
    };

    void Promise.all([saveAttempt(), minDelay]).then(() => setReady(true));
  }, [id]);

  if (!ready) {
    return <ResultsLoader />;
  }

  const sorted = [...results].sort((a, b) => b.marks - a.marks);
  const ranked: RankedResult[] = sorted.map((item) => ({
    ...item,
    rank: sorted.findIndex((other) => other.marks === item.marks) + 1,
  }));
  const userEmail = user?.email?.trim().toLowerCase() || "";
  const userName = user?.name?.trim().toLowerCase() || "";
  const isMe = (row: Result) =>
    Boolean(userEmail && row.email === userEmail) ||
    Boolean(!row.email && userName && row.name.trim().toLowerCase() === userName);
  const me = ranked.find(isMe);
  const [first, second, third] = ranked;
  const podium = [
    { entry: second, height: "h-32", color: "text-slate-300" },
    { entry: first, height: "h-44", color: "text-yellow-300" },
    { entry: third, height: "h-24", color: "text-amber-600" },
  ].filter((item): item is { entry: RankedResult; height: string; color: string } => Boolean(item.entry));
  const latest = [...ranked]
    .sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0))
    .slice(0, 10);

  return (
    <main className="urologics-shell min-h-screen px-4 py-10">
      <ConfettiOnLoad />
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <div className="urologics-chip">Leaderboard</div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">Your Rank</h1>
        </header>

        {me && summary && (
          <YourRankCard
            stats={{
              rank: me.rank,
              totalAttendees: ranked.length,
              marks: me.marks,
              totalQuestions: summary.total,
              correct: summary.correct,
              wrong: summary.wrong,
              skipped: summary.skipped,
            }}
          />
        )}

        <section className="flex items-end justify-center gap-3">
          {podium.map(({ entry, height, color }) => (
            <div key={entry.rank} className="w-1/3 text-center">
              <Trophy className={`mx-auto h-8 w-8 ${color}`} />
              <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{entry.name}</div>
              <div className="text-xs text-[var(--text-secondary)]">{entry.marks} marks</div>
              <div
                className={`${height} mt-2 flex items-start justify-center rounded-t-2xl border border-[var(--border)] bg-[var(--surface-raised)] pt-3 text-2xl font-bold ${color}`}
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
              {latest.length === 0 && (
                <tr className="border-t border-[var(--border)]">
                  <td colSpan={4} className="px-5 py-4 text-center text-[var(--text-secondary)]">
                    No attempts yet.
                  </td>
                </tr>
              )}
              {latest.map((row) => (
                <tr
                  key={`${row.email}-${row.createdAt}`}
                  className={`border-t border-[var(--border)] ${isMe(row) ? "bg-[var(--accent-soft)] font-semibold" : ""}`}
                >
                  <td className="px-5 py-2">#{row.rank}</td>
                  <td className="px-5 py-2">
                    {row.name}
                    {isMe(row) ? " (You)" : ""}
                  </td>
                  <td className="px-5 py-2">{row.marks}</td>
                  <td className="px-5 py-2">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href={`/mocks/${id}/result`} className="urologics-button-primary flex-1 text-center">
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
