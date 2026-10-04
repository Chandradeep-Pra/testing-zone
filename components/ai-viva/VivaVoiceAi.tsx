"use client";

import { Clock, PhoneOff, Camera, CameraOff, X, ChevronUp, Captions, Volume2 } from "lucide-react";
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
import { useGeminiLive } from "./useGeminiLive";

import { getDefaultExaminer, type ExaminerVoice } from "@/lib/examiner-voices";
import { useAuth } from "@/components/auth/AuthProvider";


import type { VivaCaseRecord } from "@/lib/viva-case";
import { CALM_VIVA_TOTAL_DURATION_SEC, getCalmPhaseTiming } from "@/lib/viva-flow";
import { appPath } from "@/lib/app-path";

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
type CandidateStatusDot = "idle" | "speaking" | "silence";
type StoredCandidateInfo = {
  name?: string;
  email?: string;
  selectedExaminer?: ExaminerVoice;
  selectedExaminerId?: string;
  conversation?: CandidateConversationMessage[];
  qaHistory?: QaHistoryItem[];
  selectedMicDeviceId?: string;
  selectedCaseId?: string;
  selectedCaseTitle?: string;
  selectedCase?: VivaCaseRecord;
  selectedMode?: VivaMode;
};

function resolveExhibitSrc(src: string) {
  return src.startsWith("/") ? appPath(src) : src;
}

function resolveCaseExhibitSrc(exhibit: VivaCaseRecord["exhibits"][number]) {
  const src = exhibit.url || (exhibit.file ? `/exhibits/${exhibit.file.replace(/^\/+/, "")}` : "");
  return src ? resolveExhibitSrc(src) : "";
}

