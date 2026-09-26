import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applicationCurrentVersion,
  applicationEvidenceMode,
  applicationRewriteEvidence,
  applicationVersionsFor,
  buildApplicationTrainingLoopModel,
  buildMockTrainingLoopModel,
  buildSelfIntroTrainingLoopModel,
  buildTrainingLoopModel,
  isApplicationAnswerSaved,
  previousApplicationVersionsFor,
  MAX_TRAINING_HISTORY,
  MAX_TRAINING_IMPROVEMENTS,
  MAX_TRAINING_STRENGTHS,
  type ApplicationTrainingLoopInput,
} from "@/lib/training-loop";
import { applicationAnswerProgress } from "@/lib/application-progress-display";
import { buildAirlineJourneyState } from "@/lib/airline-target-journey";
import type { ApplicationAnswer, ApplicationAnswerAnalysis, ApplicationAnswerVersion, ApplicationEvaluation } from "@/lib/application-answer-repository";
import type { AirlineJourneyContext } from "@/lib/airline-journey-context";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import type { AnswerQualityFinding } from "@/lib/answer-quality-rubric";

/* ------------------------------ fixtures ------------------------------ */

const evaluation = (key: string, label: string, status: ApplicationEvaluation["status"], score: number): ApplicationEvaluation =>
  ({ key, label, status, score, feedback: `${label} 피드백`, suggestion: `${label} 제안` });

const finding = (dimension: AnswerQualityFinding["dimension"], status: AnswerQualityFinding["status"]): AnswerQualityFinding =>
  ({ dimension, status, evidence: [], feedback: `${dimension} 누락`, confidence: "medium" });

const analysis = (over: Partial<ApplicationAnswerAnalysis> = {}): ApplicationAnswerAnalysis => ({
  overallCompleteness: 70,
  strongestPoint: "문항 적합성",
  firstImprovement: "경험 구체성",
  evaluations: [
    evaluation("question_fit", "문항 적합성", "strong", 82),
    evaluation("specificity", "경험 구체성", "needs_improvement", 48),
    evaluation("limit", "글자 수 준수", "adequate", 70),
  ],
  airlineContextLimited: false,
  analyzedAt: "2026-09-26T00:00:00.000Z",
  ...over,
});

const version = (over: Partial<ApplicationAnswerVersion> = {}): ApplicationAnswerVersion => ({
  id: "v1",
  answerId: "answer-1",
  version: 1,
  content: "호텔 프런트에서 외국인 투숙객을 응대했습니다. 안전과 배려를 함께 지켰습니다.",
  characterCount: 42,
  analysis: analysis(),
  experienceIds: ["exp-1"],
  changeReason: "initial",
  createdAt: "2026-09-26T00:00:00.000Z",
  ...over,
});

const journey = (over: Partial<AirlineJourneyContext> = {}): AirlineJourneyContext => ({
  airlineId: "jin_air",
  origin: "airline_workspace",
  returnTab: "application",
  ...over,
});

const answer = (over: Partial<ApplicationAnswer> = {}): ApplicationAnswer => ({
  id: "answer-1",
  promptId: "prompt-motivation",
  documentType: "application_question",
  title: "지원동기를 작성해 주세요.",
  status: "reviewed",
  selectedExperienceIds: ["exp-1"],
  experienceSnapshots: [
    { id: "exp-1", title: "호텔 프런트 응대", category: "customer_service", situation: "", task: "", action: "", result: "", learning: "", roleConnection: "", shortSummary: "외국인 투숙객 응대", competencyTags: [] },
  ] as unknown as ApplicationAnswer["experienceSnapshots"],
  currentVersionId: "v1",
  versionIds: ["v1"],
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
  ...over,
});

const attempt = (over: Partial<InterviewAttempt> = {}): InterviewAttempt =>
  ({ id: "a1", questionId: "im2", category: "introduction_and_motivation", createdAt: "2026-09-26T01:00:00.000Z", transcript: "답변", transcriptIntegrity: { mode: "actual_audio", isActualTranscription: true }, durationSeconds: 60, analysis: {}, attemptNumber: 1, completed: true, ...over }) as unknown as InterviewAttempt;

const selfIntro = (over: Partial<SelfIntroductionAttempt> = {}): SelfIntroductionAttempt =>
  ({ id: "s1", createdAt: "2026-09-26T01:00:00.000Z", transcript: "", durationSeconds: 60, analysis: {}, attemptNumber: 1, completed: true, targetSeconds: 60, practiceLanguage: "ko", ...over }) as unknown as SelfIntroductionAttempt;

const session = (over: Partial<InterviewSession> = {}): InterviewSession =>
  ({ id: "m1", mode: "general", questionIds: ["im1", "be1"], attemptIds: ["a1"], currentQuestionIndex: 1, status: "completed", startedAt: "2026-09-26T00:00:00.000Z", completedAt: "2026-09-26T01:00:00.000Z", sessionAnalysis: { overallSummary: "", strengths: [], improvements: [], competencySummary: [], speechSummary: "", audioSummary: "", contentSummary: "", nextPractice: [] }, ...over }) as unknown as InterviewSession;

/** A fully satisfied ladder, so a test that is not about "next" never trips an earlier rule. */
const laddered = (over: Partial<ApplicationTrainingLoopInput> = {}): ApplicationTrainingLoopInput => ({
  attempts: [attempt()],
  selfIntroductions: [selfIntro()],
  sessions: [session()],
  ...over,
});

const build = (over: Partial<ApplicationTrainingLoopInput> = {}) =>
  buildApplicationTrainingLoopModel({ answer: answer(), versions: [version()], ...laddered(), ...over });

/* ------------------------------ 1-5 result and completion ------------------------------ */

test("1. a saved application answer produces the shared loop result", () => {
  const model = build({ dailyFallback: { kind: "experience_library" } });
  assert.equal(model.context.trainingType, "application_answer");
  assert.equal(model.completed, true);
  assert.equal(model.evidenceMode, "text_analysis");
  assert.equal(model.retakeAction?.label, "같은 답변 다시 다듬기");
  assert.equal(model.nextAction?.kind, "next");
  assert.equal(model.summary.completedLabel, "완료");
  assert.ok(model.strengths.length > 0);
  assert.ok(model.improvementPoints.length > 0);
});

test("2. an unsaved draft is never complete", () => {
  const noAnswer = buildApplicationTrainingLoopModel({ answer: null, versions: [], ...laddered() });
  assert.equal(noAnswer.completed, false);
  assert.equal(noAnswer.retakeAction, undefined);
  assert.equal(noAnswer.nextAction, undefined);
  assert.equal(noAnswer.history.length, 0);
  assert.equal(noAnswer.summary.completedLabel, "미완료");
  // an answer row whose version the repository does not hold is not practice done either
  const missingVersion = buildApplicationTrainingLoopModel({ answer: answer(), versions: [], ...laddered() });
  assert.equal(missingVersion.completed, false);
  assert.equal(isApplicationAnswerSaved(answer(), []), false);
});

test("3. a saved answer with a stored version counts as complete", () => {
  assert.equal(isApplicationAnswerSaved(answer(), [version()]), true);
  assert.equal(applicationCurrentVersion(answer(), [version()])?.id, "v1");
  assert.equal(build().completed, true);
});

test("4. a generic answer stays generic", () => {
  const model = build({ answer: answer({ airlineId: undefined, journeyContext: undefined }) });
  assert.equal(model.context.airlineId, undefined);
  assert.equal(model.context.questionId, undefined);
  assert.equal(model.context.questionProvenance, undefined);
  assert.equal(model.context.promptId, "prompt-motivation");
  assert.equal(model.retakeAction?.target.kind, "application_coach");
  assert.equal((model.retakeAction?.target as { airlineId?: string }).airlineId, undefined);
});

test("5. an airline answer keeps its airline everywhere", () => {
  const model = build({ answer: answer({ airlineId: "jin_air", journeyContext: journey() }) });
  assert.equal(model.context.airlineId, "jin_air");
  assert.equal(model.context.origin, "airline_workspace");
  assert.equal((model.retakeAction?.target as { airlineId?: string }).airlineId, "jin_air");
});

/* ------------------------------ 6-11 question identity, provenance, evidence ------------------------------ */

test("6. an official application question keeps its identity", () => {
  const model = build({
    answer: answer({ airlineId: "jin_air", journeyContext: journey({ questionId: "jin-app-1", questionKind: "APPLICATION", provenance: "OFFICIAL_CURRENT", recruitmentPeriod: "2026 상반기", recruitmentYear: 2026 }) }),
  });
  assert.equal(model.context.questionId, "jin-app-1");
  assert.equal(model.context.questionProvenance, "OFFICIAL_CURRENT");
  assert.equal(model.context.recruitmentPeriod, "2026 상반기");
  assert.equal(model.context.recruitmentYear, 2026);
});

test("7. an archived official question is never relabelled as current", () => {
  const model = build({
    answer: answer({ airlineId: "jin_air", journeyContext: journey({ questionId: "jin-app-old", questionKind: "APPLICATION", provenance: "OFFICIAL_ARCHIVE", recruitmentPeriod: "2024 하반기", recruitmentYear: 2024 }) }),
  });
  assert.equal(model.context.questionProvenance, "OFFICIAL_ARCHIVE");
  assert.equal(model.context.recruitmentPeriod, "2024 하반기");
  assert.equal(JSON.stringify(model).includes("OFFICIAL_CURRENT"), false);
});

test("8. provenance survives the rewrite contract", () => {
  const context = journey({ questionId: "jin-app-1", questionKind: "APPLICATION", provenance: "VERIFIED_SECONDARY", recruitmentPeriod: "2026 상반기" });
  const model = build({ answer: answer({ airlineId: "jin_air", journeyContext: context }) });
  assert.equal(model.retakeAction?.target.kind, "application_coach");
  assert.equal((model.retakeAction?.target as { applicationAnswerId?: string }).applicationAnswerId, "answer-1");
  assert.equal(model.context.questionProvenance, "VERIFIED_SECONDARY");
  assert.equal(model.context.questionId, "jin-app-1");
});

test("9. strengths are capped at three and come from the stored analysis", () => {
  const stored = analysis({
    evaluations: [
      evaluation("a", "문항 적합성", "strong", 90),
      evaluation("b", "경험 구체성", "strong", 88),
      evaluation("c", "본인 행동", "strong", 86),
      evaluation("d", "직무 연결", "strong", 84),
      evaluation("e", "사실 근거", "strong", 82),
    ],
  });
  const model = build({ versions: [version({ analysis: stored })] });
  assert.equal(model.strengths.length, MAX_TRAINING_STRENGTHS);
  assert.equal(model.strengths[0].message, "문항 적합성: 문항 적합성 피드백");
  assert.ok(model.strengths.every((point) => point.source === "content_analysis"));
});

test("10. improvement points are capped at three and ordered by the saved priority", () => {
  const stored = analysis({
    evaluations: [
      evaluation("specificity", "경험 구체성", "needs_improvement", 48),
      evaluation("evidence", "사실 근거", "needs_improvement", 40),
      evaluation("role", "직무 연결", "needs_improvement", 50),
      evaluation("limit", "글자 수 준수", "needs_improvement", 45),
    ],
    genericExpressionWarning: "일반적인 표현이 반복됩니다.",
    rubric: { version: 1, evaluated: true, context: "application", findings: [finding("structure", "needs_improvement")], strengths: [], improvements: [], followUpCandidates: [] },
  });
  const model = build({ versions: [version({ analysis: stored })] });
  assert.equal(model.improvementPoints.length, MAX_TRAINING_IMPROVEMENTS);
  assert.equal(model.improvementPoints[0].message, "사실 근거: 사실 근거 피드백");
  assert.equal(model.noImprovementFound, false);
  const clean = build({ versions: [version({ analysis: analysis({ evaluations: [evaluation("a", "문항 적합성", "strong", 90)] }) })] });
  assert.equal(clean.improvementPoints.length, 0);
  assert.equal(clean.noImprovementFound, true);
});

test("11. the model infers nothing about the person", () => {
  const model = build();
  const serialized = JSON.stringify(model);
  for (const banned of ["자신감이 부족", "성격이", "소극적", "서비스 마인드", "승무원 적합", "합격", "적합도"]) {
    assert.equal(serialized.includes(banned), false, banned);
  }
});

/* ------------------------------ 12-18 rewrite, versioning, history ------------------------------ */

test("12. a rewrite keeps the same answer context", () => {
  const model = build({ answer: answer({ airlineId: "jin_air", journeyContext: journey({ questionId: "jin-app-1", questionKind: "APPLICATION", provenance: "OFFICIAL_CURRENT" }) }) });
  const target = model.retakeAction?.target as { kind: string; airlineId?: string; applicationAnswerId?: string };
  assert.equal(target.kind, "application_coach");
  assert.equal(target.airlineId, "jin_air");
  assert.equal(target.applicationAnswerId, "answer-1");
  assert.equal(model.context.promptId, "prompt-motivation");
  assert.deepEqual(model.context.selectedExperienceIds, ["exp-1"]);
});

test("13. a focused rewrite quotes the first real improvement point", () => {
  const model = build();
  assert.equal(model.focusedRetakeAction?.kind, "focused_retake");
  assert.equal(model.focusedRetakeAction?.label, "이 항목에 집중해서 다시 다듬기");
  assert.equal(model.focusedRetakeAction?.reason, model.improvementPoints[0].message);
  assert.equal(model.focusedRetakeAction?.focusKey, model.improvementPoints[0].key);
  const clean = build({ versions: [version({ analysis: analysis({ evaluations: [evaluation("a", "문항 적합성", "strong", 90)] }) })] });
  assert.equal(clean.focusedRetakeAction, undefined);
});

test("14. a new version increments the version number", () => {
  const v2 = version({ id: "v2", version: 2, content: "더 구체적으로 다시 작성한 답변입니다. 결과와 배운 점을 덧붙였습니다.", characterCount: 58, changeReason: "manual_edit" });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"] });
  assert.equal(applicationCurrentVersion(saved, [version(), v2])?.version, 2);
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [version(), v2], ...laddered() });
  assert.equal(model.context.applicationVersion, 2);
  assert.equal(model.summary.previousAttemptCount, 1);
});

test("15. the previous version is preserved, never overwritten", () => {
  const v2 = version({ id: "v2", version: 2 });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"] });
  const previous = previousApplicationVersionsFor(saved, [version(), v2]);
  assert.deepEqual(previous.map((item) => item.id), ["v1"]);
  assert.equal(applicationVersionsFor(saved, [version(), v2]).length, 2);
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [version(), v2], ...laddered() });
  assert.deepEqual(model.history.map((item) => item.attemptId), ["v1"]);
  assert.equal(model.context.previousVersionId, "v1");
});

test("16. comparison only uses the previous version of the same answer", () => {
  const v2 = version({ id: "v2", version: 2, characterCount: 90 });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"] });
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [version(), v2], ...laddered() });
  assert.equal(model.comparison?.previousAttemptId, "v1");
  assert.equal(model.comparison?.attemptNumber, 1);
});

test("17. versions of a different answer are excluded", () => {
  const other = version({ id: "other-v1", answerId: "answer-2", version: 1 });
  const otherLater = version({ id: "other-v2", answerId: "answer-2", version: 2 });
  const model = buildApplicationTrainingLoopModel({ answer: answer(), versions: [version(), other, otherLater], ...laddered() });
  assert.equal(model.comparison, undefined);
  assert.equal(model.history.length, 0);
  assert.deepEqual(applicationVersionsFor(answer(), [version(), other, otherLater]).map((item) => item.id), ["v1"]);
});

test("18. an answer written for a different airline is a different exercise", () => {
  const jinAir = answer({ id: "answer-jin", airlineId: "jin_air", currentVersionId: "jin-v1", versionIds: ["jin-v1"], journeyContext: journey() });
  const korean = answer({ id: "answer-kal", airlineId: "korean_air", currentVersionId: "kal-v1", versionIds: ["kal-v1"], journeyContext: journey({ airlineId: "korean_air" }) });
  const versions = [version({ id: "jin-v1", answerId: "answer-jin" }), version({ id: "kal-v1", answerId: "answer-kal" })];
  const model = buildApplicationTrainingLoopModel({ answer: jinAir, versions, ...laddered() });
  assert.equal(model.comparison, undefined);
  assert.equal(model.context.airlineId, "jin_air");
  assert.equal(buildApplicationTrainingLoopModel({ answer: korean, versions, ...laddered() }).context.airlineId, "korean_air");
});

/* ------------------------------ 19-25 identity, experiences, deltas ------------------------------ */

test("19. the same wording written for another question is a separate answer", () => {
  const first = answer({ id: "answer-a", promptId: "prompt-motivation", currentVersionId: "a-v1", versionIds: ["a-v1"], journeyContext: journey({ questionId: "q-1", questionKind: "APPLICATION", provenance: "OFFICIAL_CURRENT" }) });
  const second = answer({ id: "answer-b", promptId: "prompt-strength", currentVersionId: "b-v1", versionIds: ["b-v1"], journeyContext: journey({ questionId: "q-2", questionKind: "APPLICATION", provenance: "OFFICIAL_CURRENT" }) });
  const sameText = "동일한 문구로 저장된 답변입니다.";
  const versions = [version({ id: "a-v1", answerId: "answer-a", content: sameText }), version({ id: "b-v1", answerId: "answer-b", content: sameText })];
  assert.equal(buildApplicationTrainingLoopModel({ answer: first, versions, ...laddered() }).comparison, undefined);
  assert.equal(buildApplicationTrainingLoopModel({ answer: second, versions, ...laddered() }).context.questionId, "q-2");
  assert.equal(buildApplicationTrainingLoopModel({ answer: second, versions, ...laddered() }).context.promptId, "prompt-strength");
});

test("20. linked experiences are reported, never duplicated", () => {
  const model = build();
  assert.deepEqual(model.context.selectedExperienceIds, ["exp-1"]);
  const evidence = applicationRewriteEvidence(answer());
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].sourceType, "experience");
  assert.equal(evidence[0].sourceId, "exp-1");
  // an experience that is no longer linked is never claimed as evidence
  assert.equal(applicationRewriteEvidence(answer({ selectedExperienceIds: [] })).length, 0);
  // the saved text is the user's own answer, so a rewrite keeps that one factual row
  const withContent = applicationRewriteEvidence(answer(), version().content);
  assert.deepEqual(withContent.map((row) => row.sourceType), ["experience", "user_answer"]);
  assert.equal(applicationRewriteEvidence(answer({ selectedExperienceIds: [] }), "   ").length, 0);
});

test("21. the experience count delta is a measured value", () => {
  const v2 = version({ id: "v2", version: 2, experienceIds: ["exp-1", "exp-2"] });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"], selectedExperienceIds: ["exp-1", "exp-2"] });
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [version({ experienceIds: [] }), v2], ...laddered() });
  const delta = model.comparison?.deltas.find((item) => item.key === "experience");
  assert.equal(delta?.before, "0개");
  assert.equal(delta?.after, "2개");
});

test("22. the answer length delta is a measured value", () => {
  const v2 = version({ id: "v2", version: 2, characterCount: 560 });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"] });
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [version({ characterCount: 420 }), v2], ...laddered() });
  const delta = model.comparison?.deltas.find((item) => item.key === "length");
  assert.equal(delta?.before, "420자");
  assert.equal(delta?.after, "560자");
});

test("23. the missing element delta uses both stored analyses only", () => {
  const before = version({ analysis: analysis({ rubric: { version: 1, evaluated: true, context: "application", findings: [finding("structure", "needs_improvement"), finding("result", "needs_improvement")], strengths: [], improvements: [], followUpCandidates: [] } }) });
  const after = version({ id: "v2", version: 2, analysis: analysis({ rubric: { version: 1, evaluated: true, context: "application", findings: [finding("structure", "needs_improvement")], strengths: [], improvements: [], followUpCandidates: [] } }) });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"] });
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [before, after], ...laddered() });
  const delta = model.comparison?.deltas.find((item) => item.key === "missing");
  assert.equal(delta?.before, "2개");
  assert.equal(delta?.after, "1개");
  // a version saved without analysis contributes no analyzer delta
  const unanalyzed = buildApplicationTrainingLoopModel({ answer: saved, versions: [version({ analysis: undefined }), after], ...laddered() });
  assert.equal(unanalyzed.comparison?.deltas.some((item) => item.key === "missing"), false);
});

test("24. no comparison row is an invented improvement score", () => {
  const v2 = version({ id: "v2", version: 2, characterCount: 560 });
  const saved = answer({ currentVersionId: "v2", versionIds: ["v1", "v2"] });
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: [version(), v2], ...laddered() });
  const serialized = JSON.stringify(model.comparison);
  for (const banned of ["%", "향상도", "점수", "상승", "합격도"]) {
    assert.equal(serialized.includes(banned), false, banned);
  }
  assert.ok(model.comparison!.deltas.length >= 3);
});

test("25. history keeps at most three previous versions, newest first", () => {
  const rows = [1, 2, 3, 4, 5].map((n) => version({ id: `v${n}`, version: n, createdAt: `2026-09-2${n}T00:00:00.000Z` }));
  const saved = answer({ currentVersionId: "v5", versionIds: rows.map((item) => item.id) });
  const model = buildApplicationTrainingLoopModel({ answer: saved, versions: rows, ...laddered() });
  assert.equal(model.history.length, MAX_TRAINING_HISTORY);
  assert.deepEqual(model.history.map((item) => item.attemptNumber), [4, 3, 2]);
});

/* ------------------------------ 26-31 the next ladder ------------------------------ */

test("26. rule A offers the interview question this answer produced", () => {
  const model = build({ attempts: [], interviewQuestionId: "im2" });
  assert.equal(model.nextAction?.kind, "next");
  assert.equal(model.nextAction?.target.kind, "interview_question");
  assert.equal((model.nextAction?.target as { questionId: string }).questionId, "im2");
  // with no question derived from the answer the ladder moves on instead of inventing one
  assert.equal(build({ attempts: [], selfIntroductions: [] }).nextAction?.target.kind, "self_introduction");
});

test("27. rule B offers the self introduction", () => {
  const model = build({ selfIntroductions: [] });
  assert.equal(model.nextAction?.target.kind, "self_introduction");
  assert.equal(model.nextAction?.label, "60초 자기소개 연습");
});

test("28. rule C offers the mock interview", () => {
  const model = build({ sessions: [] });
  assert.equal(model.nextAction?.target.kind, "mock_start");
  assert.equal(model.nextAction?.label, "모의면접 시작");
});

test("29. rule D offers the airline journey action", () => {
  const model = build({
    answer: answer({ airlineId: "jin_air", journeyContext: journey() }),
    journeyAction: { kind: "interview", label: "예상 질문 연습", reason: "항공사 질문으로 면접을 연습해 보세요.", questionId: "im3" },
  });
  assert.equal(model.nextAction?.label, "예상 질문 연습");
  assert.equal(model.nextAction?.target.kind, "interview_question");
  // a generic answer never borrows an airline journey action
  assert.equal(build({ journeyAction: { kind: "mock", label: "모의면접", reason: "" } }).nextAction?.label, undefined);
});

test("30. rule E falls back to the existing daily plan target", () => {
  const model = build({ dailyFallback: { kind: "interview_question", questionId: "im4" } });
  assert.equal(model.nextAction?.label, "오늘의 기본 연습");
  assert.equal((model.nextAction?.target as { questionId: string }).questionId, "im4");
});

test("31. the ladder never proposes another application rewrite", () => {
  for (const input of [laddered(), laddered({ attempts: [] }), laddered({ selfIntroductions: [] }), laddered({ sessions: [] }), laddered({ dailyFallback: { kind: "experience_library" } })]) {
    const model = buildApplicationTrainingLoopModel({ answer: answer(), versions: [version()], ...input });
    assert.notEqual(model.nextAction?.target.kind, "application_coach");
  }
  // a rewrite stays an explicit CTA
  assert.equal(build().retakeAction?.target.kind, "application_coach");
});

/* ------------------------------ 32-36 Home, progress, journey ------------------------------ */

test("32. Home counts saved answers from the repository, not from the loop", () => {
  assert.equal(applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 0 }).mode, "count");
  assert.equal(applicationAnswerProgress({ answerCount: 0, officialQuestionCount: 0 }).mode, "empty");
  const source = readFileSync("lib/training-loop.ts", "utf8");
  // the loop stores nothing and owns no counter of its own
  assert.equal(/localStorage|safeLocalStorageWrite|createAnswerVersion\(/.test(source), false);
});

test("33. the application gap closes from real saved answers", () => {
  const withAnswer = buildAirlineJourneyState({ airlineId: "jin_air", answers: [answer({ airlineId: "jin_air" })] });
  assert.equal(withAnswer.answersDrafted, 1);
  assert.equal(withAnswer.steps.find((step) => step.id === "application")?.status, "completed");
  const without = buildAirlineJourneyState({ airlineId: "jin_air", answers: [] });
  assert.equal(without.answersDrafted, 0);
  assert.notEqual(without.steps.find((step) => step.id === "application")?.status, "completed");
});

test("34. the zero-denominator rule still holds after a save", () => {
  const display = applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 0 });
  assert.equal(display.value.includes("/"), false);
  assert.equal(display.value, "1개");
  assert.equal(applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 2 }).value, "1/2");
});

test("35. only this airline's answers reach its journey count", () => {
  const journeyState = buildAirlineJourneyState({
    airlineId: "jin_air",
    answers: [answer({ id: "a1", airlineId: "jin_air" }), answer({ id: "a2", airlineId: "korean_air" })],
  });
  assert.equal(journeyState.answersDrafted, 1);
  assert.equal(journeyState.recentActivity.some((item) => item.id === "answer:a2"), false);
});

test("36. a generic answer is counted by no airline journey", () => {
  const journeyState = buildAirlineJourneyState({ airlineId: "jin_air", answers: [answer({ id: "a3", airlineId: undefined })] });
  assert.equal(journeyState.answersDrafted, 0);
  assert.equal(journeyState.steps.find((step) => step.id === "application")?.status !== "completed", true);
});

/* ------------------------------ 37-38 resume boundary ------------------------------ */

test("37. only an unsaved work draft is resume material", () => {
  const coach = readFileSync("components/application-coach/application-coach.tsx", "utf8");
  // the work draft is written while the user is still assembling the answer, never for a saved one
  assert.match(coach, /if \(\(step === "experience" \|\| step === "coaching"\) && prompt\)\s*\n\s*saveWorkDraft\(/);
  assert.equal(/step === "rewrite"[^\n]*saveWorkDraft/.test(coach), false);
  assert.equal(isApplicationAnswerSaved(answer(), []), false);
});

test("38. a saved answer is offered as review and rewrite, not as resume", () => {
  const model = build();
  assert.equal(model.completed, true);
  assert.equal(model.retakeAction?.label, "같은 답변 다시 다듬기");
  assert.equal(JSON.stringify(model).includes("이어서"), false);
  assert.equal(applicationEvidenceMode(version()), "text_analysis");
  assert.equal(applicationEvidenceMode(undefined), "text_practice");
});

/* ------------------------------ 39-42 regressions ------------------------------ */

test("39. Single Interview keeps its own loop", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), selfIntroductions: [], sessions: [], applicationAnswerCount: 0 });
  assert.equal(model.context.trainingType, "single_interview");
  assert.equal(model.retakeAction?.label, "같은 질문 다시 연습");
  assert.equal(model.nextAction?.target.kind, "self_introduction");
});

test("40. Self Introduction keeps its own loop", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: selfIntro(), sessions: [], applicationAnswerCount: 0 });
  assert.equal(model.context.trainingType, "self_introduction");
  assert.equal(model.retakeAction?.label, "같은 자기소개 다시 연습");
  assert.equal(model.context.questionId, undefined);
});

test("41. Mock keeps its own loop and its session counting", () => {
  const model = buildMockTrainingLoopModel({ session: session(), attempts: [attempt()], applicationAnswerCount: 1 });
  assert.equal(model.context.trainingType, "mock_interview");
  assert.equal(model.completed, true);
  assert.equal(model.retakeAction?.label, "같은 모의면접 다시 연습");
  assert.equal(buildMockTrainingLoopModel({ session: session({ status: "in_progress" }), attempts: [attempt()] }).completed, false);
});

test("42. the mock mid-session guard is untouched", () => {
  const engine = readFileSync("components/interview-practice/interview-practice-engine.tsx", "utf8");
  assert.match(engine, /buildTrainingLoop&&!sessionAction\?<TrainingLoopPanel/);
  const coach = readFileSync("components/application-coach/application-coach.tsx", "utf8");
  // the application review reuses the shared panel instead of cloning one
  assert.match(coach, /<TrainingLoopPanel\s*\n\s*loop=\{buildApplicationTrainingLoopModel\(\{/);
  assert.equal(coach.includes("function ApplicationTrainingLoopPanel"), false);
});
