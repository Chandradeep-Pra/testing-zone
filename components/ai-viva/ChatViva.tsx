//@ts-ignore

import { useEffect, useRef, useState } from "react";
import { Send, Clock } from "lucide-react";
import { useVivaSession } from "./useVivaSession";

type Exhibit = {
  label: string;
  description: string;
};

type Message = {
  role: "ai" | "user";
  text: string;
  exhibit?: Exhibit;
};



export function VivaChat() {
  const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState("");
const [timeLeft, setTimeLeft] = useState(40 * 60);
const [ended, setEnded] = useState(false);
const [loading, setLoading] = useState(false);
const { next } = useVivaSession();

const bottomRef = useRef<HTMLDivElement>(null);

// stable session id
const sessionIdRef = useRef<string>(
  typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : "demo-session"
);


  // countdown timer
  useEffect(() => {
  if (timeLeft <= 0) return;
  const t = setInterval(() => setTimeLeft((t) => t - 1), 1000);
  return () => clearInterval(t);
}, [timeLeft]);

const minutes = Math.floor(timeLeft / 60);
const seconds = timeLeft % 60;


  // start viva – get first question
 useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

useEffect(() => {
  fetchNext("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

function extractText(text: unknown): string {
  if (typeof text !== "string") return "";

  // If Gemini returned JSON as a string, unwrap it
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.text === "string") {
      return parsed.text;
    }
  } catch {
    // Not JSON, continue
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
      timeElapsedSec: 600 - timeLeft
    })
  });

  const data = await res.json();
  setLoading(false);

  // Examiner is waiting — do nothing
  if (data.type === "wait") return;

  // Viva ended
  if (data.type === "end") {
    setEnded(true);
    setMessages((m) => [
      ...m,
      {
        role: "ai",
        text: "Viva completed. Your assessment is being prepared."
      }
    ]);
    return;
  }

  // Normal AI question
  const safeText =
  typeof data.text === "string"
    ? data.text
    : JSON.stringify(data.text);

setMessages((m) => [
  ...m,
  {
    role: "ai",
    text: extractText(data.text),
    exhibit: data.exhibit
  }
]);

 }


  const sendMessage = async () => {
  if (!input.trim() || ended || loading) return;

  const answer = input;

  setMessages((m) => [
    ...m,
    { role: "user", text: answer }
  ]);

  setInput("");
  await fetchNext(answer);
};


  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">

      {/* Header */}
      <div className="border-b border-neutral-800 p-4 flex justify-between items-center">
        <div className="font-semibold">AI Examiner</div>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Clock size={16} />
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
  {messages.map((m, i) => (
    <div
      key={i}
      className={`max-w-xl ${
        m.role === "ai" ? "text-left" : "ml-auto text-right"
      }`}
    >
      <div
        className={`inline-block px-4 py-2 rounded-lg text-sm ${
          m.role === "ai"
            ? "bg-neutral-800 text-neutral-100"
            : "bg-white text-black"
        }`}
      >
        {m.text}
      </div>

      {/* Exhibit (image / report / lab) */}
      {m.exhibit && (
        <div className="mt-2 bg-neutral-900 border border-neutral-800 rounded-lg p-3">
          <p className="text-xs text-neutral-400 mb-1">
            {m.exhibit.label}
          </p>
          <p className="text-sm text-neutral-200">
            {m.exhibit.description}
          </p>
        </div>
      )}
    </div>
  ))}

  {loading && (
    <div className="text-xs text-neutral-500">
      Examiner is thinking…
    </div>
  )}

  <div ref={bottomRef} />
</div>


      {/* Input */}
    <div className="border-t border-neutral-800 p-4 flex gap-2">
  <input
    value={input}
    onChange={(e) => setInput(e.target.value)}
    placeholder={ended ? "Viva ended" : "Type your answer…"}
    disabled={ended || loading}
    className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm disabled:opacity-50"
  />
  <button
    onClick={sendMessage}
    disabled={ended || loading}
    className="bg-white text-black rounded px-4 flex items-center gap-1 disabled:opacity-50"
  >
    Send
  </button>
</div>

    </main>
  );
}
