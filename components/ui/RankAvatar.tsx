"use client";

import { useState } from "react";

export default function RankAvatar({
  name,
  src,
  className = "h-7 w-7 text-[11px]",
}: {
  name: string;
  src: string | null;
  className?: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const image = src?.trim();
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0] || "").join("").toUpperCase() || "A";

  if (image && failedSource !== image) {
    return (
      // Profile photos use external URLs; preserve the initials fallback if one expires.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailedSource(image)}
        className={`shrink-0 rounded-full border border-[var(--border)] object-cover ${className}`}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] font-semibold text-[var(--text-secondary)] ${className}`}>
      {initials}
    </span>
  );
}
