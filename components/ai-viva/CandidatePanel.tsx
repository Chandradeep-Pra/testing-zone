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
      className={`relative overflow-hidden rounded-xl border
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

      <div className="absolute top-2 left-3 text-xs text-slate-300">
        Candidate
      </div>

      {/* MIC STATUS */}

      {listening && (
        <div className="absolute top-2 right-3 flex items-center gap-1 text-blue-400 text-xs">
          <Mic size={14} />
          Listening
        </div>
      )}

      {/* LIVE TRANSCRIPT */}

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