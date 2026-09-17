import assert from "node:assert/strict";
import test from "node:test";
import {
  airlineTargetingRepository,
  buildAirlineWorkspaceProfiles,
  buildPracticeLineage,
  buildPreparationStatus,
  calculateQuestionPatterns,
  classifyAirlineQuestion,
  compareAirlines,
  countryGroupFor,
  deriveOperationScope,
  filterAirlines,
  filterQuestions,
  freshnessFor,
  isAirlineEligibleForAi,
  normalizeTargetPreferences,
  patternConfidence,
  type AirlineFleetEntry,
  type AirlineRoute,
  type AirlineWorkspaceProfile,
  type WorkspaceQuestion,
} from "./airline-targeting-workspace";

const fact = { type: "career_page", value: "Official careers", sourceUrl: "https://example.com/careers", sourceTitle: "Official", sourceAuthority: "AIRLINE_OFFICIAL" as const, verifiedAt: new Date().toISOString(), status: "VERIFIED" as const };
const route = (scope: "DOMESTIC" | "INTERNATIONAL", airlineId = "a"): AirlineRoute => ({ id: `${airlineId}-${scope}`, airlineId, originAirport: "AAA", destinationAirport: "BBB", originCountry: scope === "DOMESTIC" ? "KR" : "KR", destinationCountry: scope === "DOMESTIC" ? "KR" : "JP", routeScope: scope, status: "CONFIRMED", source: fact, lastVerifiedAt: fact.verifiedAt });
const profile = (id: string, countryCode: string, operationScope: AirlineWorkspaceProfile["operationScope"], overrides: Partial<AirlineWorkspaceProfile> = {}): AirlineWorkspaceProfile => ({ id, slug: id, nameKo: id, nameEn: `${id} airline`, countryCode, countryNameKo: countryCode, countryNameEn: countryCode, region: countryCode === "AE" ? "middle_east" : countryCode === "US" ? "north_america" : "asia_pacific", operationScope, carrierType: "FULL_SERVICE", hubs: [], verified: false, published: false, aiContextEnabled: false, sources: [], ...overrides });
const question = (id: string, kind: "APPLICATION" | "INTERVIEW", text = "지원 동기는 무엇인가요?", airlineId = "a"): WorkspaceQuestion => { const base = { id, airlineId, questionText: text, position: "객실승무원", category: classifyAirlineQuestion(text), verified: false, createdAt: "2026-01-01T00:00:00.000Z" }; return kind === "APPLICATION" ? { ...base, kind, sourceType: "USER_ENTERED" } : { ...base, kind, sourceType: "USER_REPORTED" }; };

test("country filter: Korea", () => assert.deepEqual(filterAirlines([profile("kr", "KR", null), profile("jp", "JP", null)], { countryGroup: "KOREA" }).map((item) => item.id), ["kr"]));
test("country filter: Japan", () => assert.equal(countryGroupFor(profile("jp", "JP", null)), "JAPAN"));
test("country filter: China group includes HK", () => assert.equal(countryGroupFor(profile("hk", "HK", null)), "CHINA"));
test("country filter: Southeast Asia", () => assert.equal(countryGroupFor(profile("sg", "SG", null)), "SOUTHEAST_ASIA"));
test("country filter: Middle East", () => assert.equal(countryGroupFor(profile("ae", "AE", null)), "MIDDLE_EAST"));
test("country filter: North America", () => assert.equal(countryGroupFor(profile("us", "US", null)), "NORTH_AMERICA"));
test("domestic filter", () => assert.deepEqual(filterAirlines([profile("d", "KR", "DOMESTIC"), profile("i", "KR", "INTERNATIONAL")], { operationScope: "DOMESTIC" }).map((item) => item.id), ["d"]));
test("international filter", () => assert.deepEqual(filterAirlines([profile("d", "KR", "DOMESTIC"), profile("i", "KR", "INTERNATIONAL")], { operationScope: "INTERNATIONAL" }).map((item) => item.id), ["i"]));
test("BOTH airline appears in domestic filter", () => assert.equal(filterAirlines([profile("b", "KR", "BOTH")], { operationScope: "DOMESTIC" }).length, 1));
test("BOTH airline appears in international filter", () => assert.equal(filterAirlines([profile("b", "KR", "BOTH")], { operationScope: "INTERNATIONAL" }).length, 1));
test("unknown operation scope is not guessed", () => assert.equal(filterAirlines([profile("u", "KR", null)], { operationScope: "DOMESTIC" }).length, 0));
test("airline search matches English", () => assert.equal(filterAirlines([profile("korean", "KR", null, { nameEn: "Korean Air" })], { search: "korean" }).length, 1));
test("airline search matches IATA", () => assert.equal(filterAirlines([profile("korean", "KR", null, { iataCode: "KE" })], { search: "ke" }).length, 1));
test("primary airline removes duplicate interest", () => assert.deepEqual(normalizeTargetPreferences(null, [{ id: "a", name: "A" }], { id: "a", name: "A" }, "primary"), { primary: { id: "a", name: "A" }, interests: [] }));
test("interest airline toggles on", () => assert.equal(normalizeTargetPreferences(null, [], { id: "a", name: "A" }, "interest").interests.length, 1));
test("interest airline toggles off", () => assert.equal(normalizeTargetPreferences(null, [{ id: "a", name: "A" }], { id: "a", name: "A" }, "interest").interests.length, 0));
test("primary airline cannot also be interest", () => assert.equal(normalizeTargetPreferences({ id: "a", name: "A" }, [], { id: "a", name: "A" }, "interest").interests.length, 0));
test("question classifier: motivation", () => assert.equal(classifyAirlineQuestion("지원 동기는 무엇인가요?"), "MOTIVATION"));
test("question classifier: safety", () => assert.equal(classifyAirlineQuestion("비상 상황에서 안전 절차를 설명하세요"), "SAFETY"));
test("question classifier: complaint precedes service", () => assert.equal(classifyAirlineQuestion("화난 고객의 불만을 해결한 경험"), "CUSTOMER_COMPLAINT"));
test("question classifier: teamwork", () => assert.equal(classifyAirlineQuestion("팀워크를 발휘한 사례"), "TEAMWORK"));
test("question classifier: self introduction", () => assert.equal(classifyAirlineQuestion("자기소개를 해주세요"), "SELF_INTRODUCTION"));
test("question classifier: other", () => assert.equal(classifyAirlineQuestion("좋아하는 색은?"), "OTHER"));
test("pattern insufficient sample", () => assert.equal(patternConfidence(2), "INSUFFICIENT"));
test("pattern limited sample", () => assert.equal(patternConfidence(3), "LIMITED"));
test("pattern observed threshold", () => assert.equal(patternConfidence(6), "OBSERVED_PATTERN"));
test("patterns use stored questions only", () => assert.deepEqual(calculateQuestionPatterns([question("1", "APPLICATION"), question("2", "INTERVIEW")]), [{ category: "MOTIVATION", count: 2, confidence: "INSUFFICIENT" }]));
test("year filter", () => { const item = { ...question("1", "APPLICATION"), year: 2026 }; assert.equal(filterQuestions([item], { year: 2025 }).length, 0); assert.equal(filterQuestions([item], { year: 2026 }).length, 1); });
test("application and interview questions stay separate", () => { const items = [question("a", "APPLICATION"), question("i", "INTERVIEW")]; assert.deepEqual(filterQuestions(items, { kind: "INTERVIEW" }).map((item) => item.id), ["i"]); });
test("source type filter", () => assert.equal(filterQuestions([question("a", "APPLICATION")], { sourceType: "USER_REPORTED" }).length, 0));
test("question search", () => assert.equal(filterQuestions([question("a", "APPLICATION", "Cabin crew motivation")], { search: "motivation" }).length, 1));
test("route domestic", () => assert.equal(route("DOMESTIC").routeScope, "DOMESTIC"));
test("route international", () => assert.equal(route("INTERNATIONAL").routeScope, "INTERNATIONAL"));
test("operation scope derives BOTH", () => assert.equal(deriveOperationScope([route("DOMESTIC"), route("INTERNATIONAL")]), "BOTH"));
test("operation scope stays unknown without evidence", () => assert.equal(deriveOperationScope([]), null));
test("route freshness current", () => assert.equal(freshnessFor(new Date().toISOString()), "CURRENT"));
test("route freshness stale", () => assert.equal(freshnessFor("2020-01-01T00:00:00.000Z"), "STALE"));
test("invalid freshness unknown", () => assert.equal(freshnessFor("invalid"), "UNKNOWN"));
test("fleet quantity can remain unknown", () => { const fleet: AirlineFleetEntry = { id: "f", airlineId: "a", manufacturer: "Boeing", aircraftFamily: "787", aircraftModel: "787-9", quantity: null, source: fact, lastVerifiedAt: fact.verifiedAt }; assert.equal(fleet.quantity, null); });
test("canonical AI context rejects unverified profile", () => assert.equal(isAirlineEligibleForAi(profile("a", "KR", null, { published: true, aiContextEnabled: true, sources: [fact] })), false));
test("canonical AI context rejects source-less profile", () => assert.equal(isAirlineEligibleForAi(profile("a", "KR", null, { verified: true, published: true, aiContextEnabled: true })), false));
test("practice lineage preserves airline and workspace question", () => assert.deepEqual(buildPracticeLineage("a", question("q", "INTERVIEW")), { source: "airline_workspace", airlineId: "a", workspaceQuestionId: "q", questionKind: "INTERVIEW" }));
test("fresh user preparation is honest zero state", () => assert.deepEqual(buildPreparationStatus({ airlineId: "a", questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 }));
test("only completed targeted attempts count", () => { const base = { id: "x", questionId: "im2", category: "introduction_and_motivation" as const, createdAt: "2026-01-01", transcript: "", durationSeconds: 1, analysis: {} as never, targetAirlineId: "a", attemptNumber: 1, completed: true }; const result = buildPreparationStatus({ airlineId: "a", questions: [], answers: [], attempts: [base, { ...base, id: "y", completed: false }, { ...base, id: "z", targetAirlineId: "b" }], experiences: [] }); assert.equal(result.practicedInterviewCount, 1); });
test("experience linkage is deduplicated", () => { const experience = { id: "e" } as never; const answer = { id: "a", airlineId: "x", selectedExperienceIds: ["e", "e"] } as never; assert.equal(buildPreparationStatus({ airlineId: "x", questions: [], answers: [answer], attempts: [], experiences: [experience] }).linkedExperienceCount, 1); });
test("comparison is capped at three", () => assert.equal(compareAirlines([profile("1", "KR", null), profile("2", "JP", null), profile("3", "US", null), profile("4", "AE", null)], ["1", "2", "3", "4"], { questions: [], answers: [], attempts: [], experiences: [] }).length, 3));
test("master profiles do not invent operation scope beyond explicit official overrides", () => {
  const explicitOfficialScopes = new Set(["jeju_air", "jin_air", "air_busan", "air_seoul", "eastar_jet"]);
  assert.ok(buildAirlineWorkspaceProfiles().every((item) => item.operationScope === null || explicitOfficialScopes.has(item.id)));
});
test("user application question is unverified and labelled", () => { const storage = new Map<string, string>(); Object.assign(globalThis, { window: { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => void storage.set(key, value) }, dispatchEvent: () => true }, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => void storage.set(key, value) } }); const result = airlineTargetingRepository.addUserQuestion({ kind: "APPLICATION", airlineId: "a", questionText: "지원 동기" }); assert.equal(result.ok, true); if (result.ok) { assert.equal(result.question.sourceType, "USER_ENTERED"); assert.equal(result.question.verified, false); } });
test("user interview question is never verified", () => { const result = airlineTargetingRepository.addUserQuestion({ kind: "INTERVIEW", airlineId: "a", questionText: "안전 경험" }); assert.equal(result.ok, true); if (result.ok) { assert.equal(result.question.sourceType, "USER_REPORTED"); assert.equal(result.question.verified, false); } });
test("local save failure remains honest", () => { Object.assign(globalThis, { window: { localStorage: { getItem: () => null, setItem: () => { throw new Error("quota"); } }, dispatchEvent: () => true }, localStorage: { getItem: () => null, setItem: () => { throw new Error("quota"); } } }); const result = airlineTargetingRepository.addUserQuestion({ kind: "APPLICATION", airlineId: "a", questionText: "지원 동기" }); assert.equal(result.ok, false); });
test("workspace model contains no hiring score", () => { const value = JSON.stringify(buildPreparationStatus({ airlineId: "a", questions: [], answers: [], attempts: [], experiences: [] })); assert.doesNotMatch(value, /hire|passProbability|readinessScore|overallScore/i); });
