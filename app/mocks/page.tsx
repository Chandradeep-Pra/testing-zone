"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Mock {
  id: string;
  quizId: string;
  title: string;
  startTime: any;
  durationMinutes: number;
}

/* 🔥 helpers */
const getStart = (startTime: any) => {
  if (startTime?._seconds) return startTime._seconds * 1000;
  return new Date(startTime).getTime();
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

const isScheduledToday = (mock: Mock) => {
  const start = getStart(mock.startTime);
  const now = Date.now();
  return start && isToday(start) && now < start;
};

export default function TodayMocksPage() {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 modal state
  const [selectedMock, setSelectedMock] = useState<Mock | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/mocks");
        const data = await res.json();
const isTodayMock = (mock: Mock) => {
  const start = getStart(mock.startTime);
  return start && isToday(start);
};

const isLiveOrUpcoming = (mock: Mock) => {
  const start = getStart(mock.startTime);
  const end = start + 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return now <= end; // 🔥 includes LIVE + FUTURE
};

const filtered = (data.mocks || []).filter(
  (m: Mock) => isTodayMock(m) && isLiveOrUpcoming(m)
);
        setMocks(filtered);

        // 🔥 preload saved user
        const saved = localStorage.getItem("mockUser");
        if (saved) {
          const parsed = JSON.parse(saved);
          setName(parsed.name || "");
          setEmail(parsed.email || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleContinue = () => {
    if (!name || !email || !selectedMock) return;

    // ✅ save to localStorage
    localStorage.setItem(
      "mockUser",
      JSON.stringify({ name, email })
    );

    // navigate
    router.push(`/mocks/${selectedMock.id}/rules`);
  };

  return (
    <main className="min-h-screen bg-black text-white px-6">

      {/* HERO */}
      <section className="pt-24 pb-16 text-center">
        <h1 className="text-5xl font-bold">
          Today’s Scheduled Mocks
          <span className="block text-emerald-400 mt-2">
            Get Ready
          </span>
        </h1>
      </section>

      {/* CONTENT */}
      <section className="max-w-6xl mx-auto pb-24">

        {loading ? (
          <p className="text-center text-gray-400">Loading...</p>
        ) : mocks.length === 0 ? (
          <p className="text-center text-gray-500">
            No mocks scheduled for today
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">

            {mocks.map((mock) => (
              <div
                key={mock.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
              >
                <span className="text-xs px-3 py-1 rounded-full bg-blue-500 text-white mb-4 inline-block">
                  Live
                </span>

                <h2 className="text-xl font-semibold mb-2">
                  {mock.title || "Mock Quiz"}
                </h2>

                <div className="text-sm text-gray-400 mb-6 space-y-1">
                  <p>⏱ {mock.durationMinutes} mins</p>
                  <p>
  🕒 Available Till:{" "}
  {new Date(
    getStart(mock.startTime) + 7 * 24 * 60 * 60 * 1000
  ).toLocaleString()}
</p>
                </div>

                <button
                  onClick={() => setSelectedMock(mock)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold"
                >
                  Register
                </button>
              </div>
            ))}

          </div>
        )}
      </section>

      {/* 🔥 MODAL */}
      {selectedMock && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md">

            <h2 className="text-xl font-semibold mb-4">
              Enter Details
            </h2>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 outline-none"
              />

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 outline-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedMock(null)}
                className="flex-1 bg-gray-700 py-3 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={handleContinue}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold"
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