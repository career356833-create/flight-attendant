import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationDrillSourceContext,
  selectApplicationInterviewDrills,
} from "./application-interview-drill";
import type {
  ApplicationAnswer,
  ApplicationAnswerVersion,
} from "./application-answer-repository";
import type {
  AnswerQualityDimension,
  AnswerQualityFinding,
  AnswerQualityStatus,
} from "./answer-quality-rubric";
import { getPracticeQuestionsForAirline } from "./airline-knowledge-repository";
import { interviewQuestions } from "./interview-practice-data";
import { rubricFindingToWeaknessEvidence } from "./learning-analytics-adaptive";

const finding = (
  dimension: AnswerQualityDimension,
  status: AnswerQualityStatus = "needs_improvement",
): AnswerQualityFinding => ({
  dimension,
  status,
  evidence: [],
  feedback: `${dimension} 보완 근거`,
  confidence: "high",
});

const answer = (patch: Partial<ApplicationAnswer> = {}): ApplicationAnswer => ({
  id: "answer-current",
  promptId: "motivation-practice",
  documentType: "motivation_statement",
  title: "지원 동기",
  status: "reviewed",
  selectedExperienceIds: ["experience-1"],
  experienceSnapshots: [],
  currentVersionId: "version-current",
  versionIds: ["version-old", "version-current"],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  ...patch,
});

const version = (
  findings: AnswerQualityFinding[],
  patch: Partial<ApplicationAnswerVersion> = {},
): ApplicationAnswerVersion => ({
  id: "version-current",
  answerId: "answer-current",
  version: 2,
  content: "현재 지원서 답변",
  characterCount: 10,
  analysis: {
    overallCompleteness: 70,
    strongestPoint: "근거",
    firstImprovement: "구체성",
    evaluations: [],
    airlineContextLimited: true,
    rubric: {
      version: 1,
      evaluated: true,
      context: "application",
      findings,
      strengths: [],
      improvements: findings.map((item) => item.feedback),
      followUpCandidates: [],
    },
    analyzedAt: "2026-08-02T00:00:00.000Z",
  },
  changeReason: "manual_edit",
  createdAt: "2026-08-02T00:00:00.000Z",
  ...patch,
});

test("application rubric weaknesses map to deterministic drill categories", () => {
  const cases: Array<[AnswerQualityDimension, string]> = [
    ["airlineFit", "introduction_and_motivation"],
    ["specificity", "behavioral_experience"],
    ["evidence", "behavioral_experience"],
    ["structure", "introduction_and_motivation"],
    ["relevance", "introduction_and_motivation"],
    ["action", "behavioral_experience"],
    ["result", "behavioral_experience"],
  ];
  for (const [dimension, category] of cases) {
    const drill = selectApplicationInterviewDrills({
      answer: answer(),
      version: version([finding(dimension)]),
    })[0];
    assert.equal(drill.question.category, category);
  }
});

test("strong, adequate and not-applicable findings do not create negative drills", () => {
  const drills = selectApplicationInterviewDrills({
    answer: answer(),
    version: version([
      finding("relevance", "strong"),
      finding("specificity", "adequate"),
      finding("airlineFit", "not_applicable"),
    ]),
  });
  assert.deepEqual(drills, []);
});

test("published airline data without explicit AI opt-in falls back to generic", () => {
  const airlineQuestions = getPracticeQuestionsForAirline({
    airlineId: "emirates",
    includeGeneralQuestions: false,
  });
  const drill = selectApplicationInterviewDrills({
    answer: answer({ airlineId: "emirates" }),
    version: version([finding("airlineFit", "insufficient_evidence")]),
    airlineQuestions,
  })[0];
  assert.equal(airlineQuestions.length, 0);
  assert.equal(drill.targetAirlineId, undefined);
  assert.equal(drill.question.airlineTags?.length ?? 0, 0);
});

test("missing airline context falls back to a generic motivation question", () => {
  const drill = selectApplicationInterviewDrills({
    answer: answer({ airlineId: "unknown-airline" }),
    version: version([finding("airlineFit", "insufficient_evidence")]),
  })[0];
  assert.equal(drill.targetAirlineId, undefined);
  assert.equal(drill.question.category, "introduction_and_motivation");
  assert.equal(drill.question.airlineTags?.length ?? 0, 0);
});

test("recent and open questions are avoided when alternatives exist", () => {
  const behavioral = interviewQuestions.filter(
    (item) => item.category === "behavioral_experience",
  );
  const drill = selectApplicationInterviewDrills({
    answer: answer(),
    version: version([finding("specificity")]),
    recentQuestionIds: [behavioral[0].id],
    openQuestionIds: [behavioral[1].id],
  })[0];
  assert.notEqual(drill.questionId, behavioral[0].id);
  assert.notEqual(drill.questionId, behavioral[1].id);
});

test("question ids are deduplicated and recommendations are capped at three", () => {
  const drills = selectApplicationInterviewDrills({
    answer: answer(),
    version: version([
      finding("specificity"),
      finding("evidence"),
      finding("action"),
      finding("result"),
      finding("structure"),
    ]),
  });
  assert.ok(drills.length <= 3);
  assert.equal(new Set(drills.map((item) => item.questionId)).size, drills.length);
  assert.equal(drills[0].priority, "primary");
  assert.ok(drills.slice(1).every((item) => item.priority === "secondary"));
});

test("selected experience and exact current application version are carried to practice", () => {
  const drill = selectApplicationInterviewDrills({
    answer: answer(),
    version: version([finding("evidence")]),
  })[0];
  const source = applicationDrillSourceContext(drill);
  assert.equal(drill.selectedExperienceId, "experience-1");
  assert.equal(source.applicationAnswerId, "answer-current");
  assert.equal(source.applicationVersionId, "version-current");
  assert.equal(source.source, "application_drill");
});

test("legacy or non-current analysis produces no drill", () => {
  const old = version([finding("specificity")], { id: "version-old" });
  assert.equal(
    selectApplicationInterviewDrills({ answer: answer(), version: undefined })
      .length,
    0,
  );
  assert.equal(
    selectApplicationInterviewDrills({ answer: answer(), version: old }).length,
    0,
  );
});

test("an improved interview rubric remains consumable by the existing adaptive loop", () => {
  const evidence = rubricFindingToWeaknessEvidence(
    finding("airlineFit", "adequate"),
    {
      sourceType: "interview_attempt",
      sourceId: "attempt-1",
      familyId: "application-drill-family",
      occurredAt: "2026-08-03T00:00:00.000Z",
      questionId: "im1",
      questionType: "introduction_and_motivation",
    },
  );
  assert.equal(evidence?.key, "weak_airline_connection");
  assert.equal(evidence?.signal, "improved");
});

test("candidate creation has no completion or Azure dependency", () => {
  const before = JSON.stringify(answer());
  const input = answer();
  const drills = selectApplicationInterviewDrills({
    answer: input,
    version: version([finding("evidence")]),
  });
  assert.ok(drills.length > 0);
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(drills).includes("azure"), false);
  assert.equal(JSON.stringify(drills).includes("completed"), false);
});
