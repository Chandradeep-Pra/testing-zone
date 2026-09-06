export type MedicalTerm = {
  canonical: string;
  spokenVariants: string[];
  tts: string;
};

export function normalizeMedicalTerms(value: unknown): MedicalTerm[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const source = item as Record<string, unknown>;
      const canonical = typeof source.canonical === "string" ? source.canonical.trim() : "";
      if (!canonical) return null;
      const spokenVariants = Array.isArray(source.spokenVariants)
        ? source.spokenVariants.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())).map((entry) => entry.trim())
        : [];
      return {
        canonical,
        spokenVariants: [...new Set([canonical, ...spokenVariants])].slice(0, 8),
        tts: typeof source.tts === "string" && source.tts.trim() ? source.tts.trim() : canonical,
      };
    })
    .filter((item): item is MedicalTerm => Boolean(item))
    .slice(0, 50);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeMedicalTranscript(text: string, terms: MedicalTerm[]) {
  let result = text;
  const aliases = terms.flatMap((term) =>
    term.spokenVariants.map((variant) => ({ variant, replacement: term.canonical })),
  ).sort((left, right) => right.variant.length - left.variant.length);
  for (const { variant, replacement } of aliases) {
    if (variant.toLowerCase() === replacement.toLowerCase()) continue;
    result = result.replace(new RegExp(`\\b${escapeRegExp(variant)}\\b`, "gi"), replacement);
  }
  return result;
}

export function prepareTextForMedicalTts(text: string, terms: MedicalTerm[]) {
  let result = text;
  for (const term of [...terms].sort((a, b) => b.canonical.length - a.canonical.length)) {
    // Uppercase abbreviations always follow the spelling rule, even when a
    // case-specific pronunciation would otherwise turn CT into a word.
    if (/^[A-Z][A-Z.\d-]+$/.test(term.canonical)) continue;
    result = result.replace(
      new RegExp(`\\b${escapeRegExp(term.canonical)}\\b`, "gi"),
      (matched) => /\b[A-Z]{2,}\b/.test(matched) ? matched : term.tts,
    );
  }
  return spellUppercaseAbbreviations(result)
    // Plain text works with the configured Chirp voices. Sentence punctuation
    // becomes a pause; decimal points (e.g. 2.5 mg) must retain their meaning.
    .replace(/\.(?!\d)/g, "\n")
    .replace(/\n+/g, "\n");
}

const LETTER_NAMES: Record<string, string> = Object.fromEntries(
  "ay bee see dee ee eff jee aitch eye jay kay ell em en oh pee cue ar ess tee you vee double-you ex why zed"
    .split(" ")
    .map((name, index) => [String.fromCharCode(65 + index), name.replace("-", " ")]),
);

export function spellUppercaseAbbreviations(text: string) {
  return text
    .replace(/\b(?:[A-Z]\.)+[A-Z]\.?(?![a-z])/g, (word) => word.replace(/\./g, ""))
    .replace(/\b[A-Z]{2,}\b/g, (word) => [...word].map((letter) => LETTER_NAMES[letter]).join(" "));
}
