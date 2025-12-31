"use client";

import { Clock, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { vivaContext } from "@/ai-viva-data/vivaContext";
import { ExhibitImage } from "./ExhibitImage";

export default function VivaVoiceAi() {
  const { next } = useVivaSession();
  const { speak } = useSpeechOutput();

  /* ----------------------------------------
     Session / guards
  ----------------------------------------- */
  const hasStartedRef = useRef(false);
  const [overlayVisible, setOverlayVisible] = useState(true);

  /* ----------------------------------------
     AI state
  ----------------------------------------- */
  const [aiTranscript, setAiTranscript] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  // 👇 will be used in next step (image rendering)
  const [activeExhibitId, setActiveExhibitId] = useState<string | null>(null);

  /* ----------------------------------------
     Candidate state
  ----------------------------------------- */
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [candidateHistory, setCandidateHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  /* ----------------------------------------
     Speech-to-Text (browser)
  ----------------------------------------- */
  const {
    isRecording,
    results,
    interimResult,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
  });

  const activeExhibit = vivaContext.exhibits.find(
  e => e.id === activeExhibitId
);

  /* ----------------------------------------
     Interim captions
  ----------------------------------------- */
  useEffect(() => {
    if (!interimResult) return;
    setCandidateTranscript(interimResult);
  }, [interimResult]);

  /* ----------------------------------------
     Final transcript → Gemini → TTS
  ----------------------------------------- */
  useEffect(() => {
    if (!results.length) return;

    const finalText = results[results.length - 1]?.transcript?.trim();
    if (!finalText) return;

    setCandidateTranscript(finalText);
    setCandidateHistory((h) => [...h, finalText]);

    (async () => {
      try {
        setAiThinking(true);
        stopSpeechToText(); // 🔇 lock mic immediately

        const data = await next(finalText);
        if (!data || data.type === "wait") return;

        // 🧠 Exhibit trigger (stored only)
        if (data.action?.startsWith("open-img-")) {
          setActiveExhibitId(data.action.replace("open-img-", ""));
        }

        if (data.text) {
          setAiTranscript(data.text);
          setAiSpeaking(true);

          speak(data.text, () => {
            setAiSpeaking(false);
            startSpeechToText(); // 🎤 re-enable mic
          });
        }
      } finally {
        setAiThinking(false);
      }
    })();
  }, [results]);

  /* ----------------------------------------
     Start Viva (gesture required)
  ----------------------------------------- */
  async function startViva() {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const data = await next("");
    if (!data?.text) return;

    setAiTranscript(data.text);
    setAiSpeaking(true);
    stopSpeechToText();

    speak(data.text, () => {
      setAiSpeaking(false);
      startSpeechToText();
    });
  }

  /* ----------------------------------------
     UI
  ----------------------------------------- */
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col w-full">

      {/* Start Overlay */}
      {overlayVisible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <button
            onClick={async () => {
              setOverlayVisible(false);
              await startViva();
            }}
            className="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400
                       text-black text-lg font-medium shadow-lg"
          >
            Start Viva
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-12 px-6 flex items-center justify-between border-b border-neutral-800 text-sm">
        <div className="font-medium">AI Viva Examination</div>
        <div className="flex items-center gap-2 text-neutral-400">
          <Clock size={14} /> Live
        </div>
      </div>

      {/* Panels */}
      <div className="flex flex-1 p-6 gap-6">
        <AiPanel
  speaking={aiSpeaking}
  thinking={aiThinking}
  transcript={aiTranscript}
  exhibit={
    activeExhibit?.kind === "image" ? (
      <ExhibitImage
  src={`/exhibits/${activeExhibit.file}`}
  label={activeExhibit.label}
  onClose={() => setActiveExhibitId(null)}
/>

    ) : null
  }
/>


        <CandidatePanel
          speaking={false}
          listening={isRecording}
          transcript={candidateTranscript}
          history={candidateHistory}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(v => !v)}
          onStartTalk={() => {
            if (aiSpeaking) return;
            startSpeechToText();
          }}
          onStopTalk={stopSpeechToText}
        />
      </div>

      {/* Bottom Bar */}
      <div className="h-16 border-t border-neutral-800 px-8 flex items-center justify-between">
        <span className="text-neutral-400 text-sm">🎙 Voice session active</span>
        <button className="bg-red-600 p-3 rounded-full">
          <PhoneOff size={18} />
        </button>
        <span className="text-neutral-400 text-sm">Secure Session</span>
      </div>
    </main>
  );
}
