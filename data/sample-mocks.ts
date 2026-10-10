export type TimestampLike = {
  _seconds?: number;
};

export interface Mock {
  id: string;
  quizId?: string;
  title: string;
  type?: "mock" | "grand-mock" | string;
  accessType?: "private" | "public" | string;
  startTime?: string | number | TimestampLike;
  endTime?: string | number | TimestampLike;
  durationMinutes: number;
  access?: {
    allowed?: boolean;
    mode?: string;
    reason?: string | null;
  };
  hasAttempted?: boolean;
  userAttempt?: {
    score?: number;
    marks?: number;
    submittedAt?: string | null;
  };
}

// Temporary preview mock sessions for UI testing and visualization
export const SAMPLE_MOCKS: Mock[] = [
  {
    id: "sample-grand-mock-1",
    quizId: "frcs-urology-grand-mock-paper-1",
    title: "FRCS Urology Comprehensive Grand Mock - Paper 1",
    type: "grand-mock",
    accessType: "private",
    startTime: Date.now() - 30 * 60 * 1000,
    endTime: Date.now() + 90 * 60 * 1000,
    durationMinutes: 120,
    access: { allowed: true, mode: "member" },
    hasAttempted: true,
    userAttempt: {
      score: 84,
      marks: 84,
      submittedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    },
  },
  {
    id: "sample-core-urology-live",
    quizId: "core-urology-laparoscopy-robotics",
    title: "Core Urology, Laparoscopy & Upper Tract Robotics",
    type: "mock",
    accessType: "public",
    startTime: Date.now() - 10 * 60 * 1000,
    endTime: Date.now() + 50 * 60 * 1000,
    durationMinutes: 30,
    access: { allowed: true, mode: "public" },
    hasAttempted: false,
  },
  {
    id: "sample-uro-oncology",
    quizId: "uro-oncology-prostate-bladder-renal",
    title: "Uro-Oncology: Prostate, Bladder & Renal Cell Carcinoma",
    type: "grand-mock",
    accessType: "private",
    startTime: Date.now() - 120 * 60 * 1000,
    endTime: Date.now() + 180 * 60 * 1000,
    durationMinutes: 60,
    access: { allowed: true, mode: "member" },
    hasAttempted: false,
  },
  {
    id: "sample-paediatric-urology",
    quizId: "paediatric-urology-hypospadias-reflux",
    title: "Paediatric Urology & Reconstructive Surgery",
    type: "mock",
    accessType: "public",
    startTime: Date.now() + 60 * 60 * 1000,
    endTime: Date.now() + 180 * 60 * 1000,
    durationMinutes: 45,
    access: { allowed: true, mode: "public" },
    hasAttempted: false,
  },
  {
    id: "sample-andrology-infertility",
    quizId: "andrology-male-infertility-erectile",
    title: "Andrology, Erectile Dysfunction & Male Subfertility",
    type: "mock",
    accessType: "private",
    startTime: Date.now() - 200 * 60 * 1000,
    endTime: Date.now() + 400 * 60 * 1000,
    durationMinutes: 45,
    access: { allowed: true, mode: "member" },
    hasAttempted: true,
    userAttempt: {
      score: 42,
      marks: 42,
      submittedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    },
  },
  {
    id: "sample-emergency-urology",
    quizId: "emergency-urology-trauma-sepsis",
    title: "Emergency Urology, Trauma & Urosepsis Management",
    type: "mock",
    accessType: "public",
    startTime: Date.now() - 15 * 60 * 1000,
    endTime: Date.now() + 75 * 60 * 1000,
    durationMinutes: 30,
    access: { allowed: true, mode: "public" },
    hasAttempted: false,
  },
];
