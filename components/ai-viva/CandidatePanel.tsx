"use client";

import { Mic, CameraOff } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  cameraOn: boolean;
  listening: boolean;
  transcript?: string;
};

export function CandidatePanel({
  cameraOn,
  listening,
  transcript,
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

      } catch (err) {
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
      className={`relative overflow-hidden rounded-lg md:rounded-xl border w-full h-full
      bg-slate-900/80 backdrop-blur-xl
      ${listening
        ? "border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.35)]"
        : "border-slate-800"
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

      <div className="absolute top-0.5 left-1 md:top-2 md:left-3 text-xs md:text-xs text-slate-300">
        You
      </div>

      {/* MIC STATUS */}

      {listening && (
        <div className="absolute top-0.5 right-0.5 md:top-2 md:right-3 flex items-center gap-0.5 text-blue-400 text-xs">
          <Mic size={10} className="md:h-[14px] md:w-[14px]" />
          <span className="hidden sm:inline">Listening</span>
        </div>
      )}

      {/* LIVE TRANSCRIPT */}

      {transcript && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2
          bg-black/70 backdrop-blur px-2 md:px-4 py-1 md:py-2 rounded-lg
          text-xs md:text-sm text-white max-w-[95%] md:max-w-[90%] text-center line-clamp-2"
        >
          {transcript}
        </div>
      )}

    </div>
  );
}