"use client";

import { ArrowLeft, BookOpenCheck, ChevronDown, ChevronRight, LockKeyhole, Search, Video } from "lucide-react";
import type { VideoItem, VideoSection } from "@/components/courses/types";
import { getThumbnail, isUnlocked, prettifyTitle } from "@/components/courses/videoUtils";

type CourseSidebarProps = {
  error: string;
  expandedSectionIds: string[];
  filteredSections: VideoSection[];
  libraryLoading: boolean;
  onQueryChange: (query: string) => void;
  onBackToFolders: () => void;
  onToggleSection: (sectionId: string) => void;
  onVideoClick: (video: VideoItem) => void;
  playingId: string | null;
  query: string;
  selectedVideoId?: string;
  totalVideos: number;
  unlockedVideos: number;
};

export default function CourseSidebar({
  error,
  expandedSectionIds,
  filteredSections,
  libraryLoading,
  onBackToFolders,
  onQueryChange,
  onToggleSection,
  onVideoClick,
  playingId,
  query,
  selectedVideoId,
  totalVideos,
  unlockedVideos,
}: CourseSidebarProps) {
  return (
    <aside className="urologics-panel flex max-h-[46vh] min-h-0 flex-col overflow-hidden p-3 lg:max-h-none">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Videos
          </div>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {unlockedVideos}/{totalVideos} unlocked
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToFolders}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
          aria-label="Back to video folders"
          title="Back to video folders"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent-strong)]" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search lessons"
          className="urologics-input h-11 pl-11 text-sm"
        />
      </div>

      <div className="urologics-thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {libraryLoading ? (
          <div className="rounded-[22px] bg-[var(--accent-soft)] p-4 text-sm font-medium text-[var(--accent-strong)]">
            Loading videos...
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="rounded-[22px] bg-[var(--accent-soft)] p-4 text-sm text-[var(--text-secondary)]">
            No videos found.
          </div>
        ) : (
          filteredSections.map((section) => {
            const expanded = expandedSectionIds.includes(section.id);
            const lockedCount = section.videos.filter((video) => !isUnlocked(video)).length;

            return (
              <div key={section.id} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)]">
                <button
                  type="button"
                  onClick={() => onToggleSection(section.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                      {prettifyTitle(section.title)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">
                      {section.videoCount} lessons{lockedCount ? ` | ${lockedCount} locked` : ""}
                    </span>
                  </span>
                </button>

                {expanded ? (
                  <div className="space-y-1 border-t border-[var(--border)] p-2">
                    {section.videos.map((video) => {
                      const unlocked = isUnlocked(video);
                      const selected = selectedVideoId === video.id;
                      const thumbnail = getThumbnail(video);

                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => onVideoClick(video)}
                          title={!unlocked ? "Preview this lesson in available course plans" : undefined}
                          className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-2.5 text-left transition ${
                            selected
                              ? "bg-[var(--accent)] text-[var(--accent-text)]"
                              : unlocked
                                ? "hover:bg-[var(--accent-soft)]"
                                : "opacity-80 hover:bg-amber-50"
                          }`}
                        >
                          <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-2xl bg-[var(--accent-soft)] sm:h-12 sm:w-16 sm:rounded-sm">
                            {thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid h-full w-full place-items-center text-[var(--accent-strong)]">
                                <Video className="h-5 w-5" />
                              </span>
                            )}
                            {!unlocked ? <span className="absolute inset-0 bg-[var(--surface-raised)]/70" /> : null}
                            <span
                              className={`absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                                unlocked ? "hidden" : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {!unlocked && <LockKeyhole className="h-3 w-3" />}
                            </span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`line-clamp-2 text-sm font-medium leading-5 ${
                                selected ? "text-[var(--accent-text)]" : "text-[var(--text-primary)]"
                              }`}
                            >
                              {video.title}
                            </span>
                            <span
                              className={`mt-1 block text-[11px] ${
                                selected ? "text-white/70" : "text-[var(--text-tertiary)]"
                              }`}
                            >
                              {playingId === video.id ? "Opening..." : unlocked ? "Available" : "Preview in plans"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
