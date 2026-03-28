//@ts-nocheck
"use client";

import { Clock, PhoneOff, Camera, CameraOff, MessageSquare, Plug } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { useVivaEngine } from "./useVivaEngine";
import { useScribe } from "@elevenlabs/react";
import ReadyOverlay from "./ReadyOverlay";
import ChatTimeline from "./ChatTimeline";
import { useCountdown } from "./useCountdown";

const VIVA_DURATION_SEC = 10 * 60;

export default function VivaVoiceAi() {

  const { generateScore, next } = useVivaEngine();

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

  const { speak, amplitude } = useSpeechOutput();

  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);

  const [readyVisible, setReadyVisible] = useState(true);
  const [ending, setEnding] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);

  const [messages, setMessages] = useState([]);
  const liveCandidateMsgId = useRef(null);

  const [showChat, setShowChat] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const { minutes, seconds } = useCountdown(
    VIVA_DURATION_SEC,
    vivaStarted && !ending
  );

  const fillers = [
  "Hmm... okay.",
  "Right, I see.",
  "Okay, that's a good answer.",
  "Got it... just thinking.",
  "Interesting... one moment.",
];
  /* --------------------------------------------------
     AUTO END WHEN 20 SECONDS LEFT
  -------------------------------------------------- */

  useEffect(() => {

    if (!vivaStarted || ending) return;

    const remaining = minutes * 60 + seconds;

    if (remaining === 20 && !endingRef.current) {

      endingRef.current = true;

      speak(
        "Thank you. We are concluding the viva now. Generating your score.",
        async () => {
          await endViva();
        }
      );

    }

  }, [minutes, seconds]);

  const fillerTimeoutRef = useRef<any>(null);
  const fillerIndexRef = useRef(0);


  // ElevenLabs Scribe v2 integration
  // --- Auto-submit after 3s pause ---
  const autoSubmitTimer = useRef<NodeJS.Timeout | null>(null);

  // Extracted committed transcript handler for reuse
  const handleCommittedTranscript = async (text: string) => {
    console.log('[VIVA] handleCommittedTranscript called with:', text);
    setIsListening(false);
    setThinking(true);
    fillerTimeoutRef.current = setTimeout(() => {
      if (endingRef.current) return;
      const filler = fillers[fillerIndexRef.current % fillers.length];
      fillerIndexRef.current++;
      speak(filler);
    }, 1200);
    setMessages((msgs) =>
      msgs.map((m) =>
        m.id === liveCandidateMsgId.current
          ? { ...m, text, live: false }
          : m
      )
    );
    try {
      const result = await next(text);
      if (fillerTimeoutRef.current) {
        clearTimeout(fillerTimeoutRef.current);
        fillerTimeoutRef.current = null;
      }
      if (!result?.question) return;
      setMessages((msgs) => [
        ...msgs,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: result.question,
        },
      ]);
      if (result.imageUsed) {
        setMessages((msgs) => [
          ...msgs,
          {
            id: crypto.randomUUID(),
            role: "image",
            src: result.imageLink,
            description: result.imageDescription,
          },
        ]);
      }
      applyApiResponse(result);
      speak(result.question, () => {
        markSpeechEnded();
        if (!endingRef.current) {
          const id = crypto.randomUUID();
          liveCandidateMsgId.current = id;
          setMessages((msgs) => [
            ...msgs,
            {
              id,
              role: "candidate",
              text: "",
              live: true,
            },
          ]);
          setIsListening(true);
          // Start listening again
          handleStartScribe();
        }
      });
    } finally {
      setThinking(false);
    }
  };

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      console.log('[VIVA] onPartialTranscript:', data.text);
      if (ending) return;
      setMessages((msgs) => {
        const exists = msgs.find((m) => m.id === liveCandidateMsgId.current);
        if (!exists) return msgs;
        return msgs.map((m) =>
          m.id === liveCandidateMsgId.current
            ? { ...m, text: data.text }
            : m
        );
      });
      // Reset auto-submit timer on every partial
      if (autoSubmitTimer.current) clearTimeout(autoSubmitTimer.current);
      console.log('[VIVA] Setting auto-submit timer for 1.5s');
      autoSubmitTimer.current = setTimeout(() => {
        console.log('[VIVA] Auto-submit timer fired. Data:', data.text);
        if (!ending && !endingRef.current && data.text?.trim()) {
          // Simulate committed transcript after 1.5s pause
          scribe.disconnect();
          handleCommittedTranscript(data.text);
        }
      }, 1500);
    },
    onCommittedTranscript: async (data) => {
      console.log('[VIVA] onCommittedTranscript:', data.text);
      if (ending || endingRef.current) return;
      if (autoSubmitTimer.current) {
        clearTimeout(autoSubmitTimer.current);
        autoSubmitTimer.current = null;
      }
      await handleCommittedTranscript(data.text);
    },
  });


  // Helper to fetch token and connect scribe
  async function handleStartScribe() {
    const res = await fetch("/api/scribe-token");
    const { token } = await res.json();
    await scribe.connect({
      token,
      microphone: { echoCancellation: true, noiseSuppression: true },
    });
  }


  /* --------------------------------------------------
     BEGIN VIVA
  -------------------------------------------------- */

  async function handleBegin(cameraPref = false) {

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setCameraEnabled(cameraPref);
    setReadyVisible(false);
    setVivaStarted(true);
    setThinking(true);

    try {

      const data = await next("");

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: data.question,
        },
      ]);

      applyApiResponse(data);

      speak(data.question, () => {

        markSpeechEnded();

        const id = crypto.randomUUID();
        liveCandidateMsgId.current = id;

        setMessages((msgs) => [
          ...msgs,
          {
            id,
            role: "candidate",
            text: "",
            live: true,
          },
        ]);

        setIsListening(true);
        handleStartScribe();

      });

    } finally {

      setThinking(false);

    }

  }


  /* --------------------------------------------------
     END VIVA
  -------------------------------------------------- */

  async function endViva() {

    if (ending) return;

    setEnding(true);

    await generateScore();

  }
  /* ----------------------------------------
     UI
  ----------------------------------------- */
  return (
    <main className="h-screen  bg-slate-950 text-slate-100 flex flex-col w-full relative">

      {/* READY OVERLAY */}
      {readyVisible && (
        <ReadyOverlay onBegin={handleBegin} />
      )}

      {/* ENDING OVERLAY */}
      {ending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 rounded-full border-4 border-white border-t-transparent animate-spin mx-auto" />
            <p className="text-lg font-medium">
              Generating Final Score…
            </p>
            <p className="text-sm text-slate-400">
              Please wait while evaluation completes
            </p>
          </div>
        </div>
      )}

      {/* TOP BAR - MOBILE OPTIMIZED */}
      <div className="h-12 sm:h-14 md:h-16 px-2 sm:px-4 md:px-8 flex items-center justify-between bg-slate-900/60 backdrop-blur-xl border-b border-slate-800">

        {/* LEFT: Live Indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
          <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-xs sm:text-xs md:text-sm uppercase tracking-wide text-slate-400 hidden sm:inline white-space-nowrap">
            Live Viva
          </span>
        </div>

        {/* CENTER: Title (Hidden on mobile) */}
        <div className="text-slate-200 font-medium text-xs sm:text-sm md:text-base hidden md:block flex-1 text-center px-2">
          Urologics AI Examiner
        </div>

        {/* RIGHT: Timer (Always visible, most important) */}
        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-full bg-slate-800/70 border border-emerald-500/20 text-xs sm:text-sm md:text-base font-semibold text-emerald-400 flex-shrink-0">
          <Clock size={12} className="sm:h-4 sm:w-4 md:h-[18px] md:w-[18px]" />
          <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
        </div>

      </div>
      <div className={`flex-1 flex flex-col md:grid gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 h-full min-h-0 ${showChat ? "md:grid-cols-[3fr_1fr]" : "md:grid-cols-1"}`}>

  {/* ================================
      AI AREA - MOBILE RESPONSIVE
  ================================= */}
  <div className="relative bg-slate-950 border border-slate-800 rounded-lg md:rounded-xl overflow-hidden flex-1 md:flex-none min-h-0">

    <AiPanel
      amplitude={amplitude}
      speaking={speaking}
      thinking={thinking}
      exhibit={
        exhibit?.type === "image" ? (
          <div className="relative max-w-full md:max-w-3xl mx-auto h-full flex items-center justify-center">
            <img
              src={exhibit.src}
              alt="Viva exhibit"
              className="rounded-lg md:rounded-xl shadow-xl max-h-[60vh] md:max-h-[70vh] w-auto"
            />

            <button
              onClick={clearExhibit}
              className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/70 hover:bg-black/90 text-white text-xs px-2 md:px-3 py-1 rounded-full transition-colors"
            >
              Close
            </button>
          </div>
        ) : null
      }
    />

    {/* Candidate Overlay - MOBILE RESPONSIVE */}
    <div className="absolute top-1.5 right-1.5 md:top-4 md:right-4 w-20 md:w-[260px] h-24 md:h-auto aspect-video md:aspect-auto">
      <CandidatePanel
        cameraOn={cameraOn}
        listening={isListening}
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

  </div>

  {showChat && (
    <>
      {/* ================================
          CHAT HISTORY PANEL (25%)
      ================================= */}
      {/* <div className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden"> */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg md:rounded-xl flex flex-col overflow-hidden min-h-0 max-h-[40vh] md:max-h-none md:flex-1">

        {/* Header */}
        <div className="px-3 md:px-4 py-2 md:py-3 border-b border-slate-800 text-xs md:text-sm text-slate-400 flex items-center justify-between flex-shrink-0">
          <span>Conversation History</span>
          <button
            onClick={() => setShowChat(false)}
            className="text-xs text-slate-400 hover:text-slate-200 md:hidden"
          >
            Close
          </button>
        </div>

        {/* Messages */}
        <ChatTimeline messages={messages} />

      </div>
    </>
  )}

</div>

      {/* BOTTOM BAR - MOBILE RESPONSIVE */}
      <div className="h-12 sm:h-14 md:h-16 flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-6 px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800 overflow-x-auto">

        <button
          onClick={() => setShowChat((v) => !v)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
          title="Toggle history"
        >
          <MessageSquare size={14} className="sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{showChat ? "Hide" : "Show"} History</span>
          <span className="inline sm:hidden">{showChat ? "Hide" : "Show"}</span>
        </button>

        <button
          onClick={() => setCameraOn((v) => !v)}
          disabled={!cameraEnabled}
          className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border transition-colors text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
            cameraEnabled
              ? "bg-slate-800 border-slate-700 hover:bg-slate-700 cursor-pointer"
              : "bg-slate-800/50 border-slate-700/50 opacity-50 cursor-not-allowed"
          }`}
          title={cameraEnabled ? "Toggle camera" : "Camera not enabled in system check"}
        >
          {cameraOn ? (
            <>
              <CameraOff size={14} className="sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Camera Off</span>
            </>
          ) : (
            <>
              <Camera size={14} className="sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Camera On</span>
            </>
          )}
        </button>

        <button
          onClick={endViva}
          disabled={!vivaStarted || ending}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
          title="End viva examination"
        >
          <PhoneOff size={14} className="sm:h-[18px] sm:w-[18px]" />
          <span className="hidden sm:inline">End Viva</span>
          <span className="inline sm:hidden">End</span>
        </button>

      </div>
    </main>
  );
}