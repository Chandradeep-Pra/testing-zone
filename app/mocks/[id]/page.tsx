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
      const res = await fetch(`/api/mocks/${id}`);
      const data = await res.json();
      setMock(data.mock);
      setTimeLeft(data.mock.durationMinutes * 60);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl">
          <div className="urologics-panel w-full max-w-md p-8 text-center">
            <div className="text-2xl font-semibold text-white">Submit mock?</div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This will end the current Urologics mock session and move you to the results page.
            </p>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="urologics-button-secondary flex-1">
                Cancel
              </button>
              <button onClick={submit} className="urologics-button-primary flex-1">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="urologics-shell flex min-h-screen gap-4 p-4">
        <aside className="urologics-panel flex w-[300px] shrink-0 flex-col p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-400/10 text-teal-300">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Urologics Grand Mocks</div>
              <div className="text-sm font-semibold text-white">{mock.title}</div>
            </div>
          </div>

          <div className="urologics-subpanel mt-6 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <AlarmClock size={14} />
              Session Timer
            </div>
            <div className="mt-3 text-4xl font-semibold text-teal-300">
              {format(isBreak ? breakLeft : timeLeft)}
            </div>
            <div className="mt-2 text-sm text-slate-400">
              Question {currentQ + 1} of {mock.questions.length}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-5 gap-2">
            {mock.questions.map((question, index) => (
              <button
                key={question.id}
                onClick={() => setCurrentQ(index)}
                className={`rounded-xl px-0 py-2 text-sm transition ${
                  index === currentQ
                    ? "bg-teal-400 text-slate-950"
                    : answers[question.id] !== undefined
                      ? "bg-teal-400/15 text-teal-200"
                      : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]"
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
                className="urologics-button-secondary w-full gap-2"
              >
                <Coffee size={16} />
                Take Break
              </button>
            )}
            <button onClick={() => setShowConfirm(true)} className="urologics-button-primary w-full gap-2">
              <Send size={16} />
              Submit Mock
            </button>
          </div>
        </aside>

        <section className="urologics-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col lg:flex-row">
            <div className="flex flex-1 flex-col justify-between p-8 md:p-10">
              <div>
                <div className="urologics-chip">Assessment Screen</div>
                <h1 className="mt-6 text-3xl font-semibold leading-tight text-white md:text-4xl">
                  {q.questionText}
                </h1>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => select(q.id, i)}
                      className={`rounded-2xl border px-5 py-5 text-left text-sm leading-6 transition ${
                        answers[q.id] === i
                          ? "border-teal-300/35 bg-teal-400 text-slate-950"
                          : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-10 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-teal-300"
                  style={{ width: `${((currentQ + 1) / mock.questions.length) * 100}%` }}
                />
              </div>
            </div>

            {q.questionImage && (
              <div className="border-t border-white/10 p-6 lg:w-[42%] lg:border-l lg:border-t-0">
                <div className="urologics-subpanel flex h-full min-h-[280px] items-center justify-center p-5">
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
