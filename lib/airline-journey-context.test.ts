import assert from "node:assert/strict";
import test from "node:test";
import {
  airlineJourneyContextFromQuestion,
  airlineJourneyDraftId,
  applicationPromptFromJourneyContext,
  genericAirlineJourneyContext,
  journeyContextForExperience,
  journeyContextWithAttempt,
  journeyContextWithExperience,
  journeyDraftMatches,
  mergeJourneyExperienceIds,
} from "./airline-journey-context";
import { getWorkDraft, linkExperienceToWorkDraft, saveWorkDraft } from "./application-answer-repository";
import type { WorkspaceQuestion } from "./airline-targeting-workspace";

const question = (overrides: Record<string, unknown> = {}) => ({ id: "ke-q1", airlineId: "korean_air", kind: "APPLICATION", questionText: "지원 동기를 작성하세요", position: "객실승무원", category: "MOTIVATION", sourceType: "OFFICIAL_POSTING", provenance: "OFFICIAL_ARCHIVE", recruitmentPeriod: "2025 상반기", year: 2025, archived: true, verified: true, createdAt: "2025-01-01T00:00:00.000Z", ...overrides }) as WorkspaceQuestion;
const memoryStorage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key) }; };
const context = () => airlineJourneyContextFromQuestion(question());

test("application receives airline id", () => assert.equal(context().airlineId, "korean_air"));
test("application receives question id", () => assert.equal(context().questionId, "ke-q1"));
test("question text is preserved without text matching", () => assert.equal(context().questionText, "지원 동기를 작성하세요"));
test("source type is preserved", () => assert.equal(context().sourceType, "OFFICIAL_POSTING"));
test("provenance is preserved", () => assert.equal(context().provenance, "OFFICIAL_ARCHIVE"));
test("recruitment period is preserved", () => assert.equal(context().recruitmentPeriod, "2025 상반기"));
test("recruitment year is preserved", () => assert.equal(context().recruitmentYear, 2025));
test("application return tab is preserved", () => assert.equal(context().returnTab, "application"));
test("origin starts at airline workspace", () => assert.equal(context().origin, "airline_workspace"));
test("question list origin may return to questions", () => assert.equal(airlineJourneyContextFromQuestion(question(), "airline_workspace", "questions").returnTab, "questions"));
test("generic application flow has no question", () => assert.equal(genericAirlineJourneyContext("jin_air", "application").questionId, undefined));
test("generic flow does not fabricate a prompt", () => assert.equal(applicationPromptFromJourneyContext(genericAirlineJourneyContext("jin_air")), undefined));
test("archive prompt remains linked to archive provenance", () => assert.equal(applicationPromptFromJourneyContext(context())?.journeyContext?.provenance, "OFFICIAL_ARCHIVE"));
test("user reported prompt is not promoted to official", () => assert.equal(applicationPromptFromJourneyContext(airlineJourneyContextFromQuestion(question({ provenance: "USER_REPORTED", sourceType: "USER_ENTERED", archived: false })))?.sourceType, "custom_user_input"));
test("verified secondary remains explicit", () => assert.equal(applicationPromptFromJourneyContext(airlineJourneyContextFromQuestion(question({ provenance: "VERIFIED_SECONDARY", sourceType: "UNKNOWN" })))?.sourceType, "published_airline_question"));
test("unverified community is not promoted", () => assert.equal(applicationPromptFromJourneyContext(airlineJourneyContextFromQuestion(question({ provenance: "UNVERIFIED_COMMUNITY", sourceType: "USER_ENTERED" })))?.status, "custom"));
test("experience entry retains question identity", () => assert.equal(journeyContextForExperience(context()).questionId, "ke-q1"));
test("experience entry records application origin", () => assert.equal(journeyContextForExperience(context()).origin, "application"));
test("experience return retains exact airline", () => assert.equal(journeyContextWithExperience(context(), "exp-1").airlineId, "korean_air"));
test("experience return retains exact question", () => assert.equal(journeyContextWithExperience(context(), "exp-1").questionId, "ke-q1"));
test("experience return stores selected experience", () => assert.equal(journeyContextWithExperience(context(), "exp-1").experienceId, "exp-1"));
test("duplicate experience is blocked", () => assert.deepEqual(mergeJourneyExperienceIds(["exp-1"], "exp-1"), ["exp-1"]));
test("new experience is appended", () => assert.deepEqual(mergeJourneyExperienceIds(["exp-1"], "exp-2"), ["exp-1", "exp-2"]));
test("multi-airline draft ids are isolated", () => assert.notEqual(airlineJourneyDraftId(context()), airlineJourneyDraftId({ airlineId: "jal", questionId: "ke-q1" })));
test("same-text different question ids are isolated", () => assert.notEqual(airlineJourneyDraftId(context()), airlineJourneyDraftId({ airlineId: "korean_air", questionId: "ke-q2" })));
test("retake preserves prior attempt id", () => assert.equal(journeyContextWithAttempt(context(), "attempt-1").previousAttemptId, "attempt-1"));
test("self intro context keeps question provenance", () => assert.equal(airlineJourneyContextFromQuestion(question(), "self_intro").provenance, "OFFICIAL_ARCHIVE"));
test("mock context keeps recruitment period", () => assert.equal(airlineJourneyContextFromQuestion(question(), "mock").recruitmentPeriod, "2025 상반기"));
test("single interview context keeps question id", () => assert.equal(airlineJourneyContextFromQuestion(question(), "single_interview").questionId, "ke-q1"));
test("fresh generic context contains no score", () => assert.doesNotMatch(JSON.stringify(genericAirlineJourneyContext("korean_air")), /readiness|hireProbability|passProbability|overallScore/i));
test("work draft matching requires airline and question", () => { const c = context(); const draft = { id: airlineJourneyDraftId(c), airlineId: c.airlineId, selectedExperienceIds: [], coachingAnswers: {}, structure: [], coreMessage: "", journeyContext: c, updatedAt: "" }; assert.equal(journeyDraftMatches(draft, c), true); assert.equal(journeyDraftMatches(draft, { ...c, airlineId: "jal" }), false); });
test("application resume persists full lineage", () => { Object.assign(globalThis, { localStorage: memoryStorage(), window: { dispatchEvent: () => true } }); const c = context(); saveWorkDraft({ id: airlineJourneyDraftId(c), airlineId: c.airlineId, prompt: applicationPromptFromJourneyContext(c), documentType: "application_question", selectedExperienceIds: [], coachingAnswers: {}, structure: [], coreMessage: "", journeyContext: c, updatedAt: "" }); assert.equal(getWorkDraft(airlineJourneyDraftId(c))?.journeyContext?.recruitmentPeriod, "2025 상반기"); });
test("experience selection persists once and keeps lineage", () => { Object.assign(globalThis, { localStorage: memoryStorage(), window: { dispatchEvent: () => true } }); const c = context(); saveWorkDraft({ id: airlineJourneyDraftId(c), airlineId: c.airlineId, prompt: applicationPromptFromJourneyContext(c), documentType: "application_question", selectedExperienceIds: [], coachingAnswers: {}, structure: [], coreMessage: "", journeyContext: c, updatedAt: "" }); assert.equal(linkExperienceToWorkDraft(c, "exp-1").ok, true); assert.equal(linkExperienceToWorkDraft(c, "exp-1").ok, true); assert.deepEqual(getWorkDraft(airlineJourneyDraftId(c))?.selectedExperienceIds, ["exp-1"]); assert.equal(getWorkDraft(airlineJourneyDraftId(c))?.journeyContext?.questionId, "ke-q1"); });
test("missing journey draft fails without fabricated save", () => { Object.assign(globalThis, { localStorage: memoryStorage(), window: { dispatchEvent: () => true } }); assert.equal(linkExperienceToWorkDraft(context(), "exp-1").ok, false); });
test("storage failure does not claim linkage", () => { Object.assign(globalThis, { localStorage: { getItem: () => null, setItem: () => { throw new Error("quota"); } }, window: { dispatchEvent: () => true } }); const c = context(); assert.equal(saveWorkDraft({ id: airlineJourneyDraftId(c), airlineId: c.airlineId, selectedExperienceIds: [], coachingAnswers: {}, structure: [], coreMessage: "", journeyContext: c, updatedAt: "" }).ok, false); });
