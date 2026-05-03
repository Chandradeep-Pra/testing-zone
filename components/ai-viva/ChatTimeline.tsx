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
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-[linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,6,23,0.08))]">

      {questionMessages.map((msg) => {
        if (msg.role === "ai") {
          return (
            <div key={msg.id} className="flex gap-3 items-start">

              <div className="mt-1">
                <Bot size={18} className="text-emerald-400" />
              </div>

              <div
                className="
                  bg-slate-950/80
                  border border-white/10
                  rounded-2xl
                  px-4 py-3
                  text-sm
                  leading-relaxed
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
            <div key={msg.id} className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3">

              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                Image shown
              </div>

              <img
                src={msg.src}
                alt="Exhibit"
                className="
                  rounded-xl
                  border border-slate-800
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
