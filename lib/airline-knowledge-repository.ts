import {
  airlineById,
  type AirlineBusinessModel,
  type AirlineRegion,
} from "./airline-data";
import {
  interviewQuestions,
  type CapabilityKey,
  type InterviewCategory,
  type InterviewQuestion,
} from "./interview-practice-data";
import {
  airlineKnowledgeProfiles,
  airlineKnowledgeResources,
} from "./airline-knowledge-data";
import {
  airlineResearchRepository,
  getApprovedResearchSources,
  type ApprovedResearchSource,
} from "./airline-research-repository";
import {
  getApprovedAirlineInterviewQuestions,
  getApprovedCoachingInsights,
  type AirlineInterviewQuestion,
  type AirlineCoachingInsight,
} from "./airline-knowledge-transformer";
import {
  emiratesFaqDrafts,
  emiratesKnowledgeProfileCandidate,
} from "./emirates-research-pack";
import {
  qatarFaqDrafts,
  qatarKnowledgeProfileCandidate,
} from "./qatar-research-pack";
import {
  etihadFaqDrafts,
  etihadKnowledgeProfileCandidate,
} from "./etihad-research-pack";
import {
  singaporeFaqDrafts,
  singaporeKnowledgeProfileCandidate,
} from "./singapore-research-pack";
import {
  cathayFaqDrafts,
  cathayKnowledgeProfileCandidate,
} from "./cathay-research-pack";
import {
  anaFaqDrafts,
  anaKnowledgeProfileCandidate,
} from "./ana-research-pack";
import {
  jalFaqDrafts,
  jalKnowledgeProfileCandidate,
} from "./jal-research-pack";
import {
  koreanAirFaqDrafts,
  koreanAirKnowledgeProfileCandidate,
} from "./korean-air-research-pack";
import {
  asianaFaqDrafts,
  asianaKnowledgeProfileCandidate,
} from "./asiana-research-pack";
import {
  evaAirFaqDrafts,
  evaAirKnowledgeProfileCandidate,
} from "./eva-air-research-pack";
import {
  chinaAirlinesFaqDrafts,
  chinaAirlinesKnowledgeProfileCandidate,
} from "./china-airlines-research-pack";
import { lufthansaFaqDrafts, lufthansaKnowledgeProfileCandidate } from "./lufthansa-research-pack";
import { turkishAirlinesFaqDrafts, turkishAirlinesKnowledgeProfileCandidate } from "./turkish-airlines-research-pack";
import { airFranceFaqDrafts, airFranceKnowledgeProfileCandidate } from "./air-france-research-pack";
import { britishAirwaysFaqDrafts, britishAirwaysKnowledgeProfileCandidate } from "./british-airways-research-pack";
import { deltaAirLinesFaqDrafts, deltaAirLinesKnowledgeProfileCandidate } from "./delta-air-lines-research-pack";
import { unitedAirlinesFaqDrafts, unitedAirlinesKnowledgeProfileCandidate } from "./united-airlines-research-pack";
import {
  getAirlineAiRequirements,
  type AirlineRecruitmentRequirement,
} from "./airline-recruitment-requirements";
import { isAirlineKnowledgeEligibleForAiContext } from "./airline-ai-context-gate";

export type ReviewStatus =
  "draft" | "in_review" | "reviewed" | "approved" | "verified" | "archived";
export type PublicationStatus =
  "draft" | "reviewing" | "published" | "outdated" | "rejected";
export type RecruitmentStage =
  | "application"
  | "document_screening"
  | "online_assessment"
  | "video_interview"
  | "phone_interview"
  | "group_assessment"
  | "assessment_day"
  | "language_assessment"
  | "individual_interview"
  | "medical_check"
  | "background_check"
  | "final_offer"
  | "other";
export type SourceGrade = "A" | "B" | "C" | "D" | "E";
export type KnowledgeFieldStatus =
  "unknown" | "needs_review" | "verified" | "generated_insight";
