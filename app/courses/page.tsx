"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  FolderOpen,
  LockKeyhole,
  Mail,
  PlayCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/components/auth/AuthProvider";
import CourseSidebar from "@/components/courses/CourseSidebar";
import LoginRequiredPanel from "@/components/courses/LoginRequiredPanel";
import ModernVideoPlayer from "@/components/courses/ModernVideoPlayer";
import type {
  PlaybackResponse,
  VideoItem,
  VideoLibraryResponse,
  VideoSection,
} from "@/components/courses/types";
import { isUnlocked } from "@/components/courses/videoUtils";
import UrologicsHeader from "@/components/brand/UrologicsHeader";
import { appPath } from "@/lib/app-path";

const PRICING_URL = "https://urologics.co.uk/pricing";
const COURSE_INQUIRY_MAIL =
  "mailto:ankitgoel042@gmail.com?subject=I%20want%20to%20inquire%20about%20your%20courses";

export default function CoursesPage() {
  const { user, loading } = useAuth();
  const [sections, setSections] = useState<VideoSection[]>([]);
  const [showPlayerView, setShowPlayerView] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [selectedPlayback, setSelectedPlayback] =
    useState<PlaybackResponse | null>(null);
  const [selectedLockedVideo, setSelectedLockedVideo] =
    useState<VideoItem | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const idToken = user?.idToken;
    if (!idToken) return;

    let active = true;

    async function loadLibrary() {
      setLibraryLoading(true);
      setError("");

      try {
        const response = await fetch(appPath("/api/urologics/videos/library"), {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: "no-store",
        });
        const payload = (await response.json()) as VideoLibraryResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load video library.");
        }

        if (!active) return;
        const nextSections = payload.sections || [];
        setSections(nextSections);
        setExpandedSectionIds([]);
      } catch (nextError) {
        if (!active) return;
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Unable to load video library.",
        );
      } finally {
        if (active) setLibraryLoading(false);
      }
    }

    void loadLibrary();

    return () => {
      active = false;
    };
  }, [user?.idToken]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return sections;

    return sections
      .map((section) => {
        const sectionMatches = section.title
          .toLowerCase()
          .includes(normalizedQuery);
        const videos = sectionMatches
          ? section.videos
          : section.videos.filter((video) =>
              `${video.title} ${video.description || ""}`
                .toLowerCase()
                .includes(normalizedQuery),
            );

        return { ...section, videos, videoCount: videos.length };
      })
      .filter((section) => section.videos.length > 0);
  }, [query, sections]);

  const totalVideos = sections.reduce(
    (count, section) => count + section.videos.length,
    0,
  );
  const unlockedVideos = sections.reduce(
    (count, section) => count + section.videos.filter(isUnlocked).length,
    0,
  );

  function toggleSection(sectionId: string) {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  }

  function openSection(section: VideoSection) {
    setExpandedSectionIds([section.id]);
    setShowPlayerView(true);

    const firstUnlockedVideo = section.videos.find(isUnlocked);
    setSelectedLockedVideo(null);

    if (firstUnlockedVideo) {
      void handleVideoClick(firstUnlockedVideo);
      return;
    }

    setSelectedPlayback(null);
    setSelectedLockedVideo(section.videos[0] || null);
  }

  async function handleVideoClick(video: VideoItem) {
    if (!user?.idToken) {
      toast.error("Please login to access your course videos.");
      return;
    }

    if (!isUnlocked(video)) {
      setSelectedPlayback(null);
      setSelectedLockedVideo(video);
      return;
    }

    setSelectedLockedVideo(null);
    setPlayingId(video.id);
    try {
      const response = await fetch(
        appPath(`/api/urologics/videos/${video.id}/play`),
        {
          headers: { Authorization: `Bearer ${user.idToken}` },
        },
      );
      const payload = (await response.json()) as PlaybackResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to prepare video.");
      }

      setSelectedPlayback(payload);
    } catch (nextError) {
      toast.error(
        nextError instanceof Error
          ? nextError.message
          : "Unable to prepare video.",
      );
    } finally {
      setPlayingId(null);
    }
  }

  return (
    <main className="urologics-shell min-h-screen overflow-x-hidden md:h-screen md:overflow-hidden">
      <div className="mobile-native-page mx-auto flex min-h-screen w-full max-w-[1480px] flex-col md:h-screen md:min-h-0 md:px-3 md:py-3 sm:px-4">
        <UrologicsHeader
          current="Courses"
          product="Courses"
          tag="Video library"
        />

        {!loading && !user ? (
          <LoginRequiredPanel />
        ) : !showPlayerView ? (
          <section className="urologics-thin-scrollbar min-h-0 flex-1 overflow-y-auto py-2 sm:py-3">
            <div className="rounded-[30px] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,var(--accent-muted),transparent_34%),var(--surface-raised)] p-4 shadow-[0_16px_40px_var(--shadow-soft)] sm:rounded-[34px] sm:p-6">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Video folders
                  </div>
                  <h1 className="mobile-native-title mt-4 font-semibold text-[var(--text-primary)] sm:text-3xl sm:tracking-[-0.04em]">
                    Urologics Video Library.
                  </h1>
                </div>
                <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                  {unlockedVideos}/{totalVideos} unlocked
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:mt-7 md:grid-cols-2 xl:grid-cols-3">
                {libraryLoading ? (
                  <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm font-medium text-[var(--accent-strong)]">
                    Loading video folders...
                  </div>
                ) : error ? (
                  <div className="rounded-[26px] border border-red-100 bg-red-50 p-6 text-sm text-red-700">
                    {error}
                  </div>
                ) : sections.length === 0 ? (
                  <div className="rounded-[26px] border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--text-secondary)]">
                    No video folders found.
                  </div>
                ) : (
                  sections.map((section) => {
                    const unlockedCount =
                      section.videos.filter(isUnlocked).length;
                    const firstThumbnail =
                      section.imageUrl ||
                      section.folderImageUrl ||
                      section.videos
                        .map((video) => video.thumbnailUrl)
                        .find(Boolean);

                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => openSection(section)}
                        className="group overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface)] text-left shadow-[0_12px_32px_var(--shadow-soft)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_18px_44px_var(--shadow-brand)]"
                      >
                        <div className="relative aspect-video bg-[var(--accent-soft)]">
                          {firstThumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={firstThumbnail}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,var(--accent-muted),transparent_46%),linear-gradient(135deg,var(--surface-raised),var(--accent-soft))] px-5 text-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={appPath("/logo.png")}
                                alt=""
                                className="h-16 w-16 rounded-2xl object-contain shadow-[0_14px_34px_var(--shadow-soft)]"
                              />
                              <div className="max-w-[90%] rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/88 px-4 py-2 shadow-[0_10px_28px_var(--shadow-soft)] backdrop-blur">
                                <p className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">
                                  {section.title}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                          <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#071014]">
                            <PlayCircle className="h-3.5 w-3.5" />
                            Open folder
                          </div>
                        </div>
                        <div className="p-4 sm:p-5">
                          <h2 className="line-clamp-2 text-lg font-semibold text-[var(--text-primary)]">
                            {section.title}
                          </h2>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {section.videoCount} lessons · {unlockedCount}{" "}
                            unlocked
                          </p>
                          <div className="mt-4 flex items-center justify-between text-sm font-semibold text-[var(--accent-strong)]">
                            <span>Browse Content</span>
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="grid min-h-0 flex-1 gap-3 py-2 transition-all duration-500 md:py-3 lg:grid-cols-[390px_1fr]">
            <CourseSidebar
              error={error}
              expandedSectionIds={expandedSectionIds}
              filteredSections={filteredSections}
              libraryLoading={libraryLoading}
              onQueryChange={setQuery}
              onToggleSection={toggleSection}
              onVideoClick={(video) => void handleVideoClick(video)}
              onBackToFolders={() => {
                setShowPlayerView(false);
                setSelectedPlayback(null);
                setSelectedLockedVideo(null);
              }}
              playingId={playingId}
              query={query}
              selectedVideoId={
                selectedPlayback?.video.id || selectedLockedVideo?.id
              }
              totalVideos={totalVideos}
              unlockedVideos={unlockedVideos}
            />

            <div className="min-h-0 overflow-y-auto rounded-[30px]">
              {selectedLockedVideo ? (
                <LockedVideoAccessPanel video={selectedLockedVideo} />
              ) : (
                <ModernVideoPlayer
                  key={selectedPlayback?.video.id || "empty-player"}
                  playback={selectedPlayback}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function LockedVideoAccessPanel({ video }: { video: VideoItem }) {
  return (
    <div className="grid min-h-[520px] place-items-center rounded-[30px] border border-amber-200 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_36%),linear-gradient(135deg,var(--surface-raised),var(--surface-tint))] p-8 text-center shadow-[0_16px_40px_var(--shadow-soft)]">
      <div className="max-w-2xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-amber-50 text-amber-700 shadow-[0_16px_40px_rgba(245,158,11,0.22)]">
          <LockKeyhole className="h-10 w-10" />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <VideoItemLabel />
          Restricted content
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          {video.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
          Please purchase this course to access it&apos;s content, contact{" "}
          <a
            href={COURSE_INQUIRY_MAIL}
            className="font-semibold text-[var(--accent-strong)] underline underline-offset-4"
          >
            ankitgoel042@gmail.com
          </a>{" "}
          to know more about this.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href={PRICING_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
          >
            View Pricing Plans
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={COURSE_INQUIRY_MAIL}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
          >
            <Mail className="h-4 w-4" />
            Email Us
          </a>
        </div>
      </div>
    </div>
  );
}

function VideoItemLabel() {
  return <LockKeyhole className="h-3.5 w-3.5" />;
}
