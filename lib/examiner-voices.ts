export type VivaMode = "calm" | "fast";

export type ExaminerVoice = {
  id: string;
  name: string;
  title: string;
  personality: string;
  languageCode: string;
  voiceName: string;
};

export const EXAMINER_VOICES: Record<VivaMode, ExaminerVoice[]> = {
  calm: [
    {
      id: "calm-leda",
      name: "Dr. Leda",
      title: "Measured Consultant",
      personality: "Warm, composed, and reassuring with a steady examiner cadence.",
      languageCode: "en-GB",
      voiceName: "en-GB-Chirp3-HD-Leda",
    },
    {
      id: "calm-achird",
      name: "Mr. Achird",
      title: "Deliberate Senior Examiner",
      personality: "Thoughtful, polished, and patient with clear formal delivery.",
      languageCode: "en-GB",
      voiceName: "en-GB-Chirp3-HD-Achird",
    },
  ],
  fast: [
    {
      id: "fast-charon",
      name: "Mr. Charon",
      title: "Rapid-Fire Examiner",
      personality: "Crisp, assertive, and brisk for high-tempo questioning.",
      languageCode: "en-GB",
      voiceName: "en-GB-Chirp3-HD-Charon",
    },
    {
      id: "fast-zephyr",
      name: "Ms. Zephyr",
      title: "Sharp Clinical Interrogator",
      personality: "Quick, energetic, and incisive while staying professional.",
      languageCode: "en-GB",
      voiceName: "en-GB-Chirp3-HD-Zephyr",
    },
  ],
};

export function getDefaultExaminer(mode: VivaMode): ExaminerVoice {
  return EXAMINER_VOICES[mode][0];
}

export function getExaminerById(mode: VivaMode, examinerId?: string | null): ExaminerVoice {
  return (
    EXAMINER_VOICES[mode].find((voice) => voice.id === examinerId) ||
    getDefaultExaminer(mode)
  );
}
