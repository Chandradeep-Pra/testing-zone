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
    result = result.replace(
      new RegExp(`\\b${escapeRegExp(term.canonical)}\\b`, "gi"),
      term.tts,
    );
  }
  return result;
}
