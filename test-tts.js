// import textToSpeech from "@google-cloud/text-to-speech";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import fs from "fs";

const client = new TextToSpeechClient();

async function run() {

const [response] = await client.synthesizeSpeech({
  input: { text: "Hello candidate. Please explain lower urinary tract symptoms." },

  voice: {
    languageCode: "en-US",
    name: "en-US-Chirp3-HD-Charon"
  },

  audioConfig: {
    audioEncoding: "MP3"
  }
});

fs.writeFileSync("viva.mp3", response.audioContent);

}

run();