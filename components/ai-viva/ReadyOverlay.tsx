"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  TimerReset,
  Volume2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getDefaultExaminer,
  EXAMINER_VOICES,
  type ExaminerVoice,
  type VivaMode,
} from "@/lib/examiner-voices";

type ReadyOverlayProps = {
  onBegin: (cameraEnabled: boolean, examiner: ExaminerVoice) => void;
  vivaTitle: string;
  selectedMode: VivaMode;
};

export default function ReadyOverlay({
  onBegin,
  vivaTitle,
  selectedMode,
}: ReadyOverlayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [micAllowed, setMicAllowed] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [selectedExaminerId, setSelectedExaminerId] = useState(
    getDefaultExaminer(selectedMode).id
  );

  const examiners = EXAMINER_VOICES[selectedMode];
  const selectedExaminer =
    examiners.find((examiner) => examiner.id === selectedExaminerId) ||
    getDefaultExaminer(selectedMode);

  useEffect(() => {
    setSelectedExaminerId(getDefaultExaminer(selectedMode).id);
  }, [selectedMode]);

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
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraAllowed(true);
        // Don't start the camera stream by default - only when user enables it
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
     Handle Camera Toggle
  ----------------------------------------- */
  useEffect(() => {
    async function toggleCamera() {
      if (cameraEnabled && !cameraStream && cameraAllowed) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setCameraStream(videoStream);
        } catch (err) {
          console.error("Failed to access camera:", err);
          setCameraEnabled(false);
        }
      } else if (!cameraEnabled && cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
    }

    toggleCamera();

    return () => {
      if (!cameraEnabled && cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraEnabled, cameraAllowed]);

  /* ----------------------------------------
     Attach stream AFTER video mounts
  ----------------------------------------- */
  useEffect(() => {
    if (videoRef.current && cameraStream && cameraEnabled) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream, cameraEnabled]);

  const canStart = micAllowed;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.2),_transparent_35%),rgba(2,6,23,0.86)] backdrop-blur-xl p-4">

      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/90 shadow-[0_30px_120px_rgba(2,6,23,0.65)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">
                  Session Setup
                </p>
                <h1 className="text-2xl font-semibold text-white">
                  {selectedMode === "fast" ? "Fast and Furious" : "Calm and Composed"} Viva
                </h1>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-lg font-medium text-slate-100">{vivaTitle}</p>
              <p className="max-w-2xl text-sm leading-6 text-slate-400">
                Choose your examiner, confirm your microphone, and step into a polished exam room
                experience. Fast mode runs on a total 10 minute clock and ends as soon as the question set is complete.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <TimerReset size={18} />
                </div>
                <div className="text-sm font-medium text-white">
                  {selectedMode === "fast" ? "10 Minute Sprint" : "Adaptive Live Flow"}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {selectedMode === "fast"
                    ? "Rapid progression with immediate transitions once key points are covered."
                    : "Natural viva pacing with targeted follow-up questions."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300">
                  <Volume2 size={18} />
                </div>
                <div className="text-sm font-medium text-white">Examiner Selection</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Pick the examiner style that feels right for this session before you begin.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                  <Mic size={18} />
                </div>
                <div className="text-sm font-medium text-white">Voice First</div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Microphone access is required. Camera remains optional throughout the session.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-4 text-left">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Choose Examiner</p>
                <p className="mt-2 text-sm text-slate-400">
                  Select the voice and examiner temperament you want for this viva.
                </p>
              </div>

              <div className="grid gap-3">
                {examiners.map((examiner) => {
                  const active = examiner.id === selectedExaminerId;

                  return (
                    <button
                      key={examiner.id}
                      type="button"
                      onClick={() => setSelectedExaminerId(examiner.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-white">{examiner.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                            {examiner.title}
                          </div>
                        </div>
                        {active && <CheckCircle2 size={18} className="text-emerald-300" />}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {examiner.personality}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">System Check</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Ready to begin</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Examiner selected: <span className="text-slate-200">{selectedExaminer.name}</span>
                </p>
              </div>

              {cameraAllowed && cameraEnabled && (
                <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-500/20 shadow-lg">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mic size={18} className="text-emerald-400" />
                    <span className="text-slate-200">Microphone</span>
                  </div>

                  {checking ? (
                    <span className="text-slate-400">Checking...</span>
                  ) : micAllowed ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-400" />
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Camera size={18} className="text-emerald-400" />
                    <span className="text-slate-200">Camera Preview</span>
                  </div>

                  {checking ? (
                    <span className="text-slate-400">Checking...</span>
                  ) : !cameraAllowed ? (
                    <span className="text-slate-400">Not available</span>
                  ) : (
                    <Switch
                      checked={cameraEnabled}
                      onCheckedChange={setCameraEnabled}
                      disabled={!cameraAllowed}
                    />
                  )}
                </div>
              </div>

              <button
                disabled={!canStart}
                onClick={
                  canStart ? () => onBegin(cameraEnabled, selectedExaminer) : undefined
                }
                className={`mt-6 flex w-full items-center justify-center gap-3 rounded-2xl py-3 font-medium transition-all duration-200 ${
                  canStart
                    ? "bg-emerald-600 text-white shadow-[0_18px_45px_rgba(5,150,105,0.35)] hover:bg-emerald-500"
                    : "cursor-not-allowed bg-slate-700 text-slate-400"
                }`}
              >
                {canStart ? "Enter Viva Room" : "Waiting For Microphone"}
                {canStart && <ArrowRight size={18} />}
              </button>

              {!micAllowed && !checking && (
                <p className="mt-4 text-xs text-red-400">
                  Microphone access is required to start the viva.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
