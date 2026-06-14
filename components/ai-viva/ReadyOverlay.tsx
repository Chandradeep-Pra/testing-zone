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
import UrologicsBrand from "@/components/brand/UrologicsBrand";
import MicLevelMeter from "./MicLevelMeter";
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
    <div className="absolute inset-0 z-50 overflow-y-auto bg-white/95 p-3 backdrop-blur-xl sm:p-4">

      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.12)] lg:my-6">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[#0f7896]/12 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="mb-6 space-y-4 lg:mb-8">
              <UrologicsBrand
                product="AI Viva"
                tag={selectedMode === "fast" ? "Fast and Furious session" : "Calm and Composed session"}
              />
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-[#0f7896]">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">
                    Session Setup
                  </p>
                  <h1 className="text-2xl font-semibold text-[#071014]">
                    {selectedMode === "fast" ? "Fast and Furious" : "Calm and Composed"} Viva
                  </h1>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-lg font-medium text-[#071014]">{vivaTitle}</p>
              <p className="max-w-2xl text-sm leading-6 text-[#071014]/65">
                Choose your examiner, confirm your microphone, and enter the premium Urologics AI Viva room.
                Fast mode runs on a total 10 minute clock and ends as soon as the question set is complete.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:mt-8 lg:gap-4">
              <div className="urologics-subpanel p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#0f7896]">
                  <TimerReset size={18} />
                </div>
                <div className="text-sm font-medium text-[#071014]">
                  {selectedMode === "fast" ? "10 Minute Sprint" : "Adaptive Live Flow"}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#071014]/65">
                  {selectedMode === "fast"
                    ? "Rapid progression with immediate transitions once key points are covered."
                    : "Natural viva pacing with targeted follow-up questions."}
                </p>
              </div>

              <div className="urologics-subpanel p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#0f7896]">
                  <Volume2 size={18} />
                </div>
                <div className="text-sm font-medium text-[#071014]">Examiner Selection</div>
                <p className="mt-2 text-xs leading-5 text-[#071014]/65">
                  Pick the examiner style that feels right for this session before you begin.
                </p>
              </div>

              <div className="urologics-subpanel p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-[#0f7896]">
                  <Mic size={18} />
                </div>
                <div className="text-sm font-medium text-[#071014]">Voice First</div>
                <p className="mt-2 text-xs leading-5 text-[#071014]/65">
                  Microphone access is required. Camera remains optional throughout the session.
                </p>
              </div>
            </div>

            
          </div>

          <div className="p-5 sm:p-6 lg:p-8">
            <div className="rounded-[28px] border border-[#0f7896]/12 bg-cyan-50 p-6">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">System Check</p>
                <h2 className="mt-2 text-xl font-semibold text-[#071014]">Ready to begin</h2>
                <p className="mt-2 text-sm leading-6 text-[#071014]/65">
                  Examiner selected: <span className="text-[#071014]">{selectedExaminer.name}</span>
                </p>
              </div>

              {cameraAllowed && cameraEnabled && (
                <div className="mb-5 overflow-hidden rounded-2xl">
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
                <div className="flex items-center justify-between rounded-2xl border border-[#0f7896]/12 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mic size={18} className="text-[#0f7896]" />
                    <span className="text-[#071014]">Microphone</span>
                  </div>

                  {checking ? (
                    <span className="text-[#071014]/65">Checking...</span>
                  ) : micAllowed ? (
                    <CheckCircle2 size={18} className="text-[#0f7896]" />
                  ) : (
                    <AlertTriangle size={18} className="text-red-400" />
                  )}
                </div>

                {micAllowed ? (
                  <MicLevelMeter
                    selfTest
                    active={micAllowed}
                    label="Speak to test microphone"
                    helper="If the bars do not move while you speak, check browser microphone permission or select the correct input device."
                  />
                ) : null}

                <div className="flex items-center justify-between rounded-2xl border border-[#0f7896]/12 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Camera size={18} className="text-[#0f7896]" />
                    <span className="text-[#071014]">Camera Preview</span>
                  </div>

                  {checking ? (
                    <span className="text-[#071014]/65">Checking...</span>
                  ) : !cameraAllowed ? (
                    <span className="text-[#071014]/65">Not available</span>
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
                    ? "bg-[#0f7896] text-white shadow-[0_16px_34px_rgba(15,120,150,0.2)] hover:bg-[#0b6078]"
                    : "cursor-not-allowed bg-[#071014]/10 text-[#071014]/45"
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
            <div className="mt-6 lg:mt-8">
              <div className="mb-4 text-left">
                <p className="text-xs uppercase tracking-[0.22em] text-[#0f7896]">Choose Examiner</p>
                <p className="mt-2 text-sm text-[#071014]/65">
                  Select the voice and examiner temperament you want for this viva.
                </p>
              </div>

              <div className="grid max-h-[38vh] gap-3 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible lg:pr-0">
                {examiners.map((examiner) => {
                  const active = examiner.id === selectedExaminerId;

                  return (
                    <button
                      key={examiner.id}
                      type="button"
                      onClick={() => setSelectedExaminerId(examiner.id)}
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        active
                          ? "border-[#0f7896] bg-[#0f7896] text-white shadow-[0_24px_60px_rgba(15,120,150,0.25)]"
                          : "border-[#0f7896]/12 bg-white hover:border-[#0f7896]/30 hover:bg-cyan-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className={`text-sm font-semibold ${active ? "text-white" : "text-[#071014]"}`}>{examiner.name}</div>
                          <div className={`mt-1 text-xs uppercase tracking-[0.2em] ${active ? "text-white/70" : "text-[#071014]/55"}`}>
                            {examiner.title}
                          </div>
                        </div>
                        {active && <CheckCircle2 size={18} className="text-white" />}
                      </div>
                      <p className={`mt-3 text-sm leading-6 ${active ? "text-white/78" : "text-[#071014]/65"}`}>
                        {examiner.personality}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
