import { useState, useRef, useCallback, useEffect } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { appPath } from "@/lib/app-path";

type LiveCallbacks = {
  onInputTranscript?: (text: string) => void;
  onInputTurnComplete?: (text: string) => void;
  onInterruption?: () => void;
};

export function useGeminiLive(vivaCase: any, persona: any, callbacks: LiveCallbacks = {}) {
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [candidateLiveTranscript, setCandidateLiveTranscript] = useState("");
  const [liveExhibitId, setLiveExhibitId] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Array<{ role: "ai" | "candidate"; text: string }>>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [history, setHistory] = useState<Array<{ question: string; answer: string }>>([]);
  
  const sessionRef = useRef<any>(null);
  const liveExhibitIdRef = useRef<string | null>(null);
  const examinerPromptedExhibitRef = useRef(false);
  const candidateSpokeSinceExhibitRef = useRef(false);
  const readyRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const nextPlayTimeRef = useRef(0);
  const currentAnswerRef = useRef("");
  const callbacksRef = useRef(callbacks);
  const pendingSpeechRef = useRef<(() => void) | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const answerSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerReportedRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const stopSession = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    audioSourcesRef.current.forEach((source) => source.stop());
    audioSourcesRef.current.clear();
    micStreamRef.current?.getTracks().forEach(track => track.stop());
    micGainRef.current?.disconnect();
    micGainRef.current = null;
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
    setAmplitude(0);
    pendingSpeechRef.current?.();
    pendingSpeechRef.current = null;
    if (answerSilenceTimerRef.current) clearTimeout(answerSilenceTimerRef.current);
    answerSilenceTimerRef.current = null;
    answerReportedRef.current = false;
  }, []);

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
    audioSourcesRef.current.add(source);
    source.onended = () => audioSourcesRef.current.delete(source);
    
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

  const startSession = useCallback(async (examiner?: ExaminerVoice, mode: VivaMode = "calm", micDeviceId?: string) => {
    readyRef.current = false;
    initialPromptSentRef.current = false;
    setConnecting(true);
    setStartupStage("server");
    setBackendError(null);
    setTranscript("");
    setHistory([]);
    currentAnswerRef.current = "";
    answerReportedRef.current = false;
    try {
      const res = await fetch(appPath("/api/viva/live/session"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          caseId: vivaCase?.id,
          case: vivaCase,
          candidate: {
            name: candidate?.name?.trim() || "candidate",
            email: candidate?.email?.trim() || "",
          },
          examinerId: examiner?.id,
          mode,
        }),
      });
      const payload = (await res.json()) as {
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

      // 1. Setup Audio Context
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      await audioContextRef.current.audioWorklet.addModule(appPath("/audio-processor.js"));

      // 2. Connect to Gemini Live
      sessionRef.current = await live.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (msg: any) => {
            const inputText = msg.serverContent?.inputTranscription?.text;
            if (typeof inputText === "string" && inputText.trim()) {
              currentAnswerRef.current += ` ${inputText.trim()}`;
              callbacksRef.current.onInputTranscript?.(currentAnswerRef.current.trim());
            }

            if (msg.serverContent?.modelTurn?.parts) {
              msg.serverContent.modelTurn.parts.forEach((part: any) => {
                if (part.inlineData?.mimeType?.includes("audio/pcm")) {
                  playAudioChunk(part.inlineData.data);
                }
                if (part.text) setTranscript(prev => prev + " " + part.text);
              });
            }
            
            if (msg.serverContent?.interrupted) {
              audioSourcesRef.current.forEach((source) => source.stop());
              audioSourcesRef.current.clear();
              nextPlayTimeRef.current = 0;
              pendingSpeechRef.current?.();
              pendingSpeechRef.current = null;
              callbacksRef.current.onInterruption?.();
            }

            if (msg.serverContent?.turnComplete) {
              if (pendingSpeechRef.current) {
                pendingSpeechRef.current();
                pendingSpeechRef.current = null;
              } else if (currentAnswerRef.current.trim() && !answerReportedRef.current) {
                const answer = currentAnswerRef.current.trim();
                currentAnswerRef.current = "";
                answerReportedRef.current = true;
                callbacksRef.current.onInputTurnComplete?.(answer);
              }
            }
          },
          onerror: (err: any) => {
            console.error("Live Error:", err);
            stopSession();
          },
          onclose: () => setActive(false),
        }
      });

      try {
        sessionRef.current = await Promise.race([live.live.connect({
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
        }), connectTimedOut]);
      } finally {
        if (connectTimeout) clearTimeout(connectTimeout);
      }

      setStartupStage((current) => current === "server" ? "websocket" : current);
      let setupTimeout: ReturnType<typeof setTimeout> | undefined;
      setupTimeout = setTimeout(() => rejectSetup(new Error("Timed out waiting for Gemini Live session setup.")), 20000);
      try {
        await setupComplete;
      } finally {
        if (setupTimeout) clearTimeout(setupTimeout);
      }

      setStartupStage("microphone");
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(micDeviceId ? { deviceId: { exact: micDeviceId } } : {}),
        }
      });

      const micSource = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
      const processor = new AudioWorkletNode(audioContextRef.current, "audio-processor");
      micSourceRef.current = micSource;
      processorRef.current = processor;
      
      processor.port.onmessage = (e) => {
        const pcmData = e.data; // Int16Array from processor
        let sum = 0;
        for (let index = 0; index < pcmData.length; index += 1) {
          const sample = pcmData[index] / 32768;
          sum += sample * sample;
        }
        setAmplitude(pcmData.length ? Math.min(1, Math.sqrt(sum / pcmData.length) * 4.5) : 0);
        const level = pcmData.length ? Math.sqrt(sum / pcmData.length) : 0;
        if (level > 0.012) {
          answerReportedRef.current = false;
          if (answerSilenceTimerRef.current) clearTimeout(answerSilenceTimerRef.current);
          answerSilenceTimerRef.current = setTimeout(() => {
            const answer = currentAnswerRef.current.trim();
            if (answer && !answerReportedRef.current) {
              currentAnswerRef.current = "";
              answerReportedRef.current = true;
              callbacksRef.current.onInputTurnComplete?.(answer);
            }
          }, 1400);
        }
        // Convert to base64 for Gemini
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        if (sessionRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64,
              },
            });
          } catch {
            // The socket may close between an audio callback and cleanup.
          }
        }
      };

      micSource.connect(processor);
  const silentGain = audioContextRef.current.createGain();
  silentGain.gain.value = 0;
  processor.connect(silentGain);
  silentGain.connect(audioContextRef.current.destination);
  micGainRef.current = silentGain;
      setActive(true);
    } catch (err) {
      console.error("Failed to start live session:", err);
      setBackendError(err instanceof Error ? err.message : "Unable to start the live viva.");
      setStartupStage("error");
      stopSession();
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

  const speakText = useCallback((text: string) => {
    if (!sessionRef.current) return Promise.reject(new Error("Live session is not connected."));
    return new Promise<void>((resolve) => {
      pendingSpeechRef.current = resolve;
      sessionRef.current.sendClientContent({
        turns: [{
          role: "user",
          parts: [{
            text: `Speak exactly the following examiner text and do not add anything else: ${text}`,
          }],
        }],
        turnComplete: true,
      });
    });
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
    stopSession,
    speakText,
    transcript,
    candidateLiveTranscript,
    liveExhibitId,
    clearLiveExhibit,
    speaking,
    turns,
    amplitude,
    history,
  };
}
