"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteTrack, Track } from "livekit-client";

export default function AvatarViewer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");

  const startAvatar = async () => {
    try {
      setLoading(true);

      const tokenRes = await fetch("/api/liveavatar/token", { method: "POST" });
      const tokenJson = await tokenRes.json();
      const sessionToken = tokenJson?.data?.session_token;
      console.log("SESSION TOKEN:", sessionToken);

      const startRes = await fetch("/api/liveavatar/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken }),
      });

      const startJson = await startRes.json();
      const { livekit_url, livekit_client_token } =
        startJson?.data || startJson;

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        }
        if (track.kind === Track.Kind.Audio && audioRef.current) {
          track.attach(audioRef.current);
        }
      });

      await room.connect(livekit_url, livekit_client_token);
      console.log("✅ Avatar connected");
    } catch (err) {
      console.error("❌ Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const speak = async () => {
    const room = roomRef.current;
    if (!room || !text.trim()) return;

    const msg = {
      event_type: "avatar.speak_text",
      payload: { text },
    };

    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify(msg)),
      { reliable: true, topic: "agent-control" }
    );

    setText("");
  };

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex flex-col items-center justify-center p-6">
      
      {/* Title */}
      <h1 className="text-3xl font-semibold mb-6 tracking-tight">
        AI Interviewer
      </h1>

      {/* Avatar Container */}
      <div className="w-full max-w-2xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4">
        
        {/* Video Box */}
        <div className="w-full h-[360px] bg-black rounded-xl overflow-hidden flex items-center justify-center">
          {/* {!loading && (
            <span className="text-gray-400 text-sm">
              Avatar will appear here
            </span>
          )} */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        <audio ref={audioRef} autoPlay />

        {/* Controls */}
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={startAvatar}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? "Starting..." : "Start Avatar"}
          </button>

          <span className="text-xs text-gray-400">
            LiveKit Stream
          </span>
        </div>
      </div>

      {/* Input Box */}
      <div className="w-full max-w-2xl mt-6 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/10 outline-none focus:ring-2 focus:ring-white/20"
        />

        <button
          onClick={speak}
          className="px-5 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}