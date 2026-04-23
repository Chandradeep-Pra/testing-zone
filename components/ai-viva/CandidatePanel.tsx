"use client";

import { Mic, CameraOff } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  cameraOn: boolean;
  listening: boolean;
};

export function CandidatePanel({
  cameraOn,
  listening,
}: Props) {

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* -------------------------------
     CAMERA CONTROL
  -------------------------------- */

  useEffect(() => {

    async function startCamera() {
      try {

        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

      } catch {
        console.warn("Camera permission denied");
      }
    }

    function stopCamera() {

      if (!streamRef.current) return;

      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

    }

    if (cameraOn) startCamera();
    else stopCamera();

    return () => stopCamera();

  }, [cameraOn]);

  /* -------------------------------
     UI
  -------------------------------- */

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl border
      bg-slate-950/85 backdrop-blur-xl
      ${listening
        ? "border-sky-400/60 shadow-[0_0_24px_rgba(56,189,248,0.22)]"
        : "border-white/10"
      }`}
    >

      {/* CAMERA AREA */}

      {cameraOn ? (

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

      ) : (

        <div className="flex items-center justify-center h-full text-slate-500 bg-slate-900">
          <CameraOff size={28} />
        </div>

      )}

      {/* HEADER */}

      <div className="absolute left-2 top-2 rounded-full bg-black/35 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300 md:left-3 md:top-3 md:text-[11px]">
        You
      </div>

      {/* MIC STATUS */}

      {listening && (
        <div className="absolute right-1 top-1 flex items-center gap-1 rounded-full bg-sky-400/10 px-2 py-1 text-[10px] text-sky-300 md:right-3 md:top-3 md:text-xs">
          <Mic size={10} className="md:h-[14px] md:w-[14px]" />
          <span className="hidden sm:inline">Listening</span>
        </div>
      )}

      {/* LIVE TRANSCRIPT */}

      {/* {transcript && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2
          bg-black/70 backdrop-blur px-2 md:px-4 py-1 md:py-2 rounded-lg
          text-xs md:text-sm text-white max-w-[95%] md:max-w-[90%] text-center line-clamp-2"
        >
          {transcript}
        </div>
      )} */}

    </div>
  );
}
