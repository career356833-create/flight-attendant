import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMockTrainingLoopModel,
  buildSelfIntroTrainingLoopModel,
  buildTrainingLoopModel,
  isMockSessionComplete,
  mockConfigId,
  mockEvidenceMode,
  previousMockSessionsFor,
  repeatedMockIssues,
  MAX_TRAINING_HISTORY,
  MAX_TRAINING_IMPROVEMENTS,
  MAX_TRAINING_STRENGTHS,
  type MockTrainingLoopInput,
} from "@/lib/training-loop";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";

const actual = { mode: "actual_audio" as const, isActualTranscription: true };

const session = (over: Partial<InterviewSession> = {}): InterviewSession =>
  ({
    id: "m1",
    mode: "general",
    questionIds: ["im1", "be1", "cs1"],
    attemptIds: ["a1", "a2", "a3"],
    currentQuestionIndex: 2,
    status: "completed",
    startedAt: "2026-09-25T09:00:00.000Z",
    completedAt: "2026-09-25T10:00:00.000Z",
    sessionAnalysis: { overallSummary: "", strengths: [], improvements: [], competencySummary: [], speechSummary: "", audioSummary: "", contentSummary: "", nextPractice: [] },
    ...over,
  }) as unknown as InterviewSession;

const attempt = (id: string, over: Partial<InterviewAttempt> = {}): InterviewAttempt =>
  ({
    id,
    questionId: "im1",
    category: "introduction_and_motivation",
    createdAt: "2026-09-25T09:10:00.000Z",
    transcript: "답변",
    transcriptIntegrity: actual,
    durationSeconds: 60,
    analysis: {},
    attemptNumber: 1,
    completed: true,
    ...over,
  }) as unknown as InterviewAttempt;

const content = (over: Record<string, unknown> = {}) =>
  ({
    version: 1,
    answerSummary: { oneLineSummary: "", keyPoints: [] },
    structure: { detected: "star", missingParts: [], parts: [] },
    relevance: { status: "direct", missingPoints: [] },
    competencies: [],
    answerQuality: { genericClaims: [], evidenceStatements: [] },
    strongPoints: [],
    improvementPoints: [],
    sentenceCoaching: [],
    ...over,
  }) as unknown as InterviewAttempt["contentAnalysis"];

const selfIntro = (completed = true): SelfIntroductionAttempt =>
  ({ id: "s1", createdAt: "2026-09-24T00:00:00.000Z", transcript: "", durationSeconds: 60, analysis: {}, attemptNumber: 1, completed, targetSeconds: 60, practiceLanguage: "ko" }) as unknown as SelfIntroductionAttempt;

const threeAttempts = [attempt("a1"), attempt("a2"), attempt("a3")];
/** Everything downstream already done, so the next-action ladder is easy to pin. */
const saturated: MockTrainingLoopInput = { applicationAnswerCount: 1, selfIntroductions: [selfIntro()] };

// 1
test("a completed mock produces the shared loop model", () => {
  const model = buildMockTrainingLoopModel({ session: session(), attempts: threeAttempts, ...saturated });
  assert.equal(model.completed, true);
  assert.equal(model.context.trainingType, "mock_interview");
  assert.equal(model.retakeAction?.label, "같은 모의면접 다시 연습");
});

// 2
test("an unfinished session is never treated as a completed mock", () => {
  for (const status of ["created", "in_progress"] as const) {
    const model = buildMockTrainingLoopModel({ session: session({ status, attemptIds: ["a1"] }), attempts: [attempt("a1")], ...saturated });
    assert.equal(isMockSessionComplete(session({ status })), false);
    assert.equal(model.completed, false);
    assert.equal(model.retakeAction, undefined);
    assert.equal(model.nextAction, undefined);
    assert.deepEqual(model.history, []);
  }
});

// 3
test("answering only the first question does not finish a mock", () => {
  const model = buildMockTrainingLoopModel({ session: session({ status: "in_progress", attemptIds: ["a1"], currentQuestionIndex: 0 }), attempts: [attempt("a1")], ...saturated });
  assert.equal(model.completed, false);
  assert.equal(model.summary.completedLabel, "미완료");
});

// 4
test("a generic mock keeps no airline and no question id", () => {
  const model = buildMockTrainingLoopModel({ session: session({ airlineId: undefined }), attempts: threeAttempts, ...saturated });
  assert.equal(model.context.airlineId, undefined);
  assert.equal(model.context.questionId, undefined);
});

// 5
test("an airline mock keeps its airline lineage", () => {
  const model = buildMockTrainingLoopModel({ session: session({ airlineId: "jin_air" }), attempts: threeAttempts, ...saturated });
  assert.equal(model.context.airlineId, "jin_air");
  assert.deepEqual(model.retakeAction?.target, { kind: "mock_start", airlineId: "jin_air" });
});

// 6
test("session identity is the configuration, not one of its questions", () => {
  assert.equal(mockConfigId(session()), "general:generic:3");
  assert.equal(mockConfigId(session({ airlineId: "jin_air" })), "general:jin_air:3");
  assert.equal(mockConfigId(session({ mode: "safety" })), "safety:generic:3");
  assert.equal(mockConfigId(session({ questionIds: ["im1", "be1"] })), "general:generic:2");
  const model = buildMockTrainingLoopModel({ session: session(), attempts: threeAttempts, ...saturated });
  assert.equal(model.context.mockSessionId, "m1");
  assert.equal(model.context.mockConfigId, "general:generic:3");
  assert.deepEqual(model.context.questionIds, ["im1", "be1", "cs1"]);
});

// 7
test("comparison uses the previous session of the same configuration", () => {
  const previous = session({ id: "m0", attemptIds: ["b1", "b2", "b3"], completedAt: "2026-09-24T10:00:00.000Z" });
  const olderAttempts = ["b1", "b2", "b3"].map((id) => attempt(id, { durationSeconds: 90 }));
  const model = buildMockTrainingLoopModel({ session: session(), sessions: [previous], attempts: [...threeAttempts, ...olderAttempts], ...saturated });
  assert.equal(model.comparison?.previousAttemptId, "m0");
  assert.deepEqual(model.comparison?.deltas.find((d) => d.key === "duration"), { key: "duration", label: "총 답변 시간", before: "270초", after: "180초" });
});

// 8
test("a different configuration is never compared", () => {
  const otherMode = session({ id: "m0", mode: "safety", completedAt: "2026-09-24T10:00:00.000Z" });
  const otherCount = session({ id: "m9", questionIds: ["im1"], completedAt: "2026-09-24T10:00:00.000Z" });
  assert.deepEqual(previousMockSessionsFor(session(), [otherMode, otherCount]), []);
  assert.equal(buildMockTrainingLoopModel({ session: session(), sessions: [otherMode, otherCount], attempts: threeAttempts, ...saturated }).comparison, undefined);
});

// 9
test("strengths never exceed three entries", () => {
  const model = buildMockTrainingLoopModel({
    session: session({ sessionAnalysis: { ...session().sessionAnalysis!, strengths: ["A", "B", "C", "D", "E"] } }),
    attempts: threeAttempts,
    ...saturated,
  });
  assert.equal(model.strengths.length, MAX_TRAINING_STRENGTHS);
});

// 10
test("improvement points never exceed three entries", () => {
  const model = buildMockTrainingLoopModel({
    session: session({ sessionAnalysis: { ...session().sessionAnalysis!, improvements: ["A", "B", "C", "D"] } }),
    attempts: threeAttempts,
    ...saturated,
  });
  assert.equal(model.improvementPoints.length, MAX_TRAINING_IMPROVEMENTS);
});

// 11
test("an issue seen in several questions is reported once with its count", () => {
  const rows = [
    attempt("a1", { contentAnalysis: content({ structure: { detected: "star", missingParts: ["Result"], parts: [] } }) }),
    attempt("a2", { contentAnalysis: content({ structure: { detected: "star", missingParts: ["Result"], parts: [] } }) }),
    attempt("a3", { contentAnalysis: content({ structure: { detected: "star", missingParts: ["Action"], parts: [] } }) }),
  ];
  assert.deepEqual(repeatedMockIssues(session(), rows), [{ message: "Result", count: 2 }]);
  const model = buildMockTrainingLoopModel({ session: session(), attempts: rows, ...saturated });
  assert.equal(model.improvementPoints[0].message, "Result이(가) 2개 문항에서 반복됐습니다.");
});

// 12
test("an audio-only mock produces no transcript-based feedback", () => {
  const rows = ["a1", "a2", "a3"].map((id) =>
    attempt(id, {
      transcriptIntegrity: { mode: "unavailable", isActualTranscription: false } as InterviewAttempt["transcriptIntegrity"],
      transcript: "",
      audioMetrics: { pauses: { longCount: 2 } } as unknown as InterviewAttempt["audioMetrics"],
      contentAnalysis: content({ structure: { detected: "star", missingParts: ["Result"], parts: [] } }),
    }),
  );
  const model = buildMockTrainingLoopModel({
    session: session({ sessionAnalysis: { ...session().sessionAnalysis!, strengths: ["좋았어요"], improvements: ["구조를 정리해 보세요"] } }),
    attempts: rows,
    ...saturated,
  });
  assert.equal(mockEvidenceMode(session(), rows), "audio_only");
  assert.deepEqual(model.strengths, []);
  assert.equal(model.improvementPoints.every((p) => p.source !== "content_analysis"), true);
  assert.equal(model.improvementPoints.some((p) => p.key === "mock-long-pause"), true);
});

// 13
test("a text mock produces no audio feedback", () => {
  const rows = ["a1", "a2", "a3"].map((id) => attempt(id, { transcriptIntegrity: undefined, audioMetrics: undefined }));
  const model = buildMockTrainingLoopModel({ session: session({ sessionAnalysis: { ...session().sessionAnalysis!, improvements: ["구조"] } }), attempts: rows, ...saturated });
  assert.equal(mockEvidenceMode(session(), rows), "text_analysis");
  assert.equal(model.improvementPoints.some((p) => p.source === "audio_metrics" || p.source === "speech_metrics"), false);
});

// 14
test("nonverbal data never enters the mock strengths or improvements", () => {
  const rows = ["a1", "a2", "a3"].map((id) => attempt(id, { contentAnalysis: content() }));
  const model = buildMockTrainingLoopModel({ session: session(), attempts: rows, ...saturated });
  assert.equal(JSON.stringify(model).includes("nonverbal"), false);
});

// 15-16
test("retake keeps the session lineage and the airline", () => {
  const previous = session({ id: "m0", completedAt: "2026-09-24T10:00:00.000Z", airlineId: "jin_air" });
  const model = buildMockTrainingLoopModel({ session: session({ airlineId: "jin_air" }), sessions: [previous], attempts: threeAttempts, ...saturated });
  assert.equal(model.context.previousSessionId, "m0");
  assert.deepEqual(model.retakeAction?.target, { kind: "mock_start", airlineId: "jin_air" });
});

// 17
test("focused retake repeats the same mock and quotes a real improvement point", () => {
  const model = buildMockTrainingLoopModel({
    session: session({ sessionAnalysis: { ...session().sessionAnalysis!, improvements: ["결과를 더 구체화해 보세요"] } }),
    attempts: threeAttempts,
    ...saturated,
  });
  assert.equal(model.focusedRetakeAction?.reason, "결과를 더 구체화해 보세요");
  assert.deepEqual(model.focusedRetakeAction?.target, model.retakeAction?.target);
});

// 18-19
test("no score, probability or trait judgement is produced", () => {
  const model = buildMockTrainingLoopModel({
    session: session({ sessionAnalysis: { ...session().sessionAnalysis!, strengths: ["결론이 명확했어요"], improvements: ["행동을 구체화해 보세요"] } }),
    attempts: threeAttempts,
    ...saturated,
  });
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /readiness|합격 확률|적합도|향상도|\d+점 개선|\d+%/);
  for (const phrase of ["자신감이 부족", "성격이", "소극적", "서비스 마인드", "승무원 적합"]) assert.equal(serialized.includes(phrase), false, phrase);
});

// 20-21
test("comparison reports completion and duration as measured facts", () => {
  const previous = session({ id: "m0", attemptIds: ["b1", "b2"], completedAt: "2026-09-24T10:00:00.000Z" });
  const olderAttempts = ["b1", "b2"].map((id) => attempt(id, { durationSeconds: 50 }));
  const model = buildMockTrainingLoopModel({ session: session(), sessions: [previous], attempts: [...threeAttempts, ...olderAttempts], ...saturated });
  assert.deepEqual(model.comparison?.deltas.find((d) => d.key === "completed"), { key: "completed", label: "기록한 문항", before: "2/3", after: "3/3" });
  assert.equal(model.comparison?.deltas.every((d) => !/%/.test(d.before + d.after)), true);
});

// 22
test("history is capped at three same-configuration sessions", () => {
  const history = [1, 2, 3, 4].map((n) => session({ id: `m${n}`, completedAt: `2026-09-2${n}T10:00:00.000Z` }));
  const model = buildMockTrainingLoopModel({ session: session({ id: "m9", completedAt: "2026-09-25T11:00:00.000Z" }), sessions: history, attempts: threeAttempts, ...saturated });
  assert.equal(model.history.length, MAX_TRAINING_HISTORY);
  assert.deepEqual(model.history.map((h) => h.attemptId), ["m4", "m3", "m2"]);
});

// 23
test("next practice proposes the application answer first", () => {
  const model = buildMockTrainingLoopModel({ session: session({ airlineId: "jin_air" }), attempts: threeAttempts, applicationAnswerCount: 0, selfIntroductions: [selfIntro()] });
  assert.deepEqual(model.nextAction?.target, { kind: "application_coach", airlineId: "jin_air" });
});

// 24
test("next practice falls through to the airline journey action", () => {
  const model = buildMockTrainingLoopModel({ session: session({ airlineId: "jin_air" }), attempts: threeAttempts, ...saturated, journeyAction: { kind: "interview", label: "예상 질문 연습", reason: "이유", questionId: "im2" } });
  assert.deepEqual(model.nextAction?.target, { kind: "interview_question", questionId: "im2", airlineId: "jin_air" });
});

// 25
test("next practice offers a saved queue question", () => {
  const model = buildMockTrainingLoopModel({
    session: session(),
    attempts: threeAttempts,
    ...saturated,
    queue: [{ id: "q1", questionId: "cs1", status: "open", priority: 1, reason: "retake_requested", createdAt: "2026-09-24T00:00:00.000Z" } as never],
  });
  assert.deepEqual(model.nextAction?.target, { kind: "interview_question", questionId: "cs1", airlineId: undefined, queueItemId: "q1" });
});

// 26
test("next practice proposes the self introduction when none was completed", () => {
  const model = buildMockTrainingLoopModel({ session: session(), attempts: threeAttempts, applicationAnswerCount: 1, selfIntroductions: [] });
  assert.deepEqual(model.nextAction?.target, { kind: "self_introduction", targetSeconds: 60 });
});

// 27
test("next practice finally falls back to the daily target", () => {
  const model = buildMockTrainingLoopModel({ session: session(), attempts: threeAttempts, ...saturated, dailyFallback: { kind: "experience_library" } });
  assert.deepEqual(model.nextAction?.target, { kind: "experience_library" });
});

// 28
test("the mock that was just completed is never proposed as the next practice", () => {
  for (const input of [
    { ...saturated },
    { applicationAnswerCount: 0, selfIntroductions: [selfIntro()] },
    { applicationAnswerCount: 1, selfIntroductions: [] },
    { ...saturated, dailyFallback: { kind: "experience_library" as const } },
  ]) {
    const model = buildMockTrainingLoopModel({ session: session({ airlineId: "jin_air" }), attempts: threeAttempts, ...input });
    assert.notEqual(model.nextAction?.target.kind, "mock_start");
  }
});

// 29-31
test("a mock counts as one session, never as its question attempts", () => {
  const model = buildMockTrainingLoopModel({ session: session(), attempts: threeAttempts, ...saturated });
  assert.equal(model.context.completedQuestionCount, 3);
  assert.equal(model.context.mockSessionId, "m1");
  assert.equal(model.summary.previousAttemptCount, 0);
  const withHistory = buildMockTrainingLoopModel({ session: session(), sessions: [session({ id: "m0", completedAt: "2026-09-24T10:00:00.000Z" })], attempts: threeAttempts, ...saturated });
  assert.equal(withHistory.summary.previousAttemptCount, 1);
});

// 32
test("follow-up attempts are not counted as session questions", () => {
  const rows = [attempt("a1"), attempt("a2"), attempt("a3", { isFollowUp: true })];
  const model = buildMockTrainingLoopModel({ session: session(), attempts: rows, ...saturated });
  assert.equal(model.context.completedQuestionCount, 2);
  assert.equal(model.improvementPoints.some((p) => p.key === "mock-unanswered"), true);
});

// 33
test("another airline's mock never reaches this session's history", () => {
  const jin = session({ id: "j1", airlineId: "jin_air", completedAt: "2026-09-24T10:00:00.000Z" });
  const korean = session({ id: "k1", airlineId: "korean_air", completedAt: "2026-09-24T11:00:00.000Z" });
  assert.deepEqual(previousMockSessionsFor(session({ id: "j2", airlineId: "jin_air" }), [jin, korean]).map((s) => s.id), ["j1"]);
});

// 34-35
test("an in-progress session stays resumable and a completed one does not", () => {
  const running = buildMockTrainingLoopModel({ session: session({ status: "in_progress" }), attempts: threeAttempts, ...saturated });
  assert.equal(running.completed, false);
  const done = buildMockTrainingLoopModel({ session: session(), attempts: threeAttempts, ...saturated });
  assert.equal(done.retakeAction?.kind, "retake");
  assert.equal(JSON.stringify(done).includes("resume"), false);
});

// 36
test("question provenance is not rewritten by the mock loop", () => {
  const rows = ["a1", "a2", "a3"].map((id) =>
    attempt(id, { sourceContext: { source: "airline_workspace", airlineId: "jin_air", questionProvenance: "OFFICIAL_ARCHIVE" } as InterviewAttempt["sourceContext"] }),
  );
  const model = buildMockTrainingLoopModel({ session: session({ airlineId: "jin_air" }), attempts: rows, ...saturated });
  assert.equal(JSON.stringify(model).includes("OFFICIAL_CURRENT"), false);
});

// 37
test("the single interview loop keeps its own contract", () => {
  const model = buildTrainingLoopModel({
    attempt: attempt("x1", { contentAnalysis: content({ strongPoints: ["결론이 명확했어요"] }) }),
    sessions: [session()],
    selfIntroductions: [selfIntro()],
    applicationAnswerCount: 1,
  });
  assert.equal(model.context.trainingType, "single_interview");
  assert.equal(model.retakeAction?.label, "같은 질문 다시 연습");
  assert.equal(model.strengths[0].message, "결론이 명확했어요");
});

// 38
test("the self introduction loop keeps its own contract", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: selfIntro(), sessions: [session()], applicationAnswerCount: 1 });
  assert.equal(model.context.trainingType, "self_introduction");
  assert.equal(model.retakeAction?.label, "같은 자기소개 다시 연습");
});

test("the same input always produces the same mock model", () => {
  const input: MockTrainingLoopInput = { session: session(), sessions: [session({ id: "m0", completedAt: "2026-09-24T10:00:00.000Z" })], attempts: threeAttempts, ...saturated };
  assert.deepEqual(buildMockTrainingLoopModel(input), buildMockTrainingLoopModel(input));
});
