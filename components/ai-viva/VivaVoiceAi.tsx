"use client";

import { Clock, PhoneOff, Camera, CameraOff, Sparkles, ShieldCheck, History, X } from "lucide-react";
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
import { useLiveAvatar } from "./useLiveAvatar";

import UrologicsBrand from "@/components/brand/UrologicsBrand";
import { getDefaultExaminer, type ExaminerVoice } from "@/lib/examiner-voices";
import type { VivaCaseRecord } from "@/lib/viva-case";

type VivaMode = "calm" | "fast";
type QaHistoryItem = { question?: string; answer?: string };
type CandidateConversationMessage =
  | {
      id: string;
      role: "ai" | "candidate";
      text: string;
      live?: boolean;
    }
  | {
      id: string;
      role: "image";
      src: string;
      description?: string;
    };
type FastPauseState = "idle" | "monitoring" | "detected";
type StoredCandidateInfo = {
  name?: string;
  email?: string;
  selectedExaminer?: ExaminerVoice;
  selectedExaminerId?: string;
  conversation?: CandidateConversationMessage[];
  qaHistory?: QaHistoryItem[];
  selectedCaseId?: string;
  selectedCaseTitle?: string;
  selectedCase?: VivaCaseRecord;
  selectedMode?: VivaMode;
};

