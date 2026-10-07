import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { ExaminerVoice, VivaMode } from "@/lib/examiner-voices";
import { appPath } from "@/lib/app-path";
import { normalizeSessionStartPayload, withBackendDurationBuffer } from "@/lib/session-start";

const FIRST_MODEL_RESPONSE_TIMEOUT_MS = 45_000;

function getBackendWebSocketCandidates() {
  const configured =
    process.env.NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL ||
    process.env.NEXT_PUBLIC_AI_VIVA_WS_URL;

  const isLocalPage = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const configuredCandidates = configured
    ? [configured]
    : isLocalPage
      ? ["ws://localhost:8000", "ws://localhost:8001"]
      : [];

  if (!configuredCandidates.length) {
    throw new Error("The AI Viva WebSocket URL is not configured for this site. Set NEXT_PUBLIC_AI_VIVA_BACKEND_WS_URL to the secure backend WSS address.");
  }

  const baseCandidates = configuredCandidates.map((base) => {
    const trimmed = base.trim().replace(/\/+$/, "").replace(/\/ws$/i, "");
    if (!trimmed) throw new Error("The AI Viva WebSocket URL is empty.");
    if (trimmed.startsWith("https://")) return trimmed.replace(/^https:/, "wss:");
    if (trimmed.startsWith("http://")) return trimmed.replace(/^http:/, "ws:");
    if (!/^wss?:\/\//i.test(trimmed)) {
      throw new Error("The AI Viva WebSocket URL must start with ws:// or wss://.");
    }
    return trimmed.replace(/^wss?:/i, (protocol) => protocol.toLowerCase());
  });

  const hasSecurePage = typeof window !== "undefined" && window.location.protocol === "https:";
  const isLoopback = (base: string) => ["localhost", "127.0.0.1", "::1"].includes(new URL(base).hostname);
  if (hasSecurePage && baseCandidates.some((base) => base.startsWith("ws://") && !isLoopback(base))) {
    throw new Error("This secure site requires a wss:// AI Viva backend URL.");
  }

  const userId = `viva-${crypto.randomUUID()}`;
  const sessionId = crypto.randomUUID();

  return baseCandidates.map((base) => `${base}/ws/${userId}/${sessionId}`);
}

function abortStartupError() {
  return new DOMException("Viva startup was cancelled.", "AbortError");
}

function raceWithStartupAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortStartupError());

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", handleAbort);
    const handleAbort = () => {
      cleanup();
      reject(abortStartupError());
    };

    signal.addEventListener("abort", handleAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

function getUserMediaForStartup(constraints: MediaStreamConstraints, signal?: AbortSignal) {
  const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);
  void mediaPromise.then((stream) => {
    if (signal?.aborted) stream.getTracks().forEach((track) => track.stop());
  }, () => {});
  return raceWithStartupAbort(mediaPromise, signal);
}

async function connectToBackendWebSocket(signal?: AbortSignal) {
  const urls = getBackendWebSocketCandidates();
  let lastError: Error | null = null;

  for (const url of urls) {
    if (signal?.aborted) throw abortStartupError();
    try {
      const socket = await new Promise<WebSocket>((resolve, reject) => {
        const ws = new WebSocket(url);
        let settled = false;
        const cleanup = () => {
          clearTimeout(timer);
          signal?.removeEventListener("abort", handleAbort);
        };
        const handleAbort = () => {
          if (settled) return;
          settled = true;
          cleanup();
          ws.close(1000, "Viva startup cancelled");
          reject(abortStartupError());
        };
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          cleanup();
          ws.close();
          reject(new Error(`Timed out connecting to the backend live session at ${url}.`));
        }, 45000);

        signal?.addEventListener("abort", handleAbort, { once: true });
        if (signal?.aborted) {
          handleAbort();
          return;
        }

        ws.onopen = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(ws);
        };

        ws.onerror = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(`Unable to connect to the backend live session at ${url}.`));
        };

        ws.onclose = (event) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error(`Backend closed before connecting (${event.code}: ${event.reason || "no reason provided"}) at ${url}.`));
        };
      });
      return { socket, url };
    } catch (error) {
      if (signal?.aborted) throw abortStartupError();
      lastError = error instanceof Error ? error : new Error("Unable to connect to the backend live session.");
    }
  }

  throw lastError ?? new Error("Unable to connect to the backend live session.");
}

function parseBackendPayload(raw: unknown) {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return { text: trimmed };
    }
  }

  if (raw instanceof Blob) {
    return { binary: raw };
  }

  if (raw instanceof ArrayBuffer) {
    return { binary: raw };
  }

  if (typeof raw === "object" && raw !== null) {
    return raw;
  }

  return null;
}

