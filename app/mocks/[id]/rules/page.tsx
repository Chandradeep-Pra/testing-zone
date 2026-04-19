"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Mock {
  id: string;
  title: string;
  durationMinutes: number;
}

export default function MockRulesPage() {
  const { id } = useParams();
  const router = useRouter();

  const [mock, setMock] = useState<Mock | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/mocks/${id}`);
        const data = await res.json();

        setMock(data.mock);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-400">
        Loading...
      </div>
    );
  }

  if (!mock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-500">
        Mock not found
      </div>
    );
  }

  const totalTime = mock.durationMinutes + 10; // including break

  return (
    <main className="min-h-screen bg-black text-white px-6 flex items-center justify-center">

      <div className="max-w-2xl w-full bg-gray-900 border border-gray-800 rounded-2xl p-8">

        {/* TITLE */}
        <h1 className="text-3xl font-bold mb-4">
          {mock.title || "Mock Quiz"}
        </h1>

        <p className="text-gray-400 mb-6">
          Please read the instructions carefully before starting the quiz.
        </p>

        {/* RULES */}
        <div className="space-y-4 text-gray-300 text-sm leading-relaxed">

          <p>• You have <b>{mock.durationMinutes} minutes</b> to complete this quiz.</p>

          <p>• You are allowed <b>one break of 10 minutes</b> during the quiz.</p>

          <p>• The break can be used only once and cannot be split.</p>

          <p>• Total allowed time including break is <b>{totalTime} minutes</b>.</p>

          <p>• Do not refresh or close the browser during the test.</p>

          <p>• Once started, the timer will continue running.</p>

          <p>• Make sure you are in a distraction-free environment.</p>

          <p>• Your responses will be evaluated automatically.</p>

          <p className="text-emerald-400 font-medium">
            All the best 👍
          </p>

        </div>

        {/* CTA */}
        <button
          onClick={() => router.push(`/mocks/${id}`)}
          className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-semibold text-lg"
        >
          Start Quiz
        </button>

      </div>

    </main>
  );
}