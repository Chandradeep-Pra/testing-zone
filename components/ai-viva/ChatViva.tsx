import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { useCountdown } from "./useCountdown";

type Exhibit = {
  label: string;
  description: string;
};

type Message = {
  role: "ai" | "user";
  text: string;
  exhibit?: Exhibit;
};

type VivaApiResponse = {
  type?: "wait" | "question" | "end";
  text?: unknown;
  exhibit?: Exhibit;
};

export function VivaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { secondsLeft, minutes, seconds } = useCountdown(40 * 60, !ended);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" ? crypto.randomUUID() : "demo-session"
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function extractText(text: unknown): string {
    if (typeof text !== "string") return "";

    try {
      const parsed = JSON.parse(text) as { text?: string };
      if (typeof parsed.text === "string") {
        return parsed.text;
      }
    } catch {
      return text;
    }

    return text;
  }

  async function fetchNext(userAnswer: string) {
    setLoading(true);

    const res = await fetch("/api/viva/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        userAnswer,
        timeElapsedSec: 600 - secondsLeft,
      }),
    });

    const data = (await res.json()) as VivaApiResponse;
    setLoading(false);

    if (data.type === "wait") return;

    if (data.type === "end") {
      setEnded(true);
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: "Viva completed. Your assessment is being prepared.",
        },
      ]);
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "ai",
        text: extractText(data.text),
        exhibit: data.exhibit,
      },
    ]);
  }

  useEffect(() => {
    // This legacy component is not mounted in the current app flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNext("");
  }, [fetchNext]);

  const sendMessage = async () => {
    if (!input.trim() || ended || loading) return;

    const answer = input;

    setMessages((current) => [...current, { role: "user", text: answer }]);
    setInput("");
    await fetchNext(answer);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="flex items-center justify-between border-b border-neutral-800 p-4">
        <div className="font-semibold">AI Examiner</div>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Clock size={16} />
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-xl ${message.role === "ai" ? "text-left" : "ml-auto text-right"}`}
          >
            <div
              className={`inline-block rounded-lg px-4 py-2 text-sm ${
                message.role === "ai"
                  ? "bg-neutral-800 text-neutral-100"
                  : "bg-white text-black"
              }`}
            >
              {message.text}
            </div>

            {message.exhibit && (
              <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <p className="mb-1 text-xs text-neutral-400">{message.exhibit.label}</p>
                <p className="text-sm text-neutral-200">{message.exhibit.description}</p>
              </div>
            )}
          </div>
        ))}

        {loading && <div className="text-xs text-neutral-500">Examiner is thinking...</div>}

        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-neutral-800 p-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={ended ? "Viva ended" : "Type your answer..."}
          disabled={ended || loading}
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={ended || loading}
          className="flex items-center gap-1 rounded bg-white px-4 text-black disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </main>
  );
}
