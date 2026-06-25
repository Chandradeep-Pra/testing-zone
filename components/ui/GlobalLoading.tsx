"use client";

type GlobalLoadingProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export default function GlobalLoading({
  label = "Loading",
  className = "",
  compact = false,
}: GlobalLoadingProps) {
  const dotSize = compact ? "h-2.5 w-2.5" : "h-3 w-3";
  const gap = compact ? "gap-1.5" : "gap-2";
  const textSize = compact ? "text-xs" : "text-sm";

  return (
    <div
      className={`flex flex-col items-center justify-center ${gap} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`rounded-full bg-[var(--accent)] ${dotSize} animate-bounce`}
            style={{
              animationDelay: `${index * 0.15}s`,
            }}
          />
        ))}
      </div>
      {label ? (
        <p className={`font-medium text-[var(--text-secondary)] ${textSize}`}>{label}</p>
      ) : null}
    </div>
  );
}
