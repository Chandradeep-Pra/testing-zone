export type SignedPlaybackSource = { url: string; expiresAt?: number };

export function attachSignedPlayback(
  video: HTMLVideoElement,
  source: SignedPlaybackSource,
  renew: () => Promise<SignedPlaybackSource>,
  onFailure: (message: string) => void,
) {
  let active = true;
  let pending = false;
  let errorRenewalUsed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expiresAt = source.expiresAt ?? Date.now() + 14 * 60_000;
  let resume: { time: number; playing: boolean; speed: number } | null = null;

  function schedule() {
    clearTimeout(timer);
    if (active) timer = setTimeout(() => void refresh(), Math.max(1000, expiresAt - Date.now() - 60_000));
  }

  async function refresh() {
    if (!active || pending) return;
    pending = true;
    clearTimeout(timer);
    try {
      const next = await renew();
      if (!active) return;
      if (!next.url || (next.expiresAt !== undefined && next.expiresAt <= Date.now() + 1000)) {
        throw new Error("Invalid playback renewal");
      }
      // Capture immediately before replacing the source, after the network wait.
      resume = { time: video.currentTime, playing: !video.paused, speed: video.playbackRate };
      expiresAt = next.expiresAt ?? Date.now() + 14 * 60_000;
      video.src = next.url;
      video.load();
      schedule();
    } catch {
      if (active) {
        errorRenewalUsed = true;
        onFailure("Video access could not be renewed. Select the lesson again to retry.");
      }
    } finally {
      pending = false;
    }
  }

  function onMetadata() {
    if (!resume) return;
    const saved = resume;
    resume = null;
    video.currentTime = Number.isFinite(video.duration) ? Math.min(saved.time, video.duration) : saved.time;
    video.playbackRate = saved.speed;
    if (saved.playing) {
      void video.play().catch(() => {
        if (active) onFailure("Playback paused. Press Play to continue.");
      });
    }
  }

  function onError() {
    if (pending) return;
    if (errorRenewalUsed) {
      clearTimeout(timer);
      onFailure("Unable to play this video. Select the lesson again to retry.");
      return;
    }
    errorRenewalUsed = true;
    void refresh();
  }

  function onVisible() {
    if (document.visibilityState === "visible" && expiresAt - Date.now() <= 60_000 && !errorRenewalUsed) void refresh();
  }

  video.addEventListener("error", onError);
  video.addEventListener("loadedmetadata", onMetadata);
  document.addEventListener("visibilitychange", onVisible);
  schedule();
  return () => {
    active = false;
    clearTimeout(timer);
    video.removeEventListener("error", onError);
    video.removeEventListener("loadedmetadata", onMetadata);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
