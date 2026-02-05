//@ts-nocheck

"use client";

import { Clock, PhoneOff } from "lucide-react";
import { useRef, useState } from "react";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { useSpeechInput } from "./useSpeechInput";
import { useVivaEngine } from "./useVivaEngine";

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
  const [overlayVisible, setOverlayVisible] = useState(true);

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
      setCandidateTranscript(interim);
    },

    async (finalText) => {
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
          setIsListening(true);
          start();
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

  async function endViva() {
  stop();
  setIsListening(false);
  setThinking(true);

  try {
    const data = await next("", true); // 🔑 EXIT

    if (data?.evaluation) {
      sessionStorage.setItem(
        "viva-final-score",
        JSON.stringify(data.evaluation)
      );

      window.location.href = "/ai-viva/score";
    }
  } finally {
    setThinking(false);
  }
}


  /* ----------------------------------------
     UI
  ----------------------------------------- */
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col w-full">
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

      <div className="h-12 px-6 flex items-center justify-between border-b border-neutral-800 text-sm">
        <div className="font-medium">AI Viva Examination</div>
        <div className="flex items-center gap-2 text-neutral-400">
          <Clock size={14} /> Live
        </div>
      </div>

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
            if (speaking) return;
            setIsListening(true);
            start();
          }}
          onStopTalk={() => {
            setIsListening(false);
            stop();
          }}
        />
      </div>

      <div className="h-16 border-t border-neutral-800 px-8 flex items-center justify-between">
        <span className="text-neutral-400 text-sm">🎙 Voice session active</span>
        <button
  onClick={endViva}
  className="bg-red-600 p-3 rounded-full cursor-pointer hover:bg-red-700 flex items-center gap-2"
>
  End Viva
</button>


        <span className="text-neutral-400 text-sm">Secure Session</span>
      </div>
    </main>
  );
}
