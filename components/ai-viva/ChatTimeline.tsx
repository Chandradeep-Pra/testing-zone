"use client";

import { useEffect, useRef } from "react";
import { Bot, UserRound } from "lucide-react";
import MicLevelMeter from "./MicLevelMeter";

type ChatMessage =
  | { id?: string; role: "ai" | "candidate"; text: string; live?: boolean }
  | { id?: string; role: "image"; src: string; description?: string };

export default function ChatTimeline({
  messages,
  micLevel = 0,
  listening = false,
}: {
  messages: ChatMessage[];
  micLevel?: number;
  listening?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const transcriptMessages = messages.filter((message) => {
    if (message.role === "image") return true;
    return message.text.trim().length > 0;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [transcriptMessages]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {transcriptMessages.map((msg) => {
          if (msg.role === "ai") {
            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="mt-1">
                  <Bot size={18} className="text-[#0f7896]" />
                </div>

                <div
                  className="
                    max-w-[85%]
                    rounded-2xl
                    border border-[#0f7896]/12
                    bg-cyan-50
                    px-4 py-3
                    text-sm
                    leading-relaxed
                    text-[#071014]
                  "
                >
                  {msg.text}
                </div>
              </div>
            );
          }

          if (msg.role === "candidate") {
            return (
              <div key={msg.id} className="flex items-start justify-end gap-3">
                <div
                  className={`
                    max-w-[85%]
                    rounded-2xl
                    border border-[#0f7896]/12
                    bg-[#0f7896]
                    px-4 py-3
                    text-sm
                    leading-relaxed
                    text-white
                    ${msg.live ? "italic opacity-80" : "not-italic opacity-100"}
                  `}
                >
                  {msg.text}
                </div>

                <div className="mt-1">
                  <UserRound size={18} className="text-[#0f7896]" />
                </div>
              </div>
            );
          }

          if (msg.role === "image") {
            return (
              <div key={msg.id} className="space-y-2 rounded-2xl border border-[#0f7896]/12 bg-white p-3">

              <div className="text-[11px] uppercase tracking-[0.22em] text-[#0f7896]">
                Image shown
              </div>

              <img
                src={msg.src}
                alt="Exhibit"
                className="
                  rounded-xl
                  max-h-[240px]
                  w-full
                  object-contain
                "
              />

              {/* {msg.description && (
                <div className="text-xs text-slate-400">
                  {msg.description}
                </div>
              )} */}

              </div>
            );
          }
        })}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[#0f7896]/12 p-3">
        <MicLevelMeter
          active={listening}
          level={micLevel}
          label="Candidate microphone"
          helper={listening ? "Live level from the active viva microphone." : "Mic meter appears when the viva is listening."}
        />
      </div>
    </div>
  );
}
