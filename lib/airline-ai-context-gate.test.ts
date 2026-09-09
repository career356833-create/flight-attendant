import assert from "node:assert/strict";
import test from "node:test";
import {
  isAirlineKnowledgeEligibleForAiContext,
  isValidAirlineContextSource,
} from "./airline-ai-context-gate";
import {
  getAirlineAIContext,
  getPracticeQuestionsForAirline,
} from "./airline-knowledge-repository";
import { getApplicationAirlineContext } from "./application-answer-repository";
import { getSelfIntroductionAirlineContext } from "./self-introduction-data";

const eligible = {
  verified: true,
  published: true,
  sourceReferences: ["https://example.com/official-source"],
  aiContextEnabled: true,
};

test("all four canonical conditions allow airline AI context", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext(eligible), true);
});

const blockedCases: Array<[string, Record<string, unknown>]> = [
  ["verified false", { verified: false }],
  ["verified missing", { verified: undefined }],
  ["published false", { published: false }],
  ["published missing", { published: undefined }],
  ["sources missing", { sourceReferences: undefined }],
  ["sources empty", { sourceReferences: [] }],
  ["source malformed", { sourceReferences: ["not-a-url"] }],
  ["source protocol unsafe", { sourceReferences: ["javascript:alert(1)"] }],
  ["AI context disabled", { aiContextEnabled: false }],
  ["AI context flag missing", { aiContextEnabled: undefined }],
];

for (const [name, patch] of blockedCases) {
  test(`${name} is blocked`, () => {
    assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, ...patch }), false);
  });
}

test("approved alone does not imply verified", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, verified: false, approved: true } as typeof eligible & { approved: boolean }), false);
});

test("reviewed alone does not imply verified", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, verified: false, reviewed: true } as typeof eligible & { reviewed: boolean }), false);
});

test("active recruitment requirement does not imply AI opt-in", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, aiContextEnabled: false, activeRequirement: true } as typeof eligible & { activeRequirement: boolean }), false);
});

test("legacy empty record is fail-closed", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({}), false);
});

test("http and https sources are accepted", () => {
  assert.equal(isValidAirlineContextSource("https://example.com"), true);
  assert.equal(isValidAirlineContextSource("http://example.com"), true);
});

test("invalid and non-web sources are rejected", () => {
  assert.equal(isValidAirlineContextSource("source-id-only"), false);
  assert.equal(isValidAirlineContextSource("file:///private.txt"), false);
});

test("current legacy profile cannot auto-enable central context", () => {
  assert.equal(getAirlineAIContext("emirates"), null);
});

test("single and mock question selection excludes ineligible airline prompts", () => {
  assert.deepEqual(getPracticeQuestionsForAirline({ airlineId: "emirates", includeGeneralQuestions: false }), []);
});

test("application context safely downgrades when canonical gate blocks", () => {
  assert.equal(getApplicationAirlineContext("emirates"), null);
});

test("self introduction context safely downgrades when canonical gate blocks", () => {
  assert.equal(getSelfIntroductionAirlineContext("emirates"), null);
});

test("unknown airline remains generic", () => {
  assert.equal(getAirlineAIContext("unknown-airline"), null);
});

test("canonical predicate is deterministic and side-effect free", () => {
  const before = JSON.stringify(eligible);
  assert.equal(isAirlineKnowledgeEligibleForAiContext(eligible), true);
  assert.equal(isAirlineKnowledgeEligibleForAiContext(eligible), true);
  assert.equal(JSON.stringify(eligible), before);
});

test("one valid source is sufficient among invalid references", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, sourceReferences: ["bad", "https://example.com/official"] }), true);
});

test("publish-like status cannot bypass explicit published boolean", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, published: false, publishStatus: "published" } as typeof eligible & { publishStatus: string }), false);
});

test("airline selection cannot infer AI context opt-in", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, aiContextEnabled: false, airlineSelected: true } as typeof eligible & { airlineSelected: boolean }), false);
});

test("whitespace source is rejected", () => {
  assert.equal(isAirlineKnowledgeEligibleForAiContext({ ...eligible, sourceReferences: ["   "] }), false);
});
