import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupeAirlineQuestions,
  isOfficialQuestion,
  normalizeQuestionText,
  officialPatternQuestions,
  questionDedupeKey,
  questionProvenance,
  recurringOfficialCategories,
  splitOfficialQuestionHistory,
  validateOfficialQuestionSource,
  type QuestionProvenanceInput,
} from "./airline-question-provenance";
import {
  buildPracticeLineage,
  calculateQuestionPatterns,
  filterQuestions,
  getSourceBackedWorkspaceQuestions,
  type WorkspaceQuestion,
} from "./airline-targeting-workspace";

const verifiedAt = "2026-09-20T00:00:00.000Z";
const allowed = (url: string) => new URL(url).hostname.endsWith("example-airline.com");
const official = (overrides: Partial<QuestionProvenanceInput> = {}): QuestionProvenanceInput => ({
  airlineId: "pilot_air",
  questionText: "지원 동기를 말씀해 주세요.",
  provenance: "OFFICIAL_CURRENT",
  sourceType: "OFFICIAL_INTERVIEW",
  sourceUrl: "https://careers.example-airline.com/cabin-crew",
  rawSourceText: "지원 동기를 말씀해 주세요.",
  locale: "ko",
  verified: true,
  verifiedAt,
  archived: false,
  year: 2026,
  recruitmentPeriod: "2026 상반기",
  category: "MOTIVATION",
  ...overrides,
});
const workspace = (id: string, overrides: Partial<WorkspaceQuestion> = {}): WorkspaceQuestion => ({
  id,
  airlineId: "pilot_air",
  kind: "INTERVIEW",
  questionText: "지원 동기를 말씀해 주세요.",
  year: 2026,
  recruitmentPeriod: "2026 상반기",
  position: "객실승무원",
  category: "MOTIVATION",
  sourceType: "OFFICIAL_INTERVIEW",
  provenance: "OFFICIAL_CURRENT",
  locale: "ko",
  rawSourceText: "지원 동기를 말씀해 주세요.",
  sourceUrl: "https://careers.example-airline.com/cabin-crew",
  verified: true,
  verifiedAt,
  archived: false,
  createdAt: verifiedAt,
  ...overrides,
} as WorkspaceQuestion);

test("01 explicit official current provenance is preserved", () => assert.equal(questionProvenance(official()), "OFFICIAL_CURRENT"));
test("02 explicit official archive provenance is preserved", () => assert.equal(questionProvenance(official({ provenance: "OFFICIAL_ARCHIVE", archived: true })), "OFFICIAL_ARCHIVE"));
test("03 user-entered application normalizes to user reported", () => assert.equal(questionProvenance({ airlineId: "a", questionText: "q", sourceType: "USER_ENTERED" }), "USER_REPORTED"));
test("04 candidate report archive stays verified secondary", () => assert.equal(questionProvenance({ airlineId: "a", questionText: "q", sourceType: "VERIFIED_ARCHIVE" }), "VERIFIED_SECONDARY"));
test("05 unknown legacy source is unverified community", () => assert.equal(questionProvenance({ airlineId: "a", questionText: "q", sourceType: "UNKNOWN" }), "UNVERIFIED_COMMUNITY"));
test("06 only official current is official", () => assert.equal(isOfficialQuestion(official()), true));
test("07 official archive is official", () => assert.equal(isOfficialQuestion(official({ provenance: "OFFICIAL_ARCHIVE", archived: true })), true));
test("08 verified secondary is not official", () => assert.equal(isOfficialQuestion(official({ provenance: "VERIFIED_SECONDARY" })), false));
test("09 punctuation and whitespace normalize deterministically", () => assert.equal(normalizeQuestionText("  지원  동기?? "), "지원 동기"));
test("10 dedupe key separates airlines", () => assert.notEqual(questionDedupeKey(official()), questionDedupeKey(official({ airlineId: "other" }))));
test("11 dedupe key separates recruitment periods", () => assert.notEqual(questionDedupeKey(official()), questionDedupeKey(official({ recruitmentPeriod: "2025 하반기" }))));
test("12 duplicate official rows collapse", () => assert.equal(dedupeAirlineQuestions([official(), official({ questionText: " 지원  동기를 말씀해 주세요. " })]).length, 1));
test("13 same text in different periods remains historical evidence", () => assert.equal(dedupeAirlineQuestions([official(), official({ year: 2025, recruitmentPeriod: "2025 하반기" })]).length, 2));
test("14 official pattern input excludes user reports", () => assert.equal(officialPatternQuestions([official(), official({ provenance: "USER_REPORTED" })]).length, 1));
test("15 history split separates current and archived", () => { const split = splitOfficialQuestionHistory([official(), official({ provenance: "OFFICIAL_ARCHIVE", archived: true, year: 2025, recruitmentPeriod: "2025 상반기" })]); assert.equal(split.current.length, 1); assert.equal(split.historical.length, 1); });
test("16 one period does not claim recurrence", () => assert.deepEqual(recurringOfficialCategories([official()]), []));
test("17 two periods produce a repeated-theme signal", () => assert.deepEqual(recurringOfficialCategories([official(), official({ year: 2025, recruitmentPeriod: "2025 상반기" })]), [{ category: "MOTIVATION", periodCount: 2, signal: "REPEATED_THEME" }]));
test("18 user reports never create recurrence", () => assert.deepEqual(recurringOfficialCategories([official({ provenance: "USER_REPORTED" }), official({ provenance: "USER_REPORTED", year: 2025, recruitmentPeriod: "2025" })]), []));
test("19 valid official current source passes", () => assert.deepEqual(validateOfficialQuestionSource(official(), allowed), { valid: true }));
test("20 non-official source fails official validation", () => assert.equal(validateOfficialQuestionSource(official({ provenance: "USER_REPORTED" }), allowed).reason, "NOT_OFFICIAL"));
test("21 empty official question fails validation", () => assert.equal(validateOfficialQuestionSource(official({ questionText: " " }), allowed).reason, "EMPTY_QUESTION"));
test("22 raw official wording is required", () => assert.equal(validateOfficialQuestionSource(official({ rawSourceText: undefined }), allowed).reason, "RAW_SOURCE_REQUIRED"));
test("23 unverified official question fails validation", () => assert.equal(validateOfficialQuestionSource(official({ verified: false }), allowed).reason, "NOT_VERIFIED"));
test("24 verification timestamp is required", () => assert.equal(validateOfficialQuestionSource(official({ verifiedAt: undefined }), allowed).reason, "VERIFIED_AT_REQUIRED"));
test("25 non-allowlisted domain fails validation", () => assert.equal(validateOfficialQuestionSource(official({ sourceUrl: "https://community.invalid/q" }), allowed).reason, "INVALID_SOURCE"));
test("26 current question cannot be marked archived", () => assert.equal(validateOfficialQuestionSource(official({ archived: true }), allowed).reason, "CURRENT_CANNOT_BE_ARCHIVED"));
test("27 archive requires archived marker and period", () => assert.equal(validateOfficialQuestionSource(official({ provenance: "OFFICIAL_ARCHIVE", archived: false, year: undefined, recruitmentPeriod: undefined }), allowed).reason, "ARCHIVE_PERIOD_REQUIRED"));
test("28 official pattern aggregation excludes reports and secondary material", () => assert.deepEqual(calculateQuestionPatterns([workspace("o"), workspace("u", { provenance: "USER_REPORTED", sourceType: "USER_REPORTED" }), workspace("s", { provenance: "VERIFIED_SECONDARY", sourceType: "VERIFIED_ARCHIVE" })]), [{ category: "MOTIVATION", count: 1, confidence: "INSUFFICIENT" }]));
test("29 provenance filter keeps source classes separate", () => assert.deepEqual(filterQuestions([workspace("o"), workspace("u", { provenance: "USER_REPORTED", sourceType: "USER_REPORTED" })], { provenance: "USER_REPORTED" }).map((item) => item.id), ["u"]));
test("30 practice lineage preserves exact workspace provenance", () => assert.deepEqual(buildPracticeLineage("pilot_air", workspace("archive", { provenance: "OFFICIAL_ARCHIVE", archived: true })), { source: "airline_workspace", airlineId: "pilot_air", workspaceQuestionId: "archive", questionKind: "INTERVIEW", questionSourceType: "OFFICIAL_INTERVIEW", questionProvenance: "OFFICIAL_ARCHIVE" }));
test("31 Korean Air official exact-question set is honestly empty", () => assert.equal(officialPatternQuestions(getSourceBackedWorkspaceQuestions("korean_air")).length, 0));
test("32 Jeju Air official exact-question set is honestly empty", () => assert.equal(officialPatternQuestions(getSourceBackedWorkspaceQuestions("jeju_air")).length, 0));
test("33 JAL official exact-question set is honestly empty", () => assert.equal(officialPatternQuestions(getSourceBackedWorkspaceQuestions("japan_airlines")).length, 0));
test("34 Jin Air archived official exercise remains source-backed", () => { const questions = officialPatternQuestions(getSourceBackedWorkspaceQuestions("jin_air")); assert.equal(questions.length, 1); assert.equal(questionProvenance(questions[0]), "OFFICIAL_ARCHIVE"); assert.equal(questions[0].rawSourceText, questions[0].questionText); });
test("35 a single archived question cannot become a recurring pattern", () => assert.deepEqual(recurringOfficialCategories(getSourceBackedWorkspaceQuestions("jin_air")), []));
