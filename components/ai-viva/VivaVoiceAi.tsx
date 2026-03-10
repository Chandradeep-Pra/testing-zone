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
  const [isListening, setIsListening] = useState(false);

  const { minutes, seconds } = useCountdown(
    VIVA_DURATION_SEC,
    vivaStarted && !ending
  );

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
      setThinking(true);

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

  async function handleBegin() {

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

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

        setTimeout(() => start(), 50);

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

      {/* TOP BAR */}
     <div className="h-16 px-8 flex items-center justify-between bg-slate-900/60 backdrop-blur-xl border-b border-slate-800">

        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm uppercase tracking-wide text-slate-400">
            Live Viva
          </span>
        </div>

        <div className="text-slate-200 font-medium">
          Urologics AI Examiner
        </div>

        <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-slate-800/70 border border-emerald-500/20 text-lg font-semibold text-emerald-400">
          <Clock size={18} />
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>

      </div>
      <div className={`flex-1 grid gap-4 p-4 h-full min-h-0 ${showChat ? "grid-cols-[3fr_1fr]" : "grid-cols-1"}`}>

  {/* ================================
      AI AREA (75%)
  ================================= */}
  <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">

    <AiPanel
    amplitude={amplitude}
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

            {/* {exhibit.description && (
              <div className="mt-3 text-sm text-slate-300 text-center">
                {exhibit.description}
              </div>
            )} */}

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
      <div className="h-16 flex items-center justify-center gap-6 bg-slate-900/60 backdrop-blur-xl border-t border-slate-800">

        <button
          onClick={() => setShowChat((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          <MessageSquare size={16} />
          {showChat ? "Hide History" : "Show History"}
        </button>

        <button
          onClick={() => setCameraOn((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          {cameraOn ? <CameraOff size={16} /> : <Camera size={16} />}
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>


        <button
          onClick={endViva}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff size={16} />
          End Viva
        </button>

      </div>
    </main>
  );
}