"use client";

import { BookOpenCheck, ChevronDown, ChevronRight, LockKeyhole, Search, Video } from "lucide-react";
import type { VideoItem, VideoSection } from "@/components/courses/types";
import { getThumbnail, isUnlocked, prettifyTitle } from "@/components/courses/videoUtils";

type CourseSidebarProps = {
  error: string;
  expandedSectionIds: string[];
  filteredSections: VideoSection[];
  libraryLoading: boolean;
  onQueryChange: (query: string) => void;
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
    <aside className="urologics-panel flex min-h-0 flex-col overflow-hidden p-3">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0f7896]">
            <BookOpenCheck className="h-3.5 w-3.5" />
            Courses
          </div>
          <p className="mt-2 text-xs text-[#071014]/55">
            {unlockedVideos}/{totalVideos} unlocked
          </p>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f7896]" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search lessons"
          className="urologics-input h-11 pl-11 text-sm"
        />
      </div>

      <div className="urologics-thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {libraryLoading ? (
          <div className="rounded-[22px] bg-cyan-50 p-4 text-sm font-medium text-[#0f7896]">
            Loading videos...
          </div>
        ) : error ? (
          <div className="rounded-[22px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : filteredSections.length === 0 ? (
          <div className="rounded-[22px] bg-cyan-50 p-4 text-sm text-[#071014]/65">
            No videos found.
          </div>
        ) : (
          filteredSections.map((section) => {
            const expanded = expandedSectionIds.includes(section.id);
            const lockedCount = section.videos.filter((video) => !isUnlocked(video)).length;

            return (
              <div key={section.id} className="rounded-[22px] border border-[#0f7896]/10 bg-white">
                <button
                  type="button"
                  onClick={() => onToggleSection(section.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-cyan-50 text-[#0f7896]">
                    {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#071014]">
                      {prettifyTitle(section.title)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#071014]/50">
                      {section.videoCount} lessons{lockedCount ? ` | ${lockedCount} locked` : ""}
                    </span>
                  </span>
                </button>

                {expanded ? (
                  <div className="space-y-1 border-t border-[#0f7896]/8 p-2">
                    {section.videos.map((video) => {
                      const unlocked = isUnlocked(video);
                      const selected = selectedVideoId === video.id;
                      const thumbnail = getThumbnail(video);

                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => onVideoClick(video)}
                          className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-2.5 text-left transition ${
                            selected
                              ? "bg-[#0f7896] text-white"
                              : unlocked
                                ? "hover:bg-cyan-50"
                                : "opacity-70 hover:bg-slate-50"
                          }`}
                        >
                          <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-sm bg-cyan-50">
                            {thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid h-full w-full place-items-center text-[#0f7896]">
                                <Video className="h-5 w-5" />
                              </span>
                            )}
                            {!unlocked ? <span className="absolute inset-0 bg-white/58" /> : null}
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
                                selected ? "text-white" : "text-[#071014]"
                              }`}
                            >
                              {video.title}
                            </span>
                            <span
                              className={`mt-1 block text-[11px] ${
                                selected ? "text-white/70" : "text-[#071014]/45"
                              }`}
                            >
                              {playingId === video.id ? "Opening..." : unlocked ? "Available" : "Locked"}
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
