"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";

type ChatMessage =
  | { id?: string; role: "ai" | "candidate"; text: string; live?: boolean }
  | { id?: string; role: "image"; src: string; description?: string };

export default function ChatTimeline({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-scroll p-4 space-y-4 bg-[linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,6,23,0.08))]">

      {messages.map((msg) => {
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

        if (msg.role === "candidate") {
          return (
            <div key={msg.id} className="flex justify-end gap-3">

              <div
                className="
                  bg-sky-500/10
                  border border-sky-400/20
                  rounded-2xl
                  px-4 py-3
                  text-sm
                  leading-relaxed
                  max-w-[85%]
                "
              >
                {msg.live ? (
                  <span className="italic text-blue-200">
                    {msg.text || "Speaking..."}
                  </span>
                ) : (
                  msg.text
                )}
              </div>

              <div className="mt-1">
                <User size={18} className="text-blue-400" />
              </div>

            </div>
          );
        }

        if (msg.role === "image") {
          return (
            <div key={msg.id} className="space-y-2">

              <div className="text-xs text-slate-400">
                Exhibit
              </div>

              <img
                src={msg.src}
                alt="Exhibit"
                className="
                  rounded-lg
                  border border-slate-800
                  max-h-[300px]
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
