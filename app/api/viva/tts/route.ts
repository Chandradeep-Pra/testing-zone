// //@ts-nocheck

// import textToSpeech from "@google-cloud/text-to-speech";

// /* ---------------------------
//    INIT CLIENT ONCE
// ---------------------------- */

// const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

// if (!raw) {
//   throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
// }

// const creds = JSON.parse(raw);

// const client = new textToSpeech.TextToSpeechClient({
//   credentials: {
//     client_email: creds.client_email,
//     private_key: creds.private_key.replace(/\\n/g, "\n"),
//   },
//   projectId: creds.project_id,
// });

// /* ---------------------------
//    API ROUTE
// ---------------------------- */

// export async function POST(req: Request) {

//   const { text } = await req.json();

//   const [response] = await client.synthesizeSpeech({

//     input: { text },

//     voice: {
//       languageCode: "en-US",
//       name: "en-US-Neural2-C",
//     },

//     audioConfig: {
//       audioEncoding: "MP3",
//     },

//   });

//   return new Response(response.audioContent, {
//     headers: {
//       "Content-Type": "audio/mpeg",
//       "Cache-Control": "no-store",
//     },
//   });

// }


//@ts-nocheck

//@ts-nocheck

import textToSpeech from "@google-cloud/text-to-speech";

const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

if (!raw) {
  throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
}

const creds = JSON.parse(raw);

const client = new textToSpeech.TextToSpeechClient({
  credentials: {
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  },
  projectId: creds.project_id,
});

/* -------- Human-like variation -------- */

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function vivaSSML(question: string) {

  const rate = random(1.03, 1.10).toFixed(2);
  const pitch = Math.floor(random(0, 2));

  return `
  <speak>
    <prosody rate="${rate}" pitch="+${pitch}st">
      ${question}
    </prosody>
  </speak>
  `;
}

export async function POST(req: Request) {
  const { text } = await req.json();

  const [response] = await client.synthesizeSpeech({
    input: {
      ssml: vivaSSML(text),
    },

    voice: {
      languageCode: "en-US",
      name: "en-US-Aoede",
    },

    audioConfig: {
      audioEncoding: "MP3",
    },
  });

  return new Response(response.audioContent, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}