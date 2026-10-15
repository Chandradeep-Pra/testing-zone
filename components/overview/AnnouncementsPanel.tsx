"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { useState } from "react";

export type Announcement = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  kind?: "general" | "grand-mock";
  media?: { type?: "image" | "youtube"; src?: string } | null;
};

interface Props {
  announcements: Announcement[];
  onImagePreview: (src: string) => void;
}

export default function AnnouncementsPanel({ announcements, onImagePreview }: Props) {
  const [active, setActive] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const index = announcements.length ? active % announcements.length : 0;
  const item = announcements[index];
  const expanded = expandedId === item?.id;
  const move = (direction: number) => setActive((current) => (current + direction + announcements.length) % announcements.length);

  return (
    <section className="overview-card overview-announcements" aria-labelledby="announcements-heading">
      <div className="overview-card-heading">
        <span className="overview-section-icon"><Megaphone size={20} aria-hidden="true" /></span>
        <h2 id="announcements-heading">Announcements</h2>
        {announcements.length > 0 && <span className="overview-announcement-counter">{String(index + 1).padStart(2, "0")} / {String(announcements.length).padStart(2, "0")}</span>}
        {announcements.length > 1 && <div className="overview-carousel-controls">
          <button type="button" onClick={() => move(-1)} aria-label="Previous announcement"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next announcement"><ChevronRight size={17} /></button>
        </div>}
      </div>
      {item ? <div className="overview-announcement-content" aria-live="polite">
        {item.media?.src && <div className="overview-announcement-media">
          {item.media.type === "image" ? <button type="button" onClick={() => onImagePreview(item.media!.src!)} aria-label={`Enlarge image for ${item.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.media.src} alt={item.title} />
          </button> : item.media.type === "youtube" ? <iframe src={`https://www.youtube.com/embed/${item.media.src}`} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : null}
        </div>}
        <span className="overview-announcement-tag">{item.kind === "grand-mock" ? "Grand Mock" : "Latest update"}</span>
        <h3>{item.title}</h3>
        {item.subtitle && <p className="overview-announcement-subtitle">{item.subtitle}</p>}
        {item.description && <p className={`overview-announcement-description ${expanded ? "is-expanded" : ""}`}>{item.description}</p>}
        {(item.description || item.media?.type === "image") && <button type="button" className="overview-text-link" onClick={() => item.media?.type === "image" && item.media.src ? onImagePreview(item.media.src) : setExpandedId(expanded ? null : item.id)} aria-expanded={item.media?.type === "image" ? undefined : expanded}>
          {expanded ? "Show less" : "View announcement"} <ArrowUpRight size={16} aria-hidden="true" />
        </button>}
        {announcements.length > 1 && <div className="overview-carousel-dots" aria-label="Choose announcement">
          {announcements.map((announcement, position) => <button key={announcement.id} type="button" onClick={() => setActive(position)} aria-label={`Show announcement ${position + 1}`} aria-current={position === index ? "true" : undefined}><span /></button>)}
        </div>}
      </div> : <div className="overview-empty"><Megaphone size={28} aria-hidden="true" /><h3>You&apos;re all caught up</h3><p>New announcements and upcoming events will appear here.</p></div>}
    </section>
  );
}
