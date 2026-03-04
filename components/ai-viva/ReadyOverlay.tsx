//@ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { vivaContext } from "@/ai-viva-data/vivaContext";

export default function ReadyOverlay({ onBegin }) {
  const videoRef = useRef(null);

  const [micAllowed, setMicAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);

  /* ----------------------------------------
     Request Permissions
  ----------------------------------------- */
  useEffect(() => {
    async function requestPermissions() {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicAllowed(true);
        micStream.getTracks().forEach(track => track.stop());
      } catch {
        setMicAllowed(false);
      }

      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraAllowed(true);
        setCameraStream(videoStream);
      } catch {
        setCameraAllowed(false);
      }

      setChecking(false);
    }

    requestPermissions();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /* ----------------------------------------
     Attach stream AFTER video mounts
  ----------------------------------------- */
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStream]);

  const canStart = micAllowed;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-emerald-950/75 backdrop-blur-md">

      <div className="
        w-full max-w-lg
        bg-slate-900/90
        border border-emerald-500/20
        shadow-2xl
        rounded-3xl
        p-8
        text-center
        space-y-8
      ">

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-emerald-400">
            Viva Session System Check
          </h1>

          <p className="text-lg text-slate-100 font-medium">
            {vivaContext.case.title}
          </p>
        </div>

        {/* Camera Preview */}
        {cameraAllowed && (
          <div className="rounded-2xl overflow-hidden border border-emerald-500/20 shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Permissions */}
        <div className="space-y-4 text-sm">

          <div className="flex items-center justify-between bg-slate-800/60 px-4 py-3 rounded-xl">
            <div className="flex items-center gap-3">
              <Mic size={18} className="text-emerald-400" />
              <span>Microphone</span>
            </div>

            {checking ? (
              <span className="text-slate-400">Checking...</span>
            ) : micAllowed ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <AlertTriangle size={18} className="text-red-400" />
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-800/60 px-4 py-3 rounded-xl">
            <div className="flex items-center gap-3">
              <Camera size={18} className="text-emerald-400" />
              <span>Camera (Optional)</span>
            </div>

            {checking ? (
              <span className="text-slate-400">Checking...</span>
            ) : cameraAllowed ? (
              <CheckCircle2 size={18} className="text-emerald-400" />
            ) : (
              <span className="text-slate-400">Not enabled</span>
            )}
          </div>

        </div>

        {/* Action Button */}
        <button
          disabled={!canStart}
          onClick={canStart ? onBegin : undefined}
          className={`
            w-full py-3 rounded-xl font-medium flex items-center justify-center gap-3 transition-all duration-200
            ${
              canStart
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                : "bg-slate-700 text-slate-400 cursor-not-allowed"
            }
          `}
        >
          {canStart ? "All the Best!" : "Ready?"}
          {canStart && <ArrowRight size={18} />}
        </button>

        {!micAllowed && !checking && (
          <p className="text-xs text-red-400">
            Microphone access is required to start the viva.
          </p>
        )}
      </div>
    </div>
  );
}