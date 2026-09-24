import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSelfIntroTrainingLoopModel,
  buildTrainingLoopModel,
  consecutiveSelfIntroAttempts,
  previousSelfIntroAttemptsFor,
  MAX_TRAINING_HISTORY,
  MAX_TRAINING_IMPROVEMENTS,
  MAX_TRAINING_STRENGTHS,
  NO_IMPROVEMENT_MESSAGE,
  type SelfIntroTrainingLoopInput,
} from "@/lib/training-loop";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import type { InterviewSession } from "@/lib/mock-interview-session";

const actual = { mode: "actual_audio" as const, isActualTranscription: true };

const challenge = (over: Record<string, unknown> = {}) => ({
  summary: "요약",
  strengths: [],
  improvements: [],
  structure: { opening: "present", strength: "present", experience: "present", motivation: "present" },
  timing: { targetSeconds: 60, actualSeconds: 58, differenceSeconds: -2, status: "close", feedback: "" },
  nextPractice: [],
  ...over,
});

const intro = (over: Partial<SelfIntroductionAttempt> = {}): SelfIntroductionAttempt =>
  ({
    id: "s1",
    createdAt: "2026-09-24T10:00:00.000Z",
    transcript: "안녕하세요. 고객 응대 경험을 바탕으로 지원했습니다.",
    transcriptIntegrity: actual,
    durationSeconds: 58,
    analysis: { bestPoint: "", firstImprovement: "", challenge: challenge() },
    attemptNumber: 1,
    completed: true,
    targetSeconds: 60,
    practiceLanguage: "ko",
    ...over,
  }) as unknown as SelfIntroductionAttempt;

const session = (status: InterviewSession["status"] = "completed"): InterviewSession =>
  ({ id: "m1", status, startedAt: "2026-09-23T00:00:00.000Z", questionIds: ["im1"], attemptIds: [], currentQuestionIndex: 0 }) as unknown as InterviewSession;

/** Downstream work already done, so the next-action ladder is easy to pin. */
const saturated: SelfIntroTrainingLoopInput = { sessions: [session()], applicationAnswerCount: 1 };

// 1
test("a completed self introduction produces the shared loop model", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro(), ...saturated });
  assert.equal(model.completed, true);
  assert.equal(model.context.trainingType, "self_introduction");
  assert.equal(model.retakeAction?.label, "같은 자기소개 다시 연습");
});

// 2-4
test("each of the 30/60/90 modes is carried in the context", () => {
  for (const seconds of [30, 60, 90] as const) {
    const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ targetSeconds: seconds }), ...saturated });
    assert.equal(model.context.selfIntroMode, seconds);
  }
});

// 5-6
test("the practice language is carried in the context", () => {
  assert.equal(buildSelfIntroTrainingLoopModel({ attempt: intro({ practiceLanguage: "ko" }), ...saturated }).context.language, "ko");
  assert.equal(buildSelfIntroTrainingLoopModel({ attempt: intro({ practiceLanguage: "en" }), ...saturated }).context.language, "en");
});

// 7
test("comparison uses the previous attempt of the same mode and language", () => {
  const previous = intro({ id: "s0", createdAt: "2026-09-24T08:00:00.000Z", durationSeconds: 71 });
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ id: "s2", attemptNumber: 2 }), attempts: [previous], ...saturated });
  assert.equal(model.comparison?.previousAttemptId, "s0");
  assert.deepEqual(model.comparison?.deltas.find((d) => d.key === "duration"), { key: "duration", label: "답변 시간", before: "71초", after: "58초" });
});

// 8
test("a different duration mode is never compared", () => {
  const thirty = intro({ id: "s30", targetSeconds: 30, createdAt: "2026-09-24T08:00:00.000Z" });
  assert.deepEqual(previousSelfIntroAttemptsFor(intro({ id: "s60", targetSeconds: 60 }), [thirty]), []);
  assert.equal(buildSelfIntroTrainingLoopModel({ attempt: intro({ id: "s60", targetSeconds: 60 }), attempts: [thirty], ...saturated }).comparison, undefined);
});

// 9
test("a different practice language is never compared", () => {
  const english = intro({ id: "sen", practiceLanguage: "en", createdAt: "2026-09-24T08:00:00.000Z" });
  assert.deepEqual(previousSelfIntroAttemptsFor(intro({ id: "sko", practiceLanguage: "ko" }), [english]), []);
});

// 10
test("a generic self introduction gets no airline and no invented question", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ targetAirlineId: undefined }), ...saturated });
  assert.equal(model.context.airlineId, undefined);
  assert.equal(model.context.questionId, undefined);
});

// 11
test("an airline-targeted self introduction keeps its airline lineage", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ targetAirlineId: "jin_air" }), ...saturated });
  assert.equal(model.context.airlineId, "jin_air");
});

// 12-15
test("retake lineage keeps the attempt chain, mode and language", () => {
  const current = intro({ id: "s2", attemptNumber: 2, previousAttemptId: "s1", targetSeconds: 90, practiceLanguage: "en", targetAirlineId: "jin_air" });
  const model = buildSelfIntroTrainingLoopModel({ attempt: current, ...saturated });
  assert.equal(model.context.previousAttemptId, "s1");
  assert.equal(model.context.attemptNumber, 2);
  assert.equal(model.context.selfIntroMode, 90);
  assert.equal(model.context.language, "en");
  assert.equal(model.context.airlineId, "jin_air");
});

// 16
test("an audio-only self introduction produces no transcript-based feedback", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({
      transcriptIntegrity: { mode: "unavailable", isActualTranscription: false } as SelfIntroductionAttempt["transcriptIntegrity"],
      transcript: "",
      audioMetrics: { pauses: { longCount: 3 } } as unknown as SelfIntroductionAttempt["audioMetrics"],
      analysis: { bestPoint: "좋았어요", firstImprovement: "구조를 정리해 보세요", challenge: challenge({ strengths: ["강점"], improvements: ["보완"] }) } as unknown as SelfIntroductionAttempt["analysis"],
    }),
    ...saturated,
  });
  assert.equal(model.evidenceMode, "audio_only");
  assert.deepEqual(model.strengths, []);
  assert.equal(model.improvementPoints.every((p) => p.source !== "content_analysis"), true);
  assert.equal(model.improvementPoints.some((p) => p.key === "self-long-pause"), true);
});

// 17
test("a text self introduction produces no audio or speech feedback", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({
      transcriptIntegrity: undefined,
      audioMetrics: undefined,
      speechMetrics: { fillers: { totalCount: 9 } } as unknown as SelfIntroductionAttempt["speechMetrics"],
      analysis: { bestPoint: "", firstImprovement: "", challenge: challenge({ improvements: ["구조"] }) } as unknown as SelfIntroductionAttempt["analysis"],
    }),
    ...saturated,
  });
  assert.equal(model.evidenceMode, "text_analysis");
  assert.equal(model.improvementPoints.some((p) => p.source === "speech_metrics" || p.source === "audio_metrics" || p.source === "timing"), false);
});

// 18
test("strengths never exceed three entries", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({ analysis: { bestPoint: "E", firstImprovement: "", challenge: challenge({ strengths: ["A", "B", "C", "D"] }) } as unknown as SelfIntroductionAttempt["analysis"] }),
    ...saturated,
  });
  assert.equal(model.strengths.length, MAX_TRAINING_STRENGTHS);
});

// 19
test("improvement points never exceed three entries", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({ analysis: { bestPoint: "", firstImprovement: "E", challenge: challenge({ improvements: ["A", "B", "C", "D"] }) } as unknown as SelfIntroductionAttempt["analysis"] }),
    ...saturated,
  });
  assert.equal(model.improvementPoints.length, MAX_TRAINING_IMPROVEMENTS);
});

// 20-21
test("no trait inference, readiness or fabricated improvement score is produced", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({ analysis: { bestPoint: "결론이 명확했어요", firstImprovement: "행동을 구체화해 보세요", challenge: challenge() } as unknown as SelfIntroductionAttempt["analysis"] }),
    ...saturated,
  });
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /readiness|합격 확률|적합도|향상도|\d+점 개선|\d+%/);
  for (const phrase of ["자신감이 부족", "성격이", "소극적", "서비스 마인드", "승무원 적합"]) assert.equal(serialized.includes(phrase), false, phrase);
});

test("nothing is claimed when the analyzer found no improvement", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro(), ...saturated });
  assert.equal(model.noImprovementFound, true);
  assert.doesNotMatch(NO_IMPROVEMENT_MESSAGE, /완벽|합격/);
});

// 22
test("a duration miss is reported as a factual target-versus-actual pair", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({ analysis: { bestPoint: "", firstImprovement: "", challenge: challenge({ timing: { targetSeconds: 60, actualSeconds: 41, differenceSeconds: -19, status: "short", feedback: "" } }) } as unknown as SelfIntroductionAttempt["analysis"] }),
    ...saturated,
  });
  const duration = model.improvementPoints.find((p) => p.key === "self-duration");
  assert.equal(duration?.message, "목표 60초 · 실제 41초입니다.");
  assert.equal(duration?.source, "timing");
  assert.doesNotMatch(duration!.message, /점|%/);
});

test("a duration inside the target produces no timing point", () => {
  assert.equal(buildSelfIntroTrainingLoopModel({ attempt: intro(), ...saturated }).improvementPoints.some((p) => p.key === "self-duration"), false);
});

// 23
test("focused retake repeats the same exercise and quotes a real improvement point", () => {
  const model = buildSelfIntroTrainingLoopModel({
    attempt: intro({ analysis: { bestPoint: "", firstImprovement: "", challenge: challenge({ improvements: ["구조를 정리해 보세요"] }) } as unknown as SelfIntroductionAttempt["analysis"] }),
    ...saturated,
  });
  assert.equal(model.focusedRetakeAction?.reason, "구조를 정리해 보세요");
  assert.deepEqual(model.focusedRetakeAction?.target, model.retakeAction?.target);
});

// 24
test("the loop never proposes the self introduction that was just practised", () => {
  const history = [intro({ id: "s1", createdAt: "2026-09-24T08:00:00.000Z" }), intro({ id: "s2", attemptNumber: 2, createdAt: "2026-09-24T09:00:00.000Z" })];
  const current = intro({ id: "s3", attemptNumber: 3, createdAt: "2026-09-24T10:00:00.000Z" });
  assert.equal(consecutiveSelfIntroAttempts(current, history), 3);
  for (const input of [{ ...saturated }, { sessions: [], applicationAnswerCount: 1 }, { sessions: [session()], applicationAnswerCount: 0 }]) {
    const model = buildSelfIntroTrainingLoopModel({ attempt: current, attempts: history, ...input });
    assert.notEqual(model.nextAction?.target.kind, "self_introduction");
  }
});

// 25
test("next practice proposes the mock interview when none was completed", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ targetAirlineId: "jin_air" }), sessions: [], applicationAnswerCount: 1 });
  assert.deepEqual(model.nextAction?.target, { kind: "mock_start", airlineId: "jin_air" });
});

// 26
test("next practice proposes the application answer once a mock exists", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ targetAirlineId: "jin_air" }), sessions: [session()], applicationAnswerCount: 0 });
  assert.deepEqual(model.nextAction?.target, { kind: "application_coach", airlineId: "jin_air" });
});

// 27
test("next practice falls through to the airline journey action", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ targetAirlineId: "jin_air" }), ...saturated, journeyAction: { kind: "mock", label: "Quick 5 모의면접", reason: "이유" } });
  assert.deepEqual(model.nextAction?.target, { kind: "mock_start", airlineId: "jin_air" });
});

// 28
test("next practice finally falls back to the daily target", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro(), ...saturated, dailyFallback: { kind: "experience_library" } });
  assert.deepEqual(model.nextAction?.target, { kind: "experience_library" });
});

// 29-31
test("the loop reports counts without owning any completion or storage", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ id: "s2", attemptNumber: 2 }), attempts: [intro({ id: "s1", createdAt: "2026-09-24T08:00:00.000Z" })], ...saturated });
  assert.deepEqual(model.summary, { completedLabel: "완료", improvementCount: 0, previousAttemptCount: 1 });
  assert.doesNotMatch(JSON.stringify(model), /dailyCompleted|weeklyCompleted|completionEvent/);
});

// 32
test("another airline's self introduction never reaches this history", () => {
  const jin = intro({ id: "j1", targetAirlineId: "jin_air", createdAt: "2026-09-24T08:00:00.000Z" });
  const korean = intro({ id: "k1", targetAirlineId: "korean_air", createdAt: "2026-09-24T09:00:00.000Z" });
  assert.deepEqual(previousSelfIntroAttemptsFor(intro({ id: "j2", targetAirlineId: "jin_air" }), [jin, korean]).map((a) => a.id), ["j1"]);
});

// 33
test("history is capped at three same-mode attempts", () => {
  const history = [1, 2, 3, 4].map((n) => intro({ id: `s${n}`, attemptNumber: n, createdAt: `2026-09-2${n}T00:00:00.000Z` }));
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ id: "s5", attemptNumber: 5, createdAt: "2026-09-25T00:00:00.000Z" }), attempts: history, ...saturated });
  assert.equal(model.history.length, MAX_TRAINING_HISTORY);
  assert.deepEqual(model.history.map((h) => h.attemptId), ["s4", "s3", "s2"]);
});

// 34-35
test("an incomplete self introduction offers no retake, next or history", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro({ completed: false }), attempts: [intro({ id: "old" })], ...saturated });
  assert.equal(model.completed, false);
  assert.equal(model.retakeAction, undefined);
  assert.equal(model.nextAction, undefined);
  assert.deepEqual(model.history, []);
});

test("a completed self introduction offers retake and next, never resume", () => {
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro(), ...saturated });
  assert.equal(model.retakeAction?.kind, "retake");
  assert.equal(JSON.stringify(model).includes("resume"), false);
});

// 36
test("the single interview loop keeps its own contract untouched", () => {
  const attempt = {
    id: "a1", questionId: "im2", category: "introduction_and_motivation", createdAt: "2026-09-24T10:00:00.000Z",
    transcript: "답변", transcriptIntegrity: actual, durationSeconds: 70, analysis: {}, attemptNumber: 1, completed: true,
    contentAnalysis: { version: 1, answerSummary: { oneLineSummary: "", keyPoints: [] }, structure: { detected: "star", missingParts: [], parts: [] }, relevance: { status: "direct", missingPoints: [] }, competencies: [], answerQuality: { genericClaims: [], evidenceStatements: [] }, strongPoints: ["결론이 명확했어요"], improvementPoints: [{ priority: 1, message: "행동을 구체화해 보세요" }], sentenceCoaching: [] },
  } as unknown as InterviewAttempt;
  const model = buildTrainingLoopModel({ attempt, selfIntroductions: [intro()], sessions: [session()], applicationAnswerCount: 1 });
  assert.equal(model.context.trainingType, "single_interview");
  assert.equal(model.strengths[0].message, "결론이 명확했어요");
  assert.equal(model.retakeAction?.label, "같은 질문 다시 연습");
  assert.deepEqual(model.retakeAction?.target, { kind: "interview_question", questionId: "im2", airlineId: undefined });
});

test("the same input always produces the same self introduction model", () => {
  const input: SelfIntroTrainingLoopInput = { attempt: intro(), attempts: [intro({ id: "s0", createdAt: "2026-09-24T08:00:00.000Z" })], ...saturated };
  assert.deepEqual(buildSelfIntroTrainingLoopModel(input), buildSelfIntroTrainingLoopModel(input));
});
