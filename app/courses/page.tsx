"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function CoursesPage() {
  const { user, loading } = useAuth();
  const [sections, setSections] = useState<VideoSection[]>([]);
  const [query, setQuery] = useState("");
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [selectedPlayback, setSelectedPlayback] = useState<PlaybackResponse | null>(null);
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
        const response = await fetch("/api/urologics/videos/library", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const payload = (await response.json()) as VideoLibraryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load video library.");
        }

        if (!active) return;
        const nextSections = payload.sections || [];
        setSections(nextSections);
        setExpandedSectionIds(nextSections[0]?.id ? [nextSections[0].id] : []);
      } catch (nextError) {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : "Unable to load video library.");
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
        const sectionMatches = section.title.toLowerCase().includes(normalizedQuery);
        const videos = sectionMatches
          ? section.videos
          : section.videos.filter((video) =>
              `${video.title} ${video.description || ""}`.toLowerCase().includes(normalizedQuery)
            );

        return { ...section, videos, videoCount: videos.length };
      })
      .filter((section) => section.videos.length > 0);
  }, [query, sections]);

  const totalVideos = sections.reduce((count, section) => count + section.videos.length, 0);
  const unlockedVideos = sections.reduce(
    (count, section) => count + section.videos.filter(isUnlocked).length,
    0
  );

  function toggleSection(sectionId: string) {
    setExpandedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    );
  }

  async function handleVideoClick(video: VideoItem) {
    if (!user?.idToken) {
      toast.error("Please login to access your course videos.");
      return;
    }

    if (!isUnlocked(video)) {
      toast("This video is locked for your current course access.");
      return;
    }

    setPlayingId(video.id);
    try {
      const response = await fetch(`/api/urologics/videos/${video.id}/play`, {
        headers: { Authorization: `Bearer ${user.idToken}` },
      });
      const payload = (await response.json()) as PlaybackResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to prepare video.");
      }

      setSelectedPlayback(payload);
    } catch (nextError) {
      toast.error(nextError instanceof Error ? nextError.message : "Unable to prepare video.");
    } finally {
      setPlayingId(null);
    }
  }

  return (
    <main className="urologics-shell h-screen overflow-hidden">
      <div className="mx-auto flex h-screen w-full max-w-[1480px] flex-col px-3 py-3 sm:px-4">
        <UrologicsHeader current="Courses" product="Courses" tag="Video library" />

        {!loading && !user ? (
          <LoginRequiredPanel />
        ) : (
          <section className="grid min-h-0 flex-1 gap-3 py-3 lg:grid-cols-[390px_1fr]">
            <CourseSidebar
              error={error}
              expandedSectionIds={expandedSectionIds}
              filteredSections={filteredSections}
              libraryLoading={libraryLoading}
              onQueryChange={setQuery}
              onToggleSection={toggleSection}
              onVideoClick={(video) => void handleVideoClick(video)}
              playingId={playingId}
              query={query}
              selectedVideoId={selectedPlayback?.video.id}
              totalVideos={totalVideos}
              unlockedVideos={unlockedVideos}
            />

            <div className="min-h-0 overflow-y-auto rounded-[30px]">
              <ModernVideoPlayer
                key={selectedPlayback?.video.id || "empty-player"}
                playback={selectedPlayback}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
