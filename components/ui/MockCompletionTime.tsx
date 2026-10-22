import { Timer } from "lucide-react";
import { formatMockDuration, recordedMockTime } from "@/lib/mock-ranking";

export default function MockCompletionTime({ seconds, compact = false }: { seconds?: number | null; compact?: boolean }) {
  const known = recordedMockTime(seconds) !== null;
  return (
    <span
      aria-label={known ? `Time taken: ${formatMockDuration(seconds)}` : "Time taken not recorded"}
      title={known ? "First-attempt completion time, excluding breaks" : "No time was saved for this first attempt"}
      className={`inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border tabular-nums ${compact ? "px-2 py-1 text-[10px] sm:text-xs" : "px-1.5 py-2 text-[10px] sm:px-3 sm:text-sm"} ${known ? "border-[var(--accent)]/15 bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]" : "border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]"}`}
    >
      <Timer size={compact ? 12 : 14} className="hidden shrink-0 sm:block" aria-hidden="true" />
      {known ? formatMockDuration(seconds) : <><span aria-hidden="true" className="sm:hidden">—</span><span className="hidden sm:inline">Not recorded</span></>}
    </span>
  );
}