export type KnowledgeField<T = string> = {
  value?: T;
  status: KnowledgeFieldStatus;
  sourceIds?: string[];
  reviewedAt?: string;
};
export type AirlineOverview = {
  officialName: string;
  displayName: string;
  countryCode: string;
  region: AirlineRegion;
  businessModel: AirlineBusinessModel;
  headquarters?: string;
  primaryHubs?: string[];
  alliance?: string;
  brandSummary?: string;
  servicePhilosophy?: string;
  coreValues?: string[];
  cabinCrewRoleSummary?: string;
  operatingEnvironmentTags?: string[];
  website?: string;
  logo?: string;
  brandIdentity?: KnowledgeField;
  customerFocus?: KnowledgeField;
  safetyCulture?: KnowledgeField;
  employeeValues?: KnowledgeField<string[]>;
  desiredCompetencies?: KnowledgeField<CapabilityKey[]>;
  interviewFocusAreas?: KnowledgeField<string[]>;
};
export type AirlineRecruitmentProfile = {
  recruitmentLanguages: string[];
  applicationLanguages?: string[];
  commonRecruitmentStages: RecruitmentStage[];
  eligibilitySummary?: string;
  languageRequirementSummary?: string;
  documentRequirementSummary?: string;
  workConditionSummary?: string;
  visaOrResidencySummary?: string;
  officialCareerPageUrl?: string;
  latestKnownRecruitmentDate?: string;
  currentStatus:
    "unknown" | "recruiting" | "not_recruiting" | "rolling" | "seasonal";
  checkedAt?: string;
  applicationPeriod?: KnowledgeField;
  recruitmentFrequency?: KnowledgeField;
  eligibilityRequirements?: KnowledgeField<string[]>;
  requiredDocuments?: KnowledgeField<string[]>;
  selectionSteps?: KnowledgeField<RecruitmentStage[]>;
  interviewStages?: KnowledgeField<RecruitmentStage[]>;
  languageRequirements?: KnowledgeField<string[]>;
  physicalRequirements?: KnowledgeField<string[]>;
  sourceReferences?: string[];
  verifiedAt?: string;
  status?: PublicationStatus;
};
export type AirlineProfileCompleteness = {
  overview: number;
  recruitment: number;
  resources: number;
  questions: number;
  faq: number;
  sources: number;
  freshness: number;
  overall: number;
};
export type AirlineComparisonProfile = {
  serviceStyle?: KnowledgeField;
  fleetEnvironment?: KnowledgeField;
  routeCharacteristics?: KnowledgeField;
  customerSegment?: KnowledgeField;
  recruitmentStyle?: KnowledgeField;
  interviewEmphasis?: KnowledgeField<string[]>;
};
export type KnowledgePublishStatus = "unpublished" | "published";
export type AirlineKnowledgeProfile = {
  id: string;
  airlineId: string;
  overview: AirlineOverview;
  recruitmentProfile: AirlineRecruitmentProfile;
  comparisonProfile?: AirlineComparisonProfile;
  resourceIds: string[];
  questionIds: string[];
  faqIds?: string[];
  supportedLocales: string[];
  reviewStatus: ReviewStatus;
  publishStatus?: KnowledgePublishStatus;
  completeness: AirlineProfileCompleteness;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  reviewedBy?: string;
  /** Explicit opt-in for AI/context use. Missing legacy values remain disabled. */
  aiContextEnabled?: boolean;
};
export type AirlineResourceType =
  | "career_page"
  | "job_posting"
  | "recruitment_guide"
  | "company_overview"
  | "company_values"
  | "service_guide"
  | "safety_information"
  | "annual_report"
  | "sustainability_report"
  | "official_video"
  | "employee_interview"
  | "recruitment_faq"
  | "news_release"
  | "other";
export type ResourceFact = {
  id: string;
  label: string;
  value: string;
  sourceQuote?: string;
  sourceLocation?: string;
  confidence: "high" | "medium" | "low";
};
export type AirlineResource = {
  id: string;
  airlineId: string;
  resourceType: AirlineResourceType;
  title: string;
  url: string;
  language: string;
  publisher: string;
  publishedAt?: string;
  checkedAt: string;
  summary: string;
  extractedFacts?: ResourceFact[];
  sourceGrade: SourceGrade;
  verificationStatus:
    | "unverified"
    | "reviewing"
    | "verified"
    | "outdated"
    | "broken_link"
    | "rejected";
  publishStatus?: KnowledgePublishStatus;
  validity: "current" | "possibly_outdated" | "historical" | "unknown";
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
export type AirlineQuestionType =
  | "motivation"
  | "experience"
  | "service"
  | "safety"
  | "teamwork"
  | "language"
  | "situational";
export type AirlineQuestion = {
  id: string;
  airlineId: string;
  category: InterviewCategory;
  sourceType:
    | "official_application"
    | "official_video_interview"
    | "official_interview"
    | "official_event"
    | "repeated_candidate_report"
    | "single_candidate_report"
    | "practice_prediction";
  prompt: string;
  locale: string;
  shortTitle?: string;
  recruitmentStage?: RecruitmentStage;
  difficulty: "beginner" | "intermediate" | "advanced";
  targetCapabilities: CapabilityKey[];
  competencyTags?: CapabilityKey[];
  questionType?: AirlineQuestionType;
  followUpQuestions?: string[];
  sourceIds: string[];
  sourceGrade: SourceGrade;
  confidence: "high" | "medium" | "low";
  status: PublicationStatus;
  publishStatus?: KnowledgePublishStatus;
  isCurrentlyRelevant: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
export type AirlineFAQCategory =
  | "eligibility"
  | "process"
  | "application"
  | "interview"
  | "language"
  | "service"
  | "safety"
  | "attire"
  | "training"
  | "work_environment";
export type AirlineFAQ = {
  id: string;
  airlineId: string;
  category: AirlineFAQCategory;
  question: string;
  answer: string;
  sourceGrade: SourceGrade;
  sourceReference?: string;
  reviewedAt?: string;
  status: PublicationStatus;
  publishStatus?: KnowledgePublishStatus;
  createdAt: string;
  updatedAt: string;
};
export type AirlineAIContext = {
  airlineId: string;
  verifiedProfile: Pick<
    AirlineOverview,
    | "officialName"
    | "displayName"
    | "brandSummary"
    | "servicePhilosophy"
    | "coreValues"
    | "cabinCrewRoleSummary"
    | "desiredCompetencies"
    | "interviewFocusAreas"
  >;
  publishedRecruitment: {
    officialCareerPageUrl?: string;
    recruitmentLanguages: string[];
    eligibilityRequirements?: KnowledgeField<string[]>;
    languageRequirements?: KnowledgeField<string[]>;
  };
  publishedRecruitmentRequirements: AirlineRecruitmentRequirement[];
  publishedResources: AirlineResource[];
  publishedFAQ: AirlineFAQ[];
  publishedQuestions: AirlineQuestion[];
  approvedResearchQuestions: AirlineInterviewQuestion[];
  approvedCoachingInsights: AirlineCoachingInsight[];
  researchSources: ApprovedResearchSource[];
  sourceGrade: SourceGrade[];
};
export type KnowledgeReviewLog = {
  id: string;
  entityType: "airline_profile" | "resource" | "question" | "faq";
  entityId: string;
  action:
    | "created"
    | "updated"
    | "submitted_for_review"
    | "verified"
    | "published"
    | "marked_outdated"
    | "rejected"
    | "restored";
  previousStatus?: string;
  nextStatus?: string;
  reviewer?: string;
  note?: string;
  createdAt: string;
};
type Store = {
  schemaVersion: 3;
  profiles: AirlineKnowledgeProfile[];
  resources: AirlineResource[];
  questions: AirlineQuestion[];
  faqs: AirlineFAQ[];
  logs: KnowledgeReviewLog[];
};
const KEY = "cabin-airline-knowledge-v1",
  now = () => new Date().toISOString(),
  grades: SourceGrade[] = ["A", "B", "C", "D", "E"];
const faqTemplates: [AirlineFAQCategory, string, string][] = [
  [
    "eligibility",
    "지원 자격은 어떻게 확인하나요?",
    "현재 공고와 공식 채용 페이지에서 근무지·직무별 자격을 확인하세요.",
  ],
  [
    "process",
    "채용 절차는 어떻게 확인하나요?",
    "공고별 절차가 달라질 수 있으므로 공식 안내를 기준으로 준비하세요.",
  ],
  [
    "application",
    "지원서에는 무엇을 준비하나요?",
    "요청된 지원서와 경력·학력·자격 정보를 최신 공고 기준으로 정리하세요.",
  ],
  [
    "interview",
    "면접은 어떻게 준비하나요?",
    "지원 준비 과정에서 참고 가능한 예상 질문으로 경험·안전·서비스 답변을 연습하세요.",
  ],
  [
    "language",
    "언어 요건은 어떻게 확인하나요?",
    "근무지와 공고에 따라 다르므로 공식 공고의 언어 요건을 확인하세요.",
  ],
  [
    "service",
    "서비스 역량은 어떻게 준비하나요?",
    "고객 응대 경험을 사실과 행동 중심으로 정리해 두세요.",
  ],
  [
    "safety",
    "안전 관련 평가는 어떻게 준비하나요?",
    "안전을 우선하는 판단과 보고 원칙을 직무 이해와 함께 연습하세요.",
  ],
  [
    "attire",
    "복장 기준은 어디서 확인하나요?",
    "평가·교육·근무 복장 기준은 공식 안내가 있을 때만 따르세요.",
  ],
  [
    "training",
    "교육 과정은 어떻게 확인하나요?",
    "교육 내용과 기간은 채용 공고 또는 공식 안내에서 확인하세요.",
  ],
  [
    "work_environment",
    "근무 환경은 어떻게 확인하나요?",
    "노선·베이스·운항 환경은 직무와 공고에 따라 달라질 수 있습니다.",
  ],
];
const questionTemplates: [AirlineQuestionType, string, CapabilityKey[]][] = [
  [
    "motivation",
    "지원 항공사와 객실승무원 직무에 관심을 갖게 된 이유는 무엇인가요?",
    ["airline_and_role_understanding"],
  ],
  [
    "experience",
    "고객을 위해 문제를 해결한 경험을 들려주세요.",
    ["customer_situation_handling"],
  ],
  [
    "service",
    "서비스 기준을 지키기 위해 어떤 행동을 하겠나요?",
    ["customer_situation_handling"],
  ],
  [
    "safety",
    "안전과 서비스 요구가 충돌하면 어떻게 판단하겠나요?",
    ["safety_and_role_judgment"],
  ],
  [
    "teamwork",
    "팀과 협업해 결과를 만든 경험을 설명해 주세요.",
    ["interview_communication"],
  ],
  [
    "language",
    "채용 과정에서 사용할 언어로 자신을 소개해 보세요.",
    ["recruitment_language"],
  ],
  [
    "situational",
    "예상 밖의 고객 요구에 어떻게 대응하겠나요?",
    ["customer_situation_handling"],
  ],
  [
    "motivation",
    "다른 항공사가 아닌 이 환경을 준비하는 이유는 무엇인가요?",
    ["airline_and_role_understanding"],
  ],
  [
    "experience",
    "실패 또는 피드백을 개선으로 연결한 경험은 무엇인가요?",
    ["interview_communication"],
  ],
  [
    "situational",
    "우선순위를 정해 보고해야 하는 상황에서 어떻게 행동하겠나요?",
    ["safety_and_role_judgment"],
  ],
];
const unknown = <T>(value?: T): KnowledgeField<T> => ({
  value,
  status: "unknown",
});
function normalizeProfile(
  profile: AirlineKnowledgeProfile,
): AirlineKnowledgeProfile {
  const resourceIds = profile.resourceIds ?? [],
    questionIds = profile.questionIds ?? [],
    faqIds =
      profile.faqIds ??
      faqTemplates.map((_, index) => `${profile.airlineId}-faq-${index + 1}`);
  const overview = {
    ...profile.overview,
    brandIdentity: profile.overview.brandIdentity ?? unknown(),
    customerFocus: profile.overview.customerFocus ?? unknown(),
    safetyCulture: profile.overview.safetyCulture ?? unknown(),
    employeeValues: profile.overview.employeeValues ?? unknown(),
    desiredCompetencies: profile.overview.desiredCompetencies ?? unknown(),
    interviewFocusAreas: profile.overview.interviewFocusAreas ?? unknown(),
  };
  const recruitmentProfile = {
    ...profile.recruitmentProfile,
    applicationPeriod:
      profile.recruitmentProfile.applicationPeriod ?? unknown(),
    recruitmentFrequency:
      profile.recruitmentProfile.recruitmentFrequency ?? unknown(),
    eligibilityRequirements:
      profile.recruitmentProfile.eligibilityRequirements ?? unknown(),
    requiredDocuments:
      profile.recruitmentProfile.requiredDocuments ?? unknown(),
    selectionSteps: profile.recruitmentProfile.selectionSteps ?? unknown(),
    interviewStages: profile.recruitmentProfile.interviewStages ?? unknown(),
    languageRequirements:
      profile.recruitmentProfile.languageRequirements ?? unknown(),
    physicalRequirements:
      profile.recruitmentProfile.physicalRequirements ?? unknown(),
    sourceReferences: profile.recruitmentProfile.sourceReferences ?? [],
    status: profile.recruitmentProfile.status ?? "draft",
  };
  return {
    ...profile,
    overview,
    recruitmentProfile,
    resourceIds,
    questionIds,
    faqIds,
    comparisonProfile: profile.comparisonProfile ?? {
      serviceStyle: unknown(),
      fleetEnvironment: unknown(),
      routeCharacteristics: unknown(),
      customerSegment: unknown(),
      recruitmentStyle: unknown(),
      interviewEmphasis: unknown(),
    },
    completeness: profile.completeness ?? {
      overview: 0,
      recruitment: 0,
      resources: 0,
      questions: 0,
      faq: 0,
      sources: 0,
      freshness: 0,
      overall: 0,
    },
  };
}
function completeness(
  profile: AirlineKnowledgeProfile,
  resources: AirlineResource[],
  questions: AirlineQuestion[],
  faqs: AirlineFAQ[],
): AirlineProfileCompleteness {
  const ownResources = resources.filter(
      (item) => item.airlineId === profile.airlineId,
    ),
    ownQuestions = questions.filter(
      (item) => item.airlineId === profile.airlineId,
    ),
    ownFaq = faqs.filter((item) => item.airlineId === profile.airlineId);
  const overview = Math.round(
      (Object.values(profile.overview).filter(Boolean).length / 20) * 100,
    ),
    recruitment = Math.round(
      (Object.values(profile.recruitmentProfile).filter(Boolean).length / 20) *
        100,
    ),
    faq = Math.min(100, ownFaq.length * 10),
    question = Math.min(100, ownQuestions.length * 10),
    sources = Math.round(
      ((ownResources.filter((item) => grades.includes(item.sourceGrade))
        .length +
        ownFaq.filter((item) => grades.includes(item.sourceGrade)).length +
        ownQuestions.filter((item) => grades.includes(item.sourceGrade))
          .length) /
        Math.max(
          1,
          ownResources.length + ownFaq.length + ownQuestions.length,
        )) *
        100,
    ),
    freshness = ownResources.length
      ? Math.round(
          (ownResources.filter(
            (item) =>
              Date.now() - new Date(item.checkedAt).getTime() < 366 * 86400000,
          ).length /
            ownResources.length) *
            100,
        )
      : 0;
  return {
    overview,
    recruitment,
    resources: Math.min(100, ownResources.length * 25),
    questions: question,
    faq,
    sources,
    freshness,
    overall: Math.round(
      (overview + recruitment + question + faq + sources + freshness) / 6,
    ),
  };
}
function generatedFaqs(airlineId: string): AirlineFAQ[] {
  return faqTemplates.map(([category, question, answer], index) => ({
    id: `${airlineId}-faq-${index + 1}`,
    airlineId,
    category,
    question,
    answer,
    sourceGrade: "E",
    status: "draft",
    createdAt: now(),
    updatedAt: now(),
  }));
}
function generatedQuestions(airlineId: string): AirlineQuestion[] {
  return questionTemplates.map(
    ([questionType, prompt, targetCapabilities], index) => ({
      id: `${airlineId}-practice-${index + 1}`,
      airlineId,
      category: (questionType === "safety" || questionType === "situational"
        ? "situational"
        : questionType === "language"
          ? "language"
          : "behavioral_experience") as InterviewCategory,
      sourceType: "practice_prediction",
      prompt: `[지원 준비용 예상 질문] ${prompt}`,
      locale: "ko",
      recruitmentStage: "individual_interview",
      difficulty: "beginner",
      targetCapabilities,
      competencyTags: targetCapabilities,
      questionType,
      followUpQuestions:
        questionType === "motivation"
          ? ["다른 항공사가 아닌 이유는 무엇인가요?"]
          : [],
      sourceIds: [],
      sourceGrade: "E",
      confidence: "low",
      status: "draft",
      isCurrentlyRelevant: false,
      notes: "실제 기출이 아닌 연습용 예상 질문입니다.",
      createdAt: now(),
      updatedAt: now(),
    }),
  );
}
function baseStore(): Store {
  const profiles = airlineKnowledgeProfiles.map((profile) =>
      profile.airlineId === "emirates"
        ? normalizeProfile({
            ...profile,
            ...emiratesKnowledgeProfileCandidate,
            overview: {
              ...profile.overview,
              ...emiratesKnowledgeProfileCandidate.overview,
            },
            recruitmentProfile: {
              ...profile.recruitmentProfile,
              ...emiratesKnowledgeProfileCandidate.recruitmentProfile,
            },
          } as AirlineKnowledgeProfile)
        : profile.airlineId === "qatar_airways"
          ? normalizeProfile({
              ...profile,
              ...qatarKnowledgeProfileCandidate,
              overview: {
                ...profile.overview,
                ...qatarKnowledgeProfileCandidate.overview,
              },
              recruitmentProfile: {
                ...profile.recruitmentProfile,
                ...qatarKnowledgeProfileCandidate.recruitmentProfile,
              },
            } as AirlineKnowledgeProfile)
          : profile.airlineId === "etihad_airways"
            ? normalizeProfile({
                ...profile,
                ...etihadKnowledgeProfileCandidate,
                overview: {
                  ...profile.overview,
                  ...etihadKnowledgeProfileCandidate.overview,
                },
                recruitmentProfile: {
                  ...profile.recruitmentProfile,
                  ...etihadKnowledgeProfileCandidate.recruitmentProfile,
                },
              } as AirlineKnowledgeProfile)
            : profile.airlineId === "singapore_airlines"
              ? normalizeProfile({
                  ...profile,
                  ...singaporeKnowledgeProfileCandidate,
                  overview: {
                    ...profile.overview,
                    ...singaporeKnowledgeProfileCandidate.overview,
                  },
                  recruitmentProfile: {
                    ...profile.recruitmentProfile,
                    ...singaporeKnowledgeProfileCandidate.recruitmentProfile,
                  },
              } as AirlineKnowledgeProfile)
            : profile.airlineId === "cathay_pacific"
              ? normalizeProfile({
                  ...profile,
                  ...cathayKnowledgeProfileCandidate,
                  overview: { ...profile.overview, ...cathayKnowledgeProfileCandidate.overview },
                  recruitmentProfile: { ...profile.recruitmentProfile, ...cathayKnowledgeProfileCandidate.recruitmentProfile },
                } as AirlineKnowledgeProfile)
              : profile.airlineId === "ana"
                ? normalizeProfile({
                    ...profile,
                    ...anaKnowledgeProfileCandidate,
                    overview: { ...profile.overview, ...anaKnowledgeProfileCandidate.overview },
                    recruitmentProfile: { ...profile.recruitmentProfile, ...anaKnowledgeProfileCandidate.recruitmentProfile },
                  } as AirlineKnowledgeProfile)
                : profile.airlineId === "japan_airlines"
                  ? normalizeProfile({
                      ...profile,
                      ...jalKnowledgeProfileCandidate,
                      overview: { ...profile.overview, ...jalKnowledgeProfileCandidate.overview },
                      recruitmentProfile: { ...profile.recruitmentProfile, ...jalKnowledgeProfileCandidate.recruitmentProfile },
                    } as AirlineKnowledgeProfile)
                  : profile.airlineId === "korean_air"
                    ? normalizeProfile({
                        ...profile,
                        ...koreanAirKnowledgeProfileCandidate,
                        overview: { ...profile.overview, ...koreanAirKnowledgeProfileCandidate.overview },
                        recruitmentProfile: { ...profile.recruitmentProfile, ...koreanAirKnowledgeProfileCandidate.recruitmentProfile },
                      } as AirlineKnowledgeProfile)
                    : profile.airlineId === "asiana_airlines"
                      ? normalizeProfile({
                          ...profile,
                          ...asianaKnowledgeProfileCandidate,
                          overview: { ...profile.overview, ...asianaKnowledgeProfileCandidate.overview },
                          recruitmentProfile: { ...profile.recruitmentProfile, ...asianaKnowledgeProfileCandidate.recruitmentProfile },
                        } as AirlineKnowledgeProfile)
                      : profile.airlineId === "eva_air"
                        ? normalizeProfile({
                            ...profile,
                            ...evaAirKnowledgeProfileCandidate,
                            overview: { ...profile.overview, ...evaAirKnowledgeProfileCandidate.overview },
                            recruitmentProfile: { ...profile.recruitmentProfile, ...evaAirKnowledgeProfileCandidate.recruitmentProfile },
                          } as AirlineKnowledgeProfile)
                        : profile.airlineId === "china_airlines"
                          ? normalizeProfile({
                              ...profile,
                              ...chinaAirlinesKnowledgeProfileCandidate,
                              overview: { ...profile.overview, ...chinaAirlinesKnowledgeProfileCandidate.overview },
                              recruitmentProfile: { ...profile.recruitmentProfile, ...chinaAirlinesKnowledgeProfileCandidate.recruitmentProfile },
                            } as AirlineKnowledgeProfile)
                          : profile.airlineId === "lufthansa"
                            ? normalizeProfile({ ...profile, ...lufthansaKnowledgeProfileCandidate, overview: { ...profile.overview, ...lufthansaKnowledgeProfileCandidate.overview }, recruitmentProfile: { ...profile.recruitmentProfile, ...lufthansaKnowledgeProfileCandidate.recruitmentProfile } } as AirlineKnowledgeProfile)
                            : profile.airlineId === "turkish_airlines"
                              ? normalizeProfile({ ...profile, ...turkishAirlinesKnowledgeProfileCandidate, overview: { ...profile.overview, ...turkishAirlinesKnowledgeProfileCandidate.overview }, recruitmentProfile: { ...profile.recruitmentProfile, ...turkishAirlinesKnowledgeProfileCandidate.recruitmentProfile } } as AirlineKnowledgeProfile)
                              : profile.airlineId === "air_france"
                                ? normalizeProfile({ ...profile, ...airFranceKnowledgeProfileCandidate, overview: { ...profile.overview, ...airFranceKnowledgeProfileCandidate.overview }, recruitmentProfile: { ...profile.recruitmentProfile, ...airFranceKnowledgeProfileCandidate.recruitmentProfile } } as AirlineKnowledgeProfile)
                                : profile.airlineId === "british_airways"
                                  ? normalizeProfile({ ...profile, ...britishAirwaysKnowledgeProfileCandidate, overview: { ...profile.overview, ...britishAirwaysKnowledgeProfileCandidate.overview }, recruitmentProfile: { ...profile.recruitmentProfile, ...britishAirwaysKnowledgeProfileCandidate.recruitmentProfile } } as AirlineKnowledgeProfile)
                                  : profile.airlineId === "delta_air_lines"
                                    ? normalizeProfile({ ...profile, ...deltaAirLinesKnowledgeProfileCandidate, overview: { ...profile.overview, ...deltaAirLinesKnowledgeProfileCandidate.overview }, recruitmentProfile: { ...profile.recruitmentProfile, ...deltaAirLinesKnowledgeProfileCandidate.recruitmentProfile } } as AirlineKnowledgeProfile)
                                    : profile.airlineId === "united_airlines"
                                      ? normalizeProfile({ ...profile, ...unitedAirlinesKnowledgeProfileCandidate, overview: { ...profile.overview, ...unitedAirlinesKnowledgeProfileCandidate.overview }, recruitmentProfile: { ...profile.recruitmentProfile, ...unitedAirlinesKnowledgeProfileCandidate.recruitmentProfile } } as AirlineKnowledgeProfile)
            : normalizeProfile(profile),
    ),
    resources = structuredClone(airlineKnowledgeResources),
    faqs = [
      ...profiles.flatMap((profile) => generatedFaqs(profile.airlineId)),
      ...emiratesFaqDrafts,
      ...qatarFaqDrafts,
      ...etihadFaqDrafts,
      ...singaporeFaqDrafts,
      ...cathayFaqDrafts,
      ...anaFaqDrafts,
      ...jalFaqDrafts,
      ...koreanAirFaqDrafts,
      ...asianaFaqDrafts,
      ...evaAirFaqDrafts,
      ...chinaAirlinesFaqDrafts,
      ...lufthansaFaqDrafts,
      ...turkishAirlinesFaqDrafts,
      ...airFranceFaqDrafts,
      ...britishAirwaysFaqDrafts,
      ...deltaAirLinesFaqDrafts,
      ...unitedAirlinesFaqDrafts,
    ],
    questions = profiles.flatMap((profile) =>
      generatedQuestions(profile.airlineId),
    );
  const result: {
    schemaVersion: 3;
    profiles: AirlineKnowledgeProfile[];
    resources: AirlineResource[];
    questions: AirlineQuestion[];
    faqs: AirlineFAQ[];
    logs: KnowledgeReviewLog[];
  } = { schemaVersion: 3, profiles, resources, questions, faqs, logs: [] };
  result.profiles = result.profiles.map((profile) => ({
    ...profile,
    completeness: completeness(profile, resources, questions, faqs),
  }));
  return result;
}
const mergeById = <T extends { id: string }>(base: T[], saved: T[]) => [
  ...new Map([...base, ...saved].map((item) => [item.id, item])).values(),
];
function load(): Store {
  if (typeof window === "undefined") return baseStore();
  try {
    const raw = localStorage.getItem(KEY),
      saved = raw ? JSON.parse(raw) : null,
      base = baseStore();
    if (!saved) return base;
    const result: Store = {
      schemaVersion: 3,
      profiles: mergeById(
        base.profiles,
        Array.isArray(saved.profiles)
          ? saved.profiles.map(normalizeProfile)
          : [],
      ),
      resources: mergeById(
        base.resources,
        Array.isArray(saved.resources) ? saved.resources : [],
      ),
      questions: mergeById(
        base.questions,
        Array.isArray(saved.questions) ? saved.questions : [],
      ),
      faqs: mergeById(base.faqs, Array.isArray(saved.faqs) ? saved.faqs : []),
      logs: Array.isArray(saved.logs) ? saved.logs : [],
    };
    result.profiles = result.profiles.map((profile) => ({
      ...normalizeProfile(profile),
      completeness: completeness(
        normalizeProfile(profile),
        result.resources,
        result.questions,
        result.faqs,
      ),
    }));
    if (raw !== JSON.stringify(result))
      localStorage.setItem(KEY, JSON.stringify(result));
    return result;
  } catch {
    return baseStore();
  }
}
function save(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
  return store;
}
function refresh(store: Store) {
  store.profiles = store.profiles.map((profile) => ({
    ...normalizeProfile(profile),
    completeness: completeness(
      normalizeProfile(profile),
      store.resources,
      store.questions,
      store.faqs,
    ),
  }));
  return store;
}
export const airlineKnowledgeRepository = {
  load,
  initialize() {
    const store = load();
    if (typeof window !== "undefined" && !localStorage.getItem(KEY))
      save(store);
    return store;
  },
  listProfiles() {
    return load().profiles;
  },
  getProfile(airlineId: string) {
    return load().profiles.find((profile) => profile.airlineId === airlineId);
  },
  updateProfile(profile: AirlineKnowledgeProfile) {
    const store = load(),
      next = { ...normalizeProfile(profile), updatedAt: now() };
    store.profiles = [
      next,
      ...store.profiles.filter((item) => item.id !== next.id),
    ];
    save(refresh(store));
    return next;
  },
  listResources(airlineId?: string) {
    return load().resources.filter(
      (item) => !airlineId || item.airlineId === airlineId,
    );
  },
  upsertResource(resource: AirlineResource) {
    const store = load();
    store.resources = [
      resource,
      ...store.resources.filter((item) => item.id !== resource.id),
    ];
    save(refresh(store));
    return resource;
  },
  listQuestions(airlineId?: string) {
    return load().questions.filter(
      (item) => !airlineId || item.airlineId === airlineId,
    );
  },
  upsertQuestion(question: AirlineQuestion) {
    const store = load();
    store.questions = [
      question,
      ...store.questions.filter((item) => item.id !== question.id),
    ];
    save(refresh(store));
    return question;
  },
  listFaqs(airlineId?: string) {
    return load().faqs.filter(
      (item) => !airlineId || item.airlineId === airlineId,
    );
  },
  upsertFaq(faq: AirlineFAQ) {
    const store = load();
    store.faqs = [faq, ...store.faqs.filter((item) => item.id !== faq.id)];
    save(refresh(store));
    return faq;
  },
  publishQuestion(id: string) {
    const store = load(),
      question = store.questions.find((item) => item.id === id);
    if (!question || validateQuestion(question, store.resources).length)
      return null;
    question.status = "published";
    question.isCurrentlyRelevant = true;
    save(refresh(store));
    return question;
  },
  publishFaq(id: string) {
    const store = load(),
      faq = store.faqs.find((item) => item.id === id);
    if (!faq || validateFaq(faq).length) return null;
    faq.status = "published";
    save(refresh(store));
    return faq;
  },
  addReviewLog(log: KnowledgeReviewLog) {
    const store = load();
    store.logs = [log, ...store.logs].slice(0, 500);
    save(store);
  },
  listReviewLogs(id?: string) {
    return load().logs.filter((log) => !id || log.entityId === id);
  },
};
export function validateResource(resource: AirlineResource) {
  const warnings: string[] = [];
  if (!airlineById.has(resource.airlineId))
    warnings.push("Unknown airline ID.");
  if (!resource.title) warnings.push("Title is required.");
  try {
    new URL(resource.url);
  } catch {
    warnings.push("A valid URL is required.");
  }
  if (!resource.checkedAt) warnings.push("Checked date is required.");
  if (Date.now() - new Date(resource.checkedAt).getTime() > 365 * 86400000)
    warnings.push("Source check is older than 12 months.");
  if (!grades.includes(resource.sourceGrade))
    warnings.push("Source grade is required.");
  return warnings;
}
export function validateFaq(faq: AirlineFAQ) {
  const warnings: string[] = [];
  if (!faq.question || !faq.answer)
    warnings.push("FAQ question and answer are required.");
  if (!grades.includes(faq.sourceGrade))
    warnings.push("Source grade is required.");
  if (faq.status === "published" && faq.sourceGrade === "E")
    warnings.push("Unverified FAQ cannot be published.");
  return warnings;
}
export function validateQuestion(
  question: AirlineQuestion,
  resources = airlineKnowledgeRepository.listResources(),
) {
  const warnings: string[] = [];
  if (!grades.includes(question.sourceGrade))
    warnings.push("Source grade is required.");
  if (
    question.sourceType.startsWith("official_") &&
    !question.sourceIds.some((id) =>
      resources.some(
        (resource) =>
          resource.id === id && ["A", "B"].includes(resource.sourceGrade),
      ),
    )
  )
    warnings.push("Official question type requires an official source.");
  if (
    question.sourceType === "repeated_candidate_report" &&
    question.sourceIds.length < 2
  )
    warnings.push("Repeated candidate report needs at least two sources.");
  if (
    question.sourceType === "single_candidate_report" &&
    question.confidence === "high"
  )
    warnings.push("Single candidate report cannot use high confidence.");
  if (
    question.status === "published" &&
    (!question.sourceIds.length || question.sourceGrade === "E")
  )
    warnings.push("Published questions require a graded source.");
  return warnings;
}
const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
export function findSimilarQuestions(question: AirlineQuestion) {
  return airlineKnowledgeRepository
    .listQuestions(question.airlineId)
    .filter(
      (item) =>
        item.id !== question.id &&
        item.category === question.category &&
        item.recruitmentStage === question.recruitmentStage &&
        (normalizeText(item.prompt).includes(normalizeText(question.prompt)) ||
          normalizeText(question.prompt).includes(normalizeText(item.prompt))),
    );
}
export function findDuplicateResourceUrl(url: string) {
  try {
    const normalized = new URL(url);
    normalized.hash = "";
    normalized.search = "";
    return airlineKnowledgeRepository.listResources().filter((resource) => {
      try {
        const candidate = new URL(resource.url);
        candidate.hash = "";
        candidate.search = "";
        return candidate.toString() === normalized.toString();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}
const publishableQuestion = (question: AirlineQuestion) =>
  question.status === "published" &&
  question.isCurrentlyRelevant &&
  question.sourceGrade !== "E";
function toPracticeQuestion(
  question: AirlineInterviewQuestion,
): InterviewQuestion {
  const category: InterviewCategory =
    question.questionType === "safety"
      ? "safety_and_role_judgment"
      : question.questionType === "service"
        ? "customer_situation"
        : question.questionType === "motivation" ||
            question.questionType === "language"
          ? "introduction_and_motivation"
          : "behavioral_experience";
  return {
    id: question.id,
    category,
    prompt: question.prompt,
    shortTitle: question.prompt
      .replace(/^지원 준비용 예상 질문:\s*/, "")
      .slice(0, 40),
    difficulty: "intermediate",
    targetCapabilities: (question.competencyTags as CapabilityKey[]).filter(
      Boolean,
    ),
    evaluationRubric: {
      keys: question.competencyTags,
      guidance:
        question.publishStatus === "published"
          ? "지원 준비용 예상 질문입니다. 제공된 출처와 연결된 역량을 중심으로 답변을 준비해 보세요."
          : "검토 전 질문입니다.",
    },
    suggestedAnswerRange: { minSeconds: 45, maxSeconds: 90 },
    followUpQuestionIds: [],
    airlineTags: [question.airlineId],
    localeKey: `airline.${question.id}`,
  };
}
export function getPracticeQuestionsForAirline({
  airlineId,
  category,
  includeGeneralQuestions = true,
}: {
  airlineId?: string;
  category?: InterviewCategory;
  includeGeneralQuestions?: boolean;
}): InterviewQuestion[] {
  const general = includeGeneralQuestions
    ? interviewQuestions.filter(
        (question) => !category || question.category === category,
      )
    : [];
  const airline = airlineId
    ? (getAirlineAIContext(airlineId)?.approvedResearchQuestions ?? [])
        .map(toPracticeQuestion)
        .filter((question) => !category || question.category === category)
    : [];
  return [...general, ...airline];
}
export function getPublishedAirlineKnowledge(airlineId: string) {
  const profile = airlineKnowledgeRepository.getProfile(airlineId);
  if (
    !profile ||
    !["reviewed", "approved", "verified"].includes(profile.reviewStatus) ||
    (profile.publishStatus !== undefined &&
      profile.publishStatus !== "published")
  )
    return null;
  return {
    overview: profile.overview,
    recruitmentProfile: profile.recruitmentProfile,
    resources: airlineKnowledgeRepository
      .listResources(airlineId)
      .filter(
        (resource) =>
          resource.verificationStatus === "verified" &&
          resource.validity === "current" &&
          ["A", "B"].includes(resource.sourceGrade) &&
          (airlineId !== "emirates" || resource.publishStatus === "published"),
      ),
    questions: airlineKnowledgeRepository
      .listQuestions(airlineId)
      .filter(publishableQuestion),
    lastReviewedAt: profile.lastReviewedAt,
  };
}
export function getAirlineAIContext(
  airlineId: string,
): AirlineAIContext | null {
  const published = getPublishedAirlineKnowledge(airlineId);
  if (!published) return null;
  const profile = airlineKnowledgeRepository.getProfile(airlineId);
  if (
    !profile ||
    !isAirlineKnowledgeEligibleForAiContext({
      verified: profile.reviewStatus === "verified",
      published: profile.publishStatus === "published",
      sourceReferences: published.resources.map((resource) => resource.url),
      aiContextEnabled: profile.aiContextEnabled,
    })
  )
    return null;
  const publishedFAQ = airlineKnowledgeRepository
      .listFaqs(airlineId)
      .filter(
        (faq) =>
          faq.status === "published" &&
          faq.publishStatus === "published" &&
          ["A", "B", "C"].includes(faq.sourceGrade),
      ),
    verifiedField = <T>(field?: KnowledgeField<T>) =>
      field?.status === "verified" ? field : undefined,
    researchRecords = airlineResearchRepository.list(airlineId),
    researchSources = getApprovedResearchSources(researchRecords, airlineId),
    recruitment = published.recruitmentProfile;
  return {
    airlineId,
    verifiedProfile: {
      officialName: published.overview.officialName,
      displayName: published.overview.displayName,
      brandSummary: published.overview.brandSummary,
      servicePhilosophy: published.overview.servicePhilosophy,
      coreValues: published.overview.coreValues,
      cabinCrewRoleSummary: published.overview.cabinCrewRoleSummary,
      desiredCompetencies: verifiedField(
        published.overview.desiredCompetencies,
      ),
      interviewFocusAreas: verifiedField(
        published.overview.interviewFocusAreas,
      ),
    },
    publishedRecruitment: {
      officialCareerPageUrl: recruitment.officialCareerPageUrl,
      recruitmentLanguages: recruitment.recruitmentLanguages,
      eligibilityRequirements: verifiedField(
        recruitment.eligibilityRequirements,
      ),
      languageRequirements: verifiedField(recruitment.languageRequirements),
    },
    publishedRecruitmentRequirements: getAirlineAiRequirements(airlineId),
    publishedResources: published.resources,
    publishedFAQ,
    publishedQuestions: published.questions,
    approvedResearchQuestions: getApprovedAirlineInterviewQuestions(
      researchRecords,
      airlineId,
    ),
    approvedCoachingInsights: getApprovedCoachingInsights(airlineId),
    researchSources,
    sourceGrade: [
      ...new Set(
        [
          ...published.resources,
          ...publishedFAQ,
          ...published.questions,
          ...researchSources,
        ].map((item) => item.sourceGrade),
      ),
    ],
  };
}
export function getAirlineApplicationContext(
  airlineId: string,
  _includeDraft = false,
) {
  const context = getAirlineAIContext(airlineId);
  return context
    ? {
        airlineId,
        displayName: context.verifiedProfile.displayName,
        overviewSummary: context.verifiedProfile.brandSummary,
        servicePhilosophy: context.verifiedProfile.servicePhilosophy,
        coreValues: context.verifiedProfile.coreValues ?? [],
        cabinCrewRoleSummary: context.verifiedProfile.cabinCrewRoleSummary,
        recruitmentLanguages: context.publishedRecruitment.recruitmentLanguages,
        knownRecruitmentStages:
          airlineKnowledgeRepository.getProfile(airlineId)?.recruitmentProfile
            .commonRecruitmentStages ?? [],
        verifiedRecruitment: context.publishedRecruitment,
        verifiedResources: context.publishedResources,
        publishedFAQ: context.publishedFAQ,
        publishedApplicationQuestions: context.publishedQuestions,
        approvedCoachingInsights: context.approvedCoachingInsights,
        approvedInterviewQuestions: context.approvedResearchQuestions,
        lastReviewedAt:
          airlineKnowledgeRepository.getProfile(airlineId)?.lastReviewedAt,
      }
    : null;
}
