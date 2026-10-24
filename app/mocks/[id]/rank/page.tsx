"use client";

import { ArrowLeft, Medal, Timer, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ResultsLoader from "@/components/ui/ResultsLoader";
import GlobalLoading from "@/components/ui/GlobalLoading";
import ConfettiOnLoad from "@/components/ui/ConfettiOnLoad";
import YourRankCard from "@/components/ui/YourRankCard";
import RankAvatar from "@/components/ui/RankAvatar";
import MockCompletionTime from "@/components/ui/MockCompletionTime";
import { useAuth } from "@/components/auth/AuthProvider";
import { appPath } from "@/lib/app-path";
import { formatRelativeAttended } from "@/lib/format-relative-time";
import { firstAttemptRankings, mockEffectiveRank, mockPercentile, type MockRankResult } from "@/lib/mock-ranking";
import { getMockCandidateEmail, readCompletedMockAttempt, resolveMockAttempt, type MockAttemptView } from "@/lib/mock-session";
import type { Mock } from "@/data/sample-mocks";

type Result = MockRankResult;
type RankedResult = MockRankResult;

const MIN_LOADER_MS = 2500;

export default function RankPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [title, setTitle] = useState("Mock leaderboard");
  const [error, setError] = useState("");
  const [currentAttempt, setCurrentAttempt] = useState<MockAttemptView | null>(null);
  const [mock, setMock] = useState<Mock | null>(null);
  const [browsing, setBrowsing] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setReady(false);
    setError("");
    setResults([]);
    setMock(null);
    const fromMocks = new URLSearchParams(window.location.search).get("from") === "mocks";
    setBrowsing(fromMocks);
    try {
      setHasSession(Boolean(localStorage.getItem(`mock-${id}-started-at`)) && !localStorage.getItem(`mock-${id}-final`));
    } catch { setHasSession(false); }
    const candidateEmail = getMockCandidateEmail(user?.email);
    const cached = readCompletedMockAttempt(id, candidateEmail);
    setCurrentAttempt(cached);
    const minDelay = new Promise((resolve) => setTimeout(resolve, fromMocks ? 0 : MIN_LOADER_MS));

    const loadData = async () => {
      try {
        const detailRequest = fetch(appPath(`/api/mocks/${id}`), { cache: "no-store" })
          .then((response) => response.status === 401 ? fetch(appPath(`/api/public/mocks/${id}`), { cache: "no-store" }) : response)
          .then((response) => response.ok ? response.json() : null).catch(() => null);
        const [response, detail] = await Promise.all([
          fetch(appPath(`/api/mocks/${id}/results?_t=${Date.now()}`), { cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }),
          detailRequest,
        ]);
        const data = await response.json();
        if (!active) return;
        if (data.mock?.title || detail?.mock?.title) setTitle(data.mock?.title || detail.mock.title);
        setMock(detail?.mock || null);
        setCurrentAttempt(resolveMockAttempt(detail?.mock, cached, candidateEmail));
        if (!response.ok) throw new Error(data.error || "Unable to load rankings");
        setResults(firstAttemptRankings(data));
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Unable to load rankings");
      }
    };

    void Promise.all([loadData(), minDelay]).then(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [authLoading, id, user?.email, reloadKey]);

  if (!ready) {
    if (browsing) return <main className="urologics-shell flex min-h-screen items-center justify-center"><GlobalLoading label="Loading leaderboard" /></main>;
    return <ResultsLoader title="Ranking Candidate Performance" />;
  }

  // The API is the source of truth for ordering and rank.
  const ranked: RankedResult[] = results.map((item, idx) => ({
    ...item,
    rank: typeof item.rank === "number" && item.rank > 0 ? item.rank : idx + 1,
  })).sort((a, b) => a.rank - b.rank);

  const candidateEmail = getMockCandidateEmail(user?.email);
  let candidateName = user?.name?.trim().toLowerCase() || "";
  if (!candidateName) {
    try {
      const verified = JSON.parse(localStorage.getItem("urologics-candidate-verification") || localStorage.getItem("mockUser") || "{}");
      candidateName = String(verified.name || "").trim().toLowerCase();
    } catch {}
  }
  const isMe = (row: Result) => {
    const rowEmail = row.email.trim().toLowerCase();
    if (candidateEmail && rowEmail) return rowEmail === candidateEmail;
    return !rowEmail && Boolean(candidateName) && row.name.trim().toLowerCase() === candidateName;
  };

  const me = ranked.find(isMe);
  const hasAttended = Boolean(me || currentAttempt || mock?.hasAttempted);
  const canStart = Boolean(mock && (
    mock.accessType === "public" ||
    (mock.access?.allowed === true && mock.access.mode !== "locked") ||
    (!mock.access && user)
  ));
  const attemptHref = hasAttended
    ? `/mocks/${id}/result`
    : !user
      ? `/public-mocks/${id}`
      : hasSession ? `/mocks/${id}` : `/mocks/${id}/rules`;
  const attemptLabel = hasAttended ? "View analysis" : hasSession ? "Resume mock" : "Start mock";
  const [first, second, third] = ranked;
  const podium = [second, first, third]
    .filter((entry): entry is RankedResult => Boolean(entry))
    .map((entry) => {
      if (entry.rank === 1) return { entry, height: "h-44", color: "text-yellow-300" };
      if (entry.rank === 2) return { entry, height: "h-32", color: "text-slate-500 dark:text-slate-300" };
      return { entry, height: "h-24", color: "text-amber-700 dark:text-amber-500" };
    });



  return (
    <main className="urologics-shell min-h-screen px-4 py-10">
      {!browsing && <ConfettiOnLoad />}
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_16px_40px_var(--shadow-soft)] sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <Link href="/mocks" className="relative inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"><ArrowLeft size={16} />Back to mocks</Link>
          <div className="relative mt-6 flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Trophy size={27} /></div>
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Leaderboard</p><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Your first attempt. Every mark counts. Equal scores are decided by a faster finish.</p></div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-medium text-[var(--text-secondary)]">
            {!error && <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2"><Users size={14} />{ranked.length} candidates</span>}
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2"><Medal size={14} />First attempts only</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-2 text-[var(--accent-strong)]"><Timer size={14} />Faster time wins ties</span>
            {(me || currentAttempt) && <a href="#your-rank" className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-[var(--accent-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]">Your rank: {me ? `#${me.rank}` : "not available yet"}</a>}
          </div>
        </header>
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-sm text-[var(--text-secondary)]">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="min-h-11 rounded-lg px-3 font-medium text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              Try again
            </button>
          </div>
        )}

        {!hasAttended && !error && canStart && (
          <section className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--text-secondary)]">{hasSession ? "Finish your attempt to see your rank." : "Take this mock to see your rank."}</p>
            <Link href={attemptHref} className="urologics-button-primary shrink-0 text-center">{attemptLabel}</Link>
          </section>
        )}

        {(me || currentAttempt) && (
          <YourRankCard
            stats={{
              rank: me?.rank ?? null,
              totalAttendees: ranked.length,
              marks: currentAttempt?.marks ?? me?.marks ?? 0,
              totalQuestions: currentAttempt?.totalQuestions || me?.maxMarks || 0,
              firstAttemptMarks: me?.marks,
              firstAttemptTotalQuestions: me?.maxMarks ?? 0,
              firstAttemptTimeSeconds: me?.timeTakenSeconds,
              percentile: me ? mockPercentile(me.marks, ranked) : undefined,
              effectiveRank: me ? mockEffectiveRank(currentAttempt?.marks ?? me.marks, ranked.filter((row) => !isMe(row)), currentAttempt ? currentAttempt.timeTakenSeconds : me.timeTakenSeconds) : null,
            }}
          />
        )}

        {podium.length > 0 && (
          <section aria-label="Top three candidates" className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 pt-6 sm:px-8">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-1/4 -top-20 h-64 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative mb-7 flex items-center justify-between px-2"><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">The podium</h2><span className="text-xs text-[var(--text-tertiary)]">Score · Time · Rank</span></div>
            <div className="relative flex items-end justify-center gap-2 sm:gap-5">
            {podium.map(({ entry, height, color }) => (
              <div key={`${entry.email}-${entry.submittedAt || entry.rank}`} className="min-w-0 w-1/3 text-center">
                <div className="relative mx-auto w-fit">
                  <RankAvatar name={entry.name} src={entry.userImage} className={`h-12 w-12 border-2 text-sm shadow-sm sm:h-14 sm:w-14 ${entry.rank === 1 ? "border-amber-400 ring-4 ring-amber-400/15" : "border-[var(--border)]"}`} />
                  <span className={`absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--surface-raised)] ${entry.rank === 1 ? "bg-amber-400 text-amber-950" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}><Trophy size={12} /></span>
                </div>
                <p className="mt-3 truncate px-1 text-xs font-semibold text-[var(--text-primary)] sm:text-sm" title={entry.name}>{entry.name}</p>
                <p className="mb-2 mt-1 text-xs text-[var(--text-secondary)]"><span className="font-bold text-[var(--text-primary)]">{entry.marks}</span> marks</p>
                <MockCompletionTime seconds={entry.timeTakenSeconds} compact />
                <div
                  className={`${height} mt-3 flex flex-col items-center rounded-t-2xl border border-b-0 pt-4 ${entry.rank === 1 ? "border-amber-400/40 bg-gradient-to-b from-amber-400/20 to-amber-400/5" : "border-[var(--border)] bg-gradient-to-b from-[var(--surface-muted)] to-[var(--surface-raised)]"}`}
                >
                  <span className={`text-3xl font-bold tracking-tight sm:text-4xl ${entry.rank === 1 ? "text-amber-600 dark:text-amber-300" : color}`}>#{entry.rank}</span>
                  <span className="mt-2 text-[9px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)] sm:text-[10px]">{entry.rank === 1 ? "Leading the board" : entry.rank === 2 ? "Runner-up" : "Third place"}</span>
                </div>
              </div>
            ))}
            </div>
          </section>
        )}

        {!error && <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-5 sm:px-6">
            <div><h2 className="text-sm font-semibold text-[var(--text-primary)]">Candidate rankings</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Highest marks first. Shorter time breaks a tie.</p></div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-strong)]"><Timer size={14} />First-attempt times</span>
          </div>
          <table className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">First-attempt rankings sorted by marks descending, then completion time ascending.</caption>
            <thead className="bg-[var(--surface-muted)]/60 text-[10px] text-[var(--text-secondary)] sm:text-xs">
              <tr>
                <th scope="col" className="w-[14%] px-2 py-3 font-medium sm:px-5">Rank</th>
                <th scope="col" className="w-[42%] px-1 py-3 font-medium sm:px-5">Candidate</th>
                <th scope="col" aria-sort="descending" className="w-[17%] px-1 py-3 text-center font-medium sm:px-3">Marks</th>
                <th scope="col" className="w-[27%] px-1 py-3 text-center font-medium sm:px-3">Time taken</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text-primary)]">
              {ranked.length === 0 && (
                <tr className="border-t border-[var(--border)]">
                  <td colSpan={4} className="px-5 py-4 text-center text-[var(--text-secondary)]">
                    No attempts yet.
                  </td>
                </tr>
              )}
              {ranked.map((row) => (
                <tr
                  key={`${row.email}-${row.submittedAt || row.createdAt || row.rank}`}
                  className={`border-t border-[var(--border)] transition hover:bg-[var(--surface-tint)] ${
                    isMe(row) ? "bg-[var(--accent-soft)] font-semibold" : ""
                  }`}
                >
                  <td className="px-2 py-4 sm:px-5"><span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1 text-xs font-semibold tabular-nums sm:h-9 sm:min-w-9 sm:text-sm ${row.rank === 1 ? "bg-amber-400/15 text-amber-700 dark:text-amber-300" : row.rank <= 3 ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"}`}>#{row.rank}</span></td>
                  <td className="px-1 py-4 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <RankAvatar name={row.name} src={row.userImage} className="h-7 w-7 shrink-0 text-[10px] sm:h-10 sm:w-10 sm:text-xs" />
                      <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold sm:text-sm" title={row.name}>{row.name}</p><p className="mt-1 truncate text-[9px] font-normal text-[var(--text-tertiary)] sm:text-xs">{isMe(row) && <span className="text-[var(--accent-strong)] sm:hidden">You · </span>}{row.attended || formatRelativeAttended(row.submittedAt || row.createdAt)}</p></div>
                      {isMe(row) && (
                        <span className="hidden rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-text)] sm:inline">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-4 text-center font-bold tabular-nums sm:px-3 sm:text-base">{row.marks}<span className="mt-1 hidden text-[10px] font-normal text-[var(--text-tertiary)] sm:block">{row.maxMarks ? `of ${row.maxMarks}` : "marks"}</span></td>
                  <td className="px-1 py-4 text-center sm:px-3"><MockCompletionTime seconds={row.timeTakenSeconds} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[var(--border)] bg-[var(--surface-muted)]/40 px-4 py-3 text-[11px] leading-5 text-[var(--text-tertiary)] sm:px-6">Time excludes breaks. Missing times appear last among equal scores. If score and time both match, earlier submission decides the order.</div>
        </section>}

        <div className="flex flex-col gap-3 sm:flex-row">
          {hasAttended && <Link href={attemptHref} className="urologics-button-primary flex-1 text-center">
            Review answers
          </Link>}
          <Link
            href="/mocks"
            className="flex-1 rounded-full bg-[var(--surface-muted)] px-4 py-3 text-center text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--border)]"
          >
            Browse mocks
          </Link>
        </div>
      </div>
    </main>
  );
}
