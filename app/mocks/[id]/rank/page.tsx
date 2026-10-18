"use client";

import { ArrowLeft, Medal, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import ResultsLoader from "@/components/ui/ResultsLoader";
import GlobalLoading from "@/components/ui/GlobalLoading";
import ConfettiOnLoad from "@/components/ui/ConfettiOnLoad";
import YourRankCard from "@/components/ui/YourRankCard";
import RankAvatar from "@/components/ui/RankAvatar";
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
      if (entry.rank === 2) return { entry, height: "h-32", color: "text-slate-300" };
      return { entry, height: "h-24", color: "text-amber-600" };
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
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Leaderboard</p><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Rankings are based on each candidate’s first attempt.</p></div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-medium text-[var(--text-secondary)]">
            {!error && <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2"><Users size={14} />{ranked.length} candidates</span>}
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2"><Medal size={14} />First attempts only</span>
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
              percentile: me ? mockPercentile(me.marks, ranked) : undefined,
              effectiveRank: me ? mockEffectiveRank(currentAttempt?.marks ?? me.marks, ranked.filter((row) => !isMe(row))) : null,
            }}
          />
        )}

        {podium.length > 0 && (
          <section className="flex items-end justify-center gap-2 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 pt-7 sm:gap-5 sm:px-8">
            {podium.map(({ entry, height, color }) => (
              <div key={`${entry.email}-${entry.submittedAt || entry.rank}`} className="min-w-0 w-1/3 text-center">
                <Trophy className={`mx-auto h-8 w-8 ${color}`} />
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <RankAvatar name={entry.name} src={entry.userImage} className="h-5 w-5 text-[9px]" />
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

        {!error && <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)]">
          <div className="border-b border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
            Candidate rankings
          </div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-2.5 font-medium">Rank</th>
                <th className="px-5 py-2.5 font-medium">Candidate</th>
                <th className="px-5 py-2.5 font-medium">Marks</th>
                <th className="px-5 py-2.5 font-medium">Attended</th>
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
                  <td className="px-5 py-3">#{row.rank}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <RankAvatar name={row.name} src={row.userImage} />
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
          </table></div>
        </section>}

        <div className="flex flex-col gap-3 sm:flex-row">
          {hasAttended && <Link href={attemptHref} className="urologics-button-primary flex-1 text-center">
            View analysis
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
