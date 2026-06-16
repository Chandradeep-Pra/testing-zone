export type VideoAccess = {
  allowed: boolean;
  mode?: "full" | "preview" | "locked";
  reason?: string | null;
};

export type VideoItem = {
  id: string;
  title: string;
  description?: string;
  provider: "youtube" | "drive" | "storage";
  sectionId: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  accessTier?: "free" | "paid";
  effectiveAccessTier?: "free" | "paid";
  durationSeconds?: number;
  durationMinutes?: number;
  access?: VideoAccess;
};

export type VideoSection = {
  id: string;
  title: string;
  imageUrl?: string;
  folderImageUrl?: string;
  videoCount: number;
  videos: VideoItem[];
};

export type VideoLibraryResponse = {
  sections?: VideoSection[];
};

export type PlaybackResponse = {
  video: VideoItem;
  playback:
    | { provider: "storage"; url: string; mimeType?: string }
    | { provider: "drive"; previewUrl: string; webViewUrl?: string }
    | { provider: "youtube"; url: string };
};
