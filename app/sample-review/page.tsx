import type { Metadata } from "next";
import ReviewAnswers, { type MockDetail } from "@/components/mocks/ReviewAnswers";

export const metadata: Metadata = {
  title: "Sample Answer Review",
  robots: { index: false, follow: false },
};

const questions: MockDetail["questions"] = Array.from({ length: 60 }, (_, index) => ({
  id: `sample-question-${index + 1}`,
  questionText: `Sample review question ${index + 1}: Which of the following is the most appropriate answer?`,
  options: ["Option A", "Option B", "Option C", "Option D", "Option E"],
  correctAnswer: index % 5,
  explanation: {
    text: "This sample explanation previews the answer review layout. Your selected answer and the correct answer are shown above. Use the question strip to explore correct, incorrect, and unanswered states.",
  },
}));

const answers = Object.fromEntries(questions.flatMap((question, index) =>
  index % 5 === 4 ? [] : [[question.id, index % 5 === 3 ? (question.correctAnswer + 1) % 5 : question.correctAnswer]],
));
const mock: MockDetail = { title: "FRCS Urology Grand Mock", accessType: "public", questions };
const score = questions.filter((question) => answers[question.id] === question.correctAnswer).length;

export default function SampleReviewPage() {
  return <ReviewAnswers mock={mock} answers={answers} hasSavedAnswers score={score} ranks={{ official: 12, effective: 9 }} />;
}
