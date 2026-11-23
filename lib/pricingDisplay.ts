/** Presentation-only formatting; plan records, identifiers and prices stay intact. */
export function cleanPricingText(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/\bwhatsap\b/gi, "WhatsApp");
}

export function formatPricingPlanName(value: string): string {
  const labels: Record<string, string> = {
    core: "Core",
    elite: "Elite",
    executive: "Executive",
    mentorship: "Mentorship",
  };
  return cleanPricingText(value).replace(/\b(core|elite|executive|mentorship)\b/gi, (word) => labels[word.toLowerCase()]);
}

export function formatPricingDuration(label: string | undefined, months: number): string {
  const text = cleanPricingText(label || "") || `${months} ${months === 1 ? "month" : "months"}`;
  return text.replace(/\b(months?|sessions?|mocks?)\b/gi, (word) => word.toLowerCase());
}

export type PricingFeatureLine = { text: string; meta?: string };

export function cleanPricingFeatures(lines: ReadonlyArray<PricingFeatureLine>): PricingFeatureLine[] {
  const seen = new Set<string>();
  const result: PricingFeatureLine[] = [];
  for (const line of lines) {
    const text = cleanPricingText(line.text).replace(/^[\s✔✓☑✅\uFE0E\uFE0F]+/u, "").trim();
    const key = text.toLowerCase().replace(/[-\u2010-\u2015\s]+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push({ text, ...(line.meta ? { meta: cleanPricingText(line.meta) } : {}) });
  }
  return result;
}

export function pricingSearchFeedback({
  query,
  searching,
  error,
  hasAiResults,
}: {
  query: string;
  searching: boolean;
  error: string;
  hasAiResults: boolean;
}): { title: string; detail: string } {
  if (searching) return {
    title: "Finding relevant plans…",
    detail: "Searching the available plans for your request.",
  };
  if (error) return {
    title: "Search could not be completed",
    detail: "Your request is still here. Try AI search again.",
  };
  if (hasAiResults) return {
    title: "No matching plans found",
    detail: "Try a broader topic or describe what you want to practise.",
  };
  if (query.trim().length < 3) return {
    title: "Keep typing to search",
    detail: "Enter at least 3 characters to search with AI.",
  };
  return {
    title: "Find relevant plans with AI search",
    detail: "Press Enter or choose AI search to find relevant plans.",
  };
}
