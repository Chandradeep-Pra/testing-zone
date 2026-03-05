"use client";

export function useSpeechOutput() {

  async function speak(text: string, onEnd?: () => void) {

    const res = await fetch("/api/viva/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const audioBlob = await res.blob();
    const url = URL.createObjectURL(audioBlob);

    const audio = new Audio(url);

    audio.onended = () => {
      onEnd?.();
      URL.revokeObjectURL(url);
    };

    await audio.play();
  }

  return { speak };
}