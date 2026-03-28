import { useScribe } from "@elevenlabs/react";
import { useState } from "react";

export function UseScribeDemo({
  onPartial,
  onCommitted,
}: {
  onPartial: (text: string) => void;
  onCommitted: (text: string) => void;
}) {
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => onPartial(data.text),
    onCommittedTranscript: (data) => onCommitted(data.text),
  });
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    const res = await fetch("/api/scribe-token");
    const { token } = await res.json();
    await scribe.connect({
      token,
      microphone: { echoCancellation: true, noiseSuppression: true },
    });
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleStart} disabled={scribe.isConnected || loading}>
        Start Recording
      </button>
      <button onClick={scribe.disconnect} disabled={!scribe.isConnected}>
        Stop
      </button>
      {scribe.partialTranscript && <p>Live: {scribe.partialTranscript}</p>}
      <div>
        {scribe.committedTranscripts.map((t) => (
          <p key={t.id}>{t.text}</p>
        ))}
      </div>
    </div>
  );
}
