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
import { formatRelativeAttended } from "@/lib/format-relative-time";

type Result = {
  rank?: number;
  name: string;
  email: string;
  userImage?: string | null;
  marks: number;
  maxMarks?: number | null;
  attended?: string;
  createdAt?: string | null;
  submittedAt?: string | null;
};

type RankedResult = Result & { rank: number };
type Summary = { total: number; correct: number; wrong: number; skipped: number };

const MIN_LOADER_MS = 2500;

export default function RankPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADER_MS));

    const loadData = async () => {
      // 1. Recover exam summary from local storage
      try {
        const savedSummary = localStorage.getItem(`mock-${id}-summary`);
        if (savedSummary) {
          const parsed = JSON.parse(savedSummary) as Summary;
          if (parsed && typeof parsed.total === "number") {
            setSummary(parsed);
          }
        } else {
          // Fallback calculation if summary wasn't stored
          const res = await fetch(appPath(`/api/mocks/${id}`), { cache: "no-store" });
          const data = await res.json();
          const questions: Array<{ id?: string; correctAnswer?: unknown; options?: unknown[] }> =
            data?.mock?.questions ?? [];
          const savedAnswers = JSON.parse(
            localStorage.getItem(`mock-${id}-final`) || "{}"
          ) as Record<string, unknown>;

          let correct = 0;
          let skipped = 0;
          for (const q of questions) {
            const ans = q.id !== undefined ? savedAnswers[q.id] : undefined;
            if (ans === undefined || ans === null) {
              skipped += 1;
            } else if (
              Number.isInteger(q.correctAnswer) &&
              Number(ans) === Number(q.correctAnswer)
            ) {
              correct += 1;
            }
          }
          const total = questions.length;
          setSummary({
            total,
            correct,
            wrong: Math.max(0, total - correct - skipped),
            skipped,
          });
        }
      } catch (err) {
        console.error("Summary recovery error:", err);
      }

      // 2. Fetch fresh leaderboard results (cache-busted)
      try {
        const res = await fetch(appPath(`/api/public/mocks/${id}/results?_t=${Date.now()}`), {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        const data = await res.json();
        if (Array.isArray(data?.results)) {
          setResults(data.results);
        }
      } catch (error) {
        console.error("Failed to load results:", error);
      }
    };

    void Promise.all([loadData(), minDelay]).then(() => setReady(true));
  }, [id]);

  if (!ready) {
    return <ResultsLoader title="Ranking Candidate Performance" />;
  }

  // Deduplicate and rank
  const sorted = [...results].sort((a, b) => {
    if (b.marks !== a.marks) return b.marks - a.marks;
    const timeA = Date.parse(a.submittedAt || a.createdAt || "") || 0;
    const timeB = Date.parse(b.submittedAt || b.createdAt || "") || 0;
    return timeB - timeA;
  });

  const ranked: RankedResult[] = sorted.map((item, idx) => ({
    ...item,
    rank: item.rank || idx + 1,
  }));

  const userEmail = user?.email?.trim().toLowerCase() || "";
  const userName = user?.name?.trim().toLowerCase() || "";
  let verifiedCandidateEmail = "";
  let verifiedCandidateName = "";
  try {
    const verified = JSON.parse(localStorage.getItem("urologics-candidate-verification") || "{}");
    verifiedCandidateEmail = String(verified.email || "").trim().toLowerCase();
    verifiedCandidateName = String(verified.name || "").trim().toLowerCase();
  } catch {}

  const isMe = (row: Result) => {
    const rowEmail = (row.email || "").trim().toLowerCase();
    const rowName = (row.name || "").trim().toLowerCase();
    if (userEmail && rowEmail === userEmail) return true;
    if (verifiedCandidateEmail && rowEmail === verifiedCandidateEmail) return true;
    if (!rowEmail && userName && rowName === userName) return true;
    if (!rowEmail && verifiedCandidateName && rowName === verifiedCandidateName) return true;
    return false;
  };

  const me = ranked.find(isMe);
  const [first, second, third] = ranked;
  const podium = [
    { entry: second, height: "h-32", color: "text-slate-300" },
    { entry: first, height: "h-44", color: "text-yellow-300" },
    { entry: third, height: "h-24", color: "text-amber-600" },
  ].filter((item): item is { entry: RankedResult; height: string; color: string } => Boolean(item.entry));

  const latest = [...ranked].slice(0, 10);

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

        {podium.length > 0 && (
          <section className="flex items-end justify-center gap-3">
            {podium.map(({ entry, height, color }) => (
              <div key={entry.rank} className="w-1/3 text-center">
                <Trophy className={`mx-auto h-8 w-8 ${color}`} />
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  {entry.userImage ? (
                    <img
                      src={entry.userImage}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover border border-[var(--border)]"
                    />
                  ) : null}
                  <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {entry.name}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">{entry.marks} marks</div>
                <div
                  className={`${height} mt-2 flex items-start justify-center rounded-t-2xl border border-[var(--border)] bg-[var(--surface-raised)] pt-3 text-2xl font-bold ${color}`}
                >
                  #{entry.rank}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)]">
          <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
            Last 10 attendees
          </div>
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-2.5 font-medium">Rank</th>
                <th className="px-5 py-2.5 font-medium">Candidate</th>
                <th className="px-5 py-2.5 font-medium">Marks</th>
                <th className="px-5 py-2.5 font-medium">Attended</th>
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
                  key={`${row.email}-${row.submittedAt || row.createdAt || row.rank}`}
                  className={`border-t border-[var(--border)] transition hover:bg-[var(--surface-tint)] ${
                    isMe(row) ? "bg-[var(--accent-soft)] font-semibold" : ""
                  }`}
                >
                  <td className="px-5 py-3">#{row.rank}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {row.userImage ? (
                        <img
                          src={row.userImage}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover border border-[var(--border)]"
                        />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)]">
                          {(row.name || "A").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{row.name}</span>
                      {isMe(row) && (
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-text)]">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 font-semibold">{row.marks}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {row.attended || formatRelativeAttended(row.submittedAt || row.createdAt)}
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
