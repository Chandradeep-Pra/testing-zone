const REMOTE_MOCKS_URL = "https://urocms.vercel.app/api/mocks";
const REMOTE_QUIZZES_URL = "https://urocms.vercel.app/api/quizzes";

type TimestampLike = {
  _seconds?: number;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

export type Quiz = {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  createdAt?: string | number | TimestampLike;
};

export type MockEvent = {
  id: string;
  quizId: string;
  title?: string;
  startTime: string | number | TimestampLike;
  durationMinutes: number;
};

export type MockRecord = {
  id: string;
  quizId: string;
  title: string;
  startTime: string | number | TimestampLike;
  durationMinutes: number;
  quiz?: Quiz;
};

function normalizeDate(value: unknown): number {
  if (!value) return 0;

  const timestamp = asRecord(value);
  if (typeof timestamp?._seconds === "number") {
    return timestamp._seconds * 1000;
  }

  const time = new Date(value as string | number).getTime();
  return Number.isNaN(time) ? 0 : time;
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

export function normalizeMock(payload: unknown): MockRecord {
  const fallback = getDefaultMock();
  const source = asRecord(payload);

  if (!source) {
    return fallback;
  }

  return {
    id: typeof source.id === "string" ? source.id : fallback.id,
    quizId: typeof source.quizId === "string" ? source.quizId : fallback.quizId,
    title: typeof source.title === "string" ? source.title : "Mock Quiz",
    startTime:
      typeof source.startTime === "string" ||
      typeof source.startTime === "number" ||
      asRecord(source.startTime)
        ? (source.startTime as string | number | TimestampLike)
        : fallback.startTime,
    durationMinutes:
      typeof source.durationMinutes === "number"
        ? source.durationMinutes
        : fallback.durationMinutes,
  };
}

export async function fetchRemoteMocks(): Promise<MockRecord[]> {
  const res = await fetch(REMOTE_MOCKS_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch mocks");
  }

  const data = (await res.json()) as { mocks?: unknown[] } | unknown[];
  const mocks = Array.isArray((data as { mocks?: unknown[] })?.mocks)
    ? ((data as { mocks?: unknown[] }).mocks ?? [])
    : Array.isArray(data)
    ? data
    : [];

  return mocks.map((mock) => normalizeMock(mock));
}

export async function fetchRemoteMockById(id: string): Promise<MockRecord | null> {
  const res = await fetch(`${REMOTE_MOCKS_URL}/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) return null;

  if (!res.ok) {
    throw new Error("Failed to fetch mock");
  }

  const data = (await res.json()) as { mock?: unknown } | unknown;

  return normalizeMock(asRecord(data)?.mock ?? data);
}

export async function fetchRemoteQuizzes(): Promise<Quiz[]> {
  const res = await fetch(REMOTE_QUIZZES_URL, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch quizzes");
  }

  const data = (await res.json()) as { quizzes?: Quiz[] } | Quiz[];

  return Array.isArray((data as { quizzes?: Quiz[] })?.quizzes)
    ? ((data as { quizzes?: Quiz[] }).quizzes ?? [])
    : Array.isArray(data)
    ? data
    : [];
}

export async function fetchMocksWithQuizzes(): Promise<MockRecord[]> {
  const [mocks, quizzes] = await Promise.all([fetchRemoteMocks(), fetchRemoteQuizzes()]);

  return mocks.map((mock) => ({
    ...mock,
    quiz: quizzes.find((quiz) => quiz.id === mock.quizId),
  }));
}

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
