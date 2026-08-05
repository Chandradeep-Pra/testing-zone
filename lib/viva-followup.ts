import type {
  CalmAndComposedConfig,
  CalmTreatmentConfig,
  VivaCaseRecord,
} from "@/lib/viva-case";
import { isActiveCalmPhase, type ActiveCalmVivaPhase } from "@/lib/viva-flow";

type QuestionAnswer = { question: string; answer: string };

export function cleanFollowupResponse(text: string) {
  if (!text) return "Please continue.";

  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

export function parseFollowupResponse(text: string, vivaCase: VivaCaseRecord) {
  const imageUsed = /imageUsed:\s*true/i.test(text);
  const imageLinkMatch = text.match(/imageLink:\s*((?:https?:\/\/|\/)[^\s,]+)/i);
  const imageLink = imageLinkMatch ? imageLinkMatch[1] : null;
  const imageId = imageLink
    ? vivaCase.exhibits.find((exhibit) => {
        const exhibitLink = exhibit.url || (exhibit.file ? `/exhibits/${exhibit.file}` : null);
        return exhibitLink === imageLink;
      })?.id ?? null
    : null;
  const question = text
    .replace(/question:\s*/i, "")
    .split(/\nimageUsed:/i)[0]
    .split(/\nimageLink:/i)[0]
    .trim();

  return {
    question,
    imageUsed,
    imageLink,
    imageDescription: null,
    imageId,
  };
}

export function formatRecentQA(previousQA: QuestionAnswer[]) {
  return previousQA
    .slice(-2)
    .map(
      ({ question, answer }, index) =>
        `Q${index + 1}: ${question}\nA${index + 1}: ${answer || "[no answer yet]"}`,
    )
    .join("\n\n");
}

export function formatAvailableExhibits(
  vivaCase: VivaCaseRecord,
  shownExhibitIds: string[] = [],
) {
  const shownSet = new Set(shownExhibitIds.map((id) => id.toLowerCase()));

  return vivaCase.exhibits
    .filter((exhibit) => !shownSet.has(exhibit.id.toLowerCase()))
    .map((exhibit) => {
      const link = exhibit.url || (exhibit.file ? `/exhibits/${exhibit.file}` : null);
      return `- ${exhibit.id}: ${exhibit.label}${link ? ` (${link})` : ""}`;
    })
    .join("\n");
}

export function getVivaStage(value: string): ActiveCalmVivaPhase {
  return isActiveCalmPhase(value) ? value : "assessment";
}

function findReferencedTreatment(
  config: CalmAndComposedConfig | undefined,
  referenceText: string,
): CalmTreatmentConfig | null {
  const haystack = referenceText.toLowerCase();
  for (const diagnosis of config?.diagnoses || []) {
    for (const treatment of diagnosis.treatments) {
      if (
        haystack.includes(treatment.name.toLowerCase()) ||
        haystack.includes(treatment.id.toLowerCase())
      ) {
        return treatment;
      }
    }
  }
  return null;
}

export function formatPhaseContext(params: {
  stage: ActiveCalmVivaPhase;
  config?: CalmAndComposedConfig;
  referenceText: string;
}) {
  const phase = params.config?.phases?.[params.stage];
  const phaseHeader = `Objectives: ${(phase?.objectives || []).join("; ") || "use case objectives"}\nCritical: ${(phase?.criticalTopics || []).join("; ") || "none"}`;

  if (params.stage === "assessment") return phaseHeader;

  if (params.stage === "investigations") {
    const investigations = params.config?.investigations || [];
    const requested = investigations.find((item) => {
      const names = [item.id, item.name, ...item.aliases].map((value) => value.toLowerCase());
      return names.some((value) => value && params.referenceText.toLowerCase().includes(value));
    });
    const activeResult = requested || investigations[0];
    const catalog = investigations.map((item) => ({
      id: item.id,
      name: item.name,
      aliases: item.aliases,
    }));
    return `${phaseHeader}\nInvestigation catalogue: ${JSON.stringify(catalog)}${
      activeResult
        ? `\nClinically available result: ${activeResult.id}: ${activeResult.report}\nInterpretation points: ${activeResult.interpretationPoints.join("; ")}`
        : ""
    }`;
  }

  const selectedTreatment = findReferencedTreatment(params.config, params.referenceText);
  if (params.stage === "management") {
    const management = (params.config?.diagnoses || []).map((diagnosis) => ({
      diagnosis: diagnosis.name,
      aliases: diagnosis.aliases,
      treatments: diagnosis.treatments.map((treatment) => ({
        id: treatment.id,
        name: treatment.name,
        indications: treatment.indications,
        advantages: treatment.advantages,
        disadvantages: treatment.disadvantages,
        mechanism: treatment.mechanism,
      })),
    }));
    return `${phaseHeader}\nManagement references: ${JSON.stringify(management)}`;
  }

  const treatmentNames = (params.config?.diagnoses || []).flatMap((diagnosis) =>
    diagnosis.treatments.map((treatment) => treatment.name),
  );
  if (!selectedTreatment) {
    return `${phaseHeader}\nKnown treatment names: ${treatmentNames.join(", ") || "none configured"}. Establish the candidate's treatment before treatment-specific questioning.`;
  }

  if (params.stage === "complications") {
    return `${phaseHeader}\nSelected treatment: ${selectedTreatment.name}\nComplications: ${selectedTreatment.complications.join("; ")}`;
  }

  return `${phaseHeader}\nSelected treatment: ${selectedTreatment.name}\nFollow-up: ${selectedTreatment.followUp.join("; ")}`;
}
