import { appPath } from "@/lib/app-path";

export type GenerateCalmQuestionsRequest = {
  mode: "calmAndComposed";
  questionCount: number;
  title: string;
  level: string;
  stem: string;
  objectives: string[];
  mustMention: string[];
  criticalFail: string[];
  exhibits: Array<{
    id: string;
    label: string;
    description: string;
  }>;
};

export type GeneratedCalmQuestion = {
  question: string;
  answerKeywords: string[];
  linkedExhibitIds: string[];
};

export type GenerateCalmQuestionsResponse = {
  questions: GeneratedCalmQuestion[];
};

export async function generateCalmQuestions(
  firebaseIdToken: string,
  input: GenerateCalmQuestionsRequest,
): Promise<GenerateCalmQuestionsResponse> {
  const response = await fetch(appPath("/api/viva-cases/generate-questions"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firebaseIdToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      mode: "calmAndComposed",
    }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || "Unable to generate Calm and Composed questions");
  }

  return data as GenerateCalmQuestionsResponse;
}
