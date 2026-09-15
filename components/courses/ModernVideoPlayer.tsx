"use client";

import { useEffect, useRef, useState } from "react";
import {
  Gauge,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  RotateCw,
  Video,
  Volume2,
} from "lucide-react";
import type { PlaybackResponse } from "@/components/courses/types";
import { formatTime, getThumbnail, getYoutubeEmbedUrl } from "@/components/courses/videoUtils";
import { appPath } from "@/lib/app-path";
import { attachSignedPlayback } from "@/lib/client/signedPlayback";

type PlayerProps = { playback: PlaybackResponse | null; loading?: boolean; renewPlayback?: () => Promise<PlaybackResponse> };

export default function ModernVideoPlayer({ playback, loading, renewPlayback }: PlayerProps) {
  if (loading) return (
    <div className="grid aspect-video place-items-center rounded-[30px] bg-[#071014] text-white" role="status">
      <div className="flex flex-col items-center gap-3"><Loader2 aria-hidden="true" className="h-9 w-9 animate-spin" /><span>Loading video...</span></div>
    </div>
  );
  return <VideoPlayer key={playback?.video.id || "empty"} playback={playback} renewPlayback={renewPlayback} />;
}

function VideoPlayer({ playback, renewPlayback }: PlayerProps) {
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(() => {
    const video = playback?.video;
    return typeof video?.durationSeconds === "number" && Number.isFinite(video.durationSeconds)
      ? video.durationSeconds
      : typeof video?.durationMinutes === "number" && Number.isFinite(video.durationMinutes)
        ? video.durationMinutes * 60 : 0;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState("");

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    let active = true;
    void player.play().catch(() => {
      if (!active || player.error) return;
      setBuffering(false);
      setShowControls(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!buffering || playback?.playback.provider === "youtube" || !playback) return;
    const timer = window.setTimeout(() => {
      videoRef.current?.pause();
      setPlaying(false);
      setBuffering(false);
      setShowControls(true);
      setPlaybackError("Video is taking too long to load. Press Play to retry.");
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [buffering, playback]);

  useEffect(() => {
    if (playback?.playback.provider !== "storage" || !videoRef.current || !renewPlayback) return;
    return attachSignedPlayback(videoRef.current, playback.playback, async () => {
      const result = await renewPlayback();
      if (result.playback.provider !== "storage") throw new Error("Playback source changed");
      return result.playback;
    }, message => {
      setPlaying(false);
      setBuffering(false);
      setShowControls(true);
      setPlaybackError(message);
    });
  }, [playback, renewPlayback]);


  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === playerShellRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);


  if (!playback) {
    return (
      <div className="grid min-h-[520px] place-items-center rounded-[30px] border border-[var(--border)] bg-[radial-gradient(circle_at_top_left,var(--accent-muted),transparent_36%),linear-gradient(135deg,var(--surface-raised),var(--surface-tint))] p-8 text-center shadow-[0_16px_40px_var(--shadow-soft)]">
        <div>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-[28px] bg-[var(--surface-raised)] text-[var(--accent-strong)] shadow-[0_16px_40px_var(--shadow-brand)]">
            <PlayCircle className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Select a lesson
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Your video will open here.</p>
        </div>
      </div>
    );
  }

  const { video, playback: source } = playback;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const thumbnail = getThumbnail(video);

  function seekBy(seconds: number) {
    const player = videoRef.current;
    if (!player) return;
    player.currentTime = Math.min(Math.max(player.currentTime + seconds, 0), player.duration || 0);
  }

  async function togglePlay() {
    const player = videoRef.current;
    if (!player) return;

    if (player.paused) {
      setPlaybackError("");
      setBuffering(true);
      if (player.error || playbackError) player.load();
      try {
        await player.play();
      } catch {
        setPlaying(false);
        setBuffering(false);
        setPlaybackError("Playback could not start. Press Play to try again.");
      }
    } else {
      player.pause();
      setPlaying(false);
    }
  }

  function changeSpeed(nextSpeed: number) {
    setSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  }

  function scheduleControlsHide() {
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
    }

    if (!videoRef.current || videoRef.current.paused) return;

    controlsTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }

  function revealControls() {
    setShowControls(true);
    scheduleControlsHide();
  }

  async function toggleFullscreen() {
    const shell = playerShellRef.current;
    if (!shell) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    await shell.requestFullscreen().catch(() => undefined);
  }

  return (
    <div
      ref={playerShellRef}
      className={`overflow-hidden ${
        isFullscreen
          ? "rounded-none border-0 bg-black shadow-none"
          : "rounded-[30px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_18px_48px_var(--shadow-soft)]"
      }`}
    >
      <div
        className="relative bg-[#071014]"
        onMouseEnter={revealControls}
        onMouseMove={revealControls}
        onFocus={revealControls}
      >
        <div className="aspect-video">
          {source.provider === "youtube" ? (
            <iframe
              src={getYoutubeEmbedUrl(source.url)}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <video
              ref={videoRef}
              src={source.provider === "storage" ? source.url : appPath(`/api/urologics/videos/${video.id}/stream`)}
              poster={thumbnail || undefined}
              preload="auto"
              autoPlay
              controls={false}
              controlsList="nodownload noplaybackrate"
              disablePictureInPicture
              onContextMenu={(event) => event.preventDefault()}
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
              onWaiting={() => setBuffering(true)}
              onLoadStart={() => { setBuffering(true); setPlaybackError(""); }}
              onSeeking={() => setBuffering(true)}
              onSeeked={() => { if (videoRef.current && videoRef.current.readyState >= 3) setBuffering(false); }}
              onCanPlay={() => setBuffering(false)}
              onPlaying={() => {
                setBuffering(false);
                setPlaybackError("");
              }}
              onEnded={() => {
                setPlaying(false);
                setBuffering(false);
                setShowControls(true);
              }}
              onError={() => {
                if (source.provider === "storage" && renewPlayback) return;
                setPlaying(false);
                setBuffering(false);
                setShowControls(true);
                setPlaybackError("Unable to load this video. Select the lesson again to retry.");
              }}
              onPlay={() => {
                setPlaying(true);
                setShowControls(true);
                scheduleControlsHide();
              }}
              onPause={() => {
                setPlaying(false);
                setShowControls(true);
                if (controlsTimerRef.current) {
                  window.clearTimeout(controlsTimerRef.current);
                }
              }}
              playsInline
              className="h-full w-full"
            />
          )}
        </div>

        {source.provider !== "youtube" && (buffering || playbackError) ? (
          <div role={playbackError ? "alert" : "status"} className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-sm text-white">
            <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-black/75 px-5 py-4 text-center">
              {!playbackError && <Loader2 aria-hidden="true" className="h-9 w-9 animate-spin" />}
              <span>{playbackError || "Loading video..."}</span>
            </div>
          </div>
        ) : null}

        {source.provider !== "youtube" ? (
          <div
            className={`absolute inset-x-2 bottom-2 rounded-[22px] border border-white/10 bg-black/62 p-2.5 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 sm:inset-x-4 sm:bottom-4 sm:rounded-[24px] sm:p-3 ${
              showControls
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-4 opacity-0"
            }`}
            onMouseEnter={() => {
              setShowControls(true);
              if (controlsTimerRef.current) {
                window.clearTimeout(controlsTimerRef.current);
              }
            }}
            onMouseLeave={scheduleControlsHide}
          >
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <button
                type="button"
                aria-label="Seek video"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const ratio = (event.clientX - rect.left) / rect.width;
                  if (videoRef.current && duration > 0) {
                    videoRef.current.currentTime = Math.max(0, Math.min(duration * ratio, duration));
                  }
                }}
                className="block h-full w-full text-left"
              >
                <span
                  className="block h-full rounded-full bg-[var(--accent-strong)]"
                  style={{ width: `${progress}%` }}
                />
              </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                  aria-label="Back 10 seconds"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#071014] transition hover:scale-105"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                  aria-label="Forward 10 seconds"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
                <span className="ml-1 text-[11px] font-medium text-white/78 sm:text-xs">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <Volume2 className="h-4 w-4 text-white/70" />
                <div className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-white/10 px-2 py-1 sm:flex-none">
                  <Gauge className="h-3.5 w-3.5 text-white/70" />
                  {[0.75, 1, 1.25, 1.5, 2].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => changeSpeed(item)}
                      className={`rounded-full px-1.5 py-1 text-[10px] font-semibold transition sm:px-2 sm:text-[11px] ${
                        speed === item ? "bg-white text-[#071014]" : "text-white/70 hover:text-white"
                      }`}
                    >
                      {item}x
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">
            <Video className="h-3.5 w-3.5" />
            Playing
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            Duration: {duration > 0 ? formatTime(duration) : "Loading..."}
          </div>
        </div>
        <h1 className="line-clamp-2 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-2xl">
          {video.title}
        </h1>
      </div>
    </div>
  );
}
