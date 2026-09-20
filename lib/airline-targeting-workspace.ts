import { airlineById, type AirlineBusinessModel, type AirlineRegion } from "@/lib/airline-data";
import { airlineMaster, type AirlineMaster } from "@/lib/airline-master-data";
import {
  airlineKnowledgeRepository,
  getAirlineAIContext,
  getPublishedAirlineKnowledge,
  type AirlineResource,
} from "@/lib/airline-knowledge-repository";
import type { AirlineSelection } from "@/lib/airline-data";
import type { ApplicationAnswer } from "@/lib/application-answer-repository";
import type { CareerExperience } from "@/lib/experience-repository";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import { safeLocalStorageWrite } from "@/lib/safe-local-storage";
import {
  airlineOfficialBatch1Fleet,
  airlineOfficialBatch1Profiles,
  airlineOfficialBatch1Routes,
  isAllowedOfficialAirlineSource,
} from "@/lib/airline-official-data-batch-1";
import {
  airlineOfficialBatch2Fleet,
  airlineOfficialBatch2Profiles,
  airlineOfficialBatch2Routes,
} from "@/lib/airline-official-data-batch-2";
import {
  airlineOfficialBatch3AFleet,
  airlineOfficialBatch3AProfiles,
  airlineOfficialBatch3ARoutes,
} from "@/lib/airline-official-data-batch-3a";
import {
  type AirlineRecruitmentGuidance,
  type AirlineRecruitmentStep,
  type CabinCrewRequirement,
} from "@/lib/airline-official-data-batch-3b";
import {
  airlineOfficialBatch4Fleet,
  airlineOfficialBatch4Guidance,
  airlineOfficialBatch4Profiles,
  airlineOfficialBatch4RecruitmentSteps,
  airlineOfficialBatch4Requirements,
  airlineOfficialBatch4Routes,
} from "@/lib/airline-official-data-batch-4";
import {
  airlineOfficialBatch5Fleet,
  airlineOfficialBatch5Guidance,
  airlineOfficialBatch5Profiles,
  airlineOfficialBatch5RecruitmentSteps,
  airlineOfficialBatch5Requirements,
  airlineOfficialBatch5Routes,
} from "@/lib/airline-official-data-batch-5";
import {
  airlineOfficialBatch6Fleet,
  airlineOfficialBatch6Guidance,
  airlineOfficialBatch6Profiles,
  airlineOfficialBatch6RecruitmentSteps,
  airlineOfficialBatch6Requirements,
  airlineOfficialBatch6Routes,
} from "@/lib/airline-official-data-batch-6";
import {
  airlineOfficialBatch7Fleet,
  airlineOfficialBatch7Guidance,
  airlineOfficialBatch7Profiles,
  airlineOfficialBatch7RecruitmentSteps,
  airlineOfficialBatch7Requirements,
  airlineOfficialBatch7Routes,
} from "@/lib/airline-official-data-batch-7";
import {
  airlineOfficialBatch8Guidance,
  airlineOfficialBatch8ProfilePatches,
  airlineOfficialBatch8RecruitmentSteps,
  airlineOfficialBatch8Requirements,
  airlineOfficialBatch8Routes,
  applyAirlineOfficialBatch8Patch,
} from "@/lib/airline-official-data-batch-8";

export type AirlineOperationScope = "DOMESTIC" | "INTERNATIONAL" | "BOTH";
export type AirlineCarrierType = "FULL_SERVICE" | "LOW_COST" | "HYBRID" | "REGIONAL" | "OTHER";
export type AirlineCountryGroup = "ALL" | "KOREA" | "JAPAN" | "CHINA" | "SOUTHEAST_ASIA" | "MIDDLE_EAST" | "EUROPE" | "NORTH_AMERICA" | "OTHER";
export type FreshnessState = "CURRENT" | "STALE" | "UNKNOWN";
export type AirlineFactStatus = "VERIFIED" | "UNVERIFIED" | "STALE" | "UNKNOWN";

