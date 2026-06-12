import type { VideoItem } from "@/components/courses/types";

export function prettifyTitle(title: string) {
  return title
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getYoutubeEmbedUrl(url: string) {
  if (!url) return "";

  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  return url;
}

export function getThumbnail(video: VideoItem) {
  if (video.thumbnailUrl) return video.thumbnailUrl;
  if (video.provider !== "youtube" || !video.videoUrl) return "";

  const shortMatch = video.videoUrl.match(/youtu\.be\/([^?]+)/);
  if (shortMatch?.[1]) return `https://img.youtube.com/vi/${shortMatch[1]}/hqdefault.jpg`;

  const watchMatch = video.videoUrl.match(/[?&]v=([^&]+)/);
  return watchMatch?.[1] ? `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg` : "";
}

export function isUnlocked(video: VideoItem) {
  return video.access?.mode === "full" || video.access?.allowed === true;
}

export function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
