import speech from "@google-cloud/speech";
import WebSocket, { WebSocketServer } from "ws";

const client = new speech.SpeechClient();

const wss = new WebSocketServer({ port: 3002 });

wss.on("connection", (ws) => {

  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
        model: "latest_long",
        enableAutomaticPunctuation: true,
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

    });

  ws.on("message", (msg) => {
    recognizeStream.write(msg);
  });

  ws.on("close", () => {
    recognizeStream.destroy();
  });

});

console.log("🎤 STT streaming server running on ws://localhost:3002");