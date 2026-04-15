//@ts-nocheck
"use client";

import { Clock, PhoneOff, Camera, CameraOff, MessageSquare, Plug } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { useSpeechInput } from "./useSpeechInput";
import { useVivaEngine } from "./useVivaEngine";
import ReadyOverlay from "./ReadyOverlay";
import ChatTimeline from "./ChatTimeline";
import { useCountdown } from "./useCountdown";

import type { VivaCaseRecord } from "@/lib/viva-case";

export default function VivaVoiceAi({ vivaCase }: { vivaCase: VivaCaseRecord }) {
  const warmupPrompt = "Before we begin, please say your full name and tell me in one short sentence how you are feeling today. This is only an audio check and will not be scored.";
  const warmupDurationMs = 5000;
  const [candidate, setCandidate] = useState({ name: "", email: "" });
  const { generateScore, next } = useVivaEngine(vivaCase);
  useEffect(() => {
    const stored = localStorage.getItem("candidateInfo");
    if (stored) {
      const parsed = JSON.parse(stored);
      setCandidate(parsed);
      if (parsed.conversation) {
        setMessages(parsed.conversation);
      }
    }
  }, []);

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
  const warmupPendingRef = useRef(false);
  const warmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [readyVisible, setReadyVisible] = useState(true);
  const [ending, setEnding] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);

  const [messages, setMessages] = useState([]);
  const liveCandidateMsgId = useRef(null);

  const [showChat, setShowChat] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const vivaDurationSec = vivaCase.viva_rules.max_duration_minutes * 60;

  const { minutes, seconds } = useCountdown(
    vivaDurationSec,
    vivaStarted && !ending
  );

 const fillers = [
  "Alright, let me consider that.",
  "Okay, I understand.",
  "Hmm, let me think about that.",
  "Got it, one moment.",
  "Right, I see.",
  "Okay, processing your response.",
  "I understand what you're saying.",
  "Alright, just a second.",
  "Let me go through that.",
  "Okay, thinking it through.",
  "Right, let me consider your answer.",
  "Understood, give me a moment.",
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


  /* --------------------------------------------------
     SPEECH INPUT
  -------------------------------------------------- */

  const { start, stop } = useSpeechInput(

    (interim) => {

      if (ending) return;

      setMessages((msgs) => {
        const exists = msgs.find((m) => m.id === liveCandidateMsgId.current);
        if (!exists) return msgs;

        return msgs.map((m) =>
          m.id === liveCandidateMsgId.current
            ? { ...m, text: interim }
            : m
        );
      });

    },

    async (finalText) => {

      if (ending || endingRef.current) return;

      stop();
      setIsListening(false);

      if (warmupPendingRef.current) {
        return;
      }

      setThinking(true);

      fillerTimeoutRef.current = setTimeout(() => {
        if (endingRef.current) return;

        const filler =
          fillers[fillerIndexRef.current % fillers.length];

        fillerIndexRef.current++;

        speak(filler);
      }, 1200);

      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === liveCandidateMsgId.current
            ? { ...m, text: finalText, live: false }
            : m
        )
      );

      try {

        const data = await next(finalText);
        console.log("Data for AI : ", data)
        if (fillerTimeoutRef.current) {
  clearTimeout(fillerTimeoutRef.current);
  fillerTimeoutRef.current = null;
}
        if (!data?.question) return;

        setMessages((msgs) => [
          ...msgs,
          {
            id: crypto.randomUUID(),
            role: "ai",
            text: data.question,
          },
        ]);

        if (data.imageUsed) {
          setMessages((msgs) => [
            ...msgs,
            {
              id: crypto.randomUUID(),
              role: "image",
              src: data.imageLink,
              description: data.imageDescription,
            },
          ]);
        }

        applyApiResponse(data);

        speak(data.question, () => {

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
            start();
          }

        });

      } finally {

        setThinking(false);

      }

    }

  );


  /* --------------------------------------------------
     BEGIN VIVA
  -------------------------------------------------- */

  async function startViva() {
    try {
      const data = await next("");
      console.log('Next data received:', data);

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: data.question,
        },
      ]);

      applyApiResponse(data);

      speak(data.question, () => {

        console.log('First question spoken, setting up listening...');
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
        setThinking(false); // Set thinking false here

        setTimeout(() => start(), 50);
      });
    } catch (error) {
      console.error('Error starting viva:', error);
      setThinking(false);
    }
  }

  function startWarmup() {
    warmupPendingRef.current = true;
    setThinking(false);

    if (warmupTimeoutRef.current) {
      clearTimeout(warmupTimeoutRef.current);
      warmupTimeoutRef.current = null;
    }

    speak(warmupPrompt, () => {

      console.log("Warm-up prompt spoken, starting STT warm-up capture...");
      markSpeechEnded();
      setIsListening(true);
      start();

      warmupTimeoutRef.current = setTimeout(() => {
        warmupPendingRef.current = false;
        warmupTimeoutRef.current = null;
        stop();
        setIsListening(false);
        setThinking(true);

        speak("Thank you. Audio is ready. Starting the viva now.", async () => {
          await new Promise((res) => setTimeout(res, 400));
          startViva();
        });
      }, warmupDurationMs);

    });
  }

  async function handleBegin(cameraPref = false) {

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setCameraEnabled(cameraPref);
    setReadyVisible(false);
    setVivaStarted(true);
    setThinking(true);

    try {
      // Greet the user
      const greeting = `Hello ${candidate.name}, welcome to the Urologics AI Examiner viva. Please wait while we prepare your session.`;
      speak(greeting, async () => {

        console.log('Greeting finished, starting audio check...');

        await new Promise((res) => setTimeout(res, 2000));

        startWarmup();
      });

    } catch (error) {
      console.error('Error in greeting:', error);
      setThinking(false);
    }
  }


  /* --------------------------------------------------
     END VIVA
  -------------------------------------------------- */

  async function endViva() {

    if (ending) return;

    setEnding(true);

    if (warmupTimeoutRef.current) {
      clearTimeout(warmupTimeoutRef.current);
      warmupTimeoutRef.current = null;
    }

    // Save conversation to localStorage
    const stored = localStorage.getItem("candidateInfo");
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.conversation = messages;
      parsed.selectedCaseId = vivaCase.id;
      parsed.selectedCaseTitle = vivaCase.case.title;
      parsed.selectedCase = vivaCase;
      localStorage.setItem("candidateInfo", JSON.stringify(parsed));
    }

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

 

</div>

      {/* BOTTOM BAR - MOBILE RESPONSIVE */}
      <div className="h-12 sm:h-14 md:h-16 flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-6 px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800 overflow-x-auto">

       

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