"use client";

import { AlarmClock, Coffee, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  questionImage?: string;
}

interface Mock {
  id: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
}

export default function Page() {
  const { id } = useParams();
  const router = useRouter();
  const [mock, setMock] = useState<Mock | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isBreak, setIsBreak] = useState(false);
  const [breakLeft, setBreakLeft] = useState(10 * 60);
  const [breakUsed, setBreakUsed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      const publicRes = await fetch(`/api/public/mocks/${id}`);
      if (publicRes.ok) {
        const publicData = await publicRes.json();
        setMock(publicData.mock);
        setTimeLeft(publicData.mock.durationMinutes * 60);
      } else {
        const res = await fetch(`/api/mocks/${id}`);
        const data = await res.json();
        setMock(data.mock);
        setTimeLeft(data.mock.durationMinutes * 60);
      }

      const saved = localStorage.getItem(`mock-${id}-answers`);
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
    };

    void load();
  }, [id]);

  useEffect(() => {
    if (!mock) return;

    const timer = setInterval(() => {
      if (isBreak) {
        setBreakLeft((value) => {
          if (value <= 1) {
            setIsBreak(false);
            return 0;
          }

          return value - 1;
        });
      } else {
        setTimeLeft((value) => {
          if (value <= 1) {
            submit();
            return 0;
          }

          return value - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [mock, isBreak]);

  const select = (qid: string, index: number) => {
    const updated = { ...answers, [qid]: index };
    setAnswers(updated);
    localStorage.setItem(`mock-${id}-answers`, JSON.stringify(updated));

    if (currentQ < mock!.questions.length - 1) {
      setCurrentQ((value) => value + 1);
    }
  };

  const submit = () => {
    localStorage.setItem(`mock-${id}-final`, JSON.stringify(answers));
    router.push(`/mocks/${id}/result`);
  };

  const format = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (!mock) {
    return (
      <main className="urologics-shell flex min-h-screen items-center justify-center">
        <div className="urologics-panel px-8 py-6 text-white">Loading session...</div>
      </main>
    );
  }

  const q = mock.questions[currentQ];

  return (
    <>
      {isBreak && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl">
          <div className="urologics-chip">Break Active</div>
          <h2 className="mt-6 text-6xl font-semibold text-teal-300">{format(breakLeft)}</h2>
          <button onClick={() => setIsBreak(false)} className="urologics-button-primary mt-8">
            Resume Mock
          </button>
        </div>
      )}

      {showConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-[28px] border border-[#0f7896]/12 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,120,150,0.18)]">
      
      {/* Title */}
      <div className="text-2xl font-semibold text-[#071014]">
        Submit mock?
      </div>

      {/* Description */}
      <p className="mt-3 text-sm leading-6 text-[#071014]/65">
        This will end the current Urologics mock session and move you to the results page.
      </p>

      {/* Buttons */}
      <div className="mt-8 flex gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 rounded-full border border-[#0f7896]/20 px-4 py-2 text-sm font-semibold text-[#0f7896] transition hover:bg-[#0f7896] hover:text-white"
        >
          Cancel
        </button>

        <button
          onClick={submit}
          className="flex-1 rounded-full bg-[#0f7896] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b647d]"
        >
          Submit
        </button>
      </div>
    </div>
  </div>
)}

      <main className="flex min-h-screen gap-4 bg-cyan-50 p-4 text-[#071014]">
  <aside className="flex w-[300px] shrink-0 flex-col rounded-[28px] border border-[#0f7896]/12 bg-white p-5 shadow-[0_16px_40px_rgba(15,120,150,0.09)]">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f7896]/10 text-[#0f7896]">
        <ShieldCheck size={18} />
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0f7896]">
          Urologics Grand Mocks
        </div>
        <div className="mt-1 text-sm font-semibold text-[#071014]">
          {mock.title}
        </div>
      </div>
    </div>

    <div className="mt-6 rounded-[24px] border border-[#0f7896]/12 bg-cyan-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
        <AlarmClock size={14} />
        Session Timer
      </div>

      <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#0f7896]">
        {format(isBreak ? breakLeft : timeLeft)}
      </div>

      <div className="mt-2 text-sm text-[#071014]/60">
        Question {currentQ + 1} of {mock.questions.length}
      </div>
    </div>

    <div className="mt-6 grid grid-cols-5 gap-2">
      {mock.questions.map((question, index) => (
        <button
          key={question.id}
          onClick={() => setCurrentQ(index)}
          className={`rounded-xl px-0 py-2 text-sm font-semibold transition ${
            index === currentQ
              ? "bg-[#0f7896] text-white shadow-[0_8px_20px_rgba(15,120,150,0.22)]"
              : answers[question.id] !== undefined
                ? "bg-[#0f7896]/10 text-[#0f7896]"
                : "bg-cyan-50 text-[#071014]/45 hover:bg-[#0f7896]/10 hover:text-[#0f7896]"
          }`}
        >
          {index + 1}
        </button>
      ))}
    </div>

    <div className="mt-auto space-y-3 pt-6">
      {!breakUsed && (
        <button
          onClick={() => {
            setIsBreak(true);
            setBreakUsed(true);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#0f7896]/20 px-5 py-3 text-sm font-semibold text-[#0f7896] transition hover:bg-[#0f7896] hover:text-white"
        >
          <Coffee size={16} />
          Take Break
        </button>
      )}

      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0f7896] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b647d]"
      >
        <Send size={16} />
        Submit Mock
      </button>
    </div>
  </aside>

  <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]">
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="flex flex-1 flex-col justify-between p-8 md:p-10">
        <div>
          <div className="inline-flex rounded-full border border-[#0f7896]/18 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
            Question : {currentQ + 1}
          </div>

          <h1 className="mt-6 text-xl font-semibold   text-[#071014]">
            {q.questionText}
          </h1>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => select(q.id, i)}
                className={`rounded-2xl border px-5 py-5 text-left text-sm font-medium leading-6 transition ${
                  answers[q.id] === i
                    ? "border-[#0f7896] bg-[#0f7896] text-white shadow-[0_12px_28px_rgba(15,120,150,0.20)]"
                    : "border-[#0f7896]/12 bg-cyan-50 text-[#071014]/75 hover:border-[#0f7896]/30 hover:bg-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 h-2 overflow-hidden rounded-full bg-cyan-50">
          <div
            className="h-full rounded-full bg-[#0f7896] transition-all duration-300"
            style={{
              width: `${((currentQ + 1) / mock.questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {q.questionImage && (
        <div className="border-t border-[#0f7896]/10 p-6 lg:w-[42%] lg:border-l lg:border-t-0">
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-[24px] border border-[#0f7896]/12 bg-cyan-50 p-5">
            <img
              src={q.questionImage}
              alt="Question exhibit"
              className="max-h-[70vh] rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  </section>
</main>
    </>
  );
}