function decodeBase64Audio(data: string): ArrayBuffer | null {
  const normalized = data
    .replace(/^data:audio\/[^;,]+;base64,/i, "")
    .replace(/\s/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    return null;
  }

  try {
    const binary = window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

function summarizeBackendPayload(value: unknown, key = ""): unknown {
  if (value instanceof ArrayBuffer) {
    return `[binary payload: ${value.byteLength} bytes]`;
  }

  if (value instanceof Blob) {
    return `[binary payload: ${value.size} bytes, ${value.type || "unknown type"}]`;
  }

  if (typeof value === "string") {
    if (key === "data" && value.length > 256) {
      return `[encoded payload: ${value.length} characters]`;
    }
    return value.length > 2000 ? `${value.slice(0, 2000)}… [truncated]` : value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => summarizeBackendPayload(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        summarizeBackendPayload(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

export function useGeminiLive(
  vivaCase: any,
  idToken?: string,
  candidate?: { name?: string; email?: string }
) {
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [candidateLiveTranscript, setCandidateLiveTranscript] = useState("");
  const [liveExhibitId, setLiveExhibitId] = useState<string | null>(null);
  const [sessionEndReason, setSessionEndReason] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Array<{ role: "ai" | "candidate"; text: string }>>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [startupStage, setStartupStage] = useState<"idle" | "server" | "websocket" | "gemini" | "microphone" | "speaker" | "ready" | "error">("idle");
  
  const sessionRef = useRef<any>(null);
  const backendSessionReadyRef = useRef(false);
  const liveExhibitIdRef = useRef<string | null>(null);
  const examinerPromptedExhibitRef = useRef(false);
  const candidateSpokeSinceExhibitRef = useRef(false);
  const readyRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const nextPlayTimeRef = useRef(0);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptPartsRef = useRef({ input: "", output: "" });
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceCheckInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const candidateSpeechVersionRef = useRef(0);
  const micSpeechActiveRef = useRef(false);
  const micSpeechStartFramesRef = useRef(0);
  const micSilenceFramesRef = useRef(0);
  const speakingRef = useRef(false);
  const initialPromptSentRef = useRef(false);
  const firstBackendAudioLoggedRef = useRef(false);

  const appendTranscript = useCallback((role: "ai" | "candidate", text: string) => {
    const value = text.trim();
    if (!value) return;
    setTurns((current) => {
      const last = current[current.length - 1];
      if (last?.role === role) {
        return [...current.slice(0, -1), { role, text: `${last.text} ${value}`.trim() }];
      }
      return [...current, { role, text: value }];
    });
  }, []);

  const clearLiveExhibit = useCallback(() => {
    liveExhibitIdRef.current = null;
    examinerPromptedExhibitRef.current = false;
    candidateSpokeSinceExhibitRef.current = false;
    setLiveExhibitId(null);
  }, []);

  const noteExaminerOutputForExhibit = useCallback(() => {
    if (!liveExhibitIdRef.current) return;
    if (candidateSpokeSinceExhibitRef.current) clearLiveExhibit();
    else examinerPromptedExhibitRef.current = true;
  }, [clearLiveExhibit]);

  useEffect(() => {
    if (!liveExhibitId) return;
    const timeout = setTimeout(clearLiveExhibit, 60_000);
    return () => clearTimeout(timeout);
  }, [liveExhibitId, candidateLiveTranscript, clearLiveExhibit]);

  const stopPlayback = useCallback(() => {
    sourcesRef.current.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    sourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = null;
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const stopSession = useCallback(async (waitForClose = false) => {
    readyRef.current = false;
    initialPromptSentRef.current = false;
    if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
    sessionEndTimerRef.current = null;
    if (silenceCheckInTimerRef.current) clearTimeout(silenceCheckInTimerRef.current);
    silenceCheckInTimerRef.current = null;
    const socket = sessionRef.current;
    sessionRef.current = null;
    let socketClosed: Promise<void> | undefined;
    if (socket instanceof WebSocket) {
      if (waitForClose && socket.readyState !== WebSocket.CLOSED) {
        socketClosed = new Promise<void>((resolve, reject) => {
          const handleClose = () => {
            clearTimeout(timeout);
            resolve();
          };
          const timeout = setTimeout(() => {
            socket.removeEventListener("close", handleClose);
            reject(new Error("The live session did not close; the report was not generated."));
          }, 10_000);
          socket.addEventListener("close", handleClose, { once: true });
        });
      }
      if (socket.readyState === WebSocket.OPEN && backendSessionReadyRef.current) {
        socket.send(JSON.stringify({ type: "session_complete" }));
      }
      if (socket.readyState !== WebSocket.CLOSED) {
        socket.close(1000, "Viva completed");
      }
    } else {
      socket?.close?.();
    }
    backendSessionReadyRef.current = false;
    processorRef.current?.disconnect();
    silentGainRef.current?.disconnect();
    processorRef.current = null;
    silentGainRef.current = null;
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    if (playbackContextRef.current?.state !== "closed") {
      playbackContextRef.current?.close();
    }
    playbackContextRef.current = null;
    stopPlayback();
    clearLiveExhibit();
    setActive(false);
    await socketClosed;
  }, [stopPlayback, clearLiveExhibit]);

  const playAudioChunk = useCallback((base64Data: string) => {
    if (!audioContextRef.current) return;
    
    // Decode base64 to ArrayBuffer
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Int16Array(len / 2);
    for (let i = 0; i < len; i += 2) {
      bytes[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
    }
    
    // Convert to Float32 for Web Audio API
    const float32Data = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      float32Data[i] = bytes[i] / 32768.0;
    }

    const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    setSpeaking(true);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(() => setSpeaking(false), 260);
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);
    
    // Schedule playback for gapless audio
    const startTime = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + buffer.duration;
  }, []);

  const playBackendPcm = useCallback((data: ArrayBuffer, sampleRate = 24000) => {
    const context = playbackContextRef.current;
    const sampleCount = Math.floor(data.byteLength / 2);
    if (!context || context.state !== "running" || sampleCount === 0) {
      console.warn("[AI Viva audio] PCM output unavailable", {
        contextState: context?.state || "missing",
        bytes: data.byteLength,
      });
      return;
    }

    if (!firstBackendAudioLoggedRef.current) {
      firstBackendAudioLoggedRef.current = true;
      console.info("[AI Viva audio] first backend PCM packet", {
        bytes: data.byteLength,
        sampleRate,
        contextState: context.state,
      });
    }

    const view = new DataView(data);
    const samples = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = view.getInt16(index * 2, true) / 32768;
    }

    const audioBuffer = context.createBuffer(1, sampleCount, sampleRate);
    audioBuffer.getChannelData(0).set(samples);
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    sourcesRef.current.add(source);
    source.onended = () => sourcesRef.current.delete(source);

    const startTime = Math.max(context.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    speakingRef.current = true;
    setSpeaking(true);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(
      () => {
        speakingRef.current = false;
        setSpeaking(false);
      },
      Math.max(260, audioBuffer.duration * 1000 + 100),
    );
  }, []);

  const resumeAudioOutput = useCallback(async () => {
    const contexts = [playbackContextRef.current, audioContextRef.current]
      .filter((context): context is AudioContext => Boolean(context));
    await Promise.all(contexts.map((context) => (
      context.state === "suspended" ? context.resume() : Promise.resolve()
    )));
    if (contexts.length && contexts.every((context) => context.state !== "running")) {
      throw new Error("Browser audio output is unavailable. Check the selected output device and try again.");
    }
  }, []);

  const startSession = useCallback(async (examiner?: ExaminerVoice, mode: VivaMode = "calm", micDeviceId?: string, signal?: AbortSignal) => {
    const startupStartedAt = performance.now();
    const logStartupTiming = (stage: string, stageStartedAt = startupStartedAt) => {
      const now = performance.now();
      console.info("[AI Viva startup timing]", {
        stage,
        totalMs: Math.round(now - startupStartedAt),
        stageMs: Math.round(now - stageStartedAt),
      });
    };
    readyRef.current = false;
    initialPromptSentRef.current = false;
    setConnecting(true);
    setStartupStage("server");
    setBackendError(null);
    setTranscript("");
    setCandidateLiveTranscript("");
    setLiveExhibitId(null);
    setSessionEndReason(null);
    liveExhibitIdRef.current = null;
    setSessionEndReason(null);
    backendSessionReadyRef.current = false;
    candidateSpeechVersionRef.current = 0;
    micSpeechActiveRef.current = false;
    micSpeechStartFramesRef.current = 0;
    micSilenceFramesRef.current = 0;
    setSessionEndReason(null);
    examinerPromptedExhibitRef.current = false;
    candidateSpokeSinceExhibitRef.current = false;
    setTurns([]);
    transcriptPartsRef.current = { input: "", output: "" };
    firstBackendAudioLoggedRef.current = false;

    try {
      const backendWsUrls = getBackendWebSocketCandidates();
      const useFastApiBackend = backendWsUrls.length > 0;

      const playbackContext = useFastApiBackend ? new AudioContext({ sampleRate: 24000 }) : null;
      playbackContextRef.current = playbackContext;
      const playbackResume = playbackContext?.resume().then(
        () => null,
        (error) => error instanceof Error ? error : new Error("Unable to start speaker output."),
      );

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await raceWithStartupAbort(audioContextRef.current.resume(), signal);
      if (audioContextRef.current.state !== "running") {
        throw new Error("Audio output is blocked by the browser. Allow sound for this site, then try again.");
      }

      await raceWithStartupAbort(audioContextRef.current.audioWorklet.addModule(appPath("/audio-processor.js")), signal);

      if (useFastApiBackend) {
        if (!playbackContext) throw new Error("Audio playback could not be initialized.");

        const webSocketConnectStartedAt = performance.now();
        const { socket: ws, url: connectedUrl } = await connectToBackendWebSocket(signal);
        const webSocketConnectedAt = performance.now();
        logStartupTiming("websocket_open", webSocketConnectStartedAt);
        ws.binaryType = "arraybuffer";
        sessionRef.current = ws;

        console.info("[AI Viva backend] WebSocket connected", { url: connectedUrl });
        setStartupStage("websocket");
        let readyAcknowledged = false;
        backendSessionReadyRef.current = false;
        let resolveSessionReady!: () => void;
        let rejectSessionReady!: (error: Error) => void;
        const sessionReady = new Promise<void>((resolve, reject) => {
          resolveSessionReady = resolve;
          rejectSessionReady = reject;
        });
        let resolveFirstModelResponse!: () => void;
        let rejectFirstModelResponse!: (error: Error) => void;
        let waitingForFirstModelResponse = false;
        let openingPromptSentAt: number | null = null;
        const firstModelResponse = new Promise<void>((resolve, reject) => {
          resolveFirstModelResponse = resolve;
          rejectFirstModelResponse = reject;
        });
        void firstModelResponse.catch(() => {});
        let firstModelAudioTimeout: ReturnType<typeof setTimeout> | null = null;
        const markFirstModelResponse = () => {
          if (!waitingForFirstModelResponse) return;
          waitingForFirstModelResponse = false;
          if (firstModelAudioTimeout) clearTimeout(firstModelAudioTimeout);
          firstModelAudioTimeout = null;
          setStartupStage("ready");
          readyRef.current = true;
          setActive(true);
          logStartupTiming("first_model_response", openingPromptSentAt ?? startupStartedAt);
          resolveFirstModelResponse();
        };
        const readyTimeout = setTimeout(() => {
          rejectSessionReady(new Error("The backend did not prepare the viva session in time. Check the backend process and retry."));
        }, 45000);

        ws.onerror = (event) => {
          console.error("[AI Viva backend] WebSocket error", { url: connectedUrl, event });
          clearTimeout(readyTimeout);
          const message = new Error(`Backend WebSocket failed at ${connectedUrl}.`);
          rejectSessionReady(message);
          if (waitingForFirstModelResponse) {
            if (firstModelAudioTimeout) clearTimeout(firstModelAudioTimeout);
            rejectFirstModelResponse(message);
          }
        };

        ws.onclose = (event) => {
          console.error("[AI Viva backend] WebSocket closed", {
            url: connectedUrl,
            code: event.code,
            reason: event.reason || "(no reason provided)",
            wasClean: event.wasClean,
            readyState: ws.readyState,
          });
          clearTimeout(readyTimeout);
          setActive(false);
          readyRef.current = false;
          if (!readyAcknowledged) {
            rejectSessionReady(new Error(`Backend closed during startup (${event.code}: ${event.reason || "no reason provided"}).`));
          } else if (waitingForFirstModelResponse) {
            if (firstModelAudioTimeout) clearTimeout(firstModelAudioTimeout);
            rejectFirstModelResponse(new Error(`Gemini Live disconnected before returning an opening response (${event.code}: ${event.reason || "no reason provided"}).`));
          } else if (event.code !== 1000) {
            setBackendError(`Backend connection closed (${event.code}: ${event.reason || "no reason provided"}).`);
          }
        };

        ws.onmessage = (event) => {
            const payload = parseBackendPayload(event.data);

            if (!payload) return;

            if (payload.type === "show_exhibit") {
              const exhibitId = typeof payload.exhibit_id === "string" ? payload.exhibit_id : "";
              if (exhibitId) {
                liveExhibitIdRef.current = exhibitId;
                examinerPromptedExhibitRef.current = false;
                candidateSpokeSinceExhibitRef.current = false;
                setLiveExhibitId(exhibitId);
              }
              return;
            }

            if (payload.type === "interrupt_playback") {
              stopPlayback();
              return;
            }

            if (payload.type === "exit_confirmation_required") {
              transcriptPartsRef.current.input = "";
              setCandidateLiveTranscript("");
              return;
            }

            if (payload.type === "session_end") {
              const reason = typeof payload.reason === "string" ? payload.reason : "session_complete";
              const context = playbackContextRef.current;
              const playbackDelay = context
                ? Math.max(0, (nextPlayTimeRef.current - context.currentTime) * 1000)
                : 0;
              if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
              sessionEndTimerRef.current = setTimeout(() => {
                sessionEndTimerRef.current = null;
                setSessionEndReason(reason);
              }, Math.ceil(playbackDelay) + 150);
              return;
            }

            if (payload.type === "session_ready") {
              readyAcknowledged = true;
              backendSessionReadyRef.current = true;
              backendSessionReadyRef.current = true;
              clearTimeout(readyTimeout);
              console.info("[AI Viva backend] Session accepted", { url: connectedUrl });
              logStartupTiming("backend_session_ready", webSocketConnectedAt);
              resolveSessionReady();
              return;
            }

            if (payload.type === "session_error") {
              const message = typeof payload.error === "string" ? payload.error : "Backend rejected the viva startup payload.";
              console.error("[AI Viva backend] Session startup rejected", { url: connectedUrl, message });
              setBackendError(message);
              clearTimeout(readyTimeout);
              if (firstModelAudioTimeout) clearTimeout(firstModelAudioTimeout);
              rejectSessionReady(new Error(message));
              rejectFirstModelResponse(new Error(message));
              return;
            }

            console.info("[AI Viva backend] Response", summarizeBackendPayload(payload));

            if (payload.binary) {
              const audioBuffer = payload.binary instanceof Blob ? payload.binary : new Blob([payload.binary]);
              void audioBuffer.arrayBuffer().then((buffer: ArrayBuffer) => {
                if (buffer.byteLength < 2 || buffer.byteLength % 2 !== 0) return;
                noteExaminerOutputForExhibit();
                markFirstModelResponse();
                playBackendPcm(buffer);
              });
              return;
            }

            const parts = payload.content?.parts ?? payload.parts ?? [];
            const eventHasFunctionCall = parts.some((part: any) => Boolean(part.functionCall ?? part.function_call));
            const outputText = payload.outputTranscription?.text ?? payload.output_transcription?.text;
            if (
              payload.author !== "user" &&
              ((typeof outputText === "string" && outputText.trim()) ||
                parts.some((part: any) => typeof part.text === "string" && part.text.trim()))
            ) {
              markFirstModelResponse();
            }

            for (const part of parts) {
              const inlineData = part.inlineData ?? part.inline_data;
              const mimeType = inlineData?.mimeType ?? inlineData?.mime_type;
              const data = inlineData?.data;

              if (mimeType?.toLowerCase().startsWith("audio/pcm") && typeof data === "string") {
                const audioData = decodeBase64Audio(data);
                if (!audioData || audioData.byteLength < 2 || audioData.byteLength % 2 !== 0) {
                  console.warn("[AI Viva audio] Ignoring invalid PCM audio chunk", {
                    mimeType,
                    encodedLength: data.length,
                  });
                  continue;
                }
                noteExaminerOutputForExhibit();
                markFirstModelResponse();
                const sampleRate = Number(/rate=(\d+)/i.exec(mimeType)?.[1]) || 24000;
                playBackendPcm(audioData, sampleRate);
              }
            }

            const inputText = payload.inputTranscription?.text ?? payload.input_transcription?.text;
            if (typeof inputText === "string" && inputText) {
              candidateSpeechVersionRef.current += 1;
              if (silenceCheckInTimerRef.current) clearTimeout(silenceCheckInTimerRef.current);
              silenceCheckInTimerRef.current = null;
              if (liveExhibitIdRef.current && examinerPromptedExhibitRef.current && !eventHasFunctionCall) {
                candidateSpokeSinceExhibitRef.current = true;
              }
              const isNewCandidateTurn = !transcriptPartsRef.current.input;
              const delta = inputText.startsWith(transcriptPartsRef.current.input)
                ? inputText.slice(transcriptPartsRef.current.input.length)
                : inputText;
              transcriptPartsRef.current.input = inputText;
              appendTranscript("candidate", delta);
              setCandidateLiveTranscript((current) => {
                if (isNewCandidateTurn) return inputText;
                return inputText.startsWith(current) ? inputText : `${current} ${delta}`.trim();
              });
            }

            if (typeof outputText === "string" && outputText) {
              noteExaminerOutputForExhibit();
              const delta = outputText.startsWith(transcriptPartsRef.current.output)
                ? outputText.slice(transcriptPartsRef.current.output.length)
                : outputText;
              transcriptPartsRef.current.output = outputText;
              appendTranscript("ai", delta);
              setTranscript(outputText);
            } else {
              for (const part of parts) {
                const textValue = typeof part.text === "string" ? part.text : "";
                if (textValue.trim()) {
                  noteExaminerOutputForExhibit();
                  appendTranscript("ai", textValue);
                  setTranscript((current) => `${current} ${textValue}`.trim());
                }
              }
            }

            if (payload.interrupted) {
              stopPlayback();
            }

            if (payload.turnComplete || payload.turn_complete) {
              const hasModelOutput = Boolean(outputText) || parts.some((part: any) =>
                Boolean(part.text || part.inlineData || part.inline_data),
              );
              const isExaminerTurn = payload.author !== "user" && hasModelOutput;
              if (isExaminerTurn) {
                if (silenceCheckInTimerRef.current) clearTimeout(silenceCheckInTimerRef.current);
                const playbackContext = playbackContextRef.current;
                const queuedAudioMs = playbackContext
                  ? Math.max(0, (nextPlayTimeRef.current - playbackContext.currentTime) * 1000)
                  : 0;
                const armSilenceCheck = (speechVersion: number, delayMs: number) => {
                  silenceCheckInTimerRef.current = setTimeout(() => {
                    silenceCheckInTimerRef.current = null;
                    if (speechVersion !== candidateSpeechVersionRef.current || micSpeechActiveRef.current) {
                      armSilenceCheck(candidateSpeechVersionRef.current, 5000);
                      return;
                    }

                    const socket = sessionRef.current;
                    if (
                      !backendSessionReadyRef.current ||
                      !(socket instanceof WebSocket) ||
                      socket.readyState !== WebSocket.OPEN
                    ) return;
                    socket.send(JSON.stringify({ type: "candidate_silence_timeout" }));
                  }, delayMs);
                };
                armSilenceCheck(
                  candidateSpeechVersionRef.current,
                  Math.ceil(queuedAudioMs) + 5000,
                );
              }
              transcriptPartsRef.current = { input: "", output: "" };
            }

            const payloadText = typeof payload.text === "string" ? payload.text :
              typeof payload.message === "string" ? payload.message :
              typeof payload.question === "string" ? payload.question :
              typeof payload.response === "string" ? payload.response : "";

            if (!payloadText) return;
            noteExaminerOutputForExhibit();
            appendTranscript("ai", payloadText);
            setTranscript((prev) => `${prev} ${payloadText}`.trim());
        };

        const startupPayload = normalizeSessionStartPayload({
          candidate: {
            name: candidate?.name?.trim() || "candidate",
            email: candidate?.email?.trim() || "",
          },
          case: withBackendDurationBuffer(vivaCase),
          meta: { source: "urologics-web" },
        });
        const authoritativeCase = {
          ...startupPayload.case,
          session_authority: "This case replaces every sample case and rubric in any agent instructions. Use only this API case, its exhibits, rules, and marking criteria. Do not import diagnoses or marking points from another case.",
        };

        ws.send(JSON.stringify({
          ...startupPayload,
          case: authoritativeCase,
          examiner: examiner ? {
            id: examiner.id,
            name: examiner.name,
            title: examiner.title,
            personality: examiner.personality,
            languageCode: examiner.languageCode,
          } : undefined,
          mode,
        }));
        await raceWithStartupAbort(sessionReady, signal);
        if (ws.readyState !== WebSocket.OPEN) {
          throw new Error("Backend WebSocket closed after accepting the viva session.");
        }

        setStartupStage("speaker");
        const playbackError = await raceWithStartupAbort(Promise.resolve(playbackResume), signal);
        if (playbackError) throw playbackError;
        if (playbackContext.state !== "running") {
          throw new Error("Speaker output is not ready. Play the speaker test and check your selected output device.");
        }

        setStartupStage("microphone");
        const microphoneSetupStartedAt = performance.now();
        micStreamRef.current = await getUserMediaForStartup({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(micDeviceId ? { deviceId: { exact: micDeviceId } } : {}),
          },
        }, signal);

        const micSource = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
        const processor = new AudioWorkletNode(audioContextRef.current, "audio-processor");
        processorRef.current = processor;
        const silentGain = audioContextRef.current.createGain();
        silentGain.gain.value = 0;
        silentGainRef.current = silentGain;

        let resolveFirstFrame!: () => void;
        let rejectFirstFrame!: (error: Error) => void;
        const firstMicFrame = new Promise<void>((resolve, reject) => {
          resolveFirstFrame = resolve;
          rejectFirstFrame = reject;
        });
        let firstFrameSeen = false;

        processor.port.onmessage = (e) => {
          const pcmData = e.data;
          const samples = new Int16Array(
            pcmData.buffer,
            pcmData.byteOffset,
            pcmData.byteLength / Int16Array.BYTES_PER_ELEMENT,
          );
          let energy = 0;
          for (let index = 0; index < samples.length; index += 1) {
            const sample = samples[index] / 32768;
            energy += sample * sample;
          }
          const rms = Math.sqrt(energy / Math.max(samples.length, 1));
          if (rms >= 0.015) {
            micSilenceFramesRef.current = 0;
            micSpeechStartFramesRef.current += 1;
            if (micSpeechStartFramesRef.current >= 3 && !micSpeechActiveRef.current) {
              micSpeechActiveRef.current = true;
              candidateSpeechVersionRef.current += 1;
              if (silenceCheckInTimerRef.current) clearTimeout(silenceCheckInTimerRef.current);
              silenceCheckInTimerRef.current = null;
              const activeSocket = sessionRef.current;
              if (activeSocket instanceof WebSocket && activeSocket.readyState === WebSocket.OPEN) {
                activeSocket.send(JSON.stringify({ type: "candidate_speech_activity" }));
              }
            }
          } else {
            micSpeechStartFramesRef.current = 0;
            micSilenceFramesRef.current += 1;
            if (micSilenceFramesRef.current >= 10) micSpeechActiveRef.current = false;
          }
          if (ws.readyState !== WebSocket.OPEN) {
            if (!firstFrameSeen) rejectFirstFrame(new Error("Backend WebSocket closed before microphone audio was sent."));
            return;
          }
          if (initialPromptSentRef.current) {
            try {
              ws.send(pcmData.buffer.slice(pcmData.byteOffset, pcmData.byteOffset + pcmData.byteLength));
            } catch {
              if (!firstFrameSeen) rejectFirstFrame(new Error("Microphone audio could not be sent to the backend."));
              return;
            }
          }
          if (!firstFrameSeen) {
            firstFrameSeen = true;
            resolveFirstFrame();
          }
        };

        micSource.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(audioContextRef.current.destination);

        let micFrameTimeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await raceWithStartupAbort(Promise.race([
            firstMicFrame,
            new Promise<never>((_, reject) => {
              micFrameTimeout = setTimeout(() => reject(new Error("Microphone audio is not reaching the backend live session.")), 5000);
            }),
          ]), signal);
        } finally {
          if (micFrameTimeout) clearTimeout(micFrameTimeout);
        }
        logStartupTiming("microphone_ready", microphoneSetupStartedAt);

        if (ws.readyState !== WebSocket.OPEN) {
          throw new Error("Backend WebSocket closed during microphone startup.");
        }
        if (audioContextRef.current.state !== "running") {
          throw new Error("Microphone audio processing stopped before the viva was ready.");
        }

        setStartupStage("gemini");
        waitingForFirstModelResponse = true;
        firstModelAudioTimeout = setTimeout(() => {
          waitingForFirstModelResponse = false;
          firstModelAudioTimeout = null;
          logStartupTiming("first_model_response_timeout", openingPromptSentAt ?? startupStartedAt);
          rejectFirstModelResponse(new Error("Gemini Live did not return an opening response. Check backend model access and retry."));
        }, FIRST_MODEL_RESPONSE_TIMEOUT_MS);
        const candidateName = candidate?.name?.trim() || "there";
        initialPromptSentRef.current = true;
        openingPromptSentAt = performance.now();
        ws.send(JSON.stringify({
          type: "text",
          text: `Please begin the viva. My name is ${candidateName}.`,
        }));
        logStartupTiming("opening_prompt_sent", openingPromptSentAt);
        await raceWithStartupAbort(firstModelResponse, signal);
        return;
      }

      const res = await raceWithStartupAbort(fetch(appPath("/api/viva/live/session"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          caseId: vivaCase?.id,
          case: withBackendDurationBuffer(vivaCase),
          candidate: {
            name: candidate?.name?.trim() || "candidate",
            email: candidate?.email?.trim() || "",
          },
          examinerId: examiner?.id,
          mode,
        }),
        signal,
      }), signal);
      const payload = (await raceWithStartupAbort(res.json(), signal)) as {
        token?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok || !payload.token || !payload.model) {
        throw new Error(payload.error || "Unable to prepare the Gemini Live session.");
      }
      const { token, model } = payload;

      const live = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" }
      });

      let resolveSetup!: () => void;
      let rejectSetup!: (error: Error) => void;
      let setupWasReady = false;
      let socketClosed = false;
      const setupComplete = new Promise<void>((resolve, reject) => {
        resolveSetup = resolve;
        rejectSetup = reject;
      });
      let connectTimeout: ReturnType<typeof setTimeout> | undefined;
      const connectTimedOut = new Promise<never>((_, reject) => {
        connectTimeout = setTimeout(() => reject(new Error("Timed out connecting to the Gemini Live WebSocket.")), 30000);
      });

      try {
        const liveConnectPromise = live.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => setStartupStage("websocket"),
            onmessage: (msg: any) => {
              if (msg.setupComplete) {
                setupWasReady = true;
                setStartupStage("gemini");
                resolveSetup();
                return;
              }
              if (msg.serverContent?.modelTurn?.parts) {
                msg.serverContent.modelTurn.parts.forEach((part: any) => {
                  if (part.inlineData?.mimeType?.includes("audio/pcm")) {
                    playAudioChunk(part.inlineData.data);
                  }
                  if (part.text) {
                    setTranscript(prev => prev + " " + part.text);
                  }
                });
              }
              if (msg.serverContent?.interrupted) {
                stopPlayback();
              }
              const inputText = msg.serverContent?.inputTranscription?.text;
              if (inputText) {
                const isNewCandidateTurn = !transcriptPartsRef.current.input;
                const delta = inputText.startsWith(transcriptPartsRef.current.input)
                  ? inputText.slice(transcriptPartsRef.current.input.length)
                  : inputText;
                transcriptPartsRef.current.input = inputText;
                appendTranscript("candidate", delta);
                setCandidateLiveTranscript((current) => {
                  if (isNewCandidateTurn) return inputText;
                  return inputText.startsWith(current) ? inputText : `${current} ${delta}`.trim();
                });
              }
              const outputText = msg.serverContent?.outputTranscription?.text;
              if (outputText) {
                const delta = outputText.startsWith(transcriptPartsRef.current.output)
                  ? outputText.slice(transcriptPartsRef.current.output.length)
                  : outputText;
                transcriptPartsRef.current.output = outputText;
                appendTranscript("ai", delta);
                setTranscript(outputText);
              }
            },
            onerror: (err: any) => {
              console.error("Live Error:", err);
              const message = err?.message || err?.error?.message || "Gemini Live connection failed.";
              rejectSetup(new Error(message));
              stopSession();
            },
            onclose: () => {
              socketClosed = true;
              setActive(false);
              readyRef.current = false;
              if (!setupWasReady) rejectSetup(new Error("Gemini closed the connection before the live session was ready."));
            },
          }
        });
        void liveConnectPromise.then((session) => {
          if (signal?.aborted) session.close();
        }, () => {});
        sessionRef.current = await raceWithStartupAbort(Promise.race([liveConnectPromise, connectTimedOut]), signal);
      } finally {
        if (connectTimeout) clearTimeout(connectTimeout);
      }

      setStartupStage((current) => current === "server" ? "websocket" : current);
      const setupTimeout = setTimeout(() => rejectSetup(new Error("Timed out waiting for Gemini Live session setup.")), 20000);
      try {
        await raceWithStartupAbort(setupComplete, signal);
      } finally {
        if (setupTimeout) clearTimeout(setupTimeout);
      }

      setStartupStage("microphone");
      micStreamRef.current = await getUserMediaForStartup({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(micDeviceId ? { deviceId: { exact: micDeviceId } } : {}),
        }
      }, signal);

      const micSource = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
      const processor = new AudioWorkletNode(audioContextRef.current, "audio-processor");
      processorRef.current = processor;
      const silentGain = audioContextRef.current.createGain();
      silentGain.gain.value = 0;
      silentGainRef.current = silentGain;
      let resolveFirstFrame!: () => void;
      const firstMicFrame = new Promise<void>((resolve) => { resolveFirstFrame = resolve; });
      let firstFrameSeen = false;

      processor.port.onmessage = (e) => {
        const pcmData = e.data;
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        sessionRef.current?.sendRealtimeInput({
          audio: { mimeType: "audio/pcm;rate=16000", data: base64 },
        });
        if (!firstFrameSeen) {
          firstFrameSeen = true;
          resolveFirstFrame();
        }
      };

      micSource.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContextRef.current.destination);
      let micFrameTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await raceWithStartupAbort(Promise.race([
          firstMicFrame,
          new Promise<never>((_, reject) => {
            micFrameTimeout = setTimeout(() => reject(new Error("Microphone audio is not reaching the live session. Check the selected input device.")), 5000);
          }),
        ]), signal);
      } finally {
        if (micFrameTimeout) clearTimeout(micFrameTimeout);
      }
      if (socketClosed) throw new Error("Gemini Live disconnected during microphone startup. Please try again.");
      setStartupStage("ready");
      readyRef.current = true;
      setActive(true);
    } catch (err) {
      if (!signal?.aborted) {
        console.error("Failed to start live session:", err);
        setBackendError(err instanceof Error ? err.message : "Unable to start the live viva.");
      }
      setStartupStage("error");
      await stopSession();
      throw err;
    } finally {
      setConnecting(false);
    }
  }, [candidate, vivaCase, idToken, playAudioChunk, playBackendPcm, stopSession, stopPlayback, appendTranscript, noteExaminerOutputForExhibit]);

  const beginViva = useCallback(() => {
    if (!sessionRef.current || !readyRef.current) throw new Error("The Gemini Live session is not ready yet.");
    if (sessionRef.current instanceof WebSocket && initialPromptSentRef.current) return;
    const candidateName = candidate?.name?.trim() || "there";
    const openingPrompt = `Please begin the viva. My name is ${candidateName}.`;

    if (typeof (sessionRef.current as any).sendClientContent === "function") {
      (sessionRef.current as any).sendClientContent({
        turns: [{ role: "user", parts: [{ text: openingPrompt }] }],
        turnComplete: true,
      });
      return;
    }

    if (sessionRef.current instanceof WebSocket && sessionRef.current.readyState === WebSocket.OPEN) {
      sessionRef.current.send(JSON.stringify({
        type: "text",
        text: openingPrompt,
      }));
    }
  }, [candidate]);

  const sendSessionControl = useCallback((type: string, confirmed?: boolean) => {
    const socket = sessionRef.current;
    if (!(socket instanceof WebSocket) || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, ...(confirmed === undefined ? {} : { confirmed }) }));
    return true;
  }, []);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    active,
    connecting,
    startSession,
    beginViva,
    sendSessionControl,
    stopSession,
    resumeAudioOutput,
    transcript,
    candidateLiveTranscript,
    liveExhibitId,
    clearLiveExhibit,
    speaking,
    turns,
    amplitude,
    startupStage,
    backendError,
    sessionEndReason,
  };
}
