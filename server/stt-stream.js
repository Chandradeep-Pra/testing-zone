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

const client = new speech.SpeechClient({
  credentials
});

/* -------------------------------------------------------
   LOCAL VERSION (COMMENTED)
   Uses `gcloud auth application-default login`
------------------------------------------------------- */

// const client = new speech.SpeechClient();

/* -------------------------------------------------------
   SERVER
------------------------------------------------------- */

const PORT = process.env.PORT || 3002;

const wss = new WebSocketServer({ port: PORT });

console.log(`🎤 STT WebSocket running on port ${PORT}`);

/* -------------------------------------------------------
   CONNECTION
------------------------------------------------------- */

wss.on("connection", (ws) => {

  console.log("🔌 Client connected");

  let recognizeStream = null;
  let streamClosed = false;
  let restartTimer = null;

  /* ---------------------------
     Create Google STT stream
  ---------------------------- */

  function createStream() {

    streamClosed = false;

    recognizeStream = client
      .streamingRecognize({
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 16000,
          audioChannelCount: 1,
          languageCode: "en-US",
          model: "latest_short",
          enableAutomaticPunctuation: true,

          speechContexts: [
            {
              phrases: [

                /* Urology */
                "hematuria",
                "uroflowmetry",
                "post void residual",
                "benign prostatic hyperplasia",
                "prostate specific antigen",
                "PSA",
                "lower urinary tract symptoms",
                "LUTS",
                "TURP",
                "transurethral resection of prostate",

                /* Cardiology */
                "hypertension",
                "diabetes mellitus",
                "hyperlipidemia",
                "myocardial infarction",
                "coronary artery disease",
                "heart failure",
                "atrial fibrillation",

                /* Neurology */
                "stroke",
                "transient ischemic attack",
                "subarachnoid hemorrhage",
                "intracranial pressure",

                /* Gastroenterology */
                "gastroesophageal reflux disease",
                "GERD",
                "peptic ulcer disease",
                "hepatomegaly",
                "splenomegaly",
                "cirrhosis",

                /* Respiratory */
                "pneumonia",
                "chronic obstructive pulmonary disease",
                "COPD",
                "tuberculosis",
                "pulmonary embolism",

                /* Endocrine */
                "hypothyroidism",
                "hyperthyroidism",
                "Cushing syndrome",
                "Addison disease",

                /* Emergency */
                "anaphylaxis",
                "septic shock",
                "cardiac arrest",
                "ventricular tachycardia",
                "ventricular fibrillation"

              ],
              boost: 18
            }
          ]
        },

        interimResults: true
      })

      /* ---------------------------
         Transcript response
      ---------------------------- */

      .on("data", (data) => {

        const transcript =
          data.results?.[0]?.alternatives?.[0]?.transcript;

        const isFinal =
          data.results?.[0]?.isFinal;

        if (transcript && ws.readyState === ws.OPEN) {

          ws.send(JSON.stringify({
            transcript,
            final: isFinal
          }));

        }

      })

      /* ---------------------------
         Error handling
      ---------------------------- */

      .on("error", (err) => {

        console.error("❌ STT error:", err);
        streamClosed = true;

      })

      .on("close", () => {

        console.log("⚠️ STT stream closed");
        streamClosed = true;

      });

    /* ---------------------------
       Restart stream every 55s
       (Google streaming limit)
    ---------------------------- */

    restartTimer = setTimeout(() => {

      console.log("♻️ Restarting STT stream");

      if (recognizeStream) {
        recognizeStream.end();
      }

      streamClosed = true;

    }, 55000);

  }

  /* ---------------------------
     Audio chunks from client
  ---------------------------- */

  ws.on("message", (msg) => {

    if (!recognizeStream || streamClosed) {

      console.log("🎤 Starting STT stream");

      createStream();

    }

    if (recognizeStream?.writable) {

      try {
        recognizeStream.write(msg);
      } catch {
        console.log("write skipped");
      }

    }

  });

  /* ---------------------------
     Client disconnected
  ---------------------------- */

  ws.on("close", () => {

    console.log("🔌 Client disconnected");

    streamClosed = true;

    if (restartTimer) clearTimeout(restartTimer);

    if (recognizeStream) {
      recognizeStream.end();
    }

  });

});