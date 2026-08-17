import { airlineMasterById } from "./airline-master-data";
import type {
  AirlineResource,
  AirlineResourceType,
  SourceGrade,
} from "./airline-knowledge-repository";
import { emiratesResearchRecords } from "./emirates-research-pack";
import { qatarResearchRecords } from "./qatar-research-pack";
import { etihadResearchRecords } from "./etihad-research-pack";
import { singaporeResearchRecords } from "./singapore-research-pack";
import { cathayResearchRecords } from "./cathay-research-pack";
import { anaResearchRecords } from "./ana-research-pack";
import { jalResearchRecords } from "./jal-research-pack";
import { koreanAirResearchRecords } from "./korean-air-research-pack";
import { asianaResearchRecords } from "./asiana-research-pack";
import { evaAirResearchRecords } from "./eva-air-research-pack";
import { chinaAirlinesResearchRecords } from "./china-airlines-research-pack";
import { lufthansaResearchRecords } from "./lufthansa-research-pack";
import { turkishAirlinesResearchRecords } from "./turkish-airlines-research-pack";
import { airFranceResearchRecords } from "./air-france-research-pack";
import { britishAirwaysResearchRecords } from "./british-airways-research-pack";
import { deltaAirLinesResearchRecords } from "./delta-air-lines-research-pack";
import { unitedAirlinesResearchRecords } from "./united-airlines-research-pack";

export type ResearchCollectionMethod = "perplexity" | "manual";
export type ResearchStatus =
  "collected" | "processing" | "reviewing" | "approved" | "rejected";
export type ResearchFactCategory =
  | "profile"
  | "brand"
  | "service"
  | "safety"
  | "recruitment"
  | "interview"
  | "language"
  | "application"
  | "work_authorization"
  | "medical"
  | "training"
  | "experience"
  | "passport"
  | "background_check"
  | "physical"
  | "grooming"
  | "base";

export type AirlineResearchFact = {
  category: ResearchFactCategory;
  key: string;
  value: string;
  sourceUrl?: string;
  sourceGrade?: SourceGrade;
  verified: boolean;
};

export type AirlineResearchRecord = {
  id: string;
  airlineId: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: string;
  collectedBy: ResearchCollectionMethod;
  collectedAt: string;
  rawSummary: string;
  rawText?: string;
  extractedFacts: AirlineResearchFact[];
  confidence: "high" | "medium" | "low";
  status: ResearchStatus;
  sourceDate?: string;
  sourceGrade?: SourceGrade;
  notes?: string;
};

export type ApprovedResearchSource = {
  recordId: string;
  sourceTitle: string;
  sourceGrade: SourceGrade;
  verifiedAt: string;
  facts: Array<Pick<AirlineResearchFact, "category" | "key" | "value">>;
};

export type EmiratesDataPackTemplate = {
  airlineId: "emirates";
  profile: {
    brandIdentity: string[];
    servicePhilosophy: string[];
    customerFocus: string[];
    safetyCulture: string[];
  };
  recruitment: {
    recruitmentPage: string[];
    requirements: string[];
    process: string[];
  };
  interview: {
    questionPatterns: string[];
    competencyTags: string[];
    followUps: string[];
  };
  application: {
    motivationPoints: string[];
    recommendedConnection: string[];
    avoidPatterns: string[];
  };
};

// This is deliberately empty: it is an input contract, not Emirates factual content.
export const emiratesDataPackTemplate: EmiratesDataPackTemplate = {
  airlineId: "emirates",
  profile: {
    brandIdentity: [],
    servicePhilosophy: [],
    customerFocus: [],
    safetyCulture: [],
  },
  recruitment: { recruitmentPage: [], requirements: [], process: [] },
  interview: { questionPatterns: [], competencyTags: [], followUps: [] },
  application: {
    motivationPoints: [],
    recommendedConnection: [],
    avoidPatterns: [],
  },
};

const KEY = "cabin-airline-research-v1";
const now = () => new Date().toISOString();
const allowedContextGrades: SourceGrade[] = ["A", "B", "C"];

export function validateResearchRecord(record: AirlineResearchRecord) {
  const errors: string[] = [];
  if (!airlineMasterById.has(record.airlineId))
    errors.push("Unknown AirlineMaster ID.");
  if (!record.sourceTitle.trim()) errors.push("Source title is required.");
  try {
    new URL(record.sourceUrl);
  } catch {
    errors.push("A valid source URL is required.");
  }
  if (!record.collectedAt) errors.push("Collected date is required.");
  for (const fact of record.extractedFacts) {
    if (!fact.category || !fact.key.trim() || !fact.value.trim())
      errors.push("Every fact needs category, key, and value.");
  }
  return errors;
}

