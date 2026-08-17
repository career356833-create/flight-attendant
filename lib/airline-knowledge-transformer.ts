import type {
  AirlineResearchFact,
  AirlineResearchRecord,
  ResearchFactCategory,
} from "./airline-research-repository";
import type { SourceGrade } from "./airline-knowledge-repository";
import {
  emiratesCoachingInsightDrafts,
  emiratesInterviewQuestionDrafts,
} from "./emirates-research-pack";
import {
  qatarCoachingInsightDrafts,
  qatarInterviewQuestionDrafts,
} from "./qatar-research-pack";
import {
  etihadCoachingInsightDrafts,
  etihadInterviewQuestionDrafts,
} from "./etihad-research-pack";
import {
  singaporeCoachingInsightDrafts,
  singaporeInterviewQuestionDrafts,
} from "./singapore-research-pack";
import {
  cathayCoachingInsightDrafts,
  cathayInterviewQuestionDrafts,
} from "./cathay-research-pack";
import {
  anaCoachingInsightDrafts,
  anaInterviewQuestionDrafts,
} from "./ana-research-pack";
import {
  jalCoachingInsightDrafts,
  jalInterviewQuestionDrafts,
} from "./jal-research-pack";
import {
  koreanAirCoachingInsightDrafts,
  koreanAirInterviewQuestionDrafts,
} from "./korean-air-research-pack";
import {
  asianaCoachingInsightDrafts,
  asianaInterviewQuestionDrafts,
} from "./asiana-research-pack";
import {
  evaAirCoachingInsightDrafts,
  evaAirInterviewQuestionDrafts,
} from "./eva-air-research-pack";
import {
  chinaAirlinesCoachingInsightDrafts,
  chinaAirlinesInterviewQuestionDrafts,
} from "./china-airlines-research-pack";
import { lufthansaCoachingInsightDrafts, lufthansaInterviewQuestionDrafts } from "./lufthansa-research-pack";
import { turkishAirlinesCoachingInsightDrafts, turkishAirlinesInterviewQuestionDrafts } from "./turkish-airlines-research-pack";
import { airFranceCoachingInsightDrafts, airFranceInterviewQuestionDrafts } from "./air-france-research-pack";
import { britishAirwaysCoachingInsightDrafts, britishAirwaysInterviewQuestionDrafts } from "./british-airways-research-pack";
import { deltaAirLinesCoachingInsightDrafts, deltaAirLinesInterviewQuestionDrafts } from "./delta-air-lines-research-pack";
import { unitedAirlinesCoachingInsightDrafts, unitedAirlinesInterviewQuestionDrafts } from "./united-airlines-research-pack";

export type CoachingTopic =
  "motivation" | "service" | "safety" | "teamwork" | "language" | "application";
export type CoachingInsightStatus = "draft" | "reviewing" | "approved";
export type AirlineCoachingInsight = {
  id: string;
  airlineId: string;
  topic: CoachingTopic;
  coachMessage: string;
  goodDirections: string[];
  avoidPatterns: string[];
  recommendedExperienceTags: string[];
  sourceReferences: string[];
  status: CoachingInsightStatus;
  publishStatus?: "unpublished" | "published";
};

export type AirlineInterviewQuestion = {
  id: string;
  airlineId: string;
  prompt: string;
  questionType: "motivation" | "experience" | "service" | "safety" | "language";
  competencyTags: string[];
  recommendedExperienceTags: string[];
  followUpQuestions: string[];
  sourceReferences: string[];
  status: CoachingInsightStatus;
  publishStatus?: "unpublished" | "published";
  sourceBasis?: "coaching_draft" | "research_candidate";
};

export type AirlineKnowledgePack = {
  profile: AirlineResearchFact[];
  recruitment: AirlineResearchFact[];
  faq: AirlineResearchFact[];
  interviewQuestions: AirlineInterviewQuestion[];
  coachingInsights: AirlineCoachingInsight[];
};

const eligibleGrades: SourceGrade[] = ["A", "B", "C"];
const KEY = "cabin-airline-coaching-insights-v1";
const QUESTION_KEY = "cabin-airline-interview-questions-v1";

function isEligible(record: AirlineResearchRecord, fact: AirlineResearchFact) {
  return (
    record.status === "approved" &&
    fact.verified &&
    !!fact.sourceUrl &&
    !!fact.sourceGrade &&
    eligibleGrades.includes(fact.sourceGrade)
  );
}

/**
 * Pure conversion layer. It never invents a fact, question, or coach message:
 * only approved, source-graded, verified facts are retained.
 */
export function convertResearchToKnowledgePack(
  records: AirlineResearchRecord[],
): AirlineKnowledgePack {
  const usable = records.flatMap((record) =>
    record.extractedFacts
      .filter((fact) => isEligible(record, fact))
      .map((fact) => ({ record, fact })),
  );
  const factFor = (...categories: ResearchFactCategory[]) =>
    usable
      .filter(({ fact }) => categories.includes(fact.category))
      .map(({ fact }) => fact);
  return {
    profile: factFor("profile", "brand", "service", "safety"),
    recruitment: factFor("recruitment", "language", "application"),
    faq: usable
      .filter(({ fact }) => fact.key.startsWith("faq_"))
      .map(({ fact }) => fact),
    interviewQuestions: usable.flatMap(({ record, fact }) =>
      toInterviewQuestion(record, fact)
        ? [toInterviewQuestion(record, fact)!]
        : [],
    ),
    coachingInsights: usable.flatMap(({ record, fact }) =>
      toCoachingInsight(record, fact) ? [toCoachingInsight(record, fact)!] : [],
    ),
  };
}

function toInterviewQuestion(
  record: AirlineResearchRecord,
  fact: AirlineResearchFact,
): AirlineInterviewQuestion | null {
  if (fact.category !== "interview" || !fact.key.startsWith("question_"))
    return null;
  const questionType = questionTypeFromKey(fact.key);
  if (!questionType) return null;
  return {
    id: `research-question-${record.id}-${fact.key}`,
    airlineId: record.airlineId,
    prompt: fact.value,
    questionType,
    competencyTags: tagsFromKey(fact.key, "competency_"),
    recommendedExperienceTags: tagsFromKey(fact.key, "experience_"),
    followUpQuestions: [],
    sourceReferences: [fact.sourceUrl!],
    status: "draft",
  };
}

function toCoachingInsight(
  record: AirlineResearchRecord,
  fact: AirlineResearchFact,
): AirlineCoachingInsight | null {
  if (!fact.key.startsWith("coach_message_")) return null;
  const topic = topicFromKey(fact.key);
  if (!topic) return null;
  const related = record.extractedFacts.filter(
    (candidate) =>
      isEligible(record, candidate) && topicFromKey(candidate.key) === topic,
  );
  return {
    id: `research-insight-${record.id}-${topic}`,
    airlineId: record.airlineId,
    topic,
    coachMessage: fact.value,
    goodDirections: related
      .filter((item) => item.key.startsWith("good_direction_"))
      .map((item) => item.value),
    avoidPatterns: related
      .filter((item) => item.key.startsWith("avoid_pattern_"))
      .map((item) => item.value),
    recommendedExperienceTags: related
      .filter((item) => item.key.startsWith("experience_tag_"))
      .map((item) => item.value),
    sourceReferences: [...new Set(related.map((item) => item.sourceUrl!))],
    status: "draft",
  };
}

function topicFromKey(key: string): CoachingTopic | null {
  const topic = key.split("_").at(-1);
  return topic &&
    [
      "motivation",
      "service",
      "safety",
      "teamwork",
      "language",
      "application",
    ].includes(topic)
    ? (topic as CoachingTopic)
    : null;
}
function questionTypeFromKey(
  key: string,
): AirlineInterviewQuestion["questionType"] | null {
  const result = [
    "motivation",
    "experience",
    "service",
    "safety",
    "language",
  ].find((type) => key.includes(type));
  return (
    (result as AirlineInterviewQuestion["questionType"] | undefined) ?? null
  );
}
function tagsFromKey(key: string, prefix: string) {
  return key.startsWith(prefix)
    ? key.slice(prefix.length).split("_").filter(Boolean)
    : [];
}

