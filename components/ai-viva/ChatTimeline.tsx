//@ts-nocheck
"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";

export default function ChatTimeline({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">

      {messages.map((msg) => {

        if (msg.role === "ai") {
          return (
            <div key={msg.id} className="flex gap-2 items-start">
              <Bot size={16} className="text-emerald-400 mt-1" />
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm">
                {msg.text }
              </div>
            </div>
          );
        }

        if (msg.role === "candidate") {
          return (
            <div key={msg.id} className="flex gap-2 justify-end items-start">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-sm">
                {msg.live ? (msg.text || "Speaking...") : msg.text}
              </div>
              <User size={16} className="text-blue-400 mt-1" />
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
                className="rounded-lg border border-slate-800"
              />
              {msg.description && (
                <div className="text-xs text-slate-400">
                  {msg.description}
                </div>
              )}
            </div>
          );
        }

      })}

      <div ref={bottomRef} />
    </div>
  );
}