import { airlineById } from "@/lib/airline-data";
import {
  getAirlineApplicationContext,
  getPublishedAirlineKnowledge,
} from "@/lib/airline-knowledge-repository";
import {
  experienceRepository,
  type CareerExperience,
} from "@/lib/experience-repository";
import {
  recommendExperiencesForApplication,
} from "@/lib/experience-match-engine";
import type { CapabilityKey } from "@/lib/interview-practice-data";
import { evaluateAnswerQuality, type AnswerQualityRubric } from "@/lib/answer-quality-rubric";

export type ApplicationDocumentType =
  | "application_question"
  | "personal_statement"
  | "cover_letter"
  | "motivation_statement"
  | "resume_profile"
  | "video_application_script"
  | "short_answer"
  | "custom";
export type ApplicationStructureType =
  | "motivation"
  | "experience_star"
  | "strength_role_connection"
  | "problem_solution"
  | "career_goal"
  | "short_profile"
  | "custom";
export type ApplicationPrompt = {
  id: string;
  airlineId?: string;
  documentType: ApplicationDocumentType;
  prompt: string;
  locale: string;
  sourceType:
    | "official_application"
    | "published_airline_question"
    | "practice_template"
    | "custom_user_input";
  sourceIds: string[];
  characterLimit?: number;
  wordLimit?: number;
  recommendedStructure: ApplicationStructureType;
  targetCapabilities: CapabilityKey[];
  status: "verified" | "practice" | "custom";
  notes?: string;
};
export type DraftEvidence = {
  sentenceId: string;
  sourceType:
    | "experience"
    | "user_answer"
    | "verified_airline_context"
    | "airline_knowledge"
    | "generic_role_context";
  sourceId?: string;
  sourceExcerpt?: string;
};
export type ApplicationDraft = {
  id: string;
  promptId: string;
  airlineId?: string;
  documentType: ApplicationDocumentType;
  content: string;
  characterCount: number;
  wordCount: number;
  evidence: DraftEvidence[];
  knowledgeSources?: string[];
  coachingInsightIds?: string[];
  experienceIds?: string[];
  version: number;
  createdAt: string;
};
export type ApplicationEvaluation = {
  key: string;
  label: string;
  status: "strong" | "adequate" | "needs_improvement";
  score: number;
  feedback: string;
  suggestion: string;
};
export type ApplicationAnswerAnalysis = {
  overallCompleteness: number;
  strongestPoint: string;
  firstImprovement: string;
  evaluations: ApplicationEvaluation[];
  airlineContextLimited: boolean;
  airlineValueAlignment?: string;
  experienceConnection?: string;
  genericExpressionWarning?: string;
  missingCompetency?: string[];
  rubric?: AnswerQualityRubric;
  analyzedAt: string;
};
export type ApplicationAirlineContext = {
  airlineId: string;
  publishedProfile: {
    name?: string;
    servicePhilosophy?: string;
    coreValues: string[];
  };
  publishedRecruitment: { languages: string[]; eligibility?: string[] };
  publishedFAQ: { id: string; question: string; answer: string }[];
  publishedCoachingInsight: {
    id: string;
    topic: string;
    coachMessage: string;
    goodDirections: string[];
    avoidPatterns: string[];
  }[];
  publishedInterviewQuestion: {
    id: string;
    questionType: string;
    competencyTags: string[];
  }[];
};
export type AirlineExperienceMatch = {
  experienceId: string;
  experienceTags: string[];
  airlineCompetencyMatch: string[];
  reason: string;
};
export type ApplicationAnswerVersion = {
  id: string;
  answerId: string;
  version: number;
  content: string;
  characterCount: number;
  analysis?: ApplicationAnswerAnalysis;
  knowledgeSources?: string[];
  coachingInsightIds?: string[];
  experienceIds?: string[];
  changeReason:
    | "initial"
    | "manual_edit"
    | "concise"
    | "specificity"
    | "role_connection"
    | "airline_connection"
    | "tone_change"
    | "custom";
  createdAt: string;
};
export type ExperienceSnapshot = Pick<
  CareerExperience,
  | "id"
  | "title"
  | "category"
  | "situation"
  | "task"
  | "action"
  | "result"
  | "learning"
  | "roleConnection"
  | "shortSummary"
  | "competencyTags"
>;
export type ApplicationAnswer = {
  id: string;
  airlineId?: string;
  promptId: string;
  customPrompt?: string;
  documentType: ApplicationDocumentType;
  title: string;
  status: "draft" | "structured" | "reviewed" | "ready";
  selectedExperienceIds: string[];
  experienceSnapshots: ExperienceSnapshot[];
  currentVersionId: string;
  versionIds: string[];
  sourceContextSnapshot?: {
    airlineName?: string;
    coreValues?: string[];
    servicePhilosophy?: string;
    lastReviewedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};
export type StructureBlock = { id: string; label: string; guidance: string };
export type ApplicationWorkDraft = {
  id: string;
  airlineId?: string;
  documentType?: ApplicationDocumentType;
  prompt?: ApplicationPrompt;
  selectedExperienceIds: string[];
  coachingAnswers: Record<string, string>;
  structure: StructureBlock[];
  coreMessage: string;
  updatedAt: string;
};
type Progress = {
  answerContributions: Record<string, string[]>;
  dailyGains: Record<string, number>;
  capabilityGains: Record<string, number>;
};
type Store = {
  schemaVersion: 1;
  answers: ApplicationAnswer[];
  versions: ApplicationAnswerVersion[];
  workDrafts: ApplicationWorkDraft[];
  customPrompts: ApplicationPrompt[];
  progress: Progress;
  updatedAt: string;
};

const KEY = "cabin-application-answers",
  VERSION = 1,
  now = () => new Date().toISOString(),
  uid = (p: string) =>
    `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const emptyStore = (): Store => ({
  schemaVersion: VERSION,
  answers: [],
  versions: [],
  workDrafts: [],
  customPrompts: [],
  progress: { answerContributions: {}, dailyGains: {}, capabilityGains: {} },
  updatedAt: now(),
});
const isAnswer = (x: unknown): x is ApplicationAnswer =>
  !!x &&
  typeof x === "object" &&
  typeof (x as ApplicationAnswer).id === "string" &&
  Array.isArray((x as ApplicationAnswer).versionIds);
const isVersion = (x: unknown): x is ApplicationAnswerVersion =>
  !!x &&
  typeof x === "object" &&
  typeof (x as ApplicationAnswerVersion).id === "string" &&
  typeof (x as ApplicationAnswerVersion).content === "string";
function read(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const answers = Array.isArray(raw.answers)
      ? raw.answers.filter(isAnswer).slice(0, 100)
      : [];
    const versions = Array.isArray(raw.versions)
      ? raw.versions
          .filter(isVersion)
          .filter((v: ApplicationAnswerVersion) =>
            answers.some((a: ApplicationAnswer) => a.id === v.answerId),
          )
          .slice(0, 3000)
      : [];
    return {
      schemaVersion: VERSION,
      answers: answers.map((a: ApplicationAnswer) => ({
        ...a,
        experienceSnapshots: Array.isArray(a.experienceSnapshots)
          ? a.experienceSnapshots
          : [],
        versionIds: a.versionIds
          .filter((id) =>
            versions.some((v: ApplicationAnswerVersion) => v.id === id),
          )
          .slice(-30),
      })),
      versions,
      workDrafts: Array.isArray(raw.workDrafts)
        ? raw.workDrafts.slice(0, 10)
        : [],
      customPrompts: Array.isArray(raw.customPrompts)
        ? raw.customPrompts.slice(0, 50)
        : [],
      progress:
        raw.progress && typeof raw.progress === "object"
          ? raw.progress
          : emptyStore().progress,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now(),
    };
  } catch {
    return emptyStore();
  }
}
function write(store: Store) {
  if (typeof window !== "undefined") {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...store, schemaVersion: VERSION, updatedAt: now() }),
    );
    window.dispatchEvent(new Event("cabin:application-local-changed"));
  }
  return store;
}
export const recoverApplicationAnswerStore = () => write(read());
export const listApplicationAnswers = () =>
  read().answers.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export const getApplicationAnswer = (id: string) =>
  read().answers.find((a) => a.id === id);
export const listAnswersByAirline = (airlineId?: string) =>
  listApplicationAnswers().filter((a) => a.airlineId === airlineId);
export const listAnswerVersions = (answerId: string) =>
  read()
    .versions.filter((v) => v.answerId === answerId)
    .sort((a, b) => b.version - a.version);
export function saveWorkDraft(draft: ApplicationWorkDraft) {
  const s = read();
  s.workDrafts = [
    { ...draft, updatedAt: now() },
    ...s.workDrafts.filter((x) => x.id !== draft.id),
  ].slice(0, 10);
  write(s);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cabin:application-local-changed"));
  }
}
export const getWorkDraft = (id: string) =>
  read().workDrafts.find((x) => x.id === id);
export const listWorkDrafts = () =>
  read().workDrafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
export function saveCustomPrompt(prompt: ApplicationPrompt) {
  const s = read();
  s.customPrompts = [
    prompt,
    ...s.customPrompts.filter((x) => x.id !== prompt.id),
  ].slice(0, 50);
  write(s);
}

export const practiceApplicationPrompts: ApplicationPrompt[] = [
  {
    id: "practice-motivation",
    documentType: "motivation_statement",
    prompt: "객실승무원을 지원한 이유를 작성해 주세요.",
    locale: "ko",
    sourceType: "practice_template",
    sourceIds: [],
    characterLimit: 600,
    recommendedStructure: "motivation",
    targetCapabilities: [
      "application_readiness",
      "airline_and_role_understanding",
    ],
    status: "practice",
  },
  {
    id: "practice-strength",
    documentType: "personal_statement",
    prompt:
      "본인의 강점이 객실승무원 업무에 어떻게 도움이 되는지 작성해 주세요.",
    locale: "ko",
    sourceType: "practice_template",
    sourceIds: [],
    characterLimit: 600,
    recommendedStructure: "strength_role_connection",
    targetCapabilities: ["application_readiness", "interview_communication"],
    status: "practice",
  },
  {
    id: "practice-customer",
    documentType: "application_question",
    prompt: "고객의 문제를 해결한 경험을 작성해 주세요.",
    locale: "ko",
    sourceType: "practice_template",
    sourceIds: [],
    characterLimit: 700,
    recommendedStructure: "experience_star",
    targetCapabilities: ["customer_situation_handling"],
    status: "practice",
  },
  {
    id: "practice-teamwork",
    documentType: "application_question",
    prompt: "팀원과 협력하여 성과를 만든 경험을 작성해 주세요.",
    locale: "ko",
    sourceType: "practice_template",
    sourceIds: [],
    characterLimit: 700,
    recommendedStructure: "experience_star",
    targetCapabilities: ["interview_communication"],
    status: "practice",
  },
  {
    id: "practice-safety",
    documentType: "application_question",
    prompt: "안전을 우선하여 판단하거나 행동한 경험을 작성해 주세요.",
    locale: "ko",
    sourceType: "practice_template",
    sourceIds: [],
    characterLimit: 700,
    recommendedStructure: "problem_solution",
    targetCapabilities: ["safety_and_role_judgment"],
    status: "practice",
  },
  {
    id: "practice-growth",
    documentType: "application_question",
    prompt: "입사 후 어떤 객실승무원으로 성장하고 싶은지 작성해 주세요.",
    locale: "ko",
    sourceType: "practice_template",
    sourceIds: [],
    characterLimit: 500,
    recommendedStructure: "career_goal",
    targetCapabilities: ["airline_and_role_understanding"],
    status: "practice",
  },
];
export function listPrompts(airlineId?: string) {
  const published = airlineId ? getPublishedAirlineKnowledge(airlineId) : null;
  const verified = (published?.questions ?? [])
    .filter((q) => q.sourceType === "official_application")
    .map((q) => ({
      id: `airline-${q.id}`,
      airlineId,
      documentType: "application_question" as const,
      prompt: q.prompt,
      locale: q.locale,
      sourceType: "official_application" as const,
      sourceIds: q.sourceIds,
      characterLimit: 700,
      recommendedStructure: "experience_star" as const,
      targetCapabilities: q.targetCapabilities,
      status: "verified" as const,
    }));
  return [
    ...verified,
    ...practiceApplicationPrompts,
    ...read().customPrompts.filter(
      (p) => !p.airlineId || p.airlineId === airlineId,
    ),
  ];
}
export function getApplicationAirlineContext(
  airlineId?: string,
): ApplicationAirlineContext | null {
  if (!airlineId) return null;
  const context = getAirlineApplicationContext(airlineId);
  if (!context) return null;
  return {
    airlineId,
    publishedProfile: {
      name: context.displayName || airlineById.get(airlineId)?.name,
      servicePhilosophy: context.servicePhilosophy,
      coreValues: context.coreValues,
    },
    publishedRecruitment: {
      languages: context.recruitmentLanguages,
      eligibility: context.verifiedRecruitment.eligibilityRequirements?.value,
    },
    publishedFAQ: context.publishedFAQ.map((item) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
    })),
    publishedCoachingInsight: context.approvedCoachingInsights.map((item) => ({
      id: item.id,
      topic: item.topic,
      coachMessage: item.coachMessage,
      goodDirections: item.goodDirections,
      avoidPatterns: item.avoidPatterns,
    })),
    publishedInterviewQuestion: context.approvedInterviewQuestions.map(
      (item) => ({
        id: item.id,
        questionType: item.questionType,
        competencyTags: item.competencyTags,
      }),
    ),
  };
}
export function getVerifiedAirlineContext(airlineId?: string) {
  if (!airlineId) return null;
  const context = getApplicationAirlineContext(airlineId),
    published = getPublishedAirlineKnowledge(airlineId);
  if (!context || !published) return null;
  return {
    airlineName: context.publishedProfile.name,
    coreValues: context.publishedProfile.coreValues,
    servicePhilosophy: context.publishedProfile.servicePhilosophy,
    cabinCrewRoleSummary: published.overview.cabinCrewRoleSummary,
    recruitmentLanguages: context.publishedRecruitment.languages,
    knownRecruitmentStages:
      published.recruitmentProfile.commonRecruitmentStages,
    lastReviewedAt: published.lastReviewedAt,
  };
}
export function matchExperienceToAirline(
  experience: CareerExperience,
  airlineId?: string,
): AirlineExperienceMatch | null {
  const context = getApplicationAirlineContext(airlineId);
  if (!context) return null;
  const publishedTags = [
    ...new Set(
      context.publishedInterviewQuestion.flatMap(
        (question) => question.competencyTags,
      ),
    ),
  ];
  const experienceTags = experience.competencyTags ?? [];
  const airlineCompetencyMatch = experienceTags.filter((tag) =>
    publishedTags.includes(tag),
  );
  const hasServiceEvidence = [
    "customer_service",
    "service_orientation",
    "teamwork",
    "multicultural_experience",
  ].some((tag) => (experienceTags as string[]).includes(tag));
  if (!airlineCompetencyMatch.length && !hasServiceEvidence) return null;
  return {
    experienceId: experience.id,
    experienceTags,
    airlineCompetencyMatch,
    reason: `선택한 경험의 역량을 ${context.publishedProfile.name ?? "지원 항공사"}의 게시된 준비 방향과 연결해 검토할 수 있어요.`,
  };
}
export function recommendAirlineExperienceMatches(
  airlineId?: string,
  items = experienceRepository.load().experiences,
) {
  return items
    .map((experience) => ({
      experience,
      match: matchExperienceToAirline(experience, airlineId),
    }))
    .filter(
      (
        item,
      ): item is {
        experience: CareerExperience;
        match: AirlineExperienceMatch;
      } => !!item.match,
    )
    .sort(
      (a, b) =>
        b.match.airlineCompetencyMatch.length -
        a.match.airlineCompetencyMatch.length,
    );
}
export function generateApplicationDraftWithPublishedKnowledge(input: {
  prompt: ApplicationPrompt;
  airlineId?: string;
  experiences: CareerExperience[];
  coachingAnswers: Record<string, string>;
  structure: StructureBlock[];
  coreMessage: string;
}): ApplicationDraft {
  const draft = generateApplicationDraft(input),
    context = getApplicationAirlineContext(input.airlineId);
  return {
    ...draft,
    knowledgeSources: context ? [context.airlineId] : [],
    coachingInsightIds:
      context?.publishedCoachingInsight.map((insight) => insight.id) ?? [],
    experienceIds: input.experiences.map((experience) => experience.id),
  };
}
export function analyzeApplicationAnswerWithAirlineContext(
  content: string,
  prompt: ApplicationPrompt,
  evidence: DraftEvidence[],
  airlineId?: string,
): ApplicationAnswerAnalysis {
  const base = analyzeApplicationAnswer(content, prompt, evidence, airlineId),
    context = getApplicationAirlineContext(airlineId),
    hasExperience = evidence.some((item) => item.sourceType === "experience");
  const competencyTags = context
    ? [
        ...new Set(
          context.publishedInterviewQuestion.flatMap(
            (question) => question.competencyTags,
          ),
        ),
      ]
    : [];
  const missingCompetency = competencyTags
    .filter((tag) => !content.toLowerCase().includes(tag.toLowerCase()))
    .slice(0, 3);
  return {
    ...base,
    airlineValueAlignment: context
      ? "게시된 항공사 가치와 작성 내용의 연결을 검토했어요."
      : "항공사 정보 없이 범용 기준으로 검토했어요.",
    experienceConnection: hasExperience
      ? "선택한 경험 근거가 초안에 연결되어 있어요."
      : "경험 없이도 작성할 수 있지만, 관련 경험을 연결하면 더 구체화할 수 있어요.",
    genericExpressionWarning: /여행|해외.?생활|꿈/.test(content)
      ? "일반적인 관심 표현은 선택한 경험과 역할 이해로 구체화해 보세요."
      : "일반 표현보다 경험 근거를 우선해 검토했어요.",
    missingCompetency,
  };
}
export function recommendApplicationExperiences(
  prompt: ApplicationPrompt,
  items = experienceRepository.load().experiences,
) {
  const context = getApplicationAirlineContext(prompt.airlineId);
  const airlineCompetencyTags = context?.publishedInterviewQuestion.flatMap(
    (question) => question.competencyTags,
  );
  return recommendExperiencesForApplication(prompt, items, airlineCompetencyTags?.length ? {
    competencyTags: airlineCompetencyTags,
    airlineName: context?.publishedProfile.name,
  } : undefined).map(
    ({ experience, matchScore, reasons }) => ({
      experience,
      score: matchScore,
      reason: reasons[0] ?? "완성도와 활용 빈도를 고려한 추천이에요.",
    }),
  );
}
export function coachingQuestionsFor(prompt: ApplicationPrompt) {
  if (
    prompt.recommendedStructure === "motivation" ||
    prompt.recommendedStructure === "career_goal"
  )
    return [
      "왜 객실승무원 직무를 선택했나요?",
      "이 항공사 또는 근무 환경의 어떤 점에 관심이 있나요?",
      "어떤 경험이 이 직무와 연결되나요?",
      "입사 후 어떤 방식으로 기여하고 싶나요?",
    ];
  return [
    "당시 가장 어려웠던 문제는 무엇이었나요?",
    "본인이 직접 한 행동은 무엇인가요?",
    "그 판단을 선택한 이유는 무엇인가요?",
    "결과를 어떻게 확인했나요?",
    "이 경험이 객실승무원 업무와 어떻게 연결되나요?",
  ];
}
export function defaultStructure(
  type: ApplicationStructureType,
): StructureBlock[] {
  const map: Record<ApplicationStructureType, string[]> = {
    motivation: [
      "직무 선택 이유",
      "대표 경험",
      "항공사와의 연결",
      "입사 후 기여",
    ],
    experience_star: [
      "상황",
      "과제",
      "본인의 행동",
      "결과",
      "배운 점",
      "직무 연결",
    ],
    strength_role_connection: ["핵심 강점", "근거 경험", "직무 적용", "기여"],
    problem_solution: [
      "상황과 위험",
      "판단 기준",
      "본인의 행동",
      "결과",
      "직무 연결",
    ],
    career_goal: ["성장 목표", "준비 경험", "직무 기여"],
    short_profile: ["핵심 강점", "근거", "직무 연결"],
    custom: ["핵심 메시지", "근거", "결론"],
  };
  return map[type].map((label, i) => ({
    id: `block-${i}-${label}`,
    label,
    guidance: `${label}을(를) 실제 근거로 작성`,
  }));
}
const clean = (value?: string) => value?.trim().replace(/\s+/g, " ") || "";
export function generateApplicationDraft(input: {
  prompt: ApplicationPrompt;
  airlineId?: string;
  experiences: CareerExperience[];
  coachingAnswers: Record<string, string>;
  structure: StructureBlock[];
  coreMessage: string;
}): ApplicationDraft {
  const evidence: DraftEvidence[] = [];
  const sentences: string[] = [];
  const add = (
    text: string,
    sourceType: DraftEvidence["sourceType"],
    sourceId?: string,
    excerpt?: string,
  ) => {
    const value = clean(text);
    if (!value) return;
    const sentence =
      value.endsWith(".") || value.endsWith("요.") ? value : `${value}.`;
    const sentenceId = `sentence-${sentences.length + 1}`;
    sentences.push(sentence);
    evidence.push({
      sentenceId,
      sourceType,
      sourceId,
      sourceExcerpt: excerpt || value,
    });
  };
  add(input.coreMessage, "user_answer", "core-message");
  input.experiences.forEach((e) => {
    add(e.situation, "experience", e.id, e.situation);
    add(e.action, "experience", e.id, e.action);
    add(e.result, "experience", e.id, e.result);
    add(e.learning, "experience", e.id, e.learning);
    add(e.roleConnection, "experience", e.id, e.roleConnection);
  });
  Object.entries(input.coachingAnswers).forEach(([id, value]) =>
    add(value, "user_answer", id, value),
  );
  const context = getVerifiedAirlineContext(input.airlineId);
  if (context?.servicePhilosophy)
    add(
      `${context.airlineName}의 검수된 서비스 방향을 이해하고 제 경험과 연결해 기여하고 싶습니다`,
      "verified_airline_context",
      input.airlineId,
      context.servicePhilosophy,
    );
  else
    add(
      "이 경험을 바탕으로 고객과 안전을 함께 고려하는 객실승무원으로 기여하고 싶습니다",
      "generic_role_context",
    );
  let content = sentences.join(" ");
  if (
    input.prompt.characterLimit &&
    content.length > input.prompt.characterLimit
  )
    content =
      content.slice(0, input.prompt.characterLimit - 1).replace(/\s+\S*$/, "") +
      "…";
  if (
    input.prompt.wordLimit &&
    content.split(/\s+/).length > input.prompt.wordLimit
  )
    content = content.split(/\s+/).slice(0, input.prompt.wordLimit).join(" ");
  return {
    id: uid("draft"),
    promptId: input.prompt.id,
    airlineId: input.airlineId,
    documentType: input.prompt.documentType,
    content,
    characterCount: content.length,
    wordCount: content ? content.split(/\s+/).length : 0,
    evidence,
    version: 1,
    createdAt: now(),
  };
}
export function analyzeApplicationAnswer(
  content: string,
  prompt: ApplicationPrompt,
  evidence: DraftEvidence[],
  airlineId?: string,
): ApplicationAnswerAnalysis {
  const hasExperience = evidence.some((e) => e.sourceType === "experience"),
    hasAction = /행동|확인|조정|제안|해결|협력|설명/.test(content),
    hasResult = /결과|개선|배웠|확인했|성과/.test(content),
    hasRole = /객실승무원|고객|안전|서비스/.test(content),
    verifiedContext = getVerifiedAirlineContext(airlineId),
    context = !!verifiedContext,
    within =
      (!prompt.characterLimit || content.length <= prompt.characterLimit) &&
      (!prompt.wordLimit || content.split(/\s+/).length <= prompt.wordLimit);
  const raw: [string, string, number, string, string][] = [
    [
      "question_fit",
      "문항 적합성",
      content.length > 80 ? 82 : 58,
      "문항의 핵심에 바로 답하고 있어요.",
      "첫 문장에서 결론을 더 선명하게 제시해 보세요.",
    ],
    [
      "specificity",
      "경험 구체성",
      hasExperience ? 84 : 48,
      hasExperience
        ? "저장된 경험을 근거로 사용했어요."
        : "선택한 경험 근거가 부족해요.",
      "경험 저장소에서 관련 경험을 연결해 보세요.",
    ],
    [
      "action",
      "본인 행동",
      hasAction ? 80 : 55,
      hasAction
        ? "행동을 확인할 수 있어요."
        : "본인의 행동이 다소 추상적이에요.",
      "직접 한 행동을 동사 중심으로 적어 보세요.",
    ],
    [
      "result_learning",
      "결과와 배운 점",
      hasResult ? 79 : 52,
      hasResult ? "결과 또는 배움을 담았어요." : "결과와 배움이 부족해요.",
      "행동 뒤 달라진 점과 배운 점을 추가해 보세요.",
    ],
    [
      "role_connection",
      "직무 연결",
      hasRole ? 83 : 50,
      hasRole ? "객실승무원 직무와 연결했어요." : "직무 연결이 약해요.",
      "고객·안전·협업 중 연결 역량을 명시해 보세요.",
    ],
    [
      "airline_connection",
      "항공사 연결",
      context &&
      evidence.some((e) => e.sourceType === "verified_airline_context")
        ? 82
        : context
          ? 58
          : 45,
      context
        ? "검수 문맥만 기준으로 확인했어요."
        : "검수 자료가 부족해 제한적으로 평가했어요.",
      "검수된 자료가 있을 때 연결 문장을 보완해 보세요.",
    ],
    [
      "limit",
      "글자 수 준수",
      within ? 100 : 45,
      within ? "설정한 분량 안에 있어요." : "설정한 분량을 초과했어요.",
      "중복 표현을 줄여 분량을 맞춰 보세요.",
    ],
    [
      "evidence",
      "사실 근거",
      evidence.length ? 88 : 40,
      evidence.length
        ? "문장 근거를 추적할 수 있어요."
        : "직접 확인되는 근거가 부족해요.",
      "경험 또는 추가 답변 근거를 연결해 보세요.",
    ],
  ];
  const evaluations = raw.map(([key, label, score, feedback, suggestion]) => ({
    key,
    label,
    score,
    status:
      score >= 80
        ? ("strong" as const)
        : score >= 60
          ? ("adequate" as const)
          : ("needs_improvement" as const),
    feedback,
    suggestion,
  }));
  const sorted = [...evaluations].sort((a, b) => a.score - b.score);
  const rubric = evaluateAnswerQuality({
    answer: content,
    provenance: "typed_answer",
    context: "application",
    questionPrompt: prompt.prompt,
    publishedAirlineContext: verifiedContext ? {
      values: [verifiedContext.airlineName, verifiedContext.servicePhilosophy, ...verifiedContext.coreValues].filter((value): value is string => Boolean(value)),
    } : undefined,
  });
  return {
    overallCompleteness: Math.round(
      evaluations.reduce((s, e) => s + e.score, 0) / evaluations.length,
    ),
    strongestPoint: [...sorted].reverse()[0].label,
    firstImprovement: sorted[0].label,
    evaluations,
    rubric,
    airlineContextLimited: !context,
    analyzedAt: now(),
  };
}
export function createApplicationAnswer(input: {
  prompt: ApplicationPrompt;
  airlineId?: string;
  title: string;
  experiences: CareerExperience[];
  draft: ApplicationDraft;
  analysis?: ApplicationAnswerAnalysis;
}) {
  const s = read(),
    id = uid("answer"),
    versionId = uid("version"),
    createdAt = now(),
    context = getVerifiedAirlineContext(input.airlineId);
  const version: ApplicationAnswerVersion = {
    id: versionId,
    answerId: id,
    version: 1,
    content: input.draft.content,
    characterCount: input.draft.content.length,
    analysis: input.analysis,
    knowledgeSources: input.draft.knowledgeSources,
    coachingInsightIds: input.draft.coachingInsightIds,
    experienceIds: input.draft.experienceIds,
    changeReason: "initial",
    createdAt,
  };
  const answer: ApplicationAnswer = {
    id,
    airlineId: input.airlineId,
    promptId: input.prompt.id,
    customPrompt:
      input.prompt.sourceType === "custom_user_input"
        ? input.prompt.prompt
        : undefined,
    documentType: input.prompt.documentType,
    title: input.title,
    status: input.analysis ? "reviewed" : "draft",
    selectedExperienceIds: input.experiences.map((e) => e.id),
    experienceSnapshots: input.experiences.map(
      ({
        id,
        title,
        category,
        situation,
        task,
        action,
        result,
        learning,
        roleConnection,
        shortSummary,
        competencyTags,
      }) => ({
        id,
        title,
        category,
        situation,
        task,
        action,
        result,
        learning,
        roleConnection,
        shortSummary,
        competencyTags,
      }),
    ),
    currentVersionId: versionId,
    versionIds: [versionId],
    sourceContextSnapshot: context
      ? {
          airlineName: context.airlineName,
          coreValues: context.coreValues,
          servicePhilosophy: context.servicePhilosophy,
          lastReviewedAt: context.lastReviewedAt,
        }
      : undefined,
    createdAt,
    updatedAt: createdAt,
  };
  s.answers = [answer, ...s.answers].slice(0, 100);
  s.versions.push(version);
  input.experiences.forEach((e) => experienceRepository.markUsed(e.id));
  write(s);
  recordApplicationProgress(id, "structured", !!context, input.prompt.locale);
  if (input.analysis)
    recordApplicationProgress(id, "reviewed", !!context, input.prompt.locale);
  return answer;
}
export function createAnswerVersion(
  answerId: string,
  content: string,
  changeReason: ApplicationAnswerVersion["changeReason"] = "manual_edit",
  analysis?: ApplicationAnswerAnalysis,
) {
  const s = read(),
    answer = s.answers.find((a) => a.id === answerId);
  if (!answer) return null;
  const prior = s.versions.filter((v) => v.answerId === answerId),
    current = prior.find((v) => v.id === answer.currentVersionId);
  if (current?.content === content) return current;
  const version: ApplicationAnswerVersion = {
    id: uid("version"),
    answerId,
    version: Math.max(0, ...prior.map((v) => v.version)) + 1,
    content,
    characterCount: content.length,
    analysis,
    changeReason,
    createdAt: now(),
  };
  s.versions.push(version);
  answer.versionIds = [...answer.versionIds, version.id].slice(-30);
  s.versions = s.versions.filter(
    (v) => v.answerId !== answerId || answer.versionIds.includes(v.id),
  );
  answer.currentVersionId = version.id;
  answer.updatedAt = now();
  if (analysis) answer.status = "reviewed";
  write(s);
  return version;
}
export function updateApplicationAnswer(
  id: string,
  patch: Partial<ApplicationAnswer>,
) {
  const s = read(),
    answer = s.answers.find((a) => a.id === id);
  if (!answer) return null;
  Object.assign(answer, patch, { id, updatedAt: now() });
  write(s);
  return answer;
}
export function deleteApplicationAnswer(id: string) {
  const s = read();
  s.answers = s.answers.filter((a) => a.id !== id);
  s.versions = s.versions.filter((v) => v.answerId !== id);
  if (typeof window !== "undefined") {
    const key = "cabin-application-deletions-v1";
    try {
      const prior = JSON.parse(localStorage.getItem(key) ?? "[]");
      const ids = Array.isArray(prior) ? prior : [];
      localStorage.setItem(
        key,
        JSON.stringify(Array.from(new Set([...ids, id])).slice(-100)),
      );
    } catch {}
  }
  write(s);
}
export function restoreAnswerVersion(answerId: string, versionId: string) {
  const source = read().versions.find(
    (v) => v.answerId === answerId && v.id === versionId,
  );
  return source
    ? createAnswerVersion(answerId, source.content, "custom", source.analysis)
    : null;
}
export function duplicateForAirline(answerId: string, airlineId?: string) {
  const s = read(),
    source = s.answers.find((a) => a.id === answerId),
    current = s.versions.find((v) => v.id === source?.currentVersionId);
  if (!source || !current) return null;
  const id = uid("answer"),
    versionId = uid("version"),
    createdAt = now(),
    context = getVerifiedAirlineContext(airlineId);
  let content = current.content;
  const oldAirline = source.sourceContextSnapshot?.airlineName;
  if (oldAirline) content = content.replaceAll(oldAirline, "지원 항공사");
  if (context?.airlineName && context.servicePhilosophy)
    content += ` ${context.airlineName}의 검수된 서비스 방향을 이해하고 이 경험을 직무에 연결하겠습니다.`;
  const version: ApplicationAnswerVersion = {
    id: versionId,
    answerId: id,
    version: 1,
    content,
    characterCount: content.length,
    changeReason: "airline_connection",
    createdAt,
  };
  const copy: ApplicationAnswer = {
    ...source,
    id,
    airlineId,
    title: `${source.title} · ${context?.airlineName ?? "범용"}`,
    status: "draft",
    currentVersionId: versionId,
    versionIds: [versionId],
    sourceContextSnapshot: context
      ? {
          airlineName: context.airlineName,
          coreValues: context.coreValues,
          servicePhilosophy: context.servicePhilosophy,
          lastReviewedAt: context.lastReviewedAt,
        }
      : undefined,
    createdAt,
    updatedAt: createdAt,
  };
  s.answers = [copy, ...s.answers].slice(0, 100);
  s.versions.push(version);
  write(s);
  return copy;
}
export function recordApplicationProgress(
  answerId: string,
  event: "structured" | "reviewed" | "airline_connected" | "language_ready",
  hasVerifiedContext = false,
  locale = "ko",
) {
  const s = read(),
    done = s.progress.answerContributions[answerId] ?? [],
    day = now().slice(0, 10),
    used = s.progress.dailyGains[day] ?? 0;
  if (used >= 3) return;
  const key =
    event === "structured"
      ? "application_readiness"
      : event === "reviewed"
        ? "interview_communication"
        : event === "airline_connected"
          ? "airline_and_role_understanding"
          : "recruitment_language";
  if (
    done.includes(key) ||
    (event === "airline_connected" && !hasVerifiedContext) ||
    (event === "language_ready" && locale === "ko")
  )
    return;
  s.progress.answerContributions[answerId] = [...done, key];
  s.progress.dailyGains[day] = used + 1;
  s.progress.capabilityGains[key] = (s.progress.capabilityGains[key] ?? 0) + 1;
  write(s);
}
export const getApplicationCapabilityGains = () =>
  read().progress.capabilityGains;