export type AirlineFact = {
  type: string;
  value: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceAuthority: "AIRLINE_OFFICIAL" | "GOVERNMENT_OR_AUTHORITY" | "MANUFACTURER" | "VERIFIED_ARCHIVE";
  retrievedAt?: string;
  verifiedAt: string;
  status: AirlineFactStatus;
  accessStatus?: "ACCESSIBLE" | "AUTOMATED_ACCESS_RESTRICTED";
};

export type AirlineRoute = {
  id: string;
  airlineId: string;
  originAirport: string;
  destinationAirport: string;
  originCountry: string;
  destinationCountry: string;
  routeScope: Exclude<AirlineOperationScope, "BOTH">;
  status: "CONFIRMED" | "UNKNOWN";
  source: AirlineFact;
  lastVerifiedAt: string;
};

export type AirlineFleetEntry = {
  id: string;
  airlineId: string;
  manufacturer: string;
  aircraftFamily: string;
  aircraftModel: string;
  role?: "SHORT_HAUL" | "MEDIUM_HAUL" | "LONG_HAUL" | "MIXED";
  bodyType?: "NARROWBODY" | "WIDEBODY" | "OTHER";
  quantity: number | null;
  source: AirlineFact;
  lastVerifiedAt: string;
};

export type AirlineApplicationQuestionSource = "OFFICIAL_POSTING" | "USER_ENTERED" | "VERIFIED_ARCHIVE" | "UNKNOWN";
export type AirlineInterviewQuestionSource = "OFFICIAL_INTERVIEW" | "USER_REPORTED" | "VERIFIED_ARCHIVE" | "UNKNOWN";
export type AirlineQuestionCategory = "MOTIVATION" | "COMPANY_FIT" | "SERVICE" | "SAFETY" | "TEAMWORK" | "CONFLICT" | "CUSTOMER_COMPLAINT" | "GLOBAL_MINDSET" | "STRENGTH_WEAKNESS" | "SELF_INTRODUCTION" | "EXPERIENCE" | "SITUATIONAL" | "OTHER";

type AirlineQuestionBase = {
  id: string;
  airlineId: string;
  questionText: string;
  year?: number;
  recruitmentPeriod?: string;
  position: string;
  category: AirlineQuestionCategory;
  sourceUrl?: string;
  sourceTitle?: string;
  verified: boolean;
  createdAt: string;
};

export type AirlineApplicationQuestion = AirlineQuestionBase & { kind: "APPLICATION"; sourceType: AirlineApplicationQuestionSource };
export type AirlineInterviewQuestion = AirlineQuestionBase & { kind: "INTERVIEW"; sourceType: AirlineInterviewQuestionSource };
export type WorkspaceQuestion = AirlineApplicationQuestion | AirlineInterviewQuestion;

export type AirlineTargetPreferences = { primary: AirlineSelection | null; interests: AirlineSelection[] };
export type AirlineQuestionPattern = { category: AirlineQuestionCategory; count: number; confidence: "INSUFFICIENT" | "LIMITED" | "OBSERVED_PATTERN" };
export type AirlineWorkspaceProfile = {
  id: string;
  slug: string;
  nameKo: string;
  nameEn: string;
  iataCode?: string;
  countryCode: string;
  countryNameKo: string;
  countryNameEn: string;
  region: AirlineRegion;
  operationScope: AirlineOperationScope | null;
  carrierType: AirlineCarrierType;
  headquarters?: string;
  hubs: string[];
  website?: string;
  careersUrl?: string;
  cabinCrewCareersUrl?: string;
  cabinCrewRequirements?: CabinCrewRequirement[];
  recruitmentProcess?: AirlineRecruitmentStep[];
  recruitmentGuidance?: AirlineRecruitmentGuidance[];
  summary?: string;
  verified: boolean;
  published: boolean;
  aiContextEnabled: boolean;
  sources: AirlineFact[];
  lastVerifiedAt?: string;
};

type WorkspaceStore = { schemaVersion: 1; questions: WorkspaceQuestion[]; routes: AirlineRoute[]; fleet: AirlineFleetEntry[]; updatedAt: string };
const STORAGE_KEY = "cabin-airline-targeting-v1";
const VERSION = 1;
const now = () => new Date().toISOString();
const emptyStore = (): WorkspaceStore => ({ schemaVersion: VERSION, questions: [], routes: [], fleet: [], updatedAt: now() });
const carrierType = (model?: AirlineBusinessModel): AirlineCarrierType => model === "full_service" ? "FULL_SERVICE" : model === "low_cost" ? "LOW_COST" : model === "hybrid" ? "HYBRID" : model === "regional" ? "REGIONAL" : "OTHER";
const countryNames: Record<string, [string, string]> = { KR: ["대한민국", "South Korea"], JP: ["일본", "Japan"], CN: ["중국", "China"], HK: ["홍콩", "Hong Kong"], TW: ["대만", "Taiwan"], SG: ["싱가포르", "Singapore"], AE: ["아랍에미리트", "United Arab Emirates"], QA: ["카타르", "Qatar"], TR: ["튀르키예", "Türkiye"], DE: ["독일", "Germany"], GB: ["영국", "United Kingdom"], FR: ["프랑스", "France"], NL: ["네덜란드", "Netherlands"], US: ["미국", "United States"], CA: ["캐나다", "Canada"] };
const southeastAsia = new Set(["BN", "KH", "ID", "LA", "MY", "MM", "PH", "SG", "TH", "TL", "VN"]);

function resourceFact(resource: AirlineResource): AirlineFact {
  return { type: resource.resourceType, value: resource.summary, sourceUrl: resource.url, sourceTitle: resource.title, sourceAuthority: "AIRLINE_OFFICIAL", verifiedAt: resource.checkedAt, status: resource.validity === "possibly_outdated" ? "STALE" : resource.verificationStatus === "verified" ? "VERIFIED" : "UNVERIFIED" };
}

export function countryGroupFor(profile: Pick<AirlineWorkspaceProfile, "countryCode" | "region">): AirlineCountryGroup {
  if (profile.countryCode === "KR") return "KOREA";
  if (profile.countryCode === "JP") return "JAPAN";
  if (["CN", "HK", "MO", "TW"].includes(profile.countryCode)) return "CHINA";
  if (southeastAsia.has(profile.countryCode)) return "SOUTHEAST_ASIA";
  if (profile.region === "middle_east") return "MIDDLE_EAST";
  if (profile.region === "europe") return "EUROPE";
  if (profile.region === "north_america") return "NORTH_AMERICA";
  return "OTHER";
}

export function deriveOperationScope(routes: AirlineRoute[]): AirlineOperationScope | null {
  const domestic = routes.some((route) => route.routeScope === "DOMESTIC");
  const international = routes.some((route) => route.routeScope === "INTERNATIONAL");
  return domestic && international ? "BOTH" : domestic ? "DOMESTIC" : international ? "INTERNATIONAL" : null;
}

