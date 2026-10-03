"use client";

import React from "react";
import SiriWaveComponent from "./SiriWaveForm";

type Props = {
  speaking: boolean;
  thinking?: boolean;
  transcript: string;
  exhibit?: React.ReactNode;
  amplitude?: number;
  keywordDetected?: boolean;
  avatarVideo?: React.ReactNode;
  liveMode?: boolean;
  liveQuestion?: string;
  liveUserTranscript?: string;
  liveMessages?: Array<{
    id: string;
    role: "ai" | "candidate" | "image";
    text?: string;
    live?: boolean;
  }>;
};

export function AiPanel({
  speaking,
  thinking = false,
  transcript,
  exhibit,
  amplitude = 0,
  keywordDetected = false,
  avatarVideo,
  liveMode = false,
  liveQuestion = "",
  liveUserTranscript = "",
  liveMessages = [],
}: Props) {
  const [filler, setFiller] = useState("");
  const liveEndRef = React.useRef<HTMLDivElement | null>(null);
  // Keep an investigation visible while the examiner asks the candidate to
  // interpret it. Previously it was hidden for the entire spoken question.
  const activeExhibit = exhibit;

  useEffect(() => {
    if (!thinking || speaking) {
      return;
    }

    let i = 0;
    const interval = setInterval(() => {
      setFiller(fillers[i % fillers.length]);
      i += 1;
    }, 1800);
    return () => {
      clearInterval(interval);
    };
  }, [thinking, speaking]);

  useEffect(() => {
    if (!liveMode) return;
    liveEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [liveMessages, liveMode, liveQuestion, liveUserTranscript]);

  const statusText = speaking ? "Speaking" : thinking ? "Thinking" : "Listening";
  const visibleTranscript = thinking ? filler || fillers[0] : transcript;

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#111315] transition-colors duration-500 ${speaking ? "bg-[#121817]" : ""}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-[15%] flex justify-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/40 sm:top-[18%]">
        <span className={`flex items-center gap-2 ${speaking ? "text-emerald-200/80" : ""}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${speaking ? "animate-pulse bg-emerald-300" : thinking ? "animate-pulse bg-white/60" : "bg-white/30"}`} />
          {keywordDetected ? "Key point heard" : statusText}
        </span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-transparent">
        {liveMode ? (
          <div className="flex h-full w-full flex-col overflow-y-auto px-5 pb-24 pt-20 sm:px-10">
            <div className="mt-auto flex flex-col gap-3">
              {liveMessages
                .filter((message) => message.role !== "image" && message.text?.trim())
                .map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm transition-all duration-300 ${
                      message.role === "ai"
                        ? "self-start rounded-bl-md border border-cyan-300/20 bg-cyan-50 text-slate-900"
                        : "self-end rounded-br-md border border-teal-300/20 bg-teal-600 text-white"
                    } ${message.live ? "opacity-80" : "opacity-100"}`}
                  >
                    {message.text}
                  </div>
                ))}
              {liveMessages.length === 0 && liveQuestion ? (
                <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md border border-cyan-300/20 bg-cyan-50 px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm">
                  {liveQuestion}
                </div>
              ) : null}
              {liveMessages.length === 0 && liveUserTranscript ? (
                <div className="max-w-[85%] self-end rounded-2xl rounded-br-md border border-teal-300/20 bg-teal-600 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                  {liveUserTranscript}
                </div>
              ) : null}
              <div ref={liveEndRef} />
            </div>
          </div>
        ) : avatarVideo ? (
          <div className="h-full w-full">{avatarVideo}</div>
        ) : (
          <div className="flex h-[220px] w-full items-center justify-center sm:h-[300px]">
            <div className={`transition-opacity duration-700 ${speaking ? "opacity-100" : "opacity-55"}`}>
              <SiriWaveComponent amplitude={speaking ? amplitude : thinking ? 0.2 : 0.08} speed={speaking ? 0.08 : 0.025} />
            </div>
          </div>
        )}
      </div>

      {activeExhibit && (
        <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3">
          {activeExhibit}
        </div>
      )}

      {!liveMode && (visibleTranscript || thinking) && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2
          max-w-2xl w-[80%]
          bg-black/45 backdrop-blur-xl
          px-6 py-4 rounded-xl
          text-base text-center text-slate-100
          border border-white/10
          max-h-40 overflow-y-auto"
        >
          {visibleTranscript}
        </div>
      )}
    </div>
  );
}
