// export function useSpeechOutput() {
//   let audio: HTMLAudioElement | null = null;

//   async function speak(text: string, onEnd?: () => void) {
//     // IMPORTANT: must be after user gesture
//     const res = await fetch("/api/tts", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ text })
//     });

//     const blob = await res.blob();
//     const url = URL.createObjectURL(blob);

//     audio = new Audio(url);
//     audio.onended = () => {
//       URL.revokeObjectURL(url);
//       onEnd?.();
//     };

//     await audio.play();
//   }

//   return { speak };
// }


"use client";

export function useSpeechOutput() {
  function speak(text: string, onEnd?: () => void) {
    if (!("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis not supported");
      onEnd?.();
      return;
    }

    // Stop anything currently speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Examiner-like tuning
    utterance.rate = 0.8;
    utterance.pitch = 0.85;
    utterance.volume = 1;

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = () => {
      console.error("Browser TTS error");
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  return { speak };
}
