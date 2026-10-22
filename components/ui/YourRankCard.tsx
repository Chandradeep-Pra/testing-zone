import { Trophy } from "lucide-react";
import MockCompletionTime from "@/components/ui/MockCompletionTime";

export type YourRankStats = {
  rank: number | null; totalAttendees: number; marks: number; totalQuestions: number;
  correct?: number; wrong?: number; skipped?: number;
  firstAttemptMarks?: number;
  firstAttemptTotalQuestions?: number;
  percentile?: number;
  effectiveRank?: number | null;
  firstAttemptTimeSeconds?: number | null;
};

export default function YourRankCard({ stats }: { stats: YourRankStats }) {
  const percentage = stats.totalQuestions > 0 ? Math.round(stats.marks / stats.totalQuestions * 100) : null;
  const percentile = stats.percentile ?? (stats.rank === null ? null : Math.round((stats.totalAttendees - stats.rank) / Math.max(stats.totalAttendees, 1) * 1000) / 10);
  const items = [
    { label: "Current attempt score", value: stats.totalQuestions > 0 ? `${stats.marks} / ${stats.totalQuestions}` : String(stats.marks) },
    ...(stats.effectiveRank != null ? [{ label: "Effective rank", value: `#${stats.effectiveRank}` }] : []),
    { label: "Score percentage", value: percentage === null ? "—" : `${percentage}%` },
    { label: "Percentile", value: percentile === null ? "—" : `${percentile}%` },
  ];
  return (
    <section id="your-rank" aria-label="Your mock results" className="scroll-mt-24 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)]">
      <div className="grid sm:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col items-center justify-center bg-[var(--accent-soft)] px-6 py-7 text-center sm:py-9">
          <Trophy size={22} className="mb-3 text-[var(--accent-strong)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Your official rank</p>
          <p className={stats.rank === null ? "mt-2 text-xl font-semibold text-[var(--accent-strong)]" : "mt-2 text-6xl font-bold tracking-tight text-[var(--accent-strong)] sm:text-7xl"}>{stats.rank === null ? "Not available yet" : `#${stats.rank}`}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">of {stats.totalAttendees} candidates</p>
          <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">{stats.rank === null ? "Your attempt is saved. Your rank is not available on this leaderboard yet." : "Rank and percentile use your first attempt."}</p>
          {stats.firstAttemptMarks !== undefined && <p className="mt-1 text-xs font-semibold text-[var(--accent-strong)]">First attempt: {stats.firstAttemptMarks}{stats.firstAttemptTotalQuestions ? ` / ${stats.firstAttemptTotalQuestions}` : ""}</p>}
          {stats.firstAttemptTimeSeconds !== undefined && <div className="mt-3"><MockCompletionTime seconds={stats.firstAttemptTimeSeconds} /></div>}
        </div>
        <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
          {items.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-4" title={item.label === "Percentile" ? "Percentage of candidates with a lower first-attempt score. Equal scores share a percentile." : undefined}><span className="text-sm text-[var(--text-secondary)]">{item.label}</span><span className="text-lg font-semibold text-[var(--text-primary)]">{item.value}</span></div>)}
          {stats.effectiveRank != null && <p className="px-1 text-xs leading-5 text-[var(--text-secondary)]">Effective rank compares this attempt with other candidates’ first attempts. Higher marks rank first; faster completion breaks score ties. Your official rank uses your first attempt.</p>}
        </div>
      </div>
    </section>
  );
}