function isVivaEndRequest(value: string) {
  const text = value.toLowerCase().replace(/[’]/g, "'");
  if (/\b(?:don't|do not|never)\b.{0,30}\b(?:end|finish|stop|conclude)\b/.test(text)) return false;

  return (
    /\b(?:end|finish|stop|conclude)\s+(?:the\s+)?(?:viva|exam(?:ination)?|assessment)\b/.test(text) ||
    /\b(?:can|could)\s+we\s+(?:end|finish|stop|conclude)(?:\s+(?:the\s+)?(?:viva|exam(?:ination)?|assessment)|\s+(?:now|here))\b/.test(text) ||
    /\b(?:i(?:'d| would)\s+like|i want)\s+to\s+(?:end|finish|stop|conclude)\b/.test(text) ||
    /\b(?:i'm|i am)\s+(?:finished|done)\s+(?:with\s+)?(?:the\s+)?(?:viva|exam(?:ination)?|assessment)\b/.test(text)
  );
}

function getExitConfirmationAnswer(value: string): "yes" | "no" | null {
  const text = value.toLowerCase().trim().replace(/[.!?,]/g, " ").replace(/\s+/g, " ");
  if (/^(yes|yeah|yep|correct|please do|end it|i do|i would|that's right)(\b|$)/.test(text)) return "yes";
  if (/^(no|nope|not now|continue|keep going|carry on|let's continue)(\b|$)/.test(text)) return "no";
  return null;
}

function mergeCurrentCandidateAnswer(history: QaHistoryItem[], candidateText: string) {
  const current = candidateText.trim();
  const merged = history.map((item) => ({ ...item }));
  if (!current) return merged;

  const last = merged[merged.length - 1];
  if (!last) return [{ question: "", answer: current }];
  const existing = last.answer?.trim() || "";
  if (!existing) {
    last.answer = current;
  } else if (
    current.toLowerCase().startsWith(existing.toLowerCase()) ||
    current.toLowerCase().includes(existing.toLowerCase())
  ) {
    last.answer = current;
  } else if (!existing.toLowerCase().includes(current.toLowerCase())) {
    last.answer = `${existing} ${current}`.trim();
  }
  return merged;
}

export default function VivaVoiceAi({
  vivaCase,
  selectedMode = "calm",
  initialCandidate,
}: {
  vivaCase: VivaCaseRecord;
  selectedMode?: VivaMode;
  initialCandidate?: { name: string; email: string };
  aiMode?: boolean;
}) {
  const { user } = useAuth();
  const isFastMode = selectedMode === "fast";

  const [candidate, setCandidate] = useState(initialCandidate || { name: "", email: "" });
  const [selectedExaminer, setSelectedExaminer] = useState<ExaminerVoice>(
    getDefaultExaminer(selectedMode)
  );
  const {
    generateScore,
    next,
    prefetchNextCalmPhase,
    prepareCalmCase,
    getMedicalTerminology,
  } = useVivaEngine(vivaCase, selectedMode);

  useEffect(() => {
    if (initialCandidate) {
      setCandidate(initialCandidate);
    }
    const stored = localStorage.getItem("candidateInfo");
    if (stored) {
      const parsed = JSON.parse(stored) as StoredCandidateInfo;
      if (!initialCandidate) {
        setCandidate({
          name: parsed.name || "",
          email: parsed.email || "",
        });
      }
      if (parsed.selectedExaminer) {
        setSelectedExaminer(parsed.selectedExaminer);
        examinerVoiceRef.current = parsed.selectedExaminer;
      }
      if (Array.isArray(parsed.conversation)) {
        setMessages(parsed.conversation);
      }
    }
  }, [initialCandidate]);

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

    const { speak, amplitude, error: audioError, stop: stopExaminerAudio } = useSpeechOutput();
  const avatarSessionActiveRef = useRef(false);


  const hasStartedRef = useRef(false);
  const firstQuestionRef = useRef<Awaited<ReturnType<typeof next>> | null>(null);
  const continuationQuestionIndexRef = useRef(0);
  const examinerVoiceRef = useRef(selectedExaminer);
  const endingRef = useRef(false);
  const endIntentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitConfirmationPendingRef = useRef(false);
  const exitRequestHandledRef = useRef(false);
  const exitRequestOriginalTextRef = useRef("");
  const timerClosingPromptSentRef = useRef(false);
  const endVivaRef = useRef<(() => Promise<void>) | null>(null);
  const fillerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fastSilenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestCandidateTranscriptRef = useRef("");
  const lastSpeechActivityAtRef = useRef(0);
  const fastSilenceGenerationRef = useRef(0);
  const fillerIndexRef = useRef(0);
  const liveCandidateMsgId = useRef<string | null>(null);
  const advanceLockRef = useRef(false);
  const answerPrefixRef = useRef("");
  const messagesRef = useRef<CandidateConversationMessage[]>([]);
  const selectedMicDeviceIdRef = useRef<string | undefined>(undefined);
  const prefetchedPhaseRef = useRef("assessment");
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [readyVisible, setReadyVisible] = useState(true);
  const [ending, setEnding] = useState(false);
  const [reportGenerationFailed, setReportGenerationFailed] = useState(false);
  const [vivaStarted, setVivaStarted] = useState(false);
  const [messages, setMessages] = useState<CandidateConversationMessage[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [candidateTranscript, setCandidateTranscript] = useState("");
  const [fastPauseState, setFastPauseState] = useState<FastPauseState>("idle");
  const [candidateStatusDot, setCandidateStatusDot] = useState<CandidateStatusDot>("idle");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preparingCase, setPreparingCase] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [exitConfirmationPending, setExitConfirmationPending] = useState(false);
  const [timerClosingComplete, setTimerClosingComplete] = useState(false);

  const vivaDurationSec = CALM_VIVA_TOTAL_DURATION_SEC;
  const countdownRunning = vivaStarted && !ending;
  const countdownTotal = vivaDurationSec;

  function getExaminerSpeechOptions() {
    return {
      voiceName: examinerVoiceRef.current.voiceName,
      languageCode: examinerVoiceRef.current.languageCode,
      terminology: getMedicalTerminology(),
    };
  }

    async function setAvatarListening(listening: boolean) {
    if (!avatarSessionActiveRef.current) {
      return;
    }
  }


  async function speakAsExaminer(text: string, onEnd?: () => void) {
    // The avatar has its own voice configuration. Examiner speech must always
    // use the voice selected in setup, including the first question.
    return speak(text, onEnd, getExaminerSpeechOptions());
  }

  function clearFastSilencePromptTimer() {
    if (fastSilenceTimeoutRef.current) {
      clearTimeout(fastSilenceTimeoutRef.current);
      fastSilenceTimeoutRef.current = null;
    }

    setFastPauseState((current) => (current === "detected" ? "idle" : current));
  }

  function mergeWithAnswerPrefix(value: string) {
    return [answerPrefixRef.current, value].filter(Boolean).join(" ").trim();
  }

  const { minutes, seconds, secondsLeft } = useCountdown(
    countdownTotal,
    countdownRunning,
    () => {
      if (!timerClosingPromptSentRef.current) {
        void endVivaRef.current?.();
      }
    },
    vivaDurationSec
  );
  const elapsedSec = Math.max(0, countdownTotal - (minutes * 60 + seconds));
  const calmPhaseTiming = getCalmPhaseTiming(elapsedSec);

  useEffect(() => {
    if (isFastMode || !vivaStarted || ending) return;
    if (prefetchedPhaseRef.current === calmPhaseTiming.phase) return;
    prefetchedPhaseRef.current = calmPhaseTiming.phase;
    prefetchNextCalmPhase(elapsedSec);
  }, [
    calmPhaseTiming.phase,
    elapsedSec,
    isFastMode,
    vivaStarted,
    ending,
    prefetchNextCalmPhase,
  ]);

  const fillers = [
    "Okay, let us continue further",
    "Let us move on to the next question",
    "That is alright, let us continue",
    "",
  ];
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function beginListeningForAnswer(
    existingText = "",
    reuseCurrentMessage = false
  ) {
    if (endingRef.current || isFastMode) {
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
    latestCandidateTranscriptRef.current = answerPrefixRef.current;
    lastSpeechActivityAtRef.current = 0;
    setCandidateTranscript(answerPrefixRef.current);
    setCandidateStatusDot(answerPrefixRef.current ? "speaking" : "idle");
    setIsListening(true);
    void setAvatarListening(true);
    void startSpeechCapture();
  }

  async function startSpeechCapture() {
    try {
      await start();
    } catch (error) {
      console.error("Viva microphone capture failed:", error);
      setSessionError("Unable to connect the microphone. Retry the question to reconnect.");
      setIsListening(false);
      setCandidateStatusDot("idle");
      void setAvatarListening(false);
    }
  }

  function handleSpeechPause(answerText: string) {
    const latestAnswer = answerText.trim();

    if (
      !vivaStarted ||
      endingRef.current ||
      advanceLockRef.current ||
      !latestAnswer
    ) {
      return;
    }

    setFastPauseState("detected");
    setCandidateStatusDot("silence");
    void submitCurrentAnswer(latestAnswer);
  }

  function scheduleSilenceAdvance(answerText: string, markSpeechActivity = false) {
    const latestAnswer = answerText.trim();

    clearFastSilencePromptTimer();
    latestCandidateTranscriptRef.current = latestAnswer;

    if (markSpeechActivity || !lastSpeechActivityAtRef.current) {
      lastSpeechActivityAtRef.current = Date.now();
    }

    if (
      !vivaStarted ||
      endingRef.current ||
      advanceLockRef.current ||
      !latestAnswer
    ) {
      return;
    }

    setFastPauseState("monitoring");
    setCandidateStatusDot("speaking");
    const generation = fastSilenceGenerationRef.current + 1;
    fastSilenceGenerationRef.current = generation;
    const inactivityDelayMs = 4000;
    const remainingDelayMs = Math.max(
      0,
      inactivityDelayMs - (Date.now() - lastSpeechActivityAtRef.current),
    );

    fastSilenceTimeoutRef.current = setTimeout(() => {
      fastSilenceTimeoutRef.current = null;
      if (fastSilenceGenerationRef.current !== generation) {
        return;
      }

      handleSpeechPause(latestCandidateTranscriptRef.current || latestAnswer);
    }, remainingDelayMs);
  }

  async function finalizeFromTranscriptFallback() {
    if (
      ending ||
      endingRef.current ||
      advanceLockRef.current
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
    latestCandidateTranscriptRef.current = fallbackText;

    answerPrefixRef.current = fallbackText;
    syncCandidateMessage(fallbackText, false);
    scheduleSilenceAdvance(fallbackText);
  }

  const {
    start,
    stop,
    closeSocket,
    getTranscriptBuffer,
    resetTranscriptBuffer,
    micLevel,
    prepare: prepareSpeechConnection,
  } = useSpeechInput(
    (interim) => {
      if (ending) return;

      const combinedInterim = mergeWithAnswerPrefix(interim);

      latestCandidateTranscriptRef.current = combinedInterim;
      setCandidateTranscript(combinedInterim);

      setMessages((msgs) =>
        msgs.map((m) =>
          m.id === liveCandidateMsgId.current ? { ...m, text: combinedInterim } : m
        )
      );

      scheduleSilenceAdvance(combinedInterim, true);
    },

    // The STT hook invokes this only after its server reports speechEnded.
    // This local speech input is retained for the non-live calm fallback.
    async (finalText) => {
      if (ending || endingRef.current || advanceLockRef.current) return;

      const combinedFinalText = mergeWithAnswerPrefix(finalText);
      latestCandidateTranscriptRef.current = combinedFinalText;
      setCandidateTranscript(combinedFinalText);

      answerPrefixRef.current = combinedFinalText;
      syncCandidateMessage(combinedFinalText, false);
      scheduleSilenceAdvance(combinedFinalText);
    },
    async () => {
      await finalizeFromTranscriptFallback();
    },
    () => selectedMicDeviceIdRef.current,
    () => getMedicalTerminology(),
  );

  useEffect(() => {
    endingRef.current = false;
    return () => {
      endingRef.current = true;
      if (fillerTimeoutRef.current) {
        clearTimeout(fillerTimeoutRef.current);
      }
      if (fastSilenceTimeoutRef.current) {
        clearTimeout(fastSilenceTimeoutRef.current);
      }
      clearFastSilencePromptTimer();
      setCandidateStatusDot("idle");
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
    const data = await next(userAnswer, false, elapsedSec);

    if (fillerTimeoutRef.current) {
      clearTimeout(fillerTimeoutRef.current);
      fillerTimeoutRef.current = null;
    }

    const continuationQuestions = [
      "What safety-netting would you provide if the patient's symptoms worsen before review?",
      "How would your management change if the initial investigation were inconclusive?",
      "What complications would you discuss, and how would you reduce their risks?",
      "How would you explain the options and involve the patient in this decision?",
    ];
    const question = data?.exit || !data?.question
      ? continuationQuestions[continuationQuestionIndexRef.current++ % continuationQuestions.length]
      : data.question;

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
              src: resolveExhibitSrc(data.imageLink),
              description: data.imageDescription || undefined,
            },
          ]
        : []),
    ]);

    setThinking(false);
    applyApiResponse(data);
    await speakAsExaminer(question, () => {
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
    latestCandidateTranscriptRef.current = finalAnswer;
    syncCandidateMessage(finalAnswer, false);

    try {
      await next(finalAnswer, true, elapsedSec);
    } catch (error) {
      console.error("Error concluding viva on timer:", error);
    }

    void speakAsExaminer("Time is up. We are concluding the viva now.", async () => {
      await endViva();
    }).catch(() => { void endViva(); });
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
    latestCandidateTranscriptRef.current = finalAnswer;
    syncCandidateMessage(finalAnswer, false);

    if (hasStartedRef.current) {
      setThinking(true);

      fillerTimeoutRef.current = setTimeout(() => {
        if (endingRef.current) return;
        const filler = fillers[fillerIndexRef.current % fillers.length];
        fillerIndexRef.current += 1;
        void speakAsExaminer(filler).catch(() => {});
      }, 1200);
    } else {
      setThinking(true);
    }

    try {
      await askNextQuestion(finalAnswer);
    } catch (error) {
      markSpeechEnded();
      setSessionError(error instanceof Error ? error.message : "Unable to continue your viva.");
    } finally {
      setThinking(false);
      advanceLockRef.current = false;
    }
  }

  async function startViva(): Promise<boolean> {
    setPreparingCase(true);
    setSessionError(null);
    setThinking(true);
    try {
      // next() reads the backend-authored case questions directly. Retain the
      // first result so an audio retry cannot consume the next question.
      const data = firstQuestionRef.current ?? await next("");
      if (!data?.question || data.exit) throw new Error("No questions are available for this viva. Please choose another case.");
      firstQuestionRef.current = data;
      if (endingRef.current) return false;
      const question = data.question;
      setMessages([
        { id: crypto.randomUUID(), role: "ai", text: question },
        ...(data.imageUsed && data.imageLink ? [{
          id: crypto.randomUUID(), role: "image" as const,
          src: resolveExhibitSrc(data.imageLink), description: data.imageDescription || undefined,
        }] : []),
      ]);
      applyApiResponse(data);
      await speakAsExaminer(question, () => {
        if (endingRef.current) return;
        markSpeechEnded();
        beginListeningForAnswer();
      });
      if (endingRef.current) return false;
      // Start the exam clock only once the first question is actually playing.
      setVivaStarted(true);
      return true;
    } catch (error) {
      if (endingRef.current) return false;
      markSpeechEnded();
      setSessionError(error instanceof Error ? error.message : "Unable to start your viva. Please retry.");
      return false;
    } finally {
      if (!endingRef.current) {
        setPreparingCase(false);
        setThinking(false);
      }
    }
  }

    const {
    active: liveActive,
    startSession: startLiveSession,
    beginViva: beginLiveViva,
    stopSession: stopLiveSession,
    resumeAudioOutput,
    transcript: liveTranscript,
    candidateLiveTranscript,
    sendSessionControl,
    sessionEndReason,
    liveExhibitId,
    clearLiveExhibit,
    speaking: liveSpeaking,
    turns: liveTurns,
    startupStage: liveStartupStage,
    backendError: liveBackendError,
  } = useGeminiLive(vivaCase, user?.idToken, candidate);
  const examinerSpeaking = liveActive ? liveSpeaking : speaking;
  const stageTranscript = liveActive ? liveTranscript : transcript;
  const liveExhibit = liveExhibitId
    ? vivaCase.exhibits.find((item) => item.id === liveExhibitId && item.kind.toLowerCase() === "image")
    : undefined;
  const liveExhibitSrc = liveExhibit ? resolveCaseExhibitSrc(liveExhibit) : "";

  useEffect(() => {
    if (liveBackendError) setSessionError(liveBackendError);
  }, [liveBackendError]);

  useEffect(() => {
    const candidateSpeech = candidateLiveTranscript;
    if (
      !vivaStarted ||
      endingRef.current ||
      exitConfirmationPendingRef.current ||
      exitRequestHandledRef.current ||
      !isVivaEndRequest(candidateSpeech)
    ) {
      return;
    }

    exitRequestHandledRef.current = true;
    exitConfirmationPendingRef.current = true;
    exitRequestOriginalTextRef.current = candidateSpeech;
    setExitConfirmationPending(true);

    if (!sendSessionControl("candidate_exit_request")) {
      exitConfirmationPendingRef.current = false;
      setExitConfirmationPending(false);
      setSessionError("The examiner connection is unavailable, so the viva cannot confirm an early exit yet.");
    }
  }, [candidateLiveTranscript, vivaStarted, sendSessionControl]);

  useEffect(() => {
    if (!exitConfirmationPendingRef.current || endingRef.current) return;
    const candidateSpeech = candidateLiveTranscript;
    if (!candidateSpeech.trim() || candidateSpeech === exitRequestOriginalTextRef.current) return;
    const answer = getExitConfirmationAnswer(candidateSpeech);
    if (!answer) return;

    exitConfirmationPendingRef.current = false;
    setExitConfirmationPending(false);
    exitRequestHandledRef.current = false;
    exitRequestOriginalTextRef.current = "";
    if (answer === "no") {
      sendSessionControl("exit_confirmation_answer", false);
      return;
    }

    sendSessionControl("exit_confirmation_answer", true);
  }, [candidateLiveTranscript, sendSessionControl]);

  useEffect(() => {
    if (
      (sessionEndReason === "candidate_confirmed_early_exit" || sessionEndReason === "candidate_no_response") &&
      !endingRef.current
    ) {
      void endVivaRef.current?.();
    } else if (sessionEndReason === "timer_closing_ready") {
      setTimerClosingComplete(true);
    }
  }, [sessionEndReason]);

  useEffect(() => {
    if (secondsLeft === 0 && timerClosingComplete && !endingRef.current) {
      void endVivaRef.current?.();
    }
  }, [secondsLeft, timerClosingComplete]);

  useEffect(() => {
    if (!vivaStarted || ending || secondsLeft <= 0 || secondsLeft > 10 || timerClosingPromptSentRef.current) return;
    timerClosingPromptSentRef.current = true;
    sendSessionControl("timer_closing");
  }, [vivaStarted, ending, secondsLeft, sendSessionControl]);

  function revealControls() {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (vivaStarted) {
      controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 4200);
    }
  }

  useEffect(() => {
    if (!vivaStarted) {
      setControlsVisible(true);
      return;
    }
    controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 4200);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [vivaStarted]);

  async function handleBegin(
    cameraPref = true,
    examinerChoice: ExaminerVoice = getDefaultExaminer(selectedMode),
    micDeviceId?: string
  ) {
    if (hasStartedRef.current) return;

    setPreparingCase(true);
    setSessionError(null);

    hasStartedRef.current = true;

    examinerVoiceRef.current = examinerChoice;
    setSelectedExaminer(examinerChoice);
    setCameraEnabled(cameraPref);
    setCameraOn(cameraPref);
    selectedMicDeviceIdRef.current = micDeviceId;
    setPreparingCase(true);
    // Persistence must not prevent the exam from starting.
    try {
      const parsed = JSON.parse(localStorage.getItem("candidateInfo") || "{}");
      parsed.selectedExaminer = examinerChoice;
      parsed.selectedExaminerId = examinerChoice.id;
      parsed.selectedMicDeviceId = micDeviceId || "";
      localStorage.setItem("candidateInfo", JSON.stringify(parsed));
    } catch (error) {
      console.warn("Unable to save examiner preference:", error);
    }
    try {
      await startLiveSession(examinerChoice, selectedMode, micDeviceId);
      beginLiveViva();
      setReadyVisible(false);
      setVivaStarted(true);
    } catch (error) {
      hasStartedRef.current = false;
      setSessionError(error instanceof Error ? error.message : "Unable to connect the live viva.");
      setReadyVisible(true);
    } finally {
      if (!endingRef.current) setPreparingCase(false);
    }
  }

  async function retryCurrentQuestion() {
    if (preparingCase || endingRef.current) return;
    if (!vivaStarted) {
      hasStartedRef.current = false;
      await handleBegin(cameraEnabled, selectedExaminer, selectedMicDeviceIdRef.current);
      return;
    }
    if (!liveActive) {
      setSessionError("The live examiner connection has ended. Please end the viva to score the transcript collected so far.");
      return;
    }
    setSessionError(null);
    try {
      await resumeAudioOutput();
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Unable to resume live audio output.");
    }
  }

  async function endViva() {
    if (endingRef.current || ending) return;

    endingRef.current = true;
    advanceLockRef.current = true;
    setEnding(true);
    setReportGenerationFailed(false);
    setSessionError(null);
    stopExaminerAudio();
    setIsListening(false);
    const liveSessionClosed = stopLiveSession(true);
    stop();
    closeSocket();
    void setAvatarListening(false);
    avatarSessionActiveRef.current = false;


    if (fillerTimeoutRef.current) {
      clearTimeout(fillerTimeoutRef.current);
      fillerTimeoutRef.current = null;
    }

    clearFastSilencePromptTimer();
    setFastPauseState("idle");

    const liveQa = mergeCurrentCandidateAnswer(liveTurns.reduce<Array<{ question: string; answer: string }>>((rows, turn) => {
      if (turn.role === "ai") {
        rows.push({ question: turn.text, answer: "" });
      } else if (rows.length) {
        rows[rows.length - 1].answer = `${rows[rows.length - 1].answer} ${turn.text}`.trim();
      } else {
        rows.push({ question: "", answer: turn.text });
      }
      return rows;
    }, []).filter((item) => item.question || item.answer), candidateLiveTranscript);

    try {
      const stored = localStorage.getItem("candidateInfo");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.qaHistory = liveQa;
        parsed.conversation = liveTurns.map((turn, index) => ({
          id: `live-${index}`,
          role: turn.role,
          text: turn.text,
          live: true,
        }));
        parsed.selectedCaseId = vivaCase.id;
        parsed.selectedCaseTitle = vivaCase.case.title;
        parsed.selectedCase = vivaCase;
        parsed.selectedMode = selectedMode;
        parsed.selectedExaminer = selectedExaminer;
        parsed.selectedExaminerId = selectedExaminer.id;
        localStorage.setItem("candidateInfo", JSON.stringify(parsed));
      }
    } catch (error) {
      console.warn("Unable to save the viva transcript locally:", error);
    }

    try {
      await liveSessionClosed;
      await generateScore(liveQa);
    } catch (error) {
      console.error("Unable to generate the viva report:", error);
      setSessionError(error instanceof Error ? error.message : "The viva ended, but the report could not be generated.");
      setReportGenerationFailed(true);
      setEnding(false);
      endingRef.current = false;
      advanceLockRef.current = false;
    }
  }
  endVivaRef.current = endViva;

  useEffect(() => {
    if (!liveActive) return;
    setMessages(liveTurns.map((turn, index) => ({
      id: `live-${index}`,
      role: turn.role,
      text: turn.text,
      live: true,
    })));
    setIsListening(true);
    setCandidateStatusDot("idle");
  }, [liveActive, liveTurns]);

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-[#111315] text-white"
      onPointerMove={revealControls}
      onFocusCapture={revealControls}
    >
      {readyVisible && (
        <ReadyOverlay
          onBegin={handleBegin}
          vivaTitle={vivaCase.case.title}
          selectedMode={selectedMode}
          errorMessage={sessionError}
          isStarting={preparingCase}
          startupStage={liveStartupStage}
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

      {preparingCase && (
        <div role="status" aria-live="polite" className="absolute inset-0 z-40 flex items-center justify-center bg-white/95 backdrop-blur-sm">
          <div className="rounded-[28px] border border-[#0f7896]/12 bg-white px-8 py-7 text-center shadow-[0_24px_60px_rgba(15,120,150,0.18)]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-100 border-t-[#0f7896]" />
            <p className="mt-4 text-lg font-semibold text-[#071014]">Preparing your viva</p>
            <p className="mt-1 text-sm text-[#071014]/55">Connecting your live speech-to-speech examiner.</p>
          </div>
        </div>
      )}

      {!preparingCase && !readyVisible && !ending && (sessionError || audioError) && (
        <div role="alert" className="absolute inset-0 z-40 flex items-center justify-center bg-white/95 p-6 backdrop-blur-sm">
          <div className="max-w-md rounded-[28px] border border-[#0f7896]/12 bg-white px-8 py-7 text-center shadow-xl">
            <p className="text-lg font-semibold">
              {reportGenerationFailed ? "Your report could not be generated" : vivaStarted ? "Unable to continue audio" : "Unable to start your viva"}
            </p>
            <p className="mt-3 text-sm text-[#071014]/65">{sessionError || audioError}</p>
            <button
              type="button"
              onClick={() => { void (reportGenerationFailed ? endViva() : retryCurrentQuestion()); }}
              className="mt-5 rounded-xl bg-[#0f7896] px-5 py-3 font-medium text-white"
            >
              {reportGenerationFailed ? "Retry report" : "Retry question"}
            </button>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="pointer-events-none absolute inset-y-4 right-4 z-50 flex w-full max-w-xl justify-end">
          <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-lg border border-white/10 bg-[#1c1e20] text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#0f7896]/12 px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                  Session Transcript
                </div>
                <div className="mt-1 text-base font-semibold text-white">
                  Examiner questions and your spoken answers
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
                aria-label="Close history"
              >
                <X size={17} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatTimeline
                messages={messages}
                micLevel={micLevel}
                listening={isListening}
              />
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        <AiPanel
          amplitude={amplitude}
          speaking={examinerSpeaking}
          thinking={thinking || (liveActive && !stageTranscript)}
          listening={isListening}
          transcript={stageTranscript}
          avatarVideo={null}
          exhibit={
            liveExhibit && liveExhibitSrc ? (
              <div className="relative flex h-full max-h-[96vh] w-full max-w-[98vw] items-center justify-center">
                <img src={liveExhibitSrc} alt={liveExhibit.label || "Viva exhibit"} className="max-h-[92vh] max-w-[96vw] rounded-lg object-contain" />
                <button onClick={clearLiveExhibit} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white" aria-label="Close exhibit">
                  <X size={16} />
                </button>
              </div>
            ) : exhibit?.type === "image" ? (
              <div className="relative mx-auto flex h-full max-w-full items-center justify-center">
                <img src={exhibit.src} alt="Viva exhibit" className="max-h-[70vh] w-auto rounded-lg" />
                <button onClick={clearExhibit} className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white" aria-label="Close exhibit">
                  <X size={16} />
                </button>
              </div>
            ) : null
          }
        />
      </div>

      <header className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-4 pt-4 sm:px-7 sm:pt-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-xs font-semibold text-white/80">U</div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">Urologics · AI Viva</p>
            <p className="truncate text-sm font-medium text-white/90 sm:text-base">{selectedExaminer.name}</p>
          </div>
        </div>
        <div className="mr-[min(35vw,280px)] hidden max-w-[35vw] truncate pt-2 text-sm text-white/55 sm:block">{vivaCase.case.title}</div>
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2 text-sm tabular-nums text-white/80 backdrop-blur-md">
          <Clock size={14} />
          <span>{minutes}:{seconds.toString().padStart(2, "0")}</span>
        </div>
      </header>

      <aside className="absolute right-4 top-19 z-20 w-[min(58vw,340px)] min-w-28 sm:right-7 sm:top-24">
        <div className="aspect-video overflow-hidden rounded-lg border border-white/15 bg-[#202326] shadow-2xl">
          <CandidatePanel cameraOn={cameraOn} listening={isListening} transcript={candidateLiveTranscript} statusDot={candidateStatusDot} />
        </div>
        <p className="mt-2 truncate text-right text-xs text-white/65">{candidate.name || "You"}</p>
        {candidateLiveTranscript && (
          <div
            className="ml-auto mt-2 w-full rounded-lg border border-white/10 bg-[#242629]/95 px-3 py-2 text-left text-xs leading-5 text-white shadow-lg sm:text-sm"
            aria-live="polite"
            aria-label="Your live transcription"
          >
            {candidateLiveTranscript}
          </div>
        )}
      </aside>

      {!controlsVisible && vivaStarted && (
        <button
          type="button"
          onClick={revealControls}
          onPointerEnter={revealControls}
          className="absolute bottom-1 left-1/2 z-40 flex h-10 w-14 -translate-x-1/2 items-center justify-center rounded-t-lg border border-b-0 border-white/15 bg-[#25282b]/90 text-white/65 backdrop-blur-xl transition hover:text-white"
          aria-label="Show call controls"
          title="Show call controls"
        >
          <ChevronUp size={18} />
        </button>
      )}

      <div className={`absolute bottom-5 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ${controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"}`}>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#242629]/90 p-2 shadow-2xl backdrop-blur-2xl sm:gap-3 sm:px-3">
          <button
            type="button"
            onClick={() => setCameraOn((current) => !current)}
            disabled={!cameraEnabled}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-35"
            title={cameraOn ? "Turn camera off" : "Turn camera on"}
            aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          >
            {cameraOn ? <CameraOff size={19} /> : <Camera size={19} />}
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition ${historyOpen ? "bg-white text-[#161819]" : "bg-white/10 text-white hover:bg-white/20"}`}
            title={historyOpen ? "Close transcript" : "Open transcript"}
            aria-label={historyOpen ? "Close transcript" : "Open transcript"}
          >
            <Captions size={20} />
          </button>
          <button
            type="button"
            onClick={() => void resumeAudioOutput().catch((error) => setSessionError(error instanceof Error ? error.message : "Unable to resume examiner audio."))}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            title="Enable examiner audio"
            aria-label="Enable examiner audio"
          >
            <Volume2 size={19} />
          </button>
          <div className="mx-1 hidden h-7 w-px bg-white/15 sm:block" />
          <button
            type="button"
            onClick={endViva}
            disabled={(!vivaStarted && !liveActive) || ending}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5484d] text-white transition hover:bg-[#f05a5f] disabled:cursor-not-allowed disabled:opacity-40"
            title="End viva"
            aria-label="End viva"
          >
            <PhoneOff size={19} />
          </button>
        </div>
      </div>
    </main>
  );
}
