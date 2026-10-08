export type YourRankStats = {
  rank: number;
  totalAttendees: number;
  marks: number;
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
};

export default function YourRankCard({ stats }: { stats: YourRankStats }) {
  const percentage = stats.totalQuestions ? Math.round((stats.marks / stats.totalQuestions) * 100) : 0;
  const topPercent = Math.max(1, Math.ceil((stats.rank / Math.max(stats.totalAttendees, 1)) * 100));

  const items = [
    { label: "Marks", value: `${stats.marks} / ${stats.totalQuestions}` },
    { label: "Score", value: `${percentage}%` },
    { label: "Percentile", value: `Top ${topPercent}%` },
    { label: "Correct", value: stats.correct },
    { label: "Wrong", value: stats.wrong },
    { label: "Skipped", value: stats.skipped },
  ];

  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-center">
      <div className="text-sm font-medium text-[var(--text-secondary)]">Your rank</div>
      <div className="mt-1 text-6xl font-extrabold text-[var(--accent-strong)] sm:text-7xl">#{stats.rank}</div>
      <div className="text-sm text-[var(--text-secondary)]">of {stats.totalAttendees} attendees</div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl bg-[var(--surface-muted)] px-3 py-3">
            <div className="text-lg font-semibold text-[var(--text-primary)]">{item.value}</div>
            <div className="text-xs text-[var(--text-secondary)]">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
