"use client";

import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";

type ChatMessage =
  | { id?: string; role: "ai" | "candidate"; text: string; live?: boolean }
  | { id?: string; role: "image"; src: string; description?: string };

export default function ChatTimeline({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const questionMessages = messages.filter(
    (message) => message.role === "ai" || message.role === "image"
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [questionMessages]);

  return (
    <div className="h-full space-y-4 overflow-y-auto bg-white p-4">

      {questionMessages.map((msg) => {
        if (msg.role === "ai") {
          return (
            <div key={msg.id} className="flex gap-3 items-start">

              <div className="mt-1">
                <Bot size={18} className="text-[#0f7896]" />
              </div>

              <div
                className="
                  bg-cyan-50
                  border border-[#0f7896]/12
                  rounded-2xl
                  px-4 py-3
                  text-sm
                  leading-relaxed
                  text-[#071014]
                  max-w-[85%]
                "
              >
                {msg.text}
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
  );
}