function buildConversationFromQaHistory(history: QaHistoryItem[]) {
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
  const warmupDurationMs = 5000;
  const fastModeTotalDurationSec = 10 * 60;
  const isFastMode = selectedMode === "fast";

  const [candidate, setCandidate] = useState({ name: "", email: "" });
  const warmupPrompt = `Hi ${candidate.name || "there"}, how are you feeling today?`;
  const [selectedExaminer, setSelectedExaminer] = useState<ExaminerVoice>(
    getDefaultExaminer(selectedMode)
  );
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
      const parsed = JSON.parse(stored) as StoredCandidateInfo;
      setCandidate({
        name: parsed.name || "",
        email: parsed.email || "",
      });
      if (parsed.selectedExaminer) {
        setSelectedExaminer(parsed.selectedExaminer);
      }
      if (Array.isArray(parsed.conversation)) {
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
  const liveAvatar = useLiveAvatar();
  const examinerSpeaking = speaking || liveAvatar.isSpeaking;
  const avatarSessionActiveRef = useRef(false);

  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);
  const warmupPendingRef = useRef(false);
  const warmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerIndexRef = useRef(0);
  const liveCandidateMsgId = useRef<string | null>(null);
  const advanceLockRef = useRef(false);
  const keywordFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerPrefixRef = useRef("");
  const messagesRef = useRef<CandidateConversationMessage[]>([]);

  const [readyVisible, setReadyVisible] = useState(true);
  const [ending, setEnding] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);
  const [messages, setMessages] = useState<CandidateConversationMessage[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [keywordDetected, setKeywordDetected] = useState(false);
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [fastPauseState, setFastPauseState] = useState<FastPauseState>("idle");
  const [fastTimerStarted, setFastTimerStarted] = useState(false);
  const [fastTimerResetKey, setFastTimerResetKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fastKeywordProgress = isFastMode
    ? getCurrentFastQuestionKeywordProgress(candidateTranscript)
    : { matchedKeywords: [], totalKeywords: 0, allMatched: false };

  const vivaDurationSec = vivaCase.viva_rules.max_duration_minutes * 60;
  const countdownRunning = (isFastMode ? fastTimerStarted : vivaStarted) && !ending;
  const countdownTotal = isFastMode ? fastModeTotalDurationSec : vivaDurationSec;

  function getExaminerSpeechOptions() {
    return {
      voiceName: selectedExaminer.voiceName,
      languageCode: selectedExaminer.languageCode,
    };
  }

  async function setAvatarListening(listening: boolean) {
    if (!avatarSessionActiveRef.current) {
      return;
    }

    try {
      if (listening) {
        await liveAvatar.startListening();
      } else {
        await liveAvatar.stopListening();
      }
    } catch (err) {
      console.error("LiveAvatar listening state update failed:", err);
    }
  }

  async function speakAsExaminer(text: string, onEnd?: () => void) {
    if (avatarSessionActiveRef.current) {
      try {
        await liveAvatar.stopListening();
        await liveAvatar.interrupt();
        await liveAvatar.speakText(text, onEnd);
        return;
      } catch (err) {
        console.error("LiveAvatar speak failed:", err);
        // Fall back to local TTS on failure
      }
    }

    return speak(text, onEnd, getExaminerSpeechOptions());
  }

  function clearFastSilencePromptTimer() {
    setFastPauseState((current) => (current === "detected" ? "idle" : current));
  }

  function mergeWithAnswerPrefix(value: string) {
    return [answerPrefixRef.current, value].filter(Boolean).join(" ").trim();
  }

  const { minutes, seconds } = useCountdown(
    countdownTotal,
    countdownRunning,
    () => {
      if (endingRef.current || advanceLockRef.current) {
        return;
      }

      if (isFastMode) {
        void concludeVivaFromTimer();
      }
    },
    isFastMode ? `fast-total-timer-${fastTimerResetKey}` : vivaDurationSec
  );

  const fillers = [
    "Okay, let us continue further",
    "Let us move on to the next question",
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

  function beginListeningForAnswer(
    existingText = "",
    reuseCurrentMessage = false
  ) {
    if (endingRef.current) {
      return;
    }

    clearFastSilencePromptTimer();
    setFastPauseState("idle");
    answerPrefixRef.current = existingText.trim();

    if (!reuseCurrentMessage || !liveCandidateMsgId.current) {
      const id = crypto.randomUUID();
      liveCandidateMsgId.current = id;

      setMessages((msgs) => [
        ...msgs,
        {
          id,
          role: "candidate",
          text: answerPrefixRef.current,
          live: true,
        },
      ]);
    } else {
      syncCandidateMessage(answerPrefixRef.current, true);
    }

    resetTranscriptBuffer();
    advanceLockRef.current = false;
    setCandidateTranscript(answerPrefixRef.current);
    setIsListening(true);
    void setAvatarListening(true);
    void start();
  }

  function handleFastSpeechPause(answerText: string) {
    const latestAnswer = answerText.trim();

    if (
      !isFastMode ||
      !vivaStarted ||
      endingRef.current ||
      advanceLockRef.current ||
      !latestAnswer ||
      doesAnswerMatchCurrentFastQuestion(latestAnswer)
    ) {
      return;
    }

    setFastPauseState("detected");
    void submitCurrentAnswer(latestAnswer);
  }

  function tryAdvanceFastMode(answerText: string) {
    if (
      !isFastMode ||
      !vivaStarted ||
      endingRef.current ||
      advanceLockRef.current
    ) {
      return false;
    }

    if (!doesAnswerMatchCurrentFastQuestion(answerText)) {
      return false;
    }

    flashKeywordDetected();
    clearFastSilencePromptTimer();
    void submitCurrentAnswer(answerText);
    return true;
  }

  async function finalizeFastModeFromTranscriptFallback() {
    if (
      !isFastMode ||
      ending ||
      endingRef.current ||
      advanceLockRef.current ||
      warmupPendingRef.current
    ) {
      return;
    }

    const fallbackText = mergeWithAnswerPrefix(
      getTranscriptBuffer() || candidateTranscript || answerPrefixRef.current
    ).trim();

    if (!fallbackText) {
      return;
    }

    setCandidateTranscript(fallbackText);

    if (tryAdvanceFastMode(fallbackText)) {
      return;
    }

    answerPrefixRef.current = fallbackText;
    syncCandidateMessage(fallbackText, false);
    handleFastSpeechPause(fallbackText);
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

      const combinedInterim = mergeWithAnswerPrefix(interim);

      setCandidateTranscript(combinedInterim);

      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === liveCandidateMsgId.current ? { ...m, text: combinedInterim } : m
        )
      );

      if (!tryAdvanceFastMode(combinedInterim)) {
        setFastPauseState(combinedInterim.trim() ? "monitoring" : "idle");
      }
    },

    async (finalText) => {
      if (ending || endingRef.current || advanceLockRef.current) return;

      if (warmupPendingRef.current) {
        return;
      }

      const combinedFinalText = mergeWithAnswerPrefix(finalText);
      setCandidateTranscript(combinedFinalText);

      if (isFastMode) {
        if (tryAdvanceFastMode(combinedFinalText)) {
          return;
        }

        answerPrefixRef.current = combinedFinalText;
        syncCandidateMessage(combinedFinalText, false);
        handleFastSpeechPause(combinedFinalText);
        return;
      }

      await submitCurrentAnswer(combinedFinalText);
    },
    async () => {
      await finalizeFastModeFromTranscriptFallback();
    }
  );

  useEffect(() => {
    if (isFastMode || !vivaStarted || ending) return;

    const remaining = minutes * 60 + seconds;

    if (remaining === 20 && !endingRef.current) {
      endingRef.current = true;

      speakAsExaminer(
        "Thank you. We are concluding the viva now. Generating your score.",
        async () => {
          await endViva();
        }
      );
    }
  }, [isFastMode, minutes, seconds, vivaStarted, ending]);

  useEffect(() => {
    if (
      !isFastMode ||
      !vivaStarted ||
      ending ||
      endingRef.current ||
      advanceLockRef.current ||
      !fastKeywordProgress.allMatched
    ) {
      return;
    }

    flashKeywordDetected();
    clearFastSilencePromptTimer();
    void submitCurrentAnswer(
      mergeWithAnswerPrefix(getTranscriptBuffer() || candidateTranscript || answerPrefixRef.current)
    );
  }, [
    isFastMode,
    vivaStarted,
    ending,
    fastKeywordProgress.allMatched,
    candidateTranscript,
  ]);

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
      clearFastSilencePromptTimer();
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
    const question = data.question;

    setMessages((msgs) => [
      ...msgs,
      {
        id: crypto.randomUUID(),
        role: "ai",
        text: question,
      },
      ...(data.imageUsed && data.imageLink
        ? [
            {
              id: crypto.randomUUID(),
              role: "image" as const,
              src: data.imageLink,
              description: data.imageDescription || undefined,
            },
          ]
        : []),
    ]);

    setThinking(false);
    applyApiResponse(data);
    speakAsExaminer(question, () => {
      markSpeechEnded();
      beginListeningForAnswer();
    });
  }

  async function concludeVivaFromTimer() {
    if (endingRef.current || advanceLockRef.current) {
      return;
    }

    advanceLockRef.current = true;
    stop();
    setIsListening(false);
    void setAvatarListening(false);
    clearFastSilencePromptTimer();
    setFastPauseState("idle");

    const finalAnswer = mergeWithAnswerPrefix(
      getTranscriptBuffer() || candidateTranscript || answerPrefixRef.current
    ).trim();

    answerPrefixRef.current = "";
    resetTranscriptBuffer();
    setCandidateTranscript(finalAnswer);
    syncCandidateMessage(finalAnswer, false);

    try {
      await next(finalAnswer, true);
    } catch (error) {
      console.error("Error concluding viva on timer:", error);
    }

    speakAsExaminer("Time is up. We are concluding the viva now.", async () => {
      await endViva();
    });
  }

  async function submitCurrentAnswer(answerText: string) {
    if (ending || endingRef.current || advanceLockRef.current) {
      return;
    }

    advanceLockRef.current = true;
    clearFastSilencePromptTimer();
    setFastPauseState("idle");
    stop();
    setIsListening(false);
    void setAvatarListening(false);

    const finalAnswer = (
      answerText?.trim() ? answerText : mergeWithAnswerPrefix(getTranscriptBuffer() || "")
    ).trim();
    answerPrefixRef.current = "";
    resetTranscriptBuffer();
    setCandidateTranscript(finalAnswer);
    syncCandidateMessage(finalAnswer, false);

    if (!isFastMode) {
      setThinking(true);

      fillerTimeoutRef.current = setTimeout(() => {
        if (endingRef.current) return;
        const filler = fillers[fillerIndexRef.current % fillers.length];
        fillerIndexRef.current += 1;
        speakAsExaminer(filler);
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
      if (isFastMode) {
        setFastTimerStarted(false);
        setFastTimerResetKey((value) => value + 1);
      }

      const data = await next("");

      if (!data?.question) {
        return;
      }
      const question = data.question;

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: question,
        },
        ...(data.imageUsed && data.imageLink
          ? [
              {
                id: crypto.randomUUID(),
                role: "image" as const,
                src: data.imageLink,
                description: data.imageDescription || undefined,
              },
            ]
          : []),
      ]);

      setThinking(false);
      applyApiResponse(data);
      setVivaStarted(true);
      if (isFastMode) {
        setFastTimerStarted(true);
      }
      speakAsExaminer(question, () => {
        markSpeechEnded();
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

    speakAsExaminer(warmupPrompt, () => {
      markSpeechEnded();
      setIsListening(true);
      void setAvatarListening(true);
      void start();

      warmupTimeoutRef.current = setTimeout(() => {
        warmupPendingRef.current = false;
        warmupTimeoutRef.current = null;
        stop();
        resetTranscriptBuffer();
        setIsListening(false);
        void setAvatarListening(false);
        setThinking(true);

        speakAsExaminer("Thank you. Let us begin.", async () => {
          await new Promise((res) => setTimeout(res, 400));
          await startViva();
        });
      }, warmupDurationMs);
    });
  }

  async function handleBegin(
    cameraPref = false,
    examinerChoice: ExaminerVoice = getDefaultExaminer(selectedMode)
  ) {
    if (hasStartedRef.current) return;

    hasStartedRef.current = true;
    setCameraEnabled(cameraPref);
    setReadyVisible(false);
    setThinking(true);

    try {
      const greeting = `Hello ${candidate.name}, welcome to the Urologics AI Examiner viva. Please wait while we prepare your session.`;
      setSelectedExaminer(examinerChoice);
      const stored = localStorage.getItem("candidateInfo");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.selectedExaminer = examinerChoice;
        parsed.selectedExaminerId = examinerChoice.id;
        localStorage.setItem("candidateInfo", JSON.stringify(parsed));
      }
      const avatarStarted = await liveAvatar.startSession();
      avatarSessionActiveRef.current = avatarStarted;
      if (!avatarStarted) {
        console.warn("LiveAvatar session did not become ready. Falling back to TTS.", liveAvatar.error);
      } else {
        await liveAvatar.interrupt();
        await liveAvatar.startListening();
      }
      await speakAsExaminer(greeting, async () => {
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
    void setAvatarListening(false);
    await liveAvatar.stopSession();
    avatarSessionActiveRef.current = false;

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
    clearFastSilencePromptTimer();
    setFastPauseState("idle");
    setFastTimerStarted(false);

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
      parsed.selectedExaminer = selectedExaminer;
      parsed.selectedExaminerId = selectedExaminer.id;
      localStorage.setItem("candidateInfo", JSON.stringify(parsed));
    }

    await generateScore();
  }

  return (
    <main className="h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_38%,_#020617_100%)] text-slate-100 flex flex-col relative overflow-hidden">
      {readyVisible && (
        <ReadyOverlay
          onBegin={handleBegin}
          vivaTitle={vivaCase.case.title}
          selectedMode={selectedMode}
        />
      )}

      {ending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 rounded-full border-4 border-white border-t-transparent animate-spin mx-auto" />
            <p className="text-lg font-medium">Generating Final Score...</p>
            <p className="text-sm text-slate-400">Please wait while evaluation completes</p>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="pointer-events-none absolute bottom-[64px] right-0 top-[73px] z-40 flex w-full justify-end sm:bottom-[68px] md:top-[77px]">
          <div className="pointer-events-auto flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-slate-950/95 shadow-[0_28px_90px_rgba(2,6,23,0.62)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                  Question History
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  Questions asked by the examiner
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-200 transition hover:bg-white/[0.1]"
                aria-label="Close history"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatTimeline messages={messages} />
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-white/10 bg-slate-950/70 px-3 py-3 backdrop-blur-xl sm:px-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden sm:block">
              <UrologicsBrand compact product="AI Viva" tag={vivaCase.case.title} />
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 sm:hidden">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Urologics Session
              </div>
              <div className="truncate text-sm font-semibold text-slate-100 md:text-base">
                {selectedExaminer.name} · {selectedExaminer.title}
              </div>
            </div>
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
              {vivaCase.case.title}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-400">
            {isFastMode ? "Fast and Furious" : "Live Viva"}
            </span>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-300">
              <Clock size={14} />
              <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-3 sm:p-4 md:p-5">
        <div className="h-full min-h-0">
          <div className="relative h-full min-h-0 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
          <AiPanel
            amplitude={amplitude}
            speaking={examinerSpeaking}
            thinking={thinking}
            transcript={transcript}
            keywordDetected={keywordDetected}
            avatarVideo={
              liveAvatar.isReady ? (
                <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.28),_rgba(2,6,23,0.96))]">
                  <video
                    ref={liveAvatar.videoElementRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <div
                    ref={liveAvatar.audioContainerRef}
                    className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
                  />
                  {!examinerSpeaking && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.08),_rgba(2,6,23,0.42))]" />
                  )}
                </div>
              ) : null
            }
            exhibit={
                exhibit?.type === "image" ? (
                  <div className="relative mx-auto flex h-full max-w-full items-center justify-center md:max-w-3xl">
                    <img
                      src={exhibit.src}
                      alt="Viva exhibit"
                      className="max-h-[60vh] w-auto rounded-2xl shadow-xl md:max-h-[70vh]"
                    />

                    <button
                      onClick={clearExhibit}
                      className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white transition-colors hover:bg-black/90 md:right-3 md:top-3"
                    >
                      Close
                    </button>
                  </div>
                ) : null
              }
            />

            {/* <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
              <Sparkles size={13} className="text-emerald-300" />
              <span>{selectedExaminer.personality}</span>
            </div> */}

          

            <div className="absolute right-2 top-2 h-24 w-20 overflow-hidden rounded-2xl md:right-4 md:top-4 md:h-auto md:w-[260px] md:aspect-video">
              <CandidatePanel
                cameraOn={cameraOn}
                listening={isListening}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-slate-950/70 px-3 py-3 backdrop-blur-xl sm:gap-3 md:gap-6">
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
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full border border-slate-700 bg-slate-800 transition-colors text-xs sm:text-sm whitespace-nowrap flex-shrink-0 hover:bg-slate-700"
          title="Show question history"
        >
          <History size={14} className="sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Show History</span>
          <span className="inline sm:hidden">History</span>
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
