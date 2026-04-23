"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
} from "livekit-client";

type LiveAvatarSessionResponse = {
  sessionToken: string;
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  url?: string | null;
  access_token?: string | null;
  max_session_duration?: number;
  [key: string]: unknown;
};

type LiveAvatarSessionErrorResponse = {
  error?: string;
  details?: {
    code?: number;
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type LiveAvatarServerEvent = {
  event_id?: string;
  event_type: string;
  session_id: string;
  source_event_id?: string | null;
  text?: string;
  end_reason?: string;
};

type UseLiveAvatarOptions = {
  onSpeakEnded?: () => void;
  onSpeakStarted?: () => void;
};

type LiveAvatarCommand =
  | {
      event_type: "avatar.interrupt" | "avatar.start_listening" | "avatar.stop_listening";
    }
  | {
      event_type: "avatar.speak_text";
      text: string;
    };

export function useLiveAvatar(options?: UseLiveAvatarOptions) {
  const roomRef = useRef<Room | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const currentVideoTrackRef = useRef<RemoteTrack | null>(null);
  const currentAudioTrackRef = useRef<RemoteTrack | null>(null);
  const pendingSpeakEndRef = useRef<(() => void) | null>(null);

  const [isConfigured, setIsConfigured] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupTracks = useCallback(() => {
    currentVideoTrackRef.current?.detach();
    currentAudioTrackRef.current?.detach();
    currentVideoTrackRef.current = null;
    currentAudioTrackRef.current = null;

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }

    if (audioContainerRef.current) {
      audioContainerRef.current.replaceChildren();
    }
  }, []);

  const attachTrack = useCallback(
    (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoElementRef.current) {
        currentVideoTrackRef.current?.detach();
        currentVideoTrackRef.current = track;
        track.attach(videoElementRef.current);
        void videoElementRef.current.play().catch(() => undefined);
        return;
      }

      if (track.kind === Track.Kind.Audio && audioContainerRef.current) {
        currentAudioTrackRef.current?.detach();
        currentAudioTrackRef.current = track;
        const audioEl = track.attach();
        audioEl.autoplay = true;
        audioContainerRef.current.replaceChildren(audioEl);
      }
    },
    []
  );

  const handleServerEvent = useCallback(
    (payload: Uint8Array, topic?: string) => {
      if (topic !== "agent-response") {
        return;
      }

      try {
        const event = JSON.parse(
          new TextDecoder().decode(payload)
        ) as LiveAvatarServerEvent;

        if (event.event_type === "avatar.speak_started") {
          setIsSpeaking(true);
          setIsListening(false);
          options?.onSpeakStarted?.();
        }

        if (event.event_type === "avatar.speak_ended") {
          setIsSpeaking(false);
          options?.onSpeakEnded?.();
          pendingSpeakEndRef.current?.();
          pendingSpeakEndRef.current = null;
        }

        if (event.event_type === "session.stopped") {
          setIsReady(false);
          setIsSpeaking(false);
          setIsListening(false);
        }
      } catch (err) {
        console.error("Failed to parse LiveAvatar event:", err);
      }
    },
    [options]
  );

  const startSession = useCallback(async () => {
    if (roomRef.current && isReady) {
      return true;
    }

    setError(null);
    setIsConnecting(true);

    try {
      const response = await fetch("/api/liveavatar/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json()) as
        | LiveAvatarSessionResponse
        | LiveAvatarSessionErrorResponse;

      if ("error" in payload && typeof payload.error === "string") {
        const details = payload.details as { message?: string } | undefined;
        const detailMessage =
          details && typeof details.message === "string"
            ? ` (${details.message})`
            : "";
        setIsConfigured(!payload.error.includes("Missing LiveAvatar configuration"));
        throw new Error(`${payload.error}${detailMessage}`);
      }

      if (!response.ok) {
        throw new Error("Failed to start LiveAvatar session");
      }

      const sessionPayload = payload as LiveAvatarSessionResponse;

      setIsConfigured(true);
      sessionTokenRef.current = sessionPayload.sessionToken;
      sessionIdRef.current = sessionPayload.session_id;

      const roomUrl =
        typeof sessionPayload.livekit_url === "string" && sessionPayload.livekit_url.trim()
          ? sessionPayload.livekit_url.trim()
          : typeof sessionPayload.url === "string" && sessionPayload.url.trim()
          ? sessionPayload.url.trim()
          : null;

      const clientToken =
        typeof sessionPayload.livekit_client_token === "string" && sessionPayload.livekit_client_token.trim()
          ? sessionPayload.livekit_client_token.trim()
          : typeof sessionPayload.access_token === "string" && sessionPayload.access_token.trim()
          ? sessionPayload.access_token.trim()
          : null;

      if (!roomUrl || !clientToken) {
        throw new Error(
          `LiveAvatar returned invalid room credentials: ${JSON.stringify({
            keys: Object.keys(sessionPayload),
            livekit_url: typeof sessionPayload.livekit_url,
            url: typeof sessionPayload.url,
            livekit_client_token: typeof sessionPayload.livekit_client_token,
            access_token: typeof sessionPayload.access_token,
          })}`
        );
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.TrackSubscribed, attachTrack);
      room.on(RoomEvent.TrackUnsubscribed, cleanupTracks);
      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === "disconnected") {
          setIsReady(false);
          setIsSpeaking(false);
          setIsListening(false);
        }
      });
      room.on(RoomEvent.MediaDevicesError, (err) => {
        const message =
          err instanceof Error ? err.message : "LiveAvatar media device error";
        setError(message);
      });
      room.on(RoomEvent.DataReceived, (data, _participant, _kind, topic) => {
        handleServerEvent(data, topic);
      });
      room.on(RoomEvent.Disconnected, () => {
        setIsReady(false);
        setIsSpeaking(false);
        setIsListening(false);
        cleanupTracks();
      });

      await room.connect(roomUrl, clientToken, {
        autoSubscribe: true,
      });

      roomRef.current = room;
      setIsReady(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect LiveAvatar";
      console.error("LiveAvatar connect failed:", err);
      setError(message);
      setIsReady(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [attachTrack, cleanupTracks, handleServerEvent, isReady]);

  const sendCommand = useCallback(async (command: LiveAvatarCommand) => {
    if (!roomRef.current || !sessionIdRef.current) {
      throw new Error("LiveAvatar session is not ready");
    }

    await roomRef.current.localParticipant.publishData(
      new TextEncoder().encode(
        JSON.stringify({
          event_id: crypto.randomUUID(),
          session_id: sessionIdRef.current,
          ...command,
        })
      ),
      {
        reliable: true,
        topic: "agent-control",
      }
    );
  }, []);

  const speakText = useCallback(async (text: string, onEnd?: () => void) => {
    pendingSpeakEndRef.current = onEnd || null;
    setIsListening(false);
    await sendCommand({
      event_type: "avatar.speak_text",
      text,
    });
  }, [sendCommand]);

  const interrupt = useCallback(async () => {
    pendingSpeakEndRef.current = null;
    setIsSpeaking(false);
    await sendCommand({
      event_type: "avatar.interrupt",
    });
  }, [sendCommand]);

  const startListening = useCallback(async () => {
    if (!roomRef.current) {
      return;
    }

    setIsListening(true);
    await sendCommand({
      event_type: "avatar.start_listening",
    });
  }, [sendCommand]);

  const stopListening = useCallback(async () => {
    if (!roomRef.current) {
      return;
    }

    setIsListening(false);
    await sendCommand({
      event_type: "avatar.stop_listening",
    });
  }, [sendCommand]);

  const stopSession = useCallback(async () => {
    pendingSpeakEndRef.current = null;

    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    cleanupTracks();
    setIsReady(false);
    setIsSpeaking(false);
    setIsListening(false);

    const token = sessionTokenRef.current;
    sessionTokenRef.current = null;
    sessionIdRef.current = null;

    if (!token) {
      return;
    }

    try {
      await fetch("/api/liveavatar/session/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionToken: token }),
      });
    } catch (err) {
      console.error("Failed to stop LiveAvatar session:", err);
    }
  }, [cleanupTracks]);

  useEffect(() => {
    return () => {
      void stopSession();
    };
  }, [stopSession]);

  return {
    isConfigured,
    isConnecting,
    isReady,
    isSpeaking,
    isListening,
    error,
    videoElementRef,
    audioContainerRef,
    startSession,
    stopSession,
    speakText,
    interrupt,
    startListening,
    stopListening,
  };
}
