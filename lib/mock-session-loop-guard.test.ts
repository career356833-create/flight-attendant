import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMockTrainingLoopModel, buildSelfIntroTrainingLoopModel, buildTrainingLoopModel } from "@/lib/training-loop";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";

const engine = readFileSync("components/interview-practice/interview-practice-engine.tsx", "utf8");
const mockReport = readFileSync("components/interview-practice/mock-interview-session.tsx", "utf8");
const selfIntro = readFileSync("components/self-introduction/self-introduction-components.tsx", "utf8");

const actual = { mode: "actual_audio" as const, isActualTranscription: true };
const attempt = (over: Partial<InterviewAttempt> = {}): InterviewAttempt =>
  ({
    id: "a1", questionId: "im2", category: "introduction_and_motivation", createdAt: "2026-09-26T10:00:00.000Z",
    transcript: "답변", transcriptIntegrity: actual, durationSeconds: 60, analysis: {}, attemptNumber: 1, completed: true,
    ...over,
  }) as unknown as InterviewAttempt;
const session = (over: Partial<InterviewSession> = {}): InterviewSession =>
  ({
    id: "m1", mode: "general", questionIds: ["im1", "be1", "cs1"], attemptIds: ["a1", "a2", "a3"], currentQuestionIndex: 2,
    status: "completed", startedAt: "2026-09-26T09:00:00.000Z", completedAt: "2026-09-26T10:00:00.000Z",
    sessionAnalysis: { overallSummary: "", strengths: [], improvements: [], competencySummary: [], speechSummary: "", audioSummary: "", contentSummary: "", nextPractice: [] },
    ...over,
  }) as unknown as InterviewSession;
const intro = (): SelfIntroductionAttempt =>
  ({ id: "s1", createdAt: "2026-09-26T00:00:00.000Z", transcript: "", durationSeconds: 60, analysis: {}, attemptNumber: 1, completed: true, targetSeconds: 60, practiceLanguage: "ko" }) as unknown as SelfIntroductionAttempt;

// 1-2. the render condition
test("the practice engine offers its loop only when no mock session is running", () => {
  assert.match(engine, /buildTrainingLoop&&!sessionAction\?<TrainingLoopPanel/);
  assert.equal(engine.includes("{buildTrainingLoop?<TrainingLoopPanel"), false);
});

test("the guard keys off the existing sessionAction prop, not a new flag", () => {
  assert.match(engine, /sessionAction\?:\{label:string;onContinue:\(\)=>void\}/);
  assert.equal(/mockMidSession|isMockRunning|hideTrainingLoop/.test(engine), false);
});

// 3. the session action itself is untouched
test("a mock question result still shows the session action and the in-place retry", () => {
  assert.match(engine, /\{sessionAction&&<section[^]*?onClick=\{sessionAction\.onContinue\}/);
  assert.match(engine, /이 질문 다시 답하기/);
});

// 4. the finished session keeps its own loop
test("the mock report still renders the mock loop panel", () => {
  assert.match(mockReport, /\{trainingLoop ?\? ?<TrainingLoopPanel loop=\{trainingLoop\}/);
});

// 5-6. standalone behaviour is unchanged
test("a standalone interview result keeps its retake and next", () => {
  const model = buildTrainingLoopModel({ attempt: attempt(), selfIntroductions: [], sessions: [], applicationAnswerCount: 0 });
  assert.equal(model.retakeAction?.label, "같은 질문 다시 연습");
  assert.equal(model.nextAction?.kind, "next");
  assert.equal(model.nextAction?.target.kind, "self_introduction");
});

test("the engine still restarts the same question in place for a standalone retake", () => {
  assert.match(engine, /if\(action\.kind==='retake'\|\|action\.kind==='focused_retake'\)\{setCurrentPreviousAttemptId\(attempt\.id\);setStep\('intro'\)/);
});

// 7. nothing about session progress changed
test("hiding the panel does not touch session progress or persistence", () => {
  assert.match(engine, /sessionMode=\{Boolean\(sessionAction\)\}/);
  const model = buildMockTrainingLoopModel({ session: session(), attempts: ["a1", "a2", "a3"].map((id) => attempt({ id })), applicationAnswerCount: 1 });
  assert.equal(model.completed, true);
  assert.equal(model.context.completedQuestionCount, 3);
  assert.equal(model.retakeAction?.label, "같은 모의면접 다시 연습");
});

// 8. self introduction untouched
test("the self introduction result keeps its own loop panel and contract", () => {
  assert.match(selfIntro, /\{trainingLoop ?\? ?<TrainingLoopPanel loop=\{trainingLoop\}/);
  // both the AUDIO ONLY early return and the main branch still host the panel
  assert.equal(selfIntro.split("<TrainingLoopPanel").length - 1, 2);
  assert.equal(selfIntro.includes("sessionAction"), false);
  const model = buildSelfIntroTrainingLoopModel({ attempt: intro(), sessions: [session()], applicationAnswerCount: 1 });
  assert.equal(model.retakeAction?.label, "같은 자기소개 다시 연습");
});
