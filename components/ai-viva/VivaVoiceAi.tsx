"use client";

import { Clock, PhoneOff } from "lucide-react";
import { useRef, useState } from "react";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { useSpeechInput } from "./useSpeechInput";
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

  const [activeExhibitId, setActiveExhibitId] = useState<string | null>(null);

  /* ----------------------------------------
     Candidate state
  ----------------------------------------- */
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [candidateHistory, setCandidateHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);

  /* ----------------------------------------
     Speech Input (browser, examiner-controlled)
  ----------------------------------------- */
  const { start, stop } = useSpeechInput(
    // 🟡 Interim captions
    (interim) => {
      setCandidateTranscript(interim);
    },

    // 🟢 Final transcript
    async (finalText) => {
      setCandidateTranscript(finalText);
      setCandidateHistory((h) => [...h, finalText]);

      stop(); // 🔇 lock mic
      setIsListening(false);
      setAiThinking(true);

      try {
        const data = await next(finalText);
        if (!data || data.type === "wait") return;

        // 🧠 Exhibit trigger
        console.log("Received AI response:", data);
        
        if (data.action?.startsWith("open-img-")) {
          setActiveExhibitId(data.action.replace("open-img-", ""));
        }

        console.log("AI Viva Question:", data.text);

        if (data.text) {
          setAiTranscript(data.text);
          setAiSpeaking(true);

          speak(data.text, () => {
            setAiSpeaking(false);
            setIsListening(true);
            start(); // 🎤 reopen mic
          });
        }
      } finally {
        setAiThinking(false);
      }
    }
  );

  const activeExhibit = vivaContext.exhibits.find(
    (e) => e.id === activeExhibitId
  );

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

    console.log("AI Viva Question:", data.text);
    speak(data.text, () => {
      setAiSpeaking(false);
      setIsListening(true);
      start(); // 🎤 mic ON
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
      <div className="flex flex-1 flex-col md:flex-row p-6 gap-6">
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
          listening={isListening}
          transcript={candidateTranscript}
          history={candidateHistory}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory((v) => !v)}
          onStartTalk={() => {
            if (aiSpeaking) return;
            setIsListening(true);
            start();
          }}
          onStopTalk={() => {
            setIsListening(false);
            stop();
          }}
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
