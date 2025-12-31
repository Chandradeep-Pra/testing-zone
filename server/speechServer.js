
import { SpeechClient } from "@google-cloud/speech";
import WebSocket, { WebSocketServer } from "ws";

const speechClient = new SpeechClient();

const wss = new WebSocketServer({ port: 5001 });

wss.on("connection", (ws) => {
  console.log("Client connected");

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 44100,
        languageCode: "en-US",
      },
      interimResults: true,
    })
    .on("error", (err) => {
      console.error("Google STT error:", err);
      ws.close();
    })
    .on("data", (data) => {
      // send text back to browser
      ws.send(JSON.stringify({ transcript: data.results[0] }));
    });

  ws.on("message", (message) => {
    recognizeStream.write(message); // incoming audio chunks
  });

  ws.on("close", () => {
    recognizeStream.destroy();
  });
});
