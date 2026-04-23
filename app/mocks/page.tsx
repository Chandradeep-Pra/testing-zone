"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TimestampLike = {
  _seconds?: number;
};

interface Mock {
  id: string;
  quizId: string;
  title: string;
  startTime: string | number | TimestampLike;
  durationMinutes: number;
}

const getStart = (startTime: string | number | TimestampLike) => {
  if (typeof startTime === "object" && startTime?._seconds) {
    return startTime._seconds * 1000;
  }

  return typeof startTime === "string" || typeof startTime === "number"
    ? new Date(startTime).getTime()
    : 0;
};

const isToday = (timestamp: number) => {
  const d = new Date(timestamp);
  const now = new Date();

  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

export default function TodayMocksPage() {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMock, setSelectedMock] = useState<Mock | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/mocks");
        const data = (await res.json()) as { mocks?: Mock[] };

        const isTodayMock = (mock: Mock) => {
          const start = getStart(mock.startTime);
          return start && isToday(start);
        };

        const isLiveOrUpcoming = (mock: Mock) => {
          const start = getStart(mock.startTime);
          const end = start + 7 * 24 * 60 * 60 * 1000;
          const now = Date.now();

          return now <= end;
        };

        const filtered = (data.mocks || []).filter(
          (mock) => isTodayMock(mock) && isLiveOrUpcoming(mock)
        );
        setMocks(filtered);

        const saved = localStorage.getItem("mockUser");
        if (saved) {
          const parsed = JSON.parse(saved) as { name?: string; email?: string };
          setName(parsed.name || "");
          setEmail(parsed.email || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleContinue = () => {
    if (!name || !email || !selectedMock) return;

    localStorage.setItem("mockUser", JSON.stringify({ name, email }));
    router.push(`/mocks/${selectedMock.id}/rules`);
  };

  return (
    <main className="min-h-screen bg-black px-6 text-white">
      <section className="pb-16 pt-24 text-center">
        <h1 className="text-5xl font-bold">
          Today&apos;s Scheduled Mocks
          <span className="mt-2 block text-emerald-400">Get Ready</span>
        </h1>
      </section>

      <section className="mx-auto max-w-6xl pb-24">
        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : mocks.length === 0 ? (
          <p className="text-center text-gray-500">No mocks scheduled for today</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {mocks.map((mock) => (
              <div
                key={mock.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
              >
                <span className="mb-4 inline-block rounded-full bg-blue-500 px-3 py-1 text-xs text-white">
                  Live
                </span>

                <h2 className="mb-2 text-xl font-semibold">{mock.title || "Mock Quiz"}</h2>

                <div className="mb-6 space-y-1 text-sm text-gray-400">
                  <p>{mock.durationMinutes} mins</p>
                  <p>
                    Available Till:{" "}
                    {new Date(getStart(mock.startTime) + 7 * 24 * 60 * 60 * 1000).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedMock(mock)}
                  className="w-full rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500"
                >
                  Register
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">Enter Details</h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 outline-none"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-black px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedMock(null)}
                className="flex-1 rounded-xl bg-gray-700 py-3"
              >
                Cancel
              </button>

              <button
                onClick={handleContinue}
                className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold hover:bg-emerald-500"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
