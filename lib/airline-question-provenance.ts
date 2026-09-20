export type AirlineQuestionProvenance =
  | "OFFICIAL_CURRENT"
  | "OFFICIAL_ARCHIVE"
  | "USER_REPORTED"
  | "VERIFIED_SECONDARY"
  | "UNVERIFIED_COMMUNITY";

export type AirlineQuestionLocale = "ko" | "en" | "ja";

export type QuestionProvenanceInput = {
  airlineId: string;
  questionText: string;
  year?: number;
  recruitmentPeriod?: string;
  sourceType?: string;
  provenance?: AirlineQuestionProvenance;
  sourceUrl?: string;
  verified?: boolean;
  archived?: boolean;
  locale?: AirlineQuestionLocale;
  rawSourceText?: string;
  translatedText?: string;
  verifiedAt?: string;
  category?: string;
};

export const questionProvenanceLabels: Record<AirlineQuestionProvenance, string> = {
  OFFICIAL_CURRENT: "공식 현재",
  OFFICIAL_ARCHIVE: "공식 과거",
  USER_REPORTED: "사용자 제보",
  VERIFIED_SECONDARY: "검증 보조자료",
  UNVERIFIED_COMMUNITY: "미검증 커뮤니티",
};

export function questionProvenance(question: QuestionProvenanceInput): AirlineQuestionProvenance {
  if (question.provenance) return question.provenance;
  if (question.sourceType === "OFFICIAL_POSTING" || question.sourceType === "OFFICIAL_INTERVIEW") return "OFFICIAL_CURRENT";
  if (question.sourceType === "VERIFIED_ARCHIVE") return "VERIFIED_SECONDARY";
  if (question.sourceType === "USER_ENTERED" || question.sourceType === "USER_REPORTED") return "USER_REPORTED";
  return "UNVERIFIED_COMMUNITY";
}

export function isOfficialQuestion(question: QuestionProvenanceInput) {
  const provenance = questionProvenance(question);
  return provenance === "OFFICIAL_CURRENT" || provenance === "OFFICIAL_ARCHIVE";
}

export function normalizeQuestionText(text: string) {
  return text.normalize("NFKC").trim().replace(/\s+/g, " ").replace(/[？?]+$/u, "").toLocaleLowerCase();
}

export function questionDedupeKey(question: QuestionProvenanceInput) {
  return [
    question.airlineId,
    normalizeQuestionText(question.questionText),
    question.year ?? "",
    question.recruitmentPeriod?.trim() ?? "",
    questionProvenance(question),
  ].join("::");
}

export function dedupeAirlineQuestions<T extends QuestionProvenanceInput>(questions: T[]) {
  return questions.filter((question, index, all) => all.findIndex((candidate) => questionDedupeKey(candidate) === questionDedupeKey(question)) === index);
}

export function officialPatternQuestions<T extends QuestionProvenanceInput>(questions: T[]) {
  return questions.filter(isOfficialQuestion);
}

export function splitOfficialQuestionHistory<T extends QuestionProvenanceInput>(questions: T[]) {
  const official = officialPatternQuestions(questions);
  return {
    current: official.filter((question) => questionProvenance(question) === "OFFICIAL_CURRENT"),
    historical: official.filter((question) => questionProvenance(question) === "OFFICIAL_ARCHIVE"),
  };
}

export function recurringOfficialCategories<T extends QuestionProvenanceInput>(questions: T[]) {
  const periodsByCategory = new Map<string, Set<string>>();
  for (const question of officialPatternQuestions(questions)) {
    if (!question.category) continue;
    const period = question.recruitmentPeriod?.trim() || (question.year ? String(question.year) : undefined);
    if (!period) continue;
    const periods = periodsByCategory.get(question.category) ?? new Set<string>();
    periods.add(period);
    periodsByCategory.set(question.category, periods);
  }
  return [...periodsByCategory.entries()]
    .filter(([, periods]) => periods.size >= 2)
    .map(([category, periods]) => ({ category, periodCount: periods.size, signal: "REPEATED_THEME" as const }));
}

export function validateOfficialQuestionSource(question: QuestionProvenanceInput, isAllowedOfficialUrl: (url: string) => boolean) {
  if (!isOfficialQuestion(question)) return { valid: false as const, reason: "NOT_OFFICIAL" as const };
  if (!question.questionText.trim()) return { valid: false as const, reason: "EMPTY_QUESTION" as const };
  if (!question.rawSourceText?.trim()) return { valid: false as const, reason: "RAW_SOURCE_REQUIRED" as const };
  if (!question.verified) return { valid: false as const, reason: "NOT_VERIFIED" as const };
  if (!question.verifiedAt || !Number.isFinite(Date.parse(question.verifiedAt))) return { valid: false as const, reason: "VERIFIED_AT_REQUIRED" as const };
  if (!question.sourceUrl || !question.sourceUrl.startsWith("https://") || !isAllowedOfficialUrl(question.sourceUrl)) return { valid: false as const, reason: "INVALID_SOURCE" as const };
  if (questionProvenance(question) === "OFFICIAL_CURRENT" && question.archived) return { valid: false as const, reason: "CURRENT_CANNOT_BE_ARCHIVED" as const };
  if (questionProvenance(question) === "OFFICIAL_ARCHIVE" && (!question.archived || (!question.year && !question.recruitmentPeriod))) return { valid: false as const, reason: "ARCHIVE_PERIOD_REQUIRED" as const };
  return { valid: true as const };
}
