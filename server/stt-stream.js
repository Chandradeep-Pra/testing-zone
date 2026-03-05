import speech from "@google-cloud/speech";
import WebSocket, { WebSocketServer } from "ws";

const client = new speech.SpeechClient();

const PORT = process.env.PORT || 3002;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {

  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
        model: "latest_short",
        enableAutomaticPunctuation: true,
        speechContexts: [
          {
            phrases: [
              "hematuria",
              "uroflowmetry",
              "post void residual",
              "benign prostatic hyperplasia",
              "PSA",
              "lower urinary tract symptoms",
              "LUTS",
              "TURP"
            ],
            boost: 15
          }
        ]
      },
      interimResults: true
    })

    .on("data", (data) => {

      const transcript =
        data.results?.[0]?.alternatives?.[0]?.transcript;

      const isFinal = data.results?.[0]?.isFinal;

      if (transcript) {
        ws.send(JSON.stringify({
          transcript,
          final: isFinal
        }));
      }

    })

    .on("error", (err) => {
      console.error("STT error:", err);
    });

  ws.on("message", (msg) => {
    recognizeStream.write(msg);
  });

  ws.on("close", () => {
    recognizeStream.destroy();
  });

});

console.log("🎤 STT streaming server running on ws://localhost:3002");