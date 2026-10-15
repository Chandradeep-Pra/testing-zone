export function descriptionPoints(value: string) {
  return value.split(/\r?\n/).map(point => point.replace(/^\s*(?:[-*•]\s+|\d+[.)]\s+)/, "").trim()).filter(Boolean);
}
export default function DescriptionBullets({ value, className = "" }: { value: string; className?: string }) {
  const points = descriptionPoints(value);
  if (!points.length) return null;
  return <ul className={`mt-2 space-y-1.5 text-sm leading-6 text-[var(--text-secondary)] ${className}`}>{points.map((point, index) => <li key={index} className="flex items-start gap-2"><span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" /><span className="min-w-0 break-words">{point}</span></li>)}</ul>;
}
