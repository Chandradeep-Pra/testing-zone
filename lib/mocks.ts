const REMOTE_MOCKS_URL = "https://urocms.vercel.app/api/mocks";
const REMOTE_QUIZZES_URL = "https://urocms.vercel.app/api/quizzes";

/* ───────── TYPES ───────── */

export type Quiz = {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  createdAt?: any;
};

export type MockEvent = {
  id: string;
  quizId: string;
  title?: string;
  startTime: any;
  durationMinutes: number;
};

export type MockRecord = {
  id: string;
  quizId: string;
  title: string;
  startTime: any;
  durationMinutes: number;
  quiz?: Quiz;
};

/* ───────── HELPERS ───────── */

function normalizeDate(value: any): number {
  if (!value) return 0;

  // Firestore timestamp
  if (value?._seconds) {
    return value._seconds * 1000;
  }

  const time = new Date(value).getTime();
  return isNaN(time) ? 0 : time;
}

function getDefaultMock(): MockRecord {
  return {
    id: "fallback",
    quizId: "",
    title: "Mock Quiz",
    startTime: Date.now(),
    durationMinutes: 30,
  };
}

/* ───────── NORMALIZER ───────── */

export function normalizeMock(payload: any): MockRecord {
  const fallback = getDefaultMock();

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  return {
    id: payload.id || fallback.id,
    quizId: payload.quizId || fallback.quizId,
    title: payload.title || "Mock Quiz",
    startTime: payload.startTime || fallback.startTime,
    durationMinutes:
      Number(payload.durationMinutes) || fallback.durationMinutes,
  };
}

/* ───────── FETCHERS ───────── */

export async function fetchRemoteMocks(): Promise<MockRecord[]> {
  const res = await fetch(REMOTE_MOCKS_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch mocks");
  }

  const data = await res.json();

  const mocks = Array.isArray(data?.mocks)
    ? data.mocks
    : Array.isArray(data)
    ? data
    : [];

  return mocks.map((m: any) => normalizeMock(m));
}

export async function fetchRemoteMockById(
  id: string
): Promise<MockRecord | null> {
  const res = await fetch(`${REMOTE_MOCKS_URL}/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error("Failed to fetch mock");
  }

  const data = await res.json();

  return normalizeMock(data?.mock || data);
}

/* ───────── QUIZ FETCH (OPTIONAL JOIN) ───────── */

export async function fetchRemoteQuizzes(): Promise<Quiz[]> {
  const res = await fetch(REMOTE_QUIZZES_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch quizzes");
  }

  const data = await res.json();

  return Array.isArray(data?.quizzes)
    ? data.quizzes
    : Array.isArray(data)
    ? data
    : [];
}

/* ───────── COMBINED (MOST USEFUL) ───────── */

export async function fetchMocksWithQuizzes(): Promise<MockRecord[]> {
  const [mocks, quizzes] = await Promise.all([
    fetchRemoteMocks(),
    fetchRemoteQuizzes(),
  ]);

  return mocks.map((mock) => ({
    ...mock,
    quiz: quizzes.find((q) => q.id === mock.quizId),
  }));
}

/* ───────── STATUS HELPERS ───────── */

export function getMockStatus(mock: MockRecord): "Scheduled" | "Live" | "Completed" {
  const now = Date.now();
  const start = normalizeDate(mock.startTime);

  if (!start) return "Scheduled";

  const end = start + mock.durationMinutes * 60 * 1000;

  if (now < start) return "Scheduled";
  if (now >= start && now <= end) return "Live";
  return "Completed";
}

export function isMockLive(mock: MockRecord): boolean {
  return getMockStatus(mock) === "Live";
}