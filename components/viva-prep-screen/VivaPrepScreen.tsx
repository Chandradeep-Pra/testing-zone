"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { appPath } from "@/lib/app-path";
import { EXAMINER_VOICES, getDefaultExaminer, type ExaminerVoice, type VivaMode } from "@/lib/examiner-voices";
import CandidateForm from "./CandidateForm";
import ExaminerPicker from "./ExaminerPicker";
import HardwareCheck from "./HardwareCheck";
import SessionRequirements from "./SessionRequirements";
import StartupOverlay, { type StartupStage } from "./StartupOverlay";
import { useHardwareCheck } from "./useHardwareCheck";

type Candidate = { name: string; email: string };

type VivaPrepScreenProps = {
  onBegin: (cameraEnabled: boolean, examiner: ExaminerVoice, micDeviceId?: string) => void | Promise<void>;
  onCandidateReady?: (candidate: Candidate) => void | Promise<void>;
  vivaTitle: string;
  selectedMode: VivaMode;
  candidate: Candidate;
  onCandidateChange: (candidate: Candidate) => void;
  errorMessage?: string | null;
  isStarting?: boolean;
  startupStage?: StartupStage;
};

function ChecklistStep({
  onBegin,
  onBack,
  vivaTitle,
  selectedMode,
  errorMessage,
  isStarting: startingFromParent,
  startupStage,
}: {
  onBegin: VivaPrepScreenProps["onBegin"];
  onBack: () => void;
  vivaTitle: string;
  selectedMode: VivaMode;
  errorMessage?: string | null;
  isStarting: boolean;
  startupStage: StartupStage;
}) {
  const [clicked, setClicked] = useState(false);
  const isStarting = startingFromParent || clicked;
  const hw = useHardwareCheck(isStarting);
  const hardwareRef = useRef<HTMLElement | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [selectedExaminerId, setSelectedExaminerId] = useState(getDefaultExaminer(selectedMode).id);

  const canStart = hw.ready;
  const startupFailed = Boolean(errorMessage) || startupStage === "error";

  const blockers = [
    !hw.speakerReady && "Your speaker is not tested.",
    !hw.micReady &&
      (hw.micAllowed ? "Your microphone is not detected. Speak to test it." : "Your microphone is not detected."),
  ].filter(Boolean) as string[];

  const examiners = EXAMINER_VOICES[selectedMode];
  const selectedExaminer =
    examiners.find((examiner) => examiner.id === selectedExaminerId) || getDefaultExaminer(selectedMode);

  async function startSession() {
    // Show the preparing overlay immediately, before the parent state updates.
    setClicked(true);
    try {
      await onBegin(
        Boolean(hw.cameraEnabled && hw.cameraAllowed && hw.cameraStream),
        selectedExaminer,
        hw.selectedMicDeviceId || undefined,
      );
    } finally {
      setClicked(false);
    }
  }

  function handleStartClick() {
    if (!canStart) {
      hardwareRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    void startSession();
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-7">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image src={appPath("/logo.png")} alt="Urologics" width={36} height={36} className="h-9 w-9 object-contain" />
              <span className="text-[17px] font-semibold text-[var(--text-primary)]">Urologics AI</span>
            </div>
            <span
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                selectedMode === "fast"
                  ? "border-[#FF6347] bg-[#FF6347] text-white shadow-[0_12px_28px_rgba(255,99,71,0.3)]"
                  : "border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              }`}
            >
              {selectedMode === "fast" ? "Fast and Furious" : "Calm and Composed"}
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            disabled={isStarting}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--accent)] disabled:opacity-50"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </header>
        <div className="mt-6">
          <h1 className="text-[34px] font-bold leading-10 tracking-tight">{vivaTitle}</h1>
          <p className="mt-2 text-[17px] leading-6 text-[var(--text-secondary)]">
            Review the session requirements and check your hardware.
          </p>
        </div>

        <div className="mt-8 flex w-full flex-col gap-5">
          <SessionRequirements />
          <ExaminerPicker
            selectedMode={selectedMode}
            selectedExaminerId={selectedExaminerId}
            onSelect={setSelectedExaminerId}
          />
          <HardwareCheck ref={hardwareRef} hw={hw} disabled={isStarting} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[60] bg-[var(--background)]/95 px-4 py-4 backdrop-blur sm:px-7">
        <div className="relative mx-auto max-w-6xl">
          {tooltipVisible && !canStart && blockers.length > 0 && (
            <div
              id="start-viva-tooltip"
              role="tooltip"
              className="absolute bottom-full left-1/2 mb-2 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-[13px] text-[var(--text-primary)] shadow-lg"
            >
              {blockers.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            aria-disabled={!canStart}
            aria-describedby={tooltipVisible && !canStart ? "start-viva-tooltip" : undefined}
            disabled={isStarting}
            onClick={handleStartClick}
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
            onFocus={() => setTooltipVisible(true)}
            onBlur={() => setTooltipVisible(false)}
            className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-[17px] font-semibold text-white transition ${
              canStart
                ? "cursor-pointer bg-[var(--accent)] shadow-[0_8px_20px_rgba(1,136,136,0.25)] hover:bg-[var(--accent-hover)]"
                : "cursor-not-allowed bg-[var(--accent)] opacity-40"
            }`}
          >
            {isStarting ? "Starting Viva Session…" : "Start Viva Session"}
            {!isStarting && <ArrowRight size={20} />}
          </button>
        </div>
      </div>

      {(isStarting || startupFailed) && (
        <StartupOverlay failed={startupFailed} stage={startupStage} isStarting={isStarting} onRetry={() => void startSession()} />
      )}
    </>
  );
}

export default function VivaPrepScreen({
  onBegin,
  onCandidateReady,
  vivaTitle,
  selectedMode,
  candidate,
  onCandidateChange,
  errorMessage,
  isStarting = false,
  startupStage = "idle",
}: VivaPrepScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);

  async function handleCandidateSubmit(info: Candidate) {
    await onCandidateReady?.(info);
    setStep(2);
  }

  return (
    <div className="fixed inset-0 z-50 h-dvh overflow-y-auto bg-[var(--background)] text-[var(--text-primary)] urologics-minimal-scrollbar">
      {step === 1 ? (
        <CandidateForm
          candidate={candidate}
          onChange={onCandidateChange}
          onSubmit={handleCandidateSubmit}
          vivaTitle={vivaTitle}
          modeLabel={selectedMode === "fast" ? "Fast and Furious" : "Calm and Composed"}
        />
      ) : (
        <ChecklistStep
          onBegin={onBegin}
          onBack={() => setStep(1)}
          vivaTitle={vivaTitle}
          selectedMode={selectedMode}
          errorMessage={errorMessage}
          isStarting={isStarting}
          startupStage={startupStage}
        />
      )}
    </div>
  );
}