export function canConvertResearchToKnowledge(record: AirlineResearchRecord) {
  if (record.status !== "approved" || !record.sourceUrl) return false;
  return record.extractedFacts.some(
    (fact) =>
      fact.verified &&
      !!fact.sourceUrl &&
      !!fact.sourceGrade &&
      allowedContextGrades.includes(fact.sourceGrade),
  );
}

/** Converts only approved, verified, A/B/C research facts into a reviewable knowledge resource. */
export function convertResearchToKnowledge(
  record: AirlineResearchRecord,
): AirlineResource | null {
  if (!canConvertResearchToKnowledge(record)) return null;
  const facts = record.extractedFacts.filter(
    (fact) =>
      fact.verified &&
      !!fact.sourceUrl &&
      !!fact.sourceGrade &&
      allowedContextGrades.includes(fact.sourceGrade),
  );
  const sourceGrade = facts.some((fact) => fact.sourceGrade === "A")
    ? "A"
    : facts.some((fact) => fact.sourceGrade === "B")
      ? "B"
      : "C";
  return {
    id: `research-${record.id}`,
    airlineId: record.airlineId,
    resourceType: resourceTypeFor(facts[0]?.category),
    title: record.sourceTitle,
    url: record.sourceUrl,
    language: "und",
    publisher:
      record.collectedBy === "manual"
        ? "Manual research review"
        : "Perplexity research review",
    checkedAt: now(),
    summary: facts.map((fact) => `${fact.key}: ${fact.value}`).join("\n"),
    extractedFacts: facts.map((fact, index) => ({
      id: `${record.id}-${index}`,
      label: fact.key,
      value: fact.value,
      confidence: record.confidence,
    })),
    sourceGrade,
    verificationStatus: "verified",
    validity: "unknown",
    notes: `Converted from approved research record ${record.id}.`,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function getApprovedResearchSources(
  records: AirlineResearchRecord[],
  airlineId: string,
): ApprovedResearchSource[] {
  return records
    .filter(
      (record) =>
        record.airlineId === airlineId && canConvertResearchToKnowledge(record),
    )
    .map((record) => ({
      recordId: record.id,
      sourceTitle: record.sourceTitle,
      sourceGrade: bestGrade(record),
      verifiedAt: record.collectedAt,
      facts: record.extractedFacts
        .filter(
          (fact) =>
            fact.verified &&
            !!fact.sourceUrl &&
            !!fact.sourceGrade &&
            allowedContextGrades.includes(fact.sourceGrade),
        )
        .map(({ category, key, value }) => ({ category, key, value })),
    }));
}

function bestGrade(record: AirlineResearchRecord): SourceGrade {
  const grades = record.extractedFacts
    .map((fact) => fact.sourceGrade)
    .filter((grade): grade is SourceGrade => !!grade);
  return grades.includes("A") ? "A" : grades.includes("B") ? "B" : "C";
}

function resourceTypeFor(category?: ResearchFactCategory): AirlineResourceType {
  if (category === "recruitment" || category === "application")
    return "recruitment_guide";
  if (category === "safety") return "safety_information";
  if (category === "service" || category === "brand") return "service_guide";
  return "company_overview";
}

function load() {
  const base = [
    ...emiratesResearchRecords,
    ...qatarResearchRecords,
    ...etihadResearchRecords,
    ...singaporeResearchRecords,
    ...cathayResearchRecords,
    ...anaResearchRecords,
    ...jalResearchRecords,
    ...koreanAirResearchRecords,
    ...asianaResearchRecords,
    ...evaAirResearchRecords,
    ...chinaAirlinesResearchRecords,
    ...lufthansaResearchRecords,
    ...turkishAirlinesResearchRecords,
    ...airFranceResearchRecords,
    ...britishAirwaysResearchRecords,
    ...deltaAirLinesResearchRecords,
    ...unitedAirlinesResearchRecords,
  ];
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as AirlineResearchRecord[]) : [];
    return [
      ...new Map(
        [...base, ...saved].map((record) => [record.id, record]),
      ).values(),
    ];
  } catch {
    return base;
  }
}
function save(records: AirlineResearchRecord[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(KEY, JSON.stringify(records));
  return records;
}

export const airlineResearchRepository = {
  load,
  list(airlineId?: string) {
    return load().filter(
      (record) => !airlineId || record.airlineId === airlineId,
    );
  },
  create(record: AirlineResearchRecord) {
    const errors = validateResearchRecord(record);
    if (errors.length) throw new Error(errors.join(" "));
    save([record, ...load().filter((item) => item.id !== record.id)]);
    return record;
  },
  updateStatus(id: string, status: ResearchStatus) {
    const next = load().map((record) =>
      record.id === id ? { ...record, status } : record,
    );
    save(next);
    return next.find((record) => record.id === id);
  },
};