export function buildAirlineWorkspaceProfiles(routes: AirlineRoute[] = []): AirlineWorkspaceProfile[] {
  const profiles = airlineKnowledgeRepository.listProfiles();
  const officialProfiles = [...airlineOfficialBatch1Profiles, ...airlineOfficialBatch2Profiles, ...airlineOfficialBatch3AProfiles, ...airlineOfficialBatch4Profiles, ...airlineOfficialBatch5Profiles, ...airlineOfficialBatch6Profiles, ...airlineOfficialBatch7Profiles];
  return airlineMaster.filter((item) => item.status !== "inactive").map((item: AirlineMaster) => {
    const canonical = airlineById.get(item.id);
    const raw = profiles.find((profile) => profile.airlineId === item.id);
    const baseOfficial = officialProfiles.find((profile) => profile.airlineId === item.id);
    const batch8Patch = airlineOfficialBatch8ProfilePatches.find((patch) => patch.airlineId === item.id);
    const official = baseOfficial && batch8Patch
      ? applyAirlineOfficialBatch8Patch(baseOfficial, batch8Patch).profile
      : baseOfficial;
    const officialRecruitmentProfile = [...airlineOfficialBatch4Profiles, ...airlineOfficialBatch5Profiles, ...airlineOfficialBatch6Profiles, ...airlineOfficialBatch7Profiles].find((profile) => profile.airlineId === item.id);
    const canHavePublishedKnowledge = Boolean(raw && ["reviewed", "approved", "verified"].includes(raw.reviewStatus) && (raw.publishStatus === undefined || raw.publishStatus === "published"));
    const published = canHavePublishedKnowledge ? getPublishedAirlineKnowledge(item.id) : null;
    const sources = official?.sources.filter((source) => isAllowedOfficialAirlineSource(source.sourceUrl)) ?? published?.resources.map(resourceFact) ?? [];
    const localized = canonical?.aliases.find((alias) => /[가-힣]/.test(alias));
    const names = countryNames[item.country] ?? [item.country, item.country];
    return {
      id: item.id,
      slug: item.id.replaceAll("_", "-"),
      nameKo: localized ?? item.name,
      nameEn: item.name,
      iataCode: item.iataCode,
      countryCode: item.country,
      countryNameKo: names[0],
      countryNameEn: names[1],
      region: item.region,
      operationScope: official?.operationScope ?? deriveOperationScope(routes.filter((route) => route.airlineId === item.id && route.status === "CONFIRMED")),
      carrierType: official?.carrierType ?? carrierType(canonical?.businessModel),
      headquarters: official?.headquarters ?? published?.overview.headquarters,
      hubs: official?.hubs ?? published?.overview.primaryHubs ?? [],
      website: official?.website ?? published?.overview.website,
      careersUrl: official?.careersUrl ?? published?.recruitmentProfile.officialCareerPageUrl,
      cabinCrewCareersUrl: official?.sources.filter((source) => source.type === "cabin_crew_careers").at(-1)?.sourceUrl
        ?? officialRecruitmentProfile?.sources.find((source) => source.type === "cabin_crew_careers")?.sourceUrl,
      cabinCrewRequirements: [...airlineOfficialBatch4Requirements, ...airlineOfficialBatch5Requirements, ...airlineOfficialBatch6Requirements, ...airlineOfficialBatch7Requirements, ...airlineOfficialBatch8Requirements].filter((requirement) => requirement.airlineId === item.id),
      recruitmentProcess: [...airlineOfficialBatch4RecruitmentSteps, ...airlineOfficialBatch5RecruitmentSteps, ...airlineOfficialBatch6RecruitmentSteps, ...airlineOfficialBatch7RecruitmentSteps, ...airlineOfficialBatch8RecruitmentSteps].filter((step) => step.airlineId === item.id).sort((a, b) => a.order - b.order),
      recruitmentGuidance: [...airlineOfficialBatch4Guidance, ...airlineOfficialBatch5Guidance, ...airlineOfficialBatch6Guidance, ...airlineOfficialBatch7Guidance, ...airlineOfficialBatch8Guidance].filter((guidance) => guidance.airlineId === item.id),
      summary: official?.summary ?? published?.overview.brandSummary,
      verified: official?.verified ?? raw?.reviewStatus === "verified",
      published: official?.published ?? raw?.publishStatus === "published",
      aiContextEnabled: official ? official.aiContextEnabled : Boolean(raw?.aiContextEnabled),
      sources,
      lastVerifiedAt: official?.lastVerifiedAt ?? published?.lastReviewedAt,
    };
  });
}

export function mergeAirlineRoutes(localRoutes: AirlineRoute[] = []) {
  return [...airlineOfficialBatch1Routes, ...airlineOfficialBatch2Routes, ...airlineOfficialBatch3ARoutes, ...airlineOfficialBatch4Routes, ...airlineOfficialBatch5Routes, ...airlineOfficialBatch6Routes, ...airlineOfficialBatch7Routes, ...airlineOfficialBatch8Routes].filter((route) => isAllowedOfficialAirlineSource(route.source.sourceUrl)).concat(localRoutes)
    .filter((route, index, all) => all.findIndex((candidate) => candidate.id === route.id) === index);
}

export function mergeAirlineFleet(localFleet: AirlineFleetEntry[] = []) {
  return [...airlineOfficialBatch1Fleet, ...airlineOfficialBatch2Fleet, ...airlineOfficialBatch3AFleet, ...airlineOfficialBatch4Fleet, ...airlineOfficialBatch5Fleet, ...airlineOfficialBatch6Fleet, ...airlineOfficialBatch7Fleet].filter((entry) => isAllowedOfficialAirlineSource(entry.source.sourceUrl)).concat(localFleet)
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.id === entry.id) === index);
}

export function filterAirlines(profiles: AirlineWorkspaceProfile[], filters: { search?: string; countryGroup?: AirlineCountryGroup; countryCode?: string; operationScope?: AirlineOperationScope | "ALL"; carrierType?: AirlineCarrierType | "ALL" }) {
  const query = (filters.search ?? "").trim().toLocaleLowerCase();
  return profiles.filter((profile) => {
    const searchable = [profile.nameKo, profile.nameEn, profile.countryNameKo, profile.countryNameEn, profile.countryCode, profile.iataCode, profile.slug, ...((airlineById.get(profile.id)?.aliases) ?? [])].filter(Boolean).join(" ").toLocaleLowerCase();
    const countryOk = !filters.countryGroup || filters.countryGroup === "ALL" || countryGroupFor(profile) === filters.countryGroup;
    const countryCodeOk = !filters.countryCode || profile.countryCode === filters.countryCode;
    const scopeOk = !filters.operationScope || filters.operationScope === "ALL" || profile.operationScope === filters.operationScope || profile.operationScope === "BOTH" && ["DOMESTIC", "INTERNATIONAL"].includes(filters.operationScope);
    const carrierOk = !filters.carrierType || filters.carrierType === "ALL" || profile.carrierType === filters.carrierType;
    return (!query || searchable.includes(query)) && countryOk && countryCodeOk && scopeOk && carrierOk;
  });
}

export function freshnessFor(verifiedAt?: string, currentDays = 180): FreshnessState {
  if (!verifiedAt) return "UNKNOWN";
  const timestamp = Date.parse(verifiedAt);
  if (!Number.isFinite(timestamp)) return "UNKNOWN";
  return Date.now() - timestamp <= currentDays * 86_400_000 ? "CURRENT" : "STALE";
}

export function classifyAirlineQuestion(text: string): AirlineQuestionCategory {
  const value = text.toLocaleLowerCase();
  const rules: [AirlineQuestionCategory, RegExp][] = [
    ["SELF_INTRODUCTION", /자기소개|introduce yourself/], ["MOTIVATION", /지원\s*동기|왜 .*항공사|motivat|why .*airline/],
    ["COMPANY_FIT", /회사|항공사|브랜드|가치|company|airline|brand|value/], ["SAFETY", /안전|비상|규정|safety|emergency|procedure/],
    ["CUSTOMER_COMPLAINT", /불만|컴플레인|화난 고객|complaint|angry customer/], ["SERVICE", /서비스|고객|service|passenger|customer/],
    ["CONFLICT", /갈등|의견 충돌|conflict|disagreement/], ["TEAMWORK", /팀워크|협업|동료|teamwork|team/],
    ["GLOBAL_MINDSET", /다문화|문화|글로벌|multicultural|global/], ["STRENGTH_WEAKNESS", /강점|약점|장단점|strength|weakness/],
    ["SITUATIONAL", /상황|어떻게 하|what would you|situational/], ["EXPERIENCE", /경험|사례|example|experience/],
  ];
  return rules.find(([, pattern]) => pattern.test(value))?.[0] ?? "OTHER";
}

export function patternConfidence(sampleCount: number): AirlineQuestionPattern["confidence"] {
  return sampleCount >= 6 ? "OBSERVED_PATTERN" : sampleCount >= 3 ? "LIMITED" : "INSUFFICIENT";
}

export function calculateQuestionPatterns(questions: WorkspaceQuestion[]): AirlineQuestionPattern[] {
  const counts = new Map<AirlineQuestionCategory, number>();
  questions.forEach((question) => counts.set(question.category, (counts.get(question.category) ?? 0) + 1));
  const confidence = patternConfidence(questions.length);
  return [...counts].map(([category, count]) => ({ category, count, confidence })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function filterQuestions(questions: WorkspaceQuestion[], filters: { kind?: WorkspaceQuestion["kind"] | "ALL"; year?: number; category?: AirlineQuestionCategory | "ALL"; position?: string; sourceType?: string | "ALL"; search?: string }) {
  const search = (filters.search ?? "").trim().toLocaleLowerCase();
  return questions.filter((question) => (!filters.kind || filters.kind === "ALL" || question.kind === filters.kind) && (!filters.year || question.year === filters.year) && (!filters.category || filters.category === "ALL" || question.category === filters.category) && (!filters.position || question.position === filters.position) && (!filters.sourceType || filters.sourceType === "ALL" || question.sourceType === filters.sourceType) && (!search || question.questionText.toLocaleLowerCase().includes(search)));
}

export function getSourceBackedWorkspaceQuestions(airlineId: string): WorkspaceQuestion[] {
  const published = getPublishedAirlineKnowledge(airlineId);
  if (!published) return [];
  return published.questions.flatMap((item): WorkspaceQuestion[] => {
    const base = { id: `knowledge-${item.id}`, airlineId, questionText: item.prompt, position: "객실승무원", category: classifyAirlineQuestion(item.prompt), sourceUrl: published.resources.find((resource) => item.sourceIds.includes(resource.id))?.url, sourceTitle: published.resources.find((resource) => item.sourceIds.includes(resource.id))?.title, verified: true, createdAt: item.createdAt };
    if (item.sourceType === "official_application") return [{ ...base, id: `airline-${item.id}`, kind: "APPLICATION", sourceType: "OFFICIAL_POSTING" }];
    if (["official_interview", "official_video_interview", "official_event"].includes(item.sourceType)) return [{ ...base, kind: "INTERVIEW", sourceType: "OFFICIAL_INTERVIEW" }];
    if (["repeated_candidate_report", "single_candidate_report"].includes(item.sourceType)) return [{ ...base, kind: "INTERVIEW", sourceType: "VERIFIED_ARCHIVE" }];
    return [];
  });
}

export function normalizeTargetPreferences(primary: AirlineSelection | null, interests: AirlineSelection[], selected: AirlineSelection, mode: "primary" | "interest"): AirlineTargetPreferences {
  if (mode === "primary") return { primary: selected, interests: interests.filter((item) => item.id !== selected.id) };
  if (primary?.id === selected.id) return { primary, interests: interests.filter((item) => item.id !== selected.id) };
  const exists = interests.some((item) => item.id === selected.id);
  return { primary, interests: exists ? interests.filter((item) => item.id !== selected.id) : [...interests.filter((item) => item.id !== primary?.id), selected] };
}

function isQuestion(value: unknown): value is WorkspaceQuestion {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<WorkspaceQuestion>;
  return typeof item.id === "string" && typeof item.airlineId === "string" && typeof item.questionText === "string" && (item.kind === "APPLICATION" || item.kind === "INTERVIEW");
}

function readStore(): WorkspaceStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { schemaVersion: VERSION, questions: Array.isArray(raw.questions) ? raw.questions.filter(isQuestion).slice(0, 500) : [], routes: Array.isArray(raw.routes) ? raw.routes.slice(0, 1000) : [], fleet: Array.isArray(raw.fleet) ? raw.fleet.slice(0, 500) : [], updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now() };
  } catch { return emptyStore(); }
}

export const airlineTargetingRepository = {
  eventName: "cabin:airline-targeting-changed",
  load: readStore,
  save(store: WorkspaceStore) {
    const result = safeLocalStorageWrite(STORAGE_KEY, { ...store, schemaVersion: VERSION, updatedAt: now() }, { category: "application" });
    if (result.ok && typeof window !== "undefined") window.dispatchEvent(new Event(this.eventName));
    return result;
  },
  addUserQuestion(input: { kind: WorkspaceQuestion["kind"]; airlineId: string; questionText: string; year?: number; recruitmentPeriod?: string; position?: string; category?: AirlineQuestionCategory }) {
    const base = { id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `airline-question-${Date.now()}`, airlineId: input.airlineId, questionText: input.questionText.trim(), year: input.year, recruitmentPeriod: input.recruitmentPeriod?.trim() || undefined, position: input.position?.trim() || "객실승무원", category: input.category ?? classifyAirlineQuestion(input.questionText), verified: false, createdAt: now() };
    const question: WorkspaceQuestion = input.kind === "APPLICATION" ? { ...base, kind: "APPLICATION", sourceType: "USER_ENTERED" } : { ...base, kind: "INTERVIEW", sourceType: "USER_REPORTED" };
    const store = readStore();
    const result = this.save({ ...store, questions: [question, ...store.questions.filter((item) => item.id !== question.id)] });
    return result.ok ? { ok: true as const, question } : result;
  },
};

export function isAirlineEligibleForAi(profile: AirlineWorkspaceProfile) {
  return profile.verified && profile.published && profile.aiContextEnabled && profile.sources.some((source) => /^https?:\/\//.test(source.sourceUrl)) && Boolean(getAirlineAIContext(profile.id));
}

export function buildPracticeLineage(airlineId: string, question: WorkspaceQuestion) {
  return { source: "airline_workspace" as const, airlineId, workspaceQuestionId: question.id, questionKind: question.kind };
}

export function buildPreparationStatus(input: { airlineId: string; questions: WorkspaceQuestion[]; answers: ApplicationAnswer[]; attempts: InterviewAttempt[]; experiences: CareerExperience[] }) {
  const questions = input.questions.filter((item) => item.airlineId === input.airlineId);
  const answers = input.answers.filter((item) => item.airlineId === input.airlineId);
  const applicationQuestionIds = new Set(questions.filter((item) => item.kind === "APPLICATION").map((item) => item.id));
  const attempts = input.attempts.filter((item) => item.targetAirlineId === input.airlineId && item.completed);
  const linkedExperienceIds = new Set([...answers.flatMap((item) => item.selectedExperienceIds), ...attempts.map((item) => item.experienceId).filter((id): id is string => Boolean(id))].filter((id) => input.experiences.some((experience) => experience.id === id)));
  return { applicationQuestionCount: applicationQuestionIds.size, answeredApplicationCount: new Set(answers.filter((item) => applicationQuestionIds.has(item.promptId)).map((item) => item.promptId)).size, interviewQuestionCount: questions.filter((item) => item.kind === "INTERVIEW").length, practicedInterviewCount: attempts.length, linkedExperienceCount: linkedExperienceIds.size };
}

export function compareAirlines(profiles: AirlineWorkspaceProfile[], selectedIds: string[], data: { questions: WorkspaceQuestion[]; answers: ApplicationAnswer[]; attempts: InterviewAttempt[]; experiences: CareerExperience[] }) {
  return selectedIds.slice(0, 3).map((id) => {
    const profile = profiles.find((item) => item.id === id);
    if (!profile) return null;
    return { profile, preparation: buildPreparationStatus({ airlineId: id, ...data }) };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function compareCabinCrewRequirements(profiles: AirlineWorkspaceProfile[], selectedIds: string[]) {
  const selected = selectedIds.slice(0, 3).map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is AirlineWorkspaceProfile => Boolean(profile));
  const types = [...new Set(selected.flatMap((profile) => (profile.cabinCrewRequirements ?? []).map((requirement) => requirement.requirementType)))].sort();
  return types.map((requirementType) => ({
    requirementType,
    airlines: selected.map((profile) => ({
      airlineId: profile.id,
      requirements: (profile.cabinCrewRequirements ?? []).filter((requirement) => requirement.requirementType === requirementType).map((requirement) => requirement.text),
    })),
  }));
}
