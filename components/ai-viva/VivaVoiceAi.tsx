//@ts-nocheck
"use client";

import { Clock, PhoneOff } from "lucide-react";
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

const VIVA_DURATION_SEC = 10 * 60;

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

  const [readyVisible, setReadyVisible] = useState(true);
  const [ending, setEnding] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);

  const [messages, setMessages] = useState([]);
  const liveCandidateMsgId = useRef(null);

  // whether the conversation history panel is visible
  const [showChat, setShowChat] = useState(false);

  /* ----------------------------------------
     Timer
  ----------------------------------------- */
  const { minutes, seconds } = useCountdown(
    VIVA_DURATION_SEC,
    vivaStarted && !ending,
    endViva
  );

  /* ----------------------------------------
     Candidate state
  ----------------------------------------- */
 
  const [isListening, setIsListening] = useState(false);

  /* ----------------------------------------
     Speech Input
  ----------------------------------------- */
 const { start, stop } = useSpeechInput(

  // INTERIM SPEECH
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

  // FINAL SPEECH
  async (finalText) => {
    if (ending || endingRef.current) return;

    stop();
    setIsListening(false);
    setThinking(true);

    // finalize message
    setMessages((msgs) =>
      msgs.map((m) =>
        m.id === liveCandidateMsgId.current
          ? { ...m, text: finalText, live: false }
          : m
      )
    );

    try {
      const data = await next(finalText);
      if (!data?.question) return;

      // push AI question to timeline
      setMessages((msgs) => [
        ...msgs,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: data.question,
        },
      ]);

      // push image if exists
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

          // create live candidate message
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

  /* ----------------------------------------
     Controlled Start (via overlay)
  ----------------------------------------- */
  async function handleBegin() {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setReadyVisible(false);
    setVivaStarted(true);
    setThinking(true);

   

    try {
      const data = await next("");
      if (!data?.question) return;

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

  setTimeout(() => {
    start();
  }, 50);
});
    } finally {
      setThinking(false);
    }
  }

  /* ----------------------------------------
     END VIVA
  ----------------------------------------- */
  async function endViva() {
    if (endingRef.current) return;

    endingRef.current = true;
    setEnding(true);

    stop();
    setIsListening(false);
    setThinking(true);

    try {
      const data = await next("", true);

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

      {/* TOP BAR */}
     <div className="
  h-16 px-8
  flex items-center justify-between
  bg-slate-900/80 backdrop-blur-md
  border-b border-slate-800
  shadow-sm
">

  {/* LEFT — Session Label */}
  <div className="flex items-center gap-3">
    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
    <span className="text-sm uppercase tracking-wider text-slate-400">
      Live Viva Session
    </span>
  </div>

  {/* CENTER — Title */}
  <div className="text-sm font-medium text-slate-200">
    Urologics AI
  </div>

  {/* RIGHT — Timer + history toggle */}
  <div className="flex items-center gap-2">
    <button
      onClick={() => setShowChat((v) => !v)}
      className="px-2 py-1 bg-slate-800/70 border border-slate-700 rounded text-xs text-slate-200 hover:bg-slate-700 transition"
    >
      {showChat ? "Hide History" : "Show History"}
    </button>

    <div className="
      flex items-center gap-2
      bg-slate-800/70
      border border-emerald-500/20
      px-4 py-2 rounded-full
      text-sm font-medium
      text-emerald-400
    ">
      <Clock size={16} />
      {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  </div>

</div>

      {/* PANELS */}
      {/* <div className="flex flex-1 flex-col md:flex-row p-6 gap-6">
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
                  <div className="mt-3 text-sm text-slate-300 text-center">
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
      </div> */}

      {/* <div className="flex-1 grid grid-cols-[3fr_1fr] gap-4 p-4"> */}
      <div className={`flex-1 grid gap-4 p-4 h-full min-h-0 ${showChat ? "grid-cols-[3fr_1fr]" : "grid-cols-1"}`}>

  {/* ================================
      AI AREA (75%)
  ================================= */}
  <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">

    <AiPanel
      speaking={speaking}
      thinking={thinking}
      exhibit={
        exhibit?.type === "image" ? (
          <div className="relative max-w-3xl mx-auto">
            <img
              src={exhibit.src}
              alt="Viva exhibit"
              className="rounded-xl shadow-xl max-h-[70vh]"
            />

            {exhibit.description && (
              <div className="mt-3 text-sm text-slate-300 text-center">
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

    {/* Candidate Overlay */}
    <div className="absolute top-4 right-4 w-[260px]">
      <CandidatePanel
        speaking={false}
        listening={isListening}
        transcript=""
        onStartTalk={() => {
  if (speaking || ending) return;

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

  setTimeout(() => {
    start();
  }, 50);
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
      <div className="bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden min-h-0">

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 text-sm text-slate-400 flex items-center justify-between">
          <span>Conversation History</span>
          <button
            onClick={() => setShowChat(false)}
            className="text-xs text-slate-400 hover:text-slate-200"
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

      {/* BOTTOM BAR */}
      <div className="h-16 border-t border-slate-800 px-8 flex items-center justify-between">
        <span className="text-slate-400 text-sm">
          🎙 Voice session active
        </span>

        <button
          onClick={endViva}
          className="bg-red-600 p-3 rounded-full hover:bg-red-700 transition"
        >
          <PhoneOff size={18} />
        </button>

        <span className="text-slate-400 text-sm">
          Secure Session
        </span>
      </div>
    </main>
  );
}