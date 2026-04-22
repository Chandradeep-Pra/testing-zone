//@ts-nocheck
"use client";

import { Clock, PhoneOff, Camera, CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CandidatePanel } from "./CandidatePanel";
import { AiPanel } from "./AiPanel";
import { useVivaSession } from "./useVivaSession";
import { useSpeechOutput } from "./useSpeechOutput";
import { useSpeechInput } from "./useSpeechInput";
import { useVivaEngine } from "./useVivaEngine";
import ReadyOverlay from "./ReadyOverlay";
import { useCountdown } from "./useCountdown";
import ChatTimeline from "./ChatTimeline";

import type { VivaCaseRecord } from "@/lib/viva-case";

type VivaMode = "calm" | "fast";

function buildConversationFromQaHistory(history) {
  return history.flatMap((item) => {
    const entries = [];

    if (item.question?.trim()) {
      entries.push({
        id: crypto.randomUUID(),
        role: "ai",
        text: item.question.trim(),
      });
    }

    if (item.answer?.trim()) {
      entries.push({
        id: crypto.randomUUID(),
        role: "candidate",
        text: item.answer.trim(),
        live: false,
      });
    }

    return entries;
  });
}

export default function VivaVoiceAi({
  vivaCase,
  selectedMode = "calm",
}: {
  vivaCase: VivaCaseRecord;
  selectedMode?: VivaMode;
}) {
  const warmupPrompt =
    "Before we begin, please say your full name and tell me in one short sentence how you are feeling today. This is only an audio check and will not be scored.";
  const warmupDurationMs = 5000;
  const fastAnswerWindowSec = 10;
  const isFastMode = selectedMode === "fast";

  const [candidate, setCandidate] = useState({ name: "", email: "" });
  const {
    generateScore,
    next,
    doesAnswerMatchCurrentFastQuestion,
    getCurrentFastQuestionKeywordProgress,
    getHistory,
  } = useVivaEngine(vivaCase, selectedMode);

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
  const fillerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerIndexRef = useRef(0);
  const liveCandidateMsgId = useRef<string | null>(null);
  const advanceLockRef = useRef(false);
  const keywordFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef([]);

  const [readyVisible, setReadyVisible] = useState(true);
  const [ending, setEnding] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [questionTurn, setQuestionTurn] = useState(0);
  const [keywordDetected, setKeywordDetected] = useState(false);
  const [candidateTranscript, setCandidateTranscript] = useState("");

  const vivaDurationSec = vivaCase.viva_rules.max_duration_minutes * 60;
  const countdownRunning = vivaStarted && !ending && (isFastMode ? isListening : true);
  const countdownTotal = isFastMode ? fastAnswerWindowSec : vivaDurationSec;

  const { minutes, seconds } = useCountdown(
    countdownTotal,
    countdownRunning,
    () => {
      if (
        isFastMode &&
        !endingRef.current &&
        !advanceLockRef.current &&
        vivaStarted &&
        isListening
      ) {
        void submitCurrentAnswer(getTranscriptBuffer());
      }
    },
    isFastMode ? questionTurn : vivaDurationSec
  );

  const fillers = [
    "Okay, let us continue further",
    "Let us move on to the next question",
    "Let us continue further with the same case",
    "That is alright, let us continue",
    "",
  ];

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function flashKeywordDetected() {
    setKeywordDetected(true);

    if (keywordFlashTimeoutRef.current) {
      clearTimeout(keywordFlashTimeoutRef.current);
    }

    keywordFlashTimeoutRef.current = setTimeout(() => {
      setKeywordDetected(false);
      keywordFlashTimeoutRef.current = null;
    }, 700);
  }

  const {
    start,
    stop,
    closeSocket,
    getTranscriptBuffer,
    resetTranscriptBuffer,
  } = useSpeechInput(
    (interim) => {
      if (ending) return;

      setCandidateTranscript(interim);

      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === liveCandidateMsgId.current ? { ...m, text: interim } : m
        )
      );

      if (
        isFastMode &&
        vivaStarted &&
        !advanceLockRef.current &&
        getCurrentFastQuestionKeywordProgress(interim).allMatched
      ) {
        flashKeywordDetected();
        void submitCurrentAnswer(interim);
      }
    },

    async (finalText) => {
      if (ending || endingRef.current || advanceLockRef.current) return;

      if (warmupPendingRef.current) {
        return;
      }

      setCandidateTranscript(finalText);

      if (
        isFastMode &&
        vivaStarted &&
        getCurrentFastQuestionKeywordProgress(finalText).allMatched
      ) {
        flashKeywordDetected();
      }

      await submitCurrentAnswer(finalText);
    }
  );

  useEffect(() => {
    if (isFastMode || !vivaStarted || ending) return;

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
  }, [isFastMode, minutes, seconds, vivaStarted, ending]);

  useEffect(() => {
    return () => {
      if (warmupTimeoutRef.current) {
        clearTimeout(warmupTimeoutRef.current);
      }
      if (fillerTimeoutRef.current) {
        clearTimeout(fillerTimeoutRef.current);
      }
      if (keywordFlashTimeoutRef.current) {
        clearTimeout(keywordFlashTimeoutRef.current);
      }
      closeSocket();
      stop();
    };
  }, []);

  function syncCandidateMessage(text: string, live = false) {
    if (!liveCandidateMsgId.current) {
      return;
    }

    setMessages((msgs) =>
      msgs.map((m) =>
        m.id === liveCandidateMsgId.current ? { ...m, text, live } : m
      )
    );
  }

  function beginListeningForAnswer() {
    if (endingRef.current) {
      return;
    }

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

    resetTranscriptBuffer();
    advanceLockRef.current = false;
    setCandidateTranscript("");
    setIsListening(true);
    void start();
  }

  async function askNextQuestion(userAnswer: string) {
    const data = await next(userAnswer);

    if (fillerTimeoutRef.current) {
      clearTimeout(fillerTimeoutRef.current);
      fillerTimeoutRef.current = null;
    }

    if (data?.exit) {
      await endViva();
      return;
    }

    if (!data?.question) {
      return;
    }

    setMessages((msgs) => [
      ...msgs,
      {
        id: crypto.randomUUID(),
        role: "ai",
        text: data.question,
      },
    ]);

    applyApiResponse(data);
    setQuestionTurn((turn) => turn + 1);

    speak(data.question, () => {
      markSpeechEnded();
      if (isFastMode && data.imageUsed) {
        clearExhibit();
      }
      beginListeningForAnswer();
    });
  }

  async function submitCurrentAnswer(answerText: string) {
    if (ending || endingRef.current || advanceLockRef.current) {
      return;
    }

    advanceLockRef.current = true;
    stop();
    setIsListening(false);

    const finalAnswer = (answerText || getTranscriptBuffer() || "").trim();
    resetTranscriptBuffer();
    setCandidateTranscript(finalAnswer);
    syncCandidateMessage(finalAnswer, false);

    if (!isFastMode) {
      setThinking(true);

      fillerTimeoutRef.current = setTimeout(() => {
        if (endingRef.current) return;
        const filler = fillers[fillerIndexRef.current % fillers.length];
        fillerIndexRef.current += 1;
        speak(filler);
      }, 1200);
    } else {
      setThinking(true);
    }

    try {
      await askNextQuestion(finalAnswer);
    } finally {
      setThinking(false);
      advanceLockRef.current = false;
    }
  }

  async function startViva() {
    try {
      const data = await next("");

      if (!data?.question) {
        return;
      }

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: data.question,
        },
      ]);

      applyApiResponse(data);
      setQuestionTurn(1);

      speak(data.question, () => {
        setVivaStarted(true);
        markSpeechEnded();
        setThinking(false);
        beginListeningForAnswer();
      });
    } catch (error) {
      console.error("Error starting viva:", error);
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
      markSpeechEnded();
      setIsListening(true);
      void start();

      warmupTimeoutRef.current = setTimeout(() => {
        warmupPendingRef.current = false;
        warmupTimeoutRef.current = null;
        stop();
        resetTranscriptBuffer();
        setIsListening(false);
        setThinking(true);

        speak("Thank you. Audio is ready. Starting the viva now.", async () => {
          await new Promise((res) => setTimeout(res, 400));
          await startViva();
        });
      }, warmupDurationMs);
    });
  }

  async function handleBegin(cameraPref = false) {
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;
    setCameraEnabled(cameraPref);
    setReadyVisible(false);
    setThinking(true);

    try {
      const greeting = `Hello ${candidate.name}, welcome to the Urologics AI Examiner viva. Please wait while we prepare your session.`;
      speak(greeting, async () => {
        await new Promise((res) => setTimeout(res, 2000));
        startWarmup();
      });
    } catch (error) {
      console.error("Error in greeting:", error);
      setThinking(false);
    }
  }

  async function endViva() {
    if (ending) return;

    endingRef.current = true;
    advanceLockRef.current = true;
    setEnding(true);
    setIsListening(false);
    stop();
    closeSocket();

    if (warmupTimeoutRef.current) {
      clearTimeout(warmupTimeoutRef.current);
      warmupTimeoutRef.current = null;
    }

    if (fillerTimeoutRef.current) {
      clearTimeout(fillerTimeoutRef.current);
      fillerTimeoutRef.current = null;
    }

    if (keywordFlashTimeoutRef.current) {
      clearTimeout(keywordFlashTimeoutRef.current);
      keywordFlashTimeoutRef.current = null;
    }

    const stored = localStorage.getItem("candidateInfo");
    if (stored) {
      const parsed = JSON.parse(stored);
      const qaHistory = getHistory();
      parsed.qaHistory = qaHistory;
      parsed.conversation =
        messagesRef.current.length > 0
          ? messagesRef.current
          : buildConversationFromQaHistory(qaHistory);
      parsed.selectedCaseId = vivaCase.id;
      parsed.selectedCaseTitle = vivaCase.case.title;
      parsed.selectedCase = vivaCase;
      parsed.selectedMode = selectedMode;
      localStorage.setItem("candidateInfo", JSON.stringify(parsed));
    }

    await generateScore();
  }

  return (
    <main className="h-screen bg-slate-950 text-slate-100 flex flex-col w-full relative">
      {readyVisible && <ReadyOverlay onBegin={handleBegin} />}

      {ending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 rounded-full border-4 border-white border-t-transparent animate-spin mx-auto" />
            <p className="text-lg font-medium">Generating Final Score...</p>
            <p className="text-sm text-slate-400">Please wait while evaluation completes</p>
          </div>
        </div>
      )}

      <div className="h-12 sm:h-14 md:h-16 px-2 sm:px-4 md:px-8 flex items-center justify-between bg-slate-900/60 backdrop-blur-xl border-b border-slate-800">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
          <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-xs md:text-sm uppercase tracking-wide text-slate-400 hidden sm:inline white-space-nowrap">
            {isFastMode ? "Fast and Furious" : "Live Viva"}
          </span>
        </div>

        <div className="text-slate-200 font-medium text-xs sm:text-sm md:text-base hidden md:block flex-1 text-center px-2">
          Urologics AI Examiner
        </div>

        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 rounded-full bg-slate-800/70 border border-emerald-500/20 text-xs sm:text-sm md:text-base font-semibold text-emerald-400 flex-shrink-0">
          <Clock size={12} className="sm:h-4 sm:w-4 md:h-[18px] md:w-[18px]" />
          <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 h-full min-h-0">
        <div className="relative bg-slate-950 border border-slate-800 rounded-lg md:rounded-xl overflow-hidden flex-1 min-h-0">
          <AiPanel
            amplitude={amplitude}
            speaking={speaking}
            thinking={thinking}
            transcript={transcript}
            keywordDetected={keywordDetected}
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

          <div className="absolute top-1.5 right-1.5 md:top-4 md:right-4 w-20 md:w-[260px] h-24 md:h-auto aspect-video md:aspect-auto">
            <CandidatePanel
              cameraOn={cameraOn}
              listening={isListening}
              transcript={candidateTranscript}
            />
          </div>
        </div>

        {/* <div className="h-40 md:h-56 rounded-lg md:rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <ChatTimeline messages={messages} />
        </div> */}
      </div>

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
