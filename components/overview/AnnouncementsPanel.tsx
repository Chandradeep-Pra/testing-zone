"use client";

import { ArrowUpRight, ChevronLeft, ChevronRight, Megaphone, Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const index = announcements.length ? active % announcements.length : 0;
  const item = announcements[index];
  const mediaSrc = item?.media?.src?.trim() || "";
  const hasImage = item?.media?.type === "image" && Boolean(mediaSrc) && !failedImages.has(mediaSrc);
  const hasVideo = item?.media?.type === "youtube" && Boolean(mediaSrc);
  const paused = userPaused || hovered || focused || pageHidden;

  useEffect(() => {
    const updateVisibility = () => setPageHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (announcements.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % announcements.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [announcements.length, paused]);

  const move = (direction: number) => {
    setUserPaused(true);
    setActive((current) => (current + direction + announcements.length) % announcements.length);
  };
  const pauseOnInteraction = (target: EventTarget) => {
    if (target instanceof Element && !target.closest("[data-carousel-toggle]")) setUserPaused(true);
  };

  return (
    <section
      className="overview-card overview-announcements"
      aria-labelledby="announcements-heading"
      aria-roledescription={announcements.length > 1 ? "carousel" : undefined}
      data-autoplay={paused ? "paused" : "playing"}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" || event.pointerType === "pen") setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={(event) => pauseOnInteraction(event.target)}
      onClickCapture={(event) => pauseOnInteraction(event.target)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    >
      <div className="overview-card-heading">
        <span className="overview-section-icon"><Megaphone size={20} aria-hidden="true" /></span>
        <h2 id="announcements-heading">Announcements</h2>
        {announcements.length > 0 && <span className="overview-announcement-counter">{String(index + 1).padStart(2, "0")} / {String(announcements.length).padStart(2, "0")}</span>}
        {announcements.length > 1 && <div className="overview-carousel-controls">
          <button type="button" className="overview-carousel-playback" data-carousel-toggle aria-label={userPaused ? "Resume announcements" : "Pause announcements"} title={userPaused ? "Resume when you leave this card" : "Pause announcements"} onClick={() => setUserPaused((current) => !current)}>{userPaused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}</button>
          <button type="button" onClick={() => move(-1)} aria-label="Previous announcement"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next announcement"><ChevronRight size={17} /></button>
        </div>}
      </div>
      {item ? <div key={item.id} className="overview-announcement-content" role="region" aria-label={item.title} tabIndex={0} aria-live={paused ? "polite" : "off"}>
        {(hasImage || hasVideo) && <div className="overview-announcement-media">
          {hasImage ? <button type="button" onClick={() => onImagePreview(mediaSrc)} aria-label={`Enlarge image for ${item.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaSrc} alt={item.title} onError={() => setFailedImages((current) => new Set(current).add(mediaSrc))} />
          </button> : <iframe src={`https://www.youtube.com/embed/${mediaSrc}`} title={item.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
        </div>}
        <span className="overview-announcement-tag">{item.kind === "grand-mock" ? "Grand Mock" : "Latest update"}</span>
        <h3>{item.title}</h3>
        {item.subtitle && <p className="overview-announcement-subtitle">{item.subtitle}</p>}
        {item.description && <p className="overview-announcement-description is-expanded">{item.description}</p>}
        {hasImage && <button type="button" className="overview-text-link" onClick={() => onImagePreview(mediaSrc)}>
          View announcement <ArrowUpRight size={16} aria-hidden="true" />
        </button>}
      </div> : <div className="overview-empty"><Megaphone size={28} aria-hidden="true" /><h3>You&apos;re all caught up</h3><p>New announcements and upcoming events will appear here.</p></div>}
      {announcements.length > 1 && <div className="overview-carousel-dots" role="group" aria-label="Choose announcement">
        {announcements.map((announcement, position) => <button key={announcement.id} type="button" onClick={() => { setUserPaused(true); setActive(position); }} aria-label={`Show announcement ${position + 1}`} aria-current={position === index ? "true" : undefined}><span /></button>)}
      </div>}
    </section>
  );
}
