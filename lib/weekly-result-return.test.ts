import assert from "node:assert/strict";
import test from "node:test";
import {
  isWeeklyResultReturnEligible,
  type WeeklyResultReturn,
} from "./weekly-result-return";

const weeklyResult: WeeklyResultReturn = {
  context: {
    weeklyTaskId: "weekly-experience-1",
    weekStart: "2026-09-07",
    taskType: "experience_work",
    title: "경험 정리",
    estimatedMinutes: 10,
    relatedCapability: "application_readiness",
    source: "weekly_plan",
    targetKind: "experience",
  },
  entityId: "experience-1",
};

test("completed weekly entity receives only its matching return action", () => {
  assert.equal(isWeeklyResultReturnEligible(weeklyResult, "experience", "experience-1"), true);
  assert.equal(isWeeklyResultReturnEligible(weeklyResult, "experience", "experience-2"), false);
  assert.equal(isWeeklyResultReturnEligible(weeklyResult, "application", "experience-1"), false);
});

test("direct results never receive a weekly return action", () => {
  assert.equal(isWeeklyResultReturnEligible(null, "experience", "experience-1"), false);
});
