import speech from "@google-cloud/speech";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";

dotenv.config();

/* -------------------------------------------------------
   PRODUCTION VERSION (ACTIVE)
   Used on Render with Service Account JSON
------------------------------------------------------- */

const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");

// const client = new speech.SpeechClient({
//   credentials
// });

/* -------------------------------------------------------
   LOCAL VERSION (COMMENTED)
   Uses `gcloud auth application-default login`
------------------------------------------------------- */


const client = new speech.SpeechClient();

const PORT = process.env.PORT || 3002;

const wss = new WebSocketServer({ port: PORT });

console.log(`🎤 STT WebSocket server running on port ${PORT}`);

wss.on("connection", (ws) => {

  console.log("🔌 Client connected");

  let recognizeStream = null;
  let silenceTimer = null;
  let restartTimer = null;
  let streamClosed = false;

  function send(data) {

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }

  }

  /* --------------------------------------------------
     Start Google STT stream
  -------------------------------------------------- */

  function startStream() {

    console.log("🎤 Starting Google STT stream");

    streamClosed = false;

    recognizeStream =
      client.streamingRecognize({

        config: {

          encoding: "LINEAR16",
          sampleRateHertz: 16000,
          audioChannelCount: 1,
          languageCode: "en-US",

          model: "default",
          useEnhanced: true,

          enableAutomaticPunctuation: false,
          profanityFilter: false,
        },

        interimResults: true

      })

      /* ---------------------------
         Transcript event
      ---------------------------- */

      .on("data", (data) => {

        if (!data.results || !data.results[0]) return;

        const result = data.results[0];
        const transcript =
          result.alternatives?.[0]?.transcript;

        if (!transcript) return;

        console.log(
          result.isFinal
            ? `✅ Final: ${transcript}`
            : `… Interim: ${transcript}`
        );

        send({
          transcript,
          final: result.isFinal
        });

        /* ---------------------------
           Silence detection
        ---------------------------- */

        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }

        silenceTimer = setTimeout(() => {

          console.log("🛑 Silence detected → speech ended");

          send({ speechEnded: true });

        }, 2800);

      })

      .on("error", (err) => {

        console.error("❌ Google STT error:", err);
        streamClosed = true;

      })

      .on("close", () => {

        console.log("⚠️ Google STT stream closed");
        streamClosed = true;

      });

    /* ---------------------------
       Restart before 60s limit
    ---------------------------- */

    restartTimer = setTimeout(() => {

      console.log("♻️ Restarting STT stream");

      if (recognizeStream) {
        recognizeStream.end();
      }

      streamClosed = true;

    }, 55000);

  }

  /* --------------------------------------------------
     Receive audio from client
  -------------------------------------------------- */

  ws.on("message", (msg) => {

    if (!recognizeStream || streamClosed) {
      startStream();
    }

    if (recognizeStream?.writable) {

      try {
        recognizeStream.write(msg);
      } catch {
        console.warn("⚠️ Audio write skipped");
      }

    }

  });

  /* --------------------------------------------------
     Client disconnected
  -------------------------------------------------- */

  ws.on("close", () => {

    console.log("🔌 Client disconnected");

    if (silenceTimer) clearTimeout(silenceTimer);
    if (restartTimer) clearTimeout(restartTimer);

    if (recognizeStream) {
      recognizeStream.end();
    }

  });

});