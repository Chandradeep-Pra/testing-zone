"use client";

import { Clock, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { useSpeechInput } from "./useSpeechInput";
import { useVivaEngine } from "./useVivaEngine";

const VIVA_DURATION_SEC = 10 * 60; // 🔒 10 minutes

export default function VivaVoiceAi() {
  const { next } = useVivaEngine();
  const {
    transcript,
    speaking,
    thinking,
    exhibit,
    setThinking,
    applyApiResponse,
    markSpeechEnded,
    clearExhibit,
  } = useVivaSession();

  const { speak } = useSpeechOutput();

  /* ----------------------------------------
     Session guards
  ----------------------------------------- */
  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);

  const [vivaStarted, setVivaStarted] = useState(false);


  const [overlayVisible, setOverlayVisible] = useState(true);
  const [ending, setEnding] = useState(false);

  /* ----------------------------------------
     Timer
  ----------------------------------------- */
  const [remainingSec, setRemainingSec] = useState(VIVA_DURATION_SEC);

  useEffect(() => {
  if (!vivaStarted || endingRef.current) return;

  const interval = setInterval(() => {
    setRemainingSec((prev) => {
      if (prev <= 1) {
        clearInterval(interval);
        endViva(); // ⏰ AUTO END
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(interval);
}, [vivaStarted]);


  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  /* ----------------------------------------
     Candidate state
  ----------------------------------------- */
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [candidateHistory, setCandidateHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);

  /* ----------------------------------------
     Speech Input
  ----------------------------------------- */
  const { start, stop } = useSpeechInput(
    (interim) => {
      if (!ending) setCandidateTranscript(interim);
    },

    async (finalText) => {
      if (ending || endingRef.current) return;

      setCandidateTranscript(finalText);
      setCandidateHistory((h) => [...h, finalText]);

      stop();
      setIsListening(false);
      setThinking(true);

      try {
        const data = await next(finalText);
        if (!data?.question) return;

        applyApiResponse(data);

        speak(data.question, () => {
          markSpeechEnded();
          if (!endingRef.current) {
            setIsListening(true);
            start();
          }
        });
      } finally {
        setThinking(false);
      }
    }
  );

  /* ----------------------------------------
     Start Viva
  ----------------------------------------- */
 async function startViva() {
  if (hasStartedRef.current) return;
  hasStartedRef.current = true;
  setVivaStarted(true); // 🔑 START TIMER

  setThinking(true);

  try {
    const data = await next("");
    if (!data?.question) return;

    applyApiResponse(data);

    speak(data.question, () => {
      markSpeechEnded();
      setIsListening(true);
      start();
    });
  } finally {
    setThinking(false);
  }
}


  /* ----------------------------------------
     END VIVA (AUTHORITATIVE)
  ----------------------------------------- */
  async function endViva() {
    if (endingRef.current) return;

    endingRef.current = true;
    setEnding(true);

    stop();
    setIsListening(false);
    setThinking(true);

    try {
      const data = await next("", true); // 🔑 EXIT MODE

      if (data?.evaluation) {
        sessionStorage.setItem(
          "viva-final-score",
          JSON.stringify(data.evaluation)
        );
      }

      window.location.href = "/ai-viva/score";
    } catch {
      window.location.href = "/ai-viva/score";
    }
  }

  /* ----------------------------------------
     UI
  ----------------------------------------- */
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col w-full relative">

      {/* START OVERLAY */}
      {overlayVisible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <button
            onClick={async () => {
              setOverlayVisible(false);
              await startViva();
            }}
            className="px-8 py-4 rounded-xl bg-emerald-500 text-black text-lg font-medium"
          >
            Start Viva
          </button>
        </div>
      )}

      {/* ENDING OVERLAY */}
      {ending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">
              Generating final score…
            </p>
            <p className="text-sm text-neutral-400">
              Please wait
            </p>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-neutral-800 text-sm">
        <div className="font-medium">AI Viva Examination</div>
        <div className="flex items-center gap-2 text-neutral-400">
          <Clock size={14} />
          {formatTime(remainingSec)}
        </div>
      </div>

      {/* PANELS */}
      <div className="flex flex-1 flex-col md:flex-row p-6 gap-6">
        <AiPanel
          speaking={speaking}
          thinking={thinking}
          transcript={transcript}
          exhibit={
            exhibit?.type === "image" ? (
              <div className="relative max-w-3xl">
                <img
                  src={exhibit.src}
                  alt="Viva exhibit"
                  className="rounded-xl shadow-2xl max-h-[80vh]"
                />
                {exhibit.description && (
                  <div className="mt-3 text-sm text-neutral-300 text-center">
                    {exhibit.description}
                  </div>
                )}
                <button
                  onClick={clearExhibit}
                  className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full"
                >
                  Close
                </button>
              </div>
            ) : null
          }
        />

        <CandidatePanel
          speaking={false}
          listening={isListening}
          transcript={candidateTranscript}
          history={candidateHistory}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onStartTalk={() => {
            if (speaking || ending) return;
            setIsListening(true);
            start();
          }}
          onStopTalk={() => {
            setIsListening(false);
            stop();
          }}
        />
      </div>

      {/* BOTTOM BAR */}
      <div className="h-16 border-t border-neutral-800 px-8 flex items-center justify-between">
        <span className="text-neutral-400 text-sm">
          🎙 Voice session active
        </span>

        <button
          onClick={endViva}
          className="bg-red-600 p-3 rounded-full hover:bg-red-700"
        >
          <PhoneOff size={18} />
        </button>

        <span className="text-neutral-400 text-sm">
          Secure Session
        </span>
      </div>
    </main>
  );
}
