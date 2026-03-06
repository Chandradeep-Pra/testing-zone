import speech from "@google-cloud/speech";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

const client = new speech.SpeechClient({
  credentials
});

const PORT = process.env.PORT || 3002;

const wss = new WebSocketServer({ port: PORT });

console.log(`🎤 STT WebSocket running on port ${PORT}`);

wss.on("connection", (ws) => {

  console.log("🔌 Client connected");

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
      console.error("❌ STT error:", err);
    });

  ws.on("message", (msg) => {
    recognizeStream.write(msg);
  });

  ws.on("close", () => {
    console.log("🔌 Client disconnected");
    recognizeStream.destroy();
  });

});