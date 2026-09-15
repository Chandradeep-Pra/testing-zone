export function CourseTilesSkeleton() {
  return <>
    <span className="sr-only" role="status">Loading courses...</span>
    {[1, 2, 3, 4, 5, 6].map(item => (
      <div key={item} aria-hidden="true" className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="aspect-[16/9] animate-pulse bg-[var(--accent-soft)] motion-reduce:animate-none" />
        <div className="space-y-3 p-5">
          <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--accent-soft)] motion-reduce:animate-none" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--accent-soft)] motion-reduce:animate-none" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-[var(--accent-soft)] motion-reduce:animate-none" />
        </div>
      </div>
    ))}
  </>;
}

export function LessonRowsSkeleton() {
  return <div aria-busy="true" aria-label="Loading lessons" className="space-y-2">
    {[1, 2, 3, 4, 5].map(item => <div key={item} className="flex h-20 items-center gap-3 p-3" aria-hidden="true">
      <div className="h-12 w-16 shrink-0 animate-pulse rounded bg-[var(--accent-soft)] motion-reduce:animate-none" />
      <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--accent-soft)] motion-reduce:animate-none" />
    </div>)}
  </div>;
}
