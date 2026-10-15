"use client";

import { ChevronLeft, ChevronRight, Image as ImageIcon, Megaphone } from "lucide-react";
import { useState } from "react";

export type Announcement = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  kind?: "general" | "grand-mock";
  media?: { type?: "image" | "youtube"; src?: string } | null;
};

function getAnnouncementBadge(kind?: Announcement["kind"]): string {
  return kind === "grand-mock" ? "Grand Mock" : "Announcement";
}

interface Props {
  announcements: Announcement[];
  onImagePreview: (src: string) => void;
}

export default function AnnouncementsPanel({ announcements, onImagePreview }: Props) {
  const [active, setActive] = useState(0);

  const move = (dir: 1 | -1) => {
    if (!announcements.length) return;
    setActive((c) => (c + dir + announcements.length) % announcements.length);
  };

  const item = announcements[active] ?? null;

  return (
    <section className="urologics-panel overflow-hidden p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Megaphone size={18} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
              Announcements
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {announcements.length
                ? `${active + 1} of ${announcements.length}`
                : "Latest updates"}
            </p>
          </div>
        </div>

        {announcements.length > 1 && (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous"
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next"
              className="grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {item ? (
        <div className="mt-4 space-y-4">
          {/* Media */}
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
            {item.media?.type === "image" && item.media.src ? (
              <button
                type="button"
                onClick={() => onImagePreview(item.media!.src!)}
                className="block w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.media.src}
                  alt={item.title}
                  className="max-h-60 w-full object-contain"
                />
              </button>
            ) : item.media?.type === "youtube" && item.media.src ? (
              <iframe
                src={`https://www.youtube.com/embed/${item.media.src}`}
                title={item.title}
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex min-h-32 items-center justify-center text-[var(--accent-soft)]">
                <Megaphone size={38} />
              </div>
            )}
          </div>

          {/* Text */}
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
              {getAnnouncementBadge(item.kind)}
            </span>
            <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-xl">
              {item.title}
            </h2>
            {item.subtitle && (
              <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">
                {item.subtitle}
              </p>
            )}
            {item.description && (
              <div className="urologics-minimal-scrollbar mt-3 max-h-40 overflow-y-auto pr-1">
                <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
            )}
          </div>

          {/* Dots pagination */}
          {announcements.length > 1 && (
            <div className="flex justify-center gap-1.5 pt-1">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Announcement ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-6 bg-[var(--accent)]" : "w-1.5 bg-[var(--accent-muted)]"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-7 text-[var(--text-secondary)]">
          No active announcements right now.
        </p>
      )}
    </section>
  );
}

