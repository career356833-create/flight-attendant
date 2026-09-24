import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTrainingLoopModel,
  consecutiveQuestionAttempts,
  previousAttemptsFor,
  trainingEvidenceMode,
  MAX_TRAINING_HISTORY,
  MAX_TRAINING_IMPROVEMENTS,
  MAX_TRAINING_STRENGTHS,
  NO_IMPROVEMENT_MESSAGE,
  REPEATED_QUESTION_LIMIT,
  type TrainingLoopInput,
} from "@/lib/training-loop";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { InterviewPracticeQueueItem } from "@/lib/interview-practice-queue";

const actual = { mode: "actual_audio" as const, isActualTranscription: true };

const attempt = (over: Partial<InterviewAttempt> = {}): InterviewAttempt =>
  ({
    id: "a1",
    questionId: "im2",
    category: "introduction_and_motivation",
    createdAt: "2026-09-24T10:00:00.000Z",
    transcript: "저는 고객 응대 현장에서 지연 상황을 안내한 경험이 있습니다.",
    transcriptIntegrity: actual,
    durationSeconds: 70,
    analysis: {},
    attemptNumber: 1,
    completed: true,
    ...over,
  }) as unknown as InterviewAttempt;

const content = (over: Record<string, unknown> = {}) =>
  ({
    version: 1,
    answerSummary: { oneLineSummary: "요약", keyPoints: [] },
    structure: { detected: "star", missingParts: [], parts: [] },
    relevance: { status: "direct", missingPoints: [] },
    competencies: [],
    answerQuality: { genericClaims: [], evidenceStatements: [] },
    strongPoints: [],
    improvementPoints: [],
    sentenceCoaching: [],
    ...over,
  }) as unknown as InterviewAttempt["contentAnalysis"];

const selfIntro = (completed = true): SelfIntroductionAttempt => ({ id: "s1", createdAt: "2026-09-23T00:00:00.000Z", transcript: "", durationSeconds: 60, analysis: {}, attemptNumber: 1, completed } as unknown as SelfIntroductionAttempt);
const session = (status: InterviewSession["status"] = "completed"): InterviewSession => ({ id: "m1", status, startedAt: "2026-09-23T00:00:00.000Z", questionIds: ["im1"], attemptIds: [], currentQuestionIndex: 0 } as unknown as InterviewSession);
const queueItem = (over: Partial<InterviewPracticeQueueItem> = {}): InterviewPracticeQueueItem =>
  ({ id: "q1", questionId: "cs1", status: "open", priority: 1, reason: "retake_requested", createdAt: "2026-09-23T00:00:00.000Z", ...over }) as unknown as InterviewPracticeQueueItem;

/** A saturated loop: everything downstream already done, so rule ordering is easy to assert. */
const saturated: TrainingLoopInput = { selfIntroductions: [selfIntro()], sessions: [session()], applicationAnswerCount: 1 };

// 1
test("a fresh user with no attempt gets no loop, no strengths and no comparison", () => {
  const model = buildTrainingLoopModel({});
  assert.equal(model.completed, false);
  assert.deepEqual(model.strengths, []);
  assert.deepEqual(model.improvementPoints, []);
  assert.equal(model.comparison, undefined);
  assert.deepEqual(model.history, []);
  assert.equal(model.retakeAction, undefined);
  assert.equal(model.summary.previousAttemptCount, 0);
});

// 2
test("a completed interview result carries its own evidence", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ contentAnalysis: content({ strongPoints: ["결론을 먼저 제시했어요"], improvementPoints: [{ priority: 1, message: "행동을 더 구체화해 보세요" }] }) }), ...saturated });
  assert.equal(model.completed, true);
  assert.equal(model.context.trainingType, "single_interview");
  assert.equal(model.strengths[0].message, "결론을 먼저 제시했어요");
  assert.equal(model.improvementPoints[0].message, "행동을 더 구체화해 보세요");
});

// 3
test("a self-introduction result can be described through the shared context", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), context: { trainingType: "self_introduction" }, ...saturated });
  assert.equal(model.context.trainingType, "self_introduction");
});

// 4
test("a mock result can be described through the shared context", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), context: { trainingType: "mock_interview" }, ...saturated });
  assert.equal(model.context.trainingType, "mock_interview");
});

// 5
test("an application answer result can be described through the shared context", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), context: { trainingType: "application_answer" }, ...saturated });
  assert.equal(model.context.trainingType, "application_answer");
});

// 6
test("strengths never exceed three entries", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ contentAnalysis: content({ strongPoints: ["1", "2", "3", "4", "5"] }) }), ...saturated });
  assert.equal(model.strengths.length, MAX_TRAINING_STRENGTHS);
});

// 7
test("improvement points never exceed three entries and follow saved priority", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt({ contentAnalysis: content({ improvementPoints: [{ priority: 3, message: "C" }, { priority: 1, message: "A" }, { priority: 2, message: "B" }, { priority: 3, message: "D" }] }) }),
    ...saturated,
  });
  assert.equal(model.improvementPoints.length, MAX_TRAINING_IMPROVEMENTS);
  assert.deepEqual(model.improvementPoints.map((p) => p.message), ["A", "B", "C"]);
});

// 8
test("no fake improvement or success verdict is produced when the analysis found nothing", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ contentAnalysis: content() }), ...saturated });
  assert.deepEqual(model.improvementPoints, []);
  assert.equal(model.noImprovementFound, true);
  assert.equal(NO_IMPROVEMENT_MESSAGE, "이번 결과에서 추가로 확인된 보완 포인트가 없습니다.");
  assert.doesNotMatch(NO_IMPROVEMENT_MESSAGE, /완벽|합격/);
});

// 9-11
test("retake keeps the question, airline and lineage of the attempt it came from", () => {
  const current = attempt({ id: "a2", attemptNumber: 2, previousAttemptId: "a1", targetAirlineId: "jin_air" });
  const model = buildTrainingLoopModel({ attempt: current, ...saturated });
  assert.deepEqual(model.retakeAction?.target, { kind: "interview_question", questionId: "im2", airlineId: "jin_air" });
  assert.equal(model.context.previousAttemptId, "a1");
  assert.equal(model.context.attemptNumber, 2);
});

// 12-13
test("airline and question ids survive into the loop context", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ targetAirlineId: "jin_air", questionId: "airline-question:9-jin-2025" }), ...saturated });
  assert.equal(model.context.airlineId, "jin_air");
  assert.equal(model.context.questionId, "airline-question:9-jin-2025");
});

// 14-15
test("question provenance survives and an archive stays an archive", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt({ sourceContext: { source: "airline_workspace", airlineId: "jin_air", questionProvenance: "OFFICIAL_ARCHIVE" } as InterviewAttempt["sourceContext"] }),
    ...saturated,
  });
  assert.equal(model.context.questionProvenance, "OFFICIAL_ARCHIVE");
  assert.notEqual(model.context.questionProvenance, "OFFICIAL_CURRENT");
});

// 16
test("an audio-only attempt never produces transcript-based feedback", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt({
      transcriptIntegrity: { mode: "unavailable", isActualTranscription: false } as InterviewAttempt["transcriptIntegrity"],
      transcript: "",
      audioMetrics: { pauses: { longCount: 3 } } as unknown as InterviewAttempt["audioMetrics"],
      contentAnalysis: content({ strongPoints: ["좋았어요"], improvementPoints: [{ priority: 1, message: "구조를 정리해 보세요" }] }),
    }),
    ...saturated,
  });
  assert.equal(model.evidenceMode, "audio_only");
  assert.deepEqual(model.strengths, []);
  assert.equal(model.improvementPoints.every((p) => p.source !== "content_analysis"), true);
  assert.equal(model.improvementPoints.some((p) => p.key === "long_pause"), true);
});

// 17
test("a text practice never produces speech or audio feedback", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt({ transcriptIntegrity: undefined, audioMetrics: undefined, speechMetrics: { fillers: { totalCount: 9 } } as unknown as InterviewAttempt["speechMetrics"], contentAnalysis: content({ improvementPoints: [{ priority: 1, message: "구조" }] }) }),
    ...saturated,
  });
  assert.equal(model.evidenceMode, "text_analysis");
  assert.equal(model.improvementPoints.some((p) => p.source === "speech_metrics" || p.source === "audio_metrics"), false);
});

test("a practice with neither transcript nor audio is a bare text practice", () => {
  assert.equal(trainingEvidenceMode(attempt({ transcript: "", transcriptIntegrity: undefined, audioMetrics: undefined })), "text_practice");
});

// 18
test("next practice goes to the saved retake queue first", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), queue: [queueItem()], ...saturated });
  assert.equal(model.nextAction?.target.kind, "interview_question");
  assert.deepEqual(model.nextAction?.target, { kind: "interview_question", questionId: "cs1", airlineId: undefined, queueItemId: "q1" });
});

// 19
test("next practice proposes the self introduction when none was completed", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), selfIntroductions: [], sessions: [session()], applicationAnswerCount: 1 });
  assert.deepEqual(model.nextAction?.target, { kind: "self_introduction", targetSeconds: 60 });
});

// 20
test("next practice proposes the mock interview once a self introduction exists", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ targetAirlineId: "jin_air" }), selfIntroductions: [selfIntro()], sessions: [], applicationAnswerCount: 1 });
  assert.deepEqual(model.nextAction?.target, { kind: "mock_start", airlineId: "jin_air" });
});

// 21
test("next practice proposes the application answer once interviews are covered", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ targetAirlineId: "jin_air" }), selfIntroductions: [selfIntro()], sessions: [session()], applicationAnswerCount: 0 });
  assert.deepEqual(model.nextAction?.target, { kind: "application_coach", airlineId: "jin_air" });
});

// 22
test("next practice falls through to the airline journey action", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ targetAirlineId: "jin_air" }), ...saturated, journeyAction: { kind: "mock", label: "Quick 5 모의면접", reason: "이유" } });
  assert.deepEqual(model.nextAction?.target, { kind: "mock_start", airlineId: "jin_air" });
  assert.equal(model.nextAction?.label, "Quick 5 모의면접");
});

// 23
test("next practice finally falls back to the existing daily target", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), ...saturated, dailyFallback: { kind: "experience_library" } });
  assert.deepEqual(model.nextAction?.target, { kind: "experience_library" });
});

// 24
test("repeating one question does not keep proposing that same question", () => {
  const history = [attempt({ id: "a1", attemptNumber: 1, createdAt: "2026-09-24T08:00:00.000Z" }), attempt({ id: "a2", attemptNumber: 2, createdAt: "2026-09-24T09:00:00.000Z" })];
  const current = attempt({ id: "a3", attemptNumber: 3, createdAt: "2026-09-24T10:00:00.000Z" });
  assert.equal(consecutiveQuestionAttempts(current, history), REPEATED_QUESTION_LIMIT);
  const model = buildTrainingLoopModel({ attempt: current, attempts: history, queue: [queueItem()], ...saturated });
  assert.notEqual((model.nextAction?.target as { questionId?: string }).questionId, current.questionId);
  assert.match(model.nextAction!.reason, /연속으로 연습/);
});

// 25
test("comparison uses the previous attempt of the same question", () => {
  const previous = attempt({ id: "a1", attemptNumber: 1, createdAt: "2026-09-24T08:00:00.000Z", durationSeconds: 90 });
  const current = attempt({ id: "a2", attemptNumber: 2, createdAt: "2026-09-24T10:00:00.000Z", durationSeconds: 70 });
  const model = buildTrainingLoopModel({ attempt: current, attempts: [previous], ...saturated });
  assert.equal(model.comparison?.previousAttemptId, "a1");
  assert.deepEqual(model.comparison?.deltas.find((d) => d.key === "duration"), { key: "duration", label: "답변 시간", before: "90초", after: "70초" });
});

// 26
test("a different question is never compared", () => {
  const other = attempt({ id: "b1", questionId: "cs1", createdAt: "2026-09-24T08:00:00.000Z" });
  const model = buildTrainingLoopModel({ attempt: attempt({ id: "a2", attemptNumber: 2 }), attempts: [other], ...saturated });
  assert.equal(model.comparison, undefined);
  assert.deepEqual(model.history, []);
});

// 27
test("another airline's attempt never reaches this attempt's history", () => {
  const jin = attempt({ id: "j1", targetAirlineId: "jin_air", createdAt: "2026-09-24T08:00:00.000Z" });
  const korean = attempt({ id: "k1", targetAirlineId: "korean_air", createdAt: "2026-09-24T09:00:00.000Z" });
  assert.deepEqual(previousAttemptsFor(attempt({ id: "j2", targetAirlineId: "jin_air" }), [jin, korean]).map((a) => a.id), ["j1"]);
});

// 28
test("the same question text under a different question id stays separate", () => {
  const workspace = attempt({ id: "w1", questionId: "airline-question:jin-1", targetAirlineId: "jin_air", createdAt: "2026-09-24T08:00:00.000Z" });
  const catalog = attempt({ id: "c1", questionId: "im2", targetAirlineId: "jin_air", createdAt: "2026-09-24T09:00:00.000Z" });
  assert.deepEqual(previousAttemptsFor(attempt({ id: "w2", questionId: "airline-question:jin-1", targetAirlineId: "jin_air" }), [workspace, catalog]).map((a) => a.id), ["w1"]);
});

// 29-30
test("the loop never reports a completion of its own", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ completed: false }), ...saturated });
  assert.equal(model.completed, false);
  assert.equal(model.summary.completedLabel, "미완료");
  const serialized = JSON.stringify(buildTrainingLoopModel({ attempt: attempt(), ...saturated }));
  assert.doesNotMatch(serialized, /dailyCompleted|weeklyCompleted|completionEvent/);
});

// 31-32
test("history is capped and ordered newest first", () => {
  const history = [1, 2, 3, 4].map((n) => attempt({ id: `a${n}`, attemptNumber: n, createdAt: `2026-09-2${n}T00:00:00.000Z` }));
  const model = buildTrainingLoopModel({ attempt: attempt({ id: "a5", attemptNumber: 5, createdAt: "2026-09-25T00:00:00.000Z" }), attempts: history, ...saturated });
  assert.equal(model.history.length, MAX_TRAINING_HISTORY);
  assert.deepEqual(model.history.map((h) => h.attemptId), ["a4", "a3", "a2"]);
});

// 33-34
test("an incomplete attempt is never presented as a finished result", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ completed: false }), attempts: [attempt({ id: "old" })], ...saturated });
  assert.equal(model.retakeAction, undefined);
  assert.equal(model.nextAction, undefined);
  assert.deepEqual(model.history, []);
});

test("a completed attempt offers retake and next, never resume", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), ...saturated });
  assert.equal(model.retakeAction?.kind, "retake");
  assert.equal(JSON.stringify(model).includes("resume"), false);
});

// 35-36
test("favorite and queue state is reported without being changed", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), favorites: [{ questionId: "im2" } as never], queue: [queueItem({ questionId: "im2" })], ...saturated });
  assert.equal(model.favorited, true);
  assert.equal(model.queued, true);
  const none = buildTrainingLoopModel({ attempt: attempt(), favorites: [], queue: [], ...saturated });
  assert.equal(none.favorited, false);
  assert.equal(none.queued, false);
});

// 37-39
test("the model exposes no readiness, hiring probability or trait judgement", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt({ contentAnalysis: content({ strongPoints: ["결론이 명확했어요"], improvementPoints: [{ priority: 1, message: "행동을 구체화해 보세요" }] }) }),
    ...saturated,
  });
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /readiness|합격 확률|적합도|향상도|\d+점 개선|\d+%/);
  for (const phrase of ["자신감이 부족", "성격이", "소극적", "서비스 마인드", "승무원 적합"]) assert.equal(serialized.includes(phrase), false, phrase);
});

// 40-41
test("focused retake repeats the same question and quotes a real improvement point", () => {
  const model = buildTrainingLoopModel({ attempt: attempt({ contentAnalysis: content({ improvementPoints: [{ priority: 1, message: "행동을 더 구체화해 보세요" }] }) }), ...saturated });
  assert.equal(model.focusedRetakeAction?.reason, "행동을 더 구체화해 보세요");
  assert.deepEqual(model.focusedRetakeAction?.target, model.retakeAction?.target);
  const none = buildTrainingLoopModel({ attempt: attempt({ contentAnalysis: content() }), ...saturated });
  assert.equal(none.focusedRetakeAction, undefined);
});

test("the compact summary counts only real improvements and previous attempts", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt({ id: "a2", attemptNumber: 2, contentAnalysis: content({ improvementPoints: [{ priority: 1, message: "A" }, { priority: 2, message: "B" }] }) }),
    attempts: [attempt({ id: "a1", createdAt: "2026-09-24T08:00:00.000Z" })],
    ...saturated,
  });
  assert.deepEqual(model.summary, { completedLabel: "완료", improvementCount: 2, previousAttemptCount: 1 });
});

test("the same input always produces the same model", () => {
  const input: TrainingLoopInput = { attempt: attempt({ contentAnalysis: content({ strongPoints: ["s"], improvementPoints: [{ priority: 1, message: "m" }] }) }), attempts: [attempt({ id: "a0", createdAt: "2026-09-24T08:00:00.000Z" })], queue: [queueItem()], ...saturated };
  assert.deepEqual(buildTrainingLoopModel(input), buildTrainingLoopModel(input));
});
