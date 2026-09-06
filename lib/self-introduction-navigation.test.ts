import assert from "node:assert/strict";
import test from "node:test";

import {
  exitSelfIntroductionForNavigation,
  resolveSelfIntroductionResultNavigation,
} from "./self-introduction-navigation";

test("active self introduction exits to Home", () => {
  assert.deepEqual(exitSelfIntroductionForNavigation("home"), {
    activeNav: "home",
    trainingView: "dashboard",
    clearActiveWeeklyTask: true,
    clearChallengeTarget: true,
  });
});

test("active self introduction exits to Interview", () => {
  assert.equal(
    exitSelfIntroductionForNavigation("interview").activeNav,
    "interview",
  );
});

test("result revisit navigation has no completion side effect", () => {
  assert.equal(
    "completeAttempt" in exitSelfIntroductionForNavigation("home"),
    false,
  );
});

test("history result separates internal Back from Home", () => {
  assert.equal(resolveSelfIntroductionResultNavigation("back", true), "intro");
  assert.equal(resolveSelfIntroductionResultNavigation("home", true), "exit");
  assert.equal(resolveSelfIntroductionResultNavigation("back", false), "exit");
});

test("retake setup navigation does not create an attempt", () => {
  assert.equal(
    "createAttempt" in exitSelfIntroductionForNavigation("interview"),
    false,
  );
});

test("navigation transition does not clear unrelated resume state", () => {
  assert.equal(
    "singleInterviewResume" in exitSelfIntroductionForNavigation("home"),
    false,
  );
});

test("repeated navigation is idempotent", () => {
  assert.deepEqual(
    exitSelfIntroductionForNavigation("home"),
    exitSelfIntroductionForNavigation("home"),
  );
});
