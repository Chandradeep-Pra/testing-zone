import speech from "@google-cloud/speech";

const client = new speech.SpeechClient();

export async function POST(req: Request) {

  const audioBuffer = Buffer.from(await req.arrayBuffer());

  const [response] = await client.recognize({

    audio: {
      content: audioBuffer.toString("base64")
    },

    config: {

      encoding: "WEBM_OPUS",
      sampleRateHertz: 48000,
      languageCode: "en-US",

      enableAutomaticPunctuation: true,

      speechContexts: [
        {
          phrases: [
            "hematuria",
            "lower urinary tract symptoms",
            "LUTS",
            "urodynamics",
            "prostate",
            "benign prostatic hyperplasia",
            "alpha blockers",
            "tamsulosin",
            "PSA",
            "digital rectal examination",
            "post void residual",
            "uroflowmetry",
            "hydronephrosis",
            "catheterisation"
          ],
          boost: 20
        }
      ]

    }

  });

  const transcript =
    response.results
      ?.map(r => r.alternatives?.[0]?.transcript)
      .join(" ") || "";

  return Response.json({ transcript });

}