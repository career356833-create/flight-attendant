import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidenceQuestionPool,
  calculateCommunityPatterns,
  canPracticeCommunityQuestion,
  communityQuestionDedupeText,
  createUserReportedQuestion,
  isCommunityQuestionDuplicate,
  isCommunityQuestionVisible,
  patternConfidence,
  sanitizeCommunityQuestionText,
  toPublicCommunityQuestion,
  validateCommunityQuestionText,
  validateVerifiedSecondaryQuestion,
  type CommunityQuestionEvidence,
} from "./airline-question-community-evidence";
import { buildPracticeLineage, getSourceBackedWorkspaceQuestions, type WorkspaceQuestion } from "./airline-targeting-workspace";

const now = "2026-09-20T00:00:00.000Z";
const evidence = (id: string, overrides: Partial<CommunityQuestionEvidence> = {}): CommunityQuestionEvidence => ({
  id, airlineId: "air", kind: "INTERVIEW", questionText: "안전 절차를 설명해 주세요", locale: "ko", position: "객실승무원", category: "SAFETY", provenance: "USER_REPORTED", moderationStatus: "ACCEPTED", reporterOwned: true, reporterKey: `reporter-${id}`, selfAttested: true, verified: false, archived: false, year: 2026, recruitmentPeriod: "2026 상반기", createdAt: now, ...overrides,
});
const create = (overrides: Partial<Parameters<typeof createUserReportedQuestion>[0]> = {}, existing: CommunityQuestionEvidence[] = []) => createUserReportedQuestion({ id: "new", airlineId: "air", kind: "INTERVIEW", questionText: "승객의 안전 불안을 어떻게 해결했나요?", locale: "ko", reporterKey: "local-owner", selfAttested: true, createdAt: now, ...overrides }, existing);

test("01 accepted provenance taxonomy stays user reported", () => assert.equal(create().question?.provenance, "USER_REPORTED"));
test("02 new report starts pending", () => assert.equal(create().question?.moderationStatus, "PENDING"));
test("03 new report is owner-local", () => assert.equal(create().question?.reporterOwned, true));
test("04 new report cannot claim verification", () => assert.equal(create().question?.verified, false));
test("05 attestation is required", () => assert.equal(create({ selfAttested: false }).code, "ATTESTATION_REQUIRED"));
test("06 empty input is rejected", () => assert.equal(create({ questionText: "   " }).code, "EMPTY"));
test("07 overlong input is rejected", () => assert.equal(create({ questionText: "가".repeat(501) }).code, "TOO_LONG"));
test("08 URL spam is rejected", () => assert.equal(create({ questionText: "https://spam.example 질문" }).code, "URL_SPAM"));
test("09 email PII is rejected", () => assert.equal(create({ questionText: "제 이메일 me@example.com 으로 연락" }).code, "PII_DETECTED"));
test("10 phone PII is rejected", () => assert.equal(create({ questionText: "010-1234-5678로 연락" }).code, "PII_DETECTED"));
test("11 resident number PII is rejected", () => assert.equal(create({ questionText: "900101-1234567 확인" }).code, "PII_DETECTED"));
test("12 passport-like PII is rejected", () => assert.equal(create({ questionText: "M12345678 확인" }).code, "PII_DETECTED"));
test("13 XSS tags are stripped", () => assert.equal(sanitizeCommunityQuestionText("<script>alert(1)</script> 안전 질문"), "alert(1) 안전 질문"));
test("14 unicode and punctuation dedupe", () => assert.equal(communityQuestionDedupeText("지원 동기？"), communityQuestionDedupeText("지원  동기?")));
test("15 exact normalized duplicate is detected", () => assert.equal(isCommunityQuestionDuplicate({ airlineId: "air", kind: "INTERVIEW", questionText: "안전 절차를 설명해 주세요!", year: 2026, recruitmentPeriod: "2026 상반기" }, [evidence("a")]), true));
test("16 different airline is not duplicate", () => assert.equal(isCommunityQuestionDuplicate({ airlineId: "other", kind: "INTERVIEW", questionText: evidence("a").questionText }, [evidence("a")]), false));
test("17 different kind is not duplicate", () => assert.equal(isCommunityQuestionDuplicate({ airlineId: "air", kind: "APPLICATION", questionText: evidence("a").questionText }, [evidence("a")]), false));
test("18 duplicate creation fails closed", () => assert.equal(create({ questionText: evidence("a").questionText, year: 2026, recruitmentPeriod: "2026 상반기" }, [evidence("a")]).code, "DUPLICATE"));
test("19 public projection strips reporter key", () => assert.equal("reporterKey" in toPublicCommunityQuestion(evidence("a")), false));
test("20 public projection strips owner marker", () => assert.equal("reporterOwned" in toPublicCommunityQuestion(evidence("a")), false));
test("21 owner sees pending local report", () => assert.equal(isCommunityQuestionVisible(evidence("a", { moderationStatus: "PENDING" }), "OWNER"), true));
test("22 public cannot see accepted report without backend", () => assert.equal(isCommunityQuestionVisible(evidence("a"), "PUBLIC"), false));
test("23 public can see accepted only with sharing backend", () => assert.equal(isCommunityQuestionVisible(evidence("a"), "PUBLIC", true), true));
test("24 pending report cannot be practiced", () => assert.equal(canPracticeCommunityQuestion(evidence("a", { moderationStatus: "PENDING" })), false));
test("25 accepted report can be practiced", () => assert.equal(canPracticeCommunityQuestion(evidence("a")), true));
test("26 official question can be practiced", () => assert.equal(canPracticeCommunityQuestion(evidence("a", { provenance: "OFFICIAL_CURRENT", moderationStatus: undefined })), true));
test("27 verified secondary can be practiced", () => assert.equal(canPracticeCommunityQuestion(evidence("a", { provenance: "VERIFIED_SECONDARY", moderationStatus: undefined })), true));
test("28 one or two samples are insufficient", () => assert.equal(patternConfidence(2, 2), "INSUFFICIENT"));
test("29 three samples from two reporters are limited", () => assert.equal(patternConfidence(3, 2), "LIMITED"));
test("30 six samples from three reporters are observed", () => assert.equal(patternConfidence(6, 3), "OBSERVED_PATTERN"));
test("31 one reporter cannot inflate observed pattern", () => assert.equal(patternConfidence(9, 1), "INSUFFICIENT"));
test("32 pending reports do not enter user patterns", () => assert.equal(calculateCommunityPatterns([evidence("a", { moderationStatus: "PENDING" })], "USER_REPORTED").length, 0));
test("33 reporter diversity is counted", () => { const rows = [0, 1, 2].map((index) => evidence(String(index), { reporterKey: index < 2 ? "same" : "other" })); assert.equal(calculateCommunityPatterns(rows, "USER_REPORTED")[0].uniqueReporterCount, 2); });
test("34 repeated theme needs multiple periods and reporters", () => { const rows = [evidence("a", { recruitmentPeriod: "2025", reporterKey: "one" }), evidence("b", { recruitmentPeriod: "2026", reporterKey: "two" }), evidence("c", { recruitmentPeriod: "2026", reporterKey: "two" })]; assert.equal(calculateCommunityPatterns(rows, "USER_REPORTED")[0].repeatedTheme, true); });
test("35 official duplicate has display priority", () => { const pool = buildEvidenceQuestionPool([evidence("user"), evidence("official", { provenance: "OFFICIAL_CURRENT", moderationStatus: undefined })]); assert.equal(pool[0].question.id, "official"); assert.equal(pool[0].supportCount, 1); });
test("36 official priority preserves supporting report", () => assert.equal(buildEvidenceQuestionPool([evidence("user"), evidence("official", { provenance: "OFFICIAL_CURRENT" })])[0].supportingOccurrences[0].id, "user"));
test("37 valid secondary metadata passes", () => assert.deepEqual(validateVerifiedSecondaryQuestion(evidence("s", { provenance: "VERIFIED_SECONDARY", sourceUrl: "https://publisher.example/story", sourceTitle: "Interview report", publisher: "Publisher", verifiedAt: now })), { valid: true }));
test("38 secondary source requires https URL", () => assert.equal(validateVerifiedSecondaryQuestion(evidence("s", { provenance: "VERIFIED_SECONDARY", sourceUrl: "http://publisher.example", sourceTitle: "Report", publisher: "Publisher", verifiedAt: now })).code, "SOURCE_URL_REQUIRED"));
test("39 secondary source requires title", () => assert.equal(validateVerifiedSecondaryQuestion(evidence("s", { provenance: "VERIFIED_SECONDARY", sourceUrl: "https://publisher.example", publisher: "Publisher", verifiedAt: now })).code, "SOURCE_TITLE_REQUIRED"));
test("40 secondary source requires publisher", () => assert.equal(validateVerifiedSecondaryQuestion(evidence("s", { provenance: "VERIFIED_SECONDARY", sourceUrl: "https://publisher.example", sourceTitle: "Report", verifiedAt: now })).code, "PUBLISHER_REQUIRED"));
test("41 secondary source requires verifiedAt", () => assert.equal(validateVerifiedSecondaryQuestion(evidence("s", { provenance: "VERIFIED_SECONDARY", sourceUrl: "https://publisher.example", sourceTitle: "Report", publisher: "Publisher", verifiedAt: undefined })).code, "VERIFIED_AT_REQUIRED"));
test("42 secondary invalid publishedAt is rejected", () => assert.equal(validateVerifiedSecondaryQuestion(evidence("s", { provenance: "VERIFIED_SECONDARY", sourceUrl: "https://publisher.example", sourceTitle: "Report", publisher: "Publisher", verifiedAt: now, publishedAt: "bad" })).code, "INVALID_PUBLISHED_AT"));
test("43 sanitized safe question remains valid", () => assert.deepEqual(validateCommunityQuestionText("  승객 응대 경험은? "), { valid: true, questionText: "승객 응대 경험은?" }));
test("44 context fields are retained", () => { const result = create({ locale: "en", year: 2025, recruitmentPeriod: "하반기", position: "Cabin Crew", interviewStage: "VIDEO" }); assert.equal(result.ok && result.question.interviewStage, "VIDEO"); assert.equal(result.ok && result.question.locale, "en"); });
test("45 same question in a different year remains separate evidence", () => assert.equal(isCommunityQuestionDuplicate({ airlineId: "air", kind: "INTERVIEW", questionText: evidence("a").questionText, year: 2025, recruitmentPeriod: "2025 상반기" }, [evidence("a")]), false));
test("46 same question at a different interview stage remains separate evidence", () => assert.equal(isCommunityQuestionDuplicate({ airlineId: "air", kind: "INTERVIEW", questionText: evidence("a").questionText, year: 2026, recruitmentPeriod: "2026 상반기", interviewStage: "VIDEO" }, [evidence("a", { interviewStage: "FINAL_INTERVIEW" })]), false));
test("47 official evidence never enters user pattern", () => assert.equal(calculateCommunityPatterns([evidence("o", { provenance: "OFFICIAL_ARCHIVE" })], "USER_REPORTED").length, 0));
test("48 secondary evidence never enters official or user pattern", () => assert.equal(calculateCommunityPatterns([evidence("s", { provenance: "VERIFIED_SECONDARY" })], "USER_REPORTED").length, 0));
test("49 unverified community stays least-priority evidence", () => assert.equal(buildEvidenceQuestionPool([evidence("u", { provenance: "UNVERIFIED_COMMUNITY" }), evidence("s", { provenance: "VERIFIED_SECONDARY" })])[0].question.id, "s"));
test("50 promotion link preserves the original user report", () => { const user = evidence("u", { linkedOfficialQuestionId: "official" }); const pool = buildEvidenceQuestionPool([user, evidence("official", { provenance: "OFFICIAL_CURRENT" })]); assert.equal(pool[0].supportingOccurrences[0].linkedOfficialQuestionId, "official"); });
test("51 creating a report has no answer or completion payload", () => { const result = create(); assert.equal(result.ok, true); assert.equal(result.ok && "answer" in result.question, false); assert.equal(result.ok && "completed" in result.question, false); });
test("52 accepted report practice lineage preserves user provenance", () => { const question = evidence("u") as WorkspaceQuestion; assert.equal(buildPracticeLineage("air", question).questionProvenance, "USER_REPORTED"); });
test("53 Jin Air archived official question stays outside community provenance", () => { const questions = getSourceBackedWorkspaceQuestions("jin_air"); assert.equal(questions.length, 1); assert.equal(questions[0].provenance, "OFFICIAL_ARCHIVE"); });
