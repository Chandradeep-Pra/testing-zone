"use client";

import { Clock, PhoneOff, Camera, CameraOff, Sparkles, UserRound, ShieldCheck } from "lucide-react";
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

import { getDefaultExaminer, type ExaminerVoice } from "@/lib/examiner-voices";
import type { VivaCaseRecord } from "@/lib/viva-case";

type VivaMode = "calm" | "fast";
type QaHistoryItem = { question?: string; answer?: string };
type CandidateConversationMessage = {
  id: string;
  role: "ai" | "candidate";
  text: string;
  live?: boolean;
};
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
  const warmupPrompt =
    "Before we begin, for the audio check please state your full name and how you are feeling today. This will not be scored.";
  const warmupDurationMs = 5000;
  const fastModeTotalDurationSec = 10 * 60;
  const fastSilencePromptDelayMs = 2000;
  const isFastMode = selectedMode === "fast";

  const [candidate, setCandidate] = useState({ name: "", email: "" });
  const [selectedExaminer, setSelectedExaminer] = useState<ExaminerVoice>(
    getDefaultExaminer(selectedMode)
  );
  const {
    generateScore,
    next,
    doesAnswerMatchCurrentFastQuestion,
    getCurrentFastQuestion,
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

  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);
  const warmupPendingRef = useRef(false);
  const warmupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillerIndexRef = useRef(0);
  const liveCandidateMsgId = useRef<string | null>(null);
  const advanceLockRef = useRef(false);
  const keywordFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fastSilencePromptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerPrefixRef = useRef("");
  const awaitingFastModeConfirmationRef = useRef(false);
  const fastPromptAskedRef = useRef(false);
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

  const currentFastQuestion = isFastMode ? getCurrentFastQuestion() : null;
  const fastKeywordProgress = isFastMode
    ? getCurrentFastQuestionKeywordProgress(candidateTranscript)
    : { matchedKeywords: [], totalKeywords: 0, allMatched: false };

  const vivaDurationSec = vivaCase.viva_rules.max_duration_minutes * 60;
  const countdownRunning = vivaStarted && !ending;
  const countdownTotal = isFastMode ? fastModeTotalDurationSec : vivaDurationSec;

  function getExaminerSpeechOptions() {
    return {
      voiceName: selectedExaminer.voiceName,
      languageCode: selectedExaminer.languageCode,
    };
  }

  function speakAsExaminer(text: string, onEnd?: () => void) {
    return speak(text, onEnd, getExaminerSpeechOptions());
  }

  function clearFastSilencePromptTimer() {
    if (fastSilencePromptTimeoutRef.current) {
      clearTimeout(fastSilencePromptTimeoutRef.current);
      fastSilencePromptTimeoutRef.current = null;
    }
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
        advanceLockRef.current = true;
        stop();
        setIsListening(false);
        clearFastSilencePromptTimer();
        speakAsExaminer("Time is up. We are concluding the viva now.", async () => {
          await endViva();
        });
      }
    },
    isFastMode ? "fast-total-timer" : vivaDurationSec
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

  function beginListeningForConfirmation() {
    if (endingRef.current) {
      return;
    }

    liveCandidateMsgId.current = null;
    resetTranscriptBuffer();
    setCandidateTranscript("");
    setIsListening(true);
    void start();
  }

  function beginListeningForAnswer(
    existingText = "",
    reuseCurrentMessage = false
  ) {
    if (endingRef.current) {
      return;
    }

    awaitingFastModeConfirmationRef.current = false;
    clearFastSilencePromptTimer();
    answerPrefixRef.current = existingText.trim();
    if (!reuseCurrentMessage) {
      fastPromptAskedRef.current = false;
    }

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
    void start();
  }

  function promptForFastModeContinuation(answerText: string) {
    if (
      !isFastMode ||
      !vivaStarted ||
      endingRef.current ||
      advanceLockRef.current ||
      awaitingFastModeConfirmationRef.current
    ) {
      return;
    }

    const normalizedAnswer = answerText.trim();
    if (!normalizedAnswer || doesAnswerMatchCurrentFastQuestion(normalizedAnswer)) {
      return;
    }

    clearFastSilencePromptTimer();

    fastSilencePromptTimeoutRef.current = setTimeout(() => {
      const latestAnswer = mergeWithAnswerPrefix(getTranscriptBuffer()) || normalizedAnswer;

      if (
        endingRef.current ||
        advanceLockRef.current ||
        awaitingFastModeConfirmationRef.current ||
        !latestAnswer ||
        doesAnswerMatchCurrentFastQuestion(latestAnswer)
      ) {
        return;
      }

      if (fastPromptAskedRef.current) {
        void submitCurrentAnswer(latestAnswer);
        return;
      }

      fastPromptAskedRef.current = true;
      awaitingFastModeConfirmationRef.current = true;
      answerPrefixRef.current = latestAnswer;
      stop();
      setIsListening(false);
      resetTranscriptBuffer();
      syncCandidateMessage(latestAnswer, false);
      setCandidateTranscript(latestAnswer);

      speakAsExaminer("Do you want to add anything else to your answer?", () => {
        beginListeningForConfirmation();
      });
    }, fastSilencePromptDelayMs);
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

  const {
    start,
    stop,
    closeSocket,
    getTranscriptBuffer,
    resetTranscriptBuffer,
  } = useSpeechInput(
    (interim) => {
      if (ending) return;

      if (awaitingFastModeConfirmationRef.current) {
        setCandidateTranscript(interim);
        return;
      }

      const combinedInterim = mergeWithAnswerPrefix(interim);

      setCandidateTranscript(combinedInterim);

      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === liveCandidateMsgId.current ? { ...m, text: combinedInterim } : m
        )
      );

      if (!tryAdvanceFastMode(combinedInterim)) {
        promptForFastModeContinuation(combinedInterim);
      }
    },

    async (finalText) => {
      if (ending || endingRef.current || advanceLockRef.current) return;

      if (warmupPendingRef.current) {
        return;
      }

      if (awaitingFastModeConfirmationRef.current) {
        const normalized = finalText.toLowerCase();
        awaitingFastModeConfirmationRef.current = false;

        if (/\b(yes|yeah|yep|sure|okay|ok|continue)\b/.test(normalized)) {
          beginListeningForAnswer(answerPrefixRef.current, true);
          return;
        }

        if (/\b(no|nope|nah|move on|next)\b/.test(normalized)) {
          await submitCurrentAnswer(answerPrefixRef.current);
          return;
        }

        await submitCurrentAnswer(answerPrefixRef.current);
        return;
      }

      const combinedFinalText = mergeWithAnswerPrefix(finalText);
      setCandidateTranscript(combinedFinalText);

      if (isFastMode) {
        if (tryAdvanceFastMode(combinedFinalText)) {
          return;
        }

        answerPrefixRef.current = combinedFinalText;
        syncCandidateMessage(combinedFinalText, true);
        promptForFastModeContinuation(combinedFinalText);
        return;
      }

      await submitCurrentAnswer(combinedFinalText);
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
    ]);

    setThinking(false);
    applyApiResponse(data);
    speakAsExaminer(question, () => {
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
    clearFastSilencePromptTimer();
    awaitingFastModeConfirmationRef.current = false;
    stop();
    setIsListening(false);

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
      ]);

      setThinking(false);
      applyApiResponse(data);
      speakAsExaminer(question, () => {
        setVivaStarted(true);
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
      void start();

      warmupTimeoutRef.current = setTimeout(() => {
        warmupPendingRef.current = false;
        warmupTimeoutRef.current = null;
        stop();
        resetTranscriptBuffer();
        setIsListening(false);
        setThinking(true);

        speakAsExaminer("Thank you. Audio is ready. Starting the viva now.", async () => {
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
      speak(greeting, async () => {
        await new Promise((res) => setTimeout(res, 2000));
        startWarmup();
      }, {
        voiceName: examinerChoice.voiceName,
        languageCode: examinerChoice.languageCode,
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
    clearFastSilencePromptTimer();

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

      <div className="border-b border-white/10 bg-slate-950/70 px-3 py-3 backdrop-blur-xl sm:px-5 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                Examiner Session
              </div>
              <div className="truncate text-sm font-semibold text-slate-100 md:text-base">
                {selectedExaminer.name} • {selectedExaminer.title}
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

      <div className="flex-1 p-3 sm:p-4 md:p-5 min-h-0">
        <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="relative min-h-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
            <AiPanel
              amplitude={amplitude}
              speaking={speaking}
              thinking={thinking}
              transcript={transcript}
              keywordDetected={keywordDetected}
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

            <div className="absolute left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
              <Sparkles size={13} className="text-emerald-300" />
              <span>{selectedExaminer.personality}</span>
            </div>

            <div className="absolute right-2 top-2 h-24 w-20 overflow-hidden rounded-2xl md:right-4 md:top-4 md:h-auto md:w-[260px] md:aspect-video">
              <CandidatePanel
                cameraOn={cameraOn}
                listening={isListening}
              />
            </div>
          </div>

          <div className="grid min-h-0 gap-4 lg:grid-rows-[auto_1fr_auto]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                <UserRound size={14} />
                Candidate Feed
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300 min-h-24">
                {candidateTranscript || "Your live answer transcript will appear here while you speak."}
              </div>

              {isFastMode &&
                currentFastQuestion &&
                currentFastQuestion.answerKeywords.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        Keyword Tracker
                      </div>
                      <div className="text-xs text-slate-400">
                        {fastKeywordProgress.matchedKeywords.length}/{fastKeywordProgress.totalKeywords}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {currentFastQuestion.answerKeywords.map((keyword, index) => {
                        const matched = fastKeywordProgress.matchedKeywords.includes(keyword);

                        return (
                          <div
                            key={`${keyword}-${index}`}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                              matched
                                ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
                                : "border-white/10 bg-white/[0.04] text-slate-400"
                            }`}
                          >
                            {matched ? "Heard: " : ""}
                            {keyword}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            <div className="min-h-0 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
              <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.22em] text-slate-500">
                Session Timeline
              </div>
              <ChatTimeline messages={messages} />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              {isFastMode ? (
                <p>
                  Fast mode stays on a total 10 minute clock. If you pause before covering all key words, the examiner now asks whether you want to add anything else before moving on.
                </p>
              ) : (
                <p>
                  Calm mode follows a more natural viva pace with adaptive follow-up questioning and a professional conversational cadence.
                </p>
              )}
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
