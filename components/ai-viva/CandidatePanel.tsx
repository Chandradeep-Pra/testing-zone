"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  speaking: boolean;
  listening: boolean;
  transcript: string;
  onStartTalk: () => void;
  onStopTalk: () => void;
};

export function CandidatePanel({
  speaking,
  listening,
  transcript,
  onStartTalk,
  onStopTalk,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn("Camera permission denied");
      }
    }

    initCamera();
  }, []);

  return (
    <div
      className={`relative rounded-xl border overflow-hidden
      ${listening || speaking
        ? "border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.35)]"
        : "border-slate-800"
      }`}
    >
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover bg-slate-900"
      />

      {/* Header */}
      <div className="absolute top-2 left-3 text-xs text-slate-300">
        Candidate
      </div>

      {/* Mic Status */}
      {(listening || speaking) && (
        <div className="absolute top-2 right-3 flex items-center gap-1 text-blue-400 text-xs">
          <Mic size={14} />
          {speaking ? "Speaking" : "Listening"}
        </div>
      )}

      {/* Press To Talk */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
        <button
          onPointerDown={() => {
            if (!listening) onStartTalk();
          }}
          onPointerUp={() => {
            if (listening) onStopTalk();
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition
            ${
              listening
                ? "bg-blue-500 text-black"
                : "bg-black/70 hover:bg-black text-white"
            }`}
        >
          {listening ? "Listening…" : "Hold to Talk"}
        </button>
      </div>

      {/* Live Transcript */}
      {transcript && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2
          bg-black/70 backdrop-blur px-4 py-2 rounded-lg
          text-sm text-white max-w-[90%] text-center"
        >
          {transcript}
        </div>
      )}
    </div>
  );
}