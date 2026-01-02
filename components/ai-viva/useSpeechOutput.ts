"use client";

export function useSpeechOutput() {
  async function speak(text: string, onEnd?: () => void) {
    if (!("speechSynthesis" in window)) {
      console.warn("SpeechSynthesis not supported");
      onEnd?.();
      return;
    }

    await waitForVoices();

    const chunks = chunkText(text);
    let index = 0;

    const speakChunk = () => {
      if (index >= chunks.length) {
        onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      index++;

      utterance.rate = 0.8;
      utterance.pitch = 0.85;
      utterance.volume = 1;

      utterance.onend = speakChunk;
      utterance.onerror = () => {
        console.error("TTS chunk failed");
        speakChunk();
      };

      speechSynthesis.speak(utterance);
    };

    speakChunk();
  }

  return { speak };
}

// helpers
function chunkText(text: string, size = 180) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = speechSynthesis.getVoices();
    if (voices.length) resolve(voices);
    else speechSynthesis.onvoiceschanged = () => resolve(speechSynthesis.getVoices());
  });
}
