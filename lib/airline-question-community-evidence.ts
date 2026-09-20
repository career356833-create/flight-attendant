import { normalizeQuestionText, questionProvenance, type AirlineQuestionLocale, type AirlineQuestionProvenance, type QuestionProvenanceInput } from "@/lib/airline-question-provenance";

export type QuestionModerationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "DUPLICATE" | "NEEDS_REVIEW";
export type QuestionInterviewStage = "DOCUMENT" | "VIDEO" | "FIRST_INTERVIEW" | "FINAL_INTERVIEW" | "GROUP" | "OTHER";
export type CommunityPatternConfidence = "INSUFFICIENT" | "LIMITED" | "OBSERVED_PATTERN";

export type CommunityQuestionEvidence = QuestionProvenanceInput & {
  id: string;
  kind: "APPLICATION" | "INTERVIEW";
  locale?: AirlineQuestionLocale;
  position: string;
  interviewStage?: QuestionInterviewStage;
  moderationStatus?: QuestionModerationStatus;
  reporterOwned?: boolean;
  reporterKey?: string;
  selfAttested?: boolean;
  createdAt: string;
  sourceTitle?: string;
  publisher?: string;
  publishedAt?: string;
  linkedOfficialQuestionId?: string;
  verified: boolean;
};

export type CommunityQuestionPattern = {
  category: string;
  count: number;
  confidence: CommunityPatternConfidence;
  reportCount: number;
  uniqueReporterCount: number;
  yearsObserved: number[];
  latestObserved?: string;
  repeatedTheme: boolean;
};

export const moderationStatusLabels: Record<QuestionModerationStatus, string> = {
  PENDING: "검토 대기",
  ACCEPTED: "검토 수락",
  REJECTED: "검토 거절",
  DUPLICATE: "중복 제보",
  NEEDS_REVIEW: "추가 검토 필요",
};

export const interviewStageLabels: Record<QuestionInterviewStage, string> = {
  DOCUMENT: "서류",
  VIDEO: "영상 면접",
  FIRST_INTERVIEW: "1차 면접",
  FINAL_INTERVIEW: "최종 면접",
  GROUP: "그룹 면접",
  OTHER: "기타",
};

const MAX_QUESTION_LENGTH = 500;
const URL_PATTERN = /(?:https?:\/\/|www\.)\S+/iu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu;
const PHONE_PATTERN = /(?:\+?82[-.\s]?)?0?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/u;
const RRN_PATTERN = /\b\d{6}[-\s]?[1-4]\d{6}\b/u;
const PASSPORT_PATTERN = /\b[A-Z]{1,2}\d{7,8}\b/u;

export function sanitizeCommunityQuestionText(value: string) {
  return value.normalize("NFKC").replace(/<[^>]*>/gu, " ").replace(/[\u0000-\u001F\u007F]/gu, " ").replace(/\s+/gu, " ").trim();
}

export function validateCommunityQuestionText(value: string) {
  const questionText = sanitizeCommunityQuestionText(value);
  if (!questionText) return { valid: false as const, code: "EMPTY" as const, questionText };
  if (questionText.length > MAX_QUESTION_LENGTH) return { valid: false as const, code: "TOO_LONG" as const, questionText };
  if (URL_PATTERN.test(questionText)) return { valid: false as const, code: "URL_SPAM" as const, questionText };
  if ([EMAIL_PATTERN, PHONE_PATTERN, RRN_PATTERN, PASSPORT_PATTERN].some((pattern) => pattern.test(questionText))) return { valid: false as const, code: "PII_DETECTED" as const, questionText };
  return { valid: true as const, questionText };
}

export function communityQuestionDedupeText(value: string) {
  return normalizeQuestionText(sanitizeCommunityQuestionText(value)).replace(/[\p{P}\p{S}]+/gu, "").replace(/\s+/gu, "");
}

export function isCommunityQuestionDuplicate(input: Pick<CommunityQuestionEvidence, "airlineId" | "questionText" | "kind"> & Partial<Pick<CommunityQuestionEvidence, "year" | "recruitmentPeriod" | "interviewStage">>, existing: (Pick<CommunityQuestionEvidence, "airlineId" | "questionText" | "kind"> & Partial<Pick<CommunityQuestionEvidence, "year" | "recruitmentPeriod" | "interviewStage">>)[]) {
  const normalized = communityQuestionDedupeText(input.questionText);
  const period = input.recruitmentPeriod?.normalize("NFKC").trim().toLocaleLowerCase() ?? "";
  return existing.some((item) => item.airlineId === input.airlineId && item.kind === input.kind && communityQuestionDedupeText(item.questionText) === normalized && (item.year ?? null) === (input.year ?? null) && (item.recruitmentPeriod?.normalize("NFKC").trim().toLocaleLowerCase() ?? "") === period && (item.interviewStage ?? null) === (input.interviewStage ?? null));
}

export function createUserReportedQuestion(input: {
  id: string;
  airlineId: string;
  kind: "APPLICATION" | "INTERVIEW";
  questionText: string;
  locale: AirlineQuestionLocale;
  reporterKey: string;
  selfAttested: boolean;
  createdAt: string;
  year?: number;
  recruitmentPeriod?: string;
  position?: string;
  interviewStage?: QuestionInterviewStage;
  category?: string;
}, existing: CommunityQuestionEvidence[]) {
  const validation = validateCommunityQuestionText(input.questionText);
  if (!validation.valid) return { ok: false as const, code: validation.code };
  if (!input.selfAttested) return { ok: false as const, code: "ATTESTATION_REQUIRED" as const };
  if (isCommunityQuestionDuplicate({ ...input, questionText: validation.questionText }, existing)) return { ok: false as const, code: "DUPLICATE" as const };
  const question: CommunityQuestionEvidence = {
    id: input.id,
    airlineId: input.airlineId,
    kind: input.kind,
    questionText: validation.questionText,
    locale: input.locale,
    year: input.year,
    recruitmentPeriod: input.recruitmentPeriod?.trim() || undefined,
    position: input.position?.trim() || "객실승무원",
    interviewStage: input.interviewStage,
    category: input.category,
    provenance: "USER_REPORTED",
    moderationStatus: "PENDING",
    reporterOwned: true,
    reporterKey: input.reporterKey,
    selfAttested: true,
    verified: false,
    archived: false,
    createdAt: input.createdAt,
  };
  return { ok: true as const, question };
}

export function validateVerifiedSecondaryQuestion(question: CommunityQuestionEvidence) {
  if (questionProvenance(question) !== "VERIFIED_SECONDARY") return { valid: false as const, code: "WRONG_PROVENANCE" as const };
  if (!validateCommunityQuestionText(question.questionText).valid) return { valid: false as const, code: "INVALID_QUESTION" as const };
  if (!question.sourceUrl?.startsWith("https://")) return { valid: false as const, code: "SOURCE_URL_REQUIRED" as const };
  if (!question.sourceTitle?.trim()) return { valid: false as const, code: "SOURCE_TITLE_REQUIRED" as const };
  if (!question.publisher?.trim()) return { valid: false as const, code: "PUBLISHER_REQUIRED" as const };
  if (!question.verifiedAt || !Number.isFinite(Date.parse(question.verifiedAt))) return { valid: false as const, code: "VERIFIED_AT_REQUIRED" as const };
  if (question.publishedAt && !Number.isFinite(Date.parse(question.publishedAt))) return { valid: false as const, code: "INVALID_PUBLISHED_AT" as const };
  return { valid: true as const };
}

export function toPublicCommunityQuestion(question: CommunityQuestionEvidence) {
  const { reporterKey: _reporterKey, reporterOwned: _reporterOwned, ...safe } = question;
  return safe;
}

export function isCommunityQuestionVisible(question: CommunityQuestionEvidence, viewer: "OWNER" | "PUBLIC", sharingBackendAvailable = false) {
  const provenance = questionProvenance(question);
  if (provenance !== "USER_REPORTED") return true;
  if (viewer === "OWNER" && question.reporterOwned) return question.moderationStatus !== "REJECTED";
  return sharingBackendAvailable && question.moderationStatus === "ACCEPTED";
}

export function canPracticeCommunityQuestion(question: CommunityQuestionEvidence) {
  const provenance = questionProvenance(question);
  return provenance === "OFFICIAL_CURRENT" || provenance === "OFFICIAL_ARCHIVE" || provenance === "VERIFIED_SECONDARY" || (provenance === "USER_REPORTED" && question.moderationStatus === "ACCEPTED");
}

export function patternConfidence(sampleCount: number, uniqueReporterCount = sampleCount): CommunityPatternConfidence {
  if (sampleCount >= 6 && uniqueReporterCount >= 3) return "OBSERVED_PATTERN";
  if (sampleCount >= 3 && uniqueReporterCount >= 2) return "LIMITED";
  return "INSUFFICIENT";
}

export function calculateCommunityPatterns(questions: CommunityQuestionEvidence[], provenance: "USER_REPORTED" | "VERIFIED_SECONDARY") {
  const eligible = questions.filter((question) => questionProvenance(question) === provenance && (provenance !== "USER_REPORTED" || question.moderationStatus === "ACCEPTED"));
  const byCategory = new Map<string, CommunityQuestionEvidence[]>();
  for (const question of eligible) {
    const category = question.category || "OTHER";
    byCategory.set(category, [...(byCategory.get(category) ?? []), question]);
  }
  return [...byCategory.entries()].map(([category, items]): CommunityQuestionPattern => {
    const reporterKeys = new Set(items.map((item) => item.reporterKey).filter((key): key is string => Boolean(key)));
    const years = [...new Set(items.map((item) => item.year).filter((year): year is number => typeof year === "number"))].sort();
    const periods = new Set(items.map((item) => item.recruitmentPeriod?.trim() || (item.year ? String(item.year) : "")).filter(Boolean));
    const latestObserved = items.map((item) => item.createdAt).filter((value) => Number.isFinite(Date.parse(value))).sort().at(-1);
    const uniqueReporterCount = provenance === "VERIFIED_SECONDARY" ? items.length : reporterKeys.size;
    return { category, count: items.length, reportCount: items.length, uniqueReporterCount, yearsObserved: years, latestObserved, repeatedTheme: periods.size >= 2 && uniqueReporterCount >= 2, confidence: patternConfidence(items.length, uniqueReporterCount) };
  }).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function buildEvidenceQuestionPool<T extends CommunityQuestionEvidence>(questions: T[]) {
  const rank: Record<AirlineQuestionProvenance, number> = { OFFICIAL_CURRENT: 0, OFFICIAL_ARCHIVE: 1, VERIFIED_SECONDARY: 2, USER_REPORTED: 3, UNVERIFIED_COMMUNITY: 4 };
  const groups = new Map<string, T[]>();
  for (const question of questions) {
    const key = `${question.airlineId}::${question.kind}::${communityQuestionDedupeText(question.questionText)}`;
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }
  return [...groups.values()].map((items) => {
    const sorted = [...items].sort((a, b) => rank[questionProvenance(a)] - rank[questionProvenance(b)] || a.createdAt.localeCompare(b.createdAt));
    return { question: sorted[0], supportingOccurrences: sorted.slice(1), supportCount: sorted.length - 1 };
  }).sort((a, b) => rank[questionProvenance(a.question)] - rank[questionProvenance(b.question)] || b.question.createdAt.localeCompare(a.question.createdAt));
}