function load() {
  const base = [
    ...emiratesCoachingInsightDrafts,
    ...qatarCoachingInsightDrafts,
    ...etihadCoachingInsightDrafts,
    ...singaporeCoachingInsightDrafts,
    ...cathayCoachingInsightDrafts,
    ...anaCoachingInsightDrafts,
    ...jalCoachingInsightDrafts,
    ...koreanAirCoachingInsightDrafts,
    ...asianaCoachingInsightDrafts,
    ...evaAirCoachingInsightDrafts,
    ...chinaAirlinesCoachingInsightDrafts,
    ...lufthansaCoachingInsightDrafts,
    ...turkishAirlinesCoachingInsightDrafts,
    ...airFranceCoachingInsightDrafts,
    ...britishAirwaysCoachingInsightDrafts,
    ...deltaAirLinesCoachingInsightDrafts,
    ...unitedAirlinesCoachingInsightDrafts,
  ];
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as AirlineCoachingInsight[]) : [];
    return [
      ...new Map([...base, ...saved].map((item) => [item.id, item])).values(),
    ];
  } catch {
    return base;
  }
}
function save(items: AirlineCoachingInsight[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(KEY, JSON.stringify(items));
  return items;
}
export const airlineCoachingInsightRepository = {
  load,
  list(airlineId?: string) {
    return load().filter((item) => !airlineId || item.airlineId === airlineId);
  },
  upsert(insight: AirlineCoachingInsight) {
    save([insight, ...load().filter((item) => item.id !== insight.id)]);
    return insight;
  },
  updateStatus(id: string, status: CoachingInsightStatus) {
    const next = load().map((item) =>
      item.id === id ? { ...item, status } : item,
    );
    save(next);
    return next.find((item) => item.id === id);
  },
};

function loadQuestions() {
  const base = [
    ...emiratesInterviewQuestionDrafts,
    ...qatarInterviewQuestionDrafts,
    ...etihadInterviewQuestionDrafts,
    ...singaporeInterviewQuestionDrafts,
    ...cathayInterviewQuestionDrafts,
    ...anaInterviewQuestionDrafts,
    ...jalInterviewQuestionDrafts,
    ...koreanAirInterviewQuestionDrafts,
    ...asianaInterviewQuestionDrafts,
    ...evaAirInterviewQuestionDrafts,
    ...chinaAirlinesInterviewQuestionDrafts,
    ...lufthansaInterviewQuestionDrafts,
    ...turkishAirlinesInterviewQuestionDrafts,
    ...airFranceInterviewQuestionDrafts,
    ...britishAirwaysInterviewQuestionDrafts,
    ...deltaAirLinesInterviewQuestionDrafts,
    ...unitedAirlinesInterviewQuestionDrafts,
  ];
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(QUESTION_KEY);
    const saved = raw ? (JSON.parse(raw) as AirlineInterviewQuestion[]) : [];
    return [
      ...new Map([...base, ...saved].map((item) => [item.id, item])).values(),
    ];
  } catch {
    return base;
  }
}
function saveQuestions(items: AirlineInterviewQuestion[]) {
  if (typeof window !== "undefined")
    localStorage.setItem(QUESTION_KEY, JSON.stringify(items));
  return items;
}
export const airlineInterviewQuestionRepository = {
  load: loadQuestions,
  list(airlineId?: string) {
    return loadQuestions().filter(
      (item) => !airlineId || item.airlineId === airlineId,
    );
  },
  upsert(question: AirlineInterviewQuestion) {
    saveQuestions([
      question,
      ...loadQuestions().filter((item) => item.id !== question.id),
    ]);
    return question;
  },
  updateStatus(id: string, status: CoachingInsightStatus) {
    const next = loadQuestions().map((item) =>
      item.id === id ? { ...item, status } : item,
    );
    saveQuestions(next);
    return next.find((item) => item.id === id);
  },
};

export function getApprovedCoachingInsights(airlineId: string) {
  return airlineCoachingInsightRepository
    .list(airlineId)
    .filter(
      (insight) =>
        insight.status === "approved" &&
        insight.publishStatus === "published" &&
        insight.sourceReferences.length > 0,
    );
}

/** Adapter used by interview surfaces; general questions remain outside this filtered list. */
export function getApprovedAirlineInterviewQuestions(
  _records: AirlineResearchRecord[],
  airlineId: string,
) {
  return airlineInterviewQuestionRepository
    .list(airlineId)
    .filter(
      (question) =>
        question.status === "approved" &&
        question.publishStatus === "published" &&
        question.sourceReferences.length > 0,
    );
}

/** Interview adapter: airline-specific approved prompts only; callers retain the 24 general questions. */
export function getInterviewCoachQuestionRecommendations(airlineId: string) {
  return getApprovedAirlineInterviewQuestions([], airlineId);
}
