
import { useState } from "react";

export type VivaExhibit =
  | {
      type: "image";
      src: string;
      description?: string;
    }
  | null;

type VivaApiResponse = {
  question?: string;
  imageUsed?: boolean;
  imageLink?: string | null;
  imageDescription?: string | null;
};

export function useVivaSession() {
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [exhibit, setExhibit] = useState<VivaExhibit>(null);

  function applyApiResponse(data: VivaApiResponse) {
    console.log("To use image:", data.imageUsed)
    // console.log("To use exhibit:", data.exhibit)
    if (!data?.question) return;

    setTranscript(data.question);
    setSpeaking(true);

    // ALWAYS clear exhibit first, then conditionally set if image is provided
    // This prevents image persistence across questions
    setExhibit(null);

    // Only show image if API explicitly says to and provides the link
    if (data.imageUsed === true && data.imageLink) {
      setExhibit({
        type: "image",
        src: data.imageLink,
        description: data.imageDescription ?? undefined,
      });
    }
  }

  function markSpeechEnded() {
    setSpeaking(false);
  }

  function clearExhibit() {
    setExhibit(null);
  }

  return {
    transcript,
    speaking,
    thinking,
    exhibit,
    setThinking,
    applyApiResponse,
    markSpeechEnded,
    clearExhibit,
  };
}
