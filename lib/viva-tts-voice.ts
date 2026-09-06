const VIVA_VOICES: Record<string, "FEMALE" | "MALE"> = {
  "en-GB-Chirp3-HD-Leda": "FEMALE",
  "en-GB-Chirp3-HD-Achird": "MALE",
  "en-GB-Chirp3-HD-Charon": "MALE",
  "en-GB-Chirp3-HD-Zephyr": "FEMALE",
};

export function resolveVivaTtsVoice(voiceName: unknown, languageCode: unknown) {
  if (typeof voiceName !== "string" || !Object.hasOwn(VIVA_VOICES, voiceName)) {
    throw new Error("A supported examiner voice is required. Please select your examiner again.");
  }
  if (languageCode !== undefined && languageCode !== "en-GB") {
    throw new Error("The examiner voice requires en-GB.");
  }
  return { name: voiceName, languageCode: "en-GB", ssmlGender: VIVA_VOICES[voiceName] };
}
