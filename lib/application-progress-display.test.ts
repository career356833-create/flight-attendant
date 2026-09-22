import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applicationAnswerProgress,
  applicationProgressLabelsEn,
  applicationProgressLabelsKo,
  applicationQuestionProgress,
} from "@/lib/application-progress-display";
import { buildAirlineJourneyState } from "@/lib/airline-target-journey";
import { buildPreparationStatus } from "@/lib/airline-targeting-workspace";
import type { WorkspaceQuestion } from "@/lib/airline-targeting-workspace";
import type { ApplicationAnswer } from "@/lib/application-answer-repository";

const zeroDenominatorRatio = /\b\d+\s*\/\s*0\b/;

const officialApplicationQuestion = (id: string, airlineId = "jin_air") =>
  ({
    id,
    airlineId,
    kind: "APPLICATION",
    category: "MOTIVATION",
    questionText: `official application question ${id}`,
    sourceType: "OFFICIAL_POSTING",
    locale: "ko",
    role: "cabin_crew",
    year: 2025,
    moderationStatus: "ACCEPTED",
  }) as unknown as WorkspaceQuestion;

const answer = (id: string, promptId: string | undefined, airlineId = "jin_air") =>
  ({
    id,
    airlineId,
    promptId,
    title: `answer ${id}`,
    status: "reviewed",
    selectedExperienceIds: [],
    versionIds: [id],
    updatedAt: "2026-09-23T00:00:00.000Z",
    createdAt: "2026-09-23T00:00:00.000Z",
  }) as unknown as ApplicationAnswer;

// 1. official questions 0 / answers 0
test("no official question and no answer renders an empty label, not a ratio", () => {
  const display = applicationAnswerProgress({ answerCount: 0, officialQuestionCount: 0 });
  assert.equal(display.mode, "empty");
  assert.equal(display.value, applicationProgressLabelsKo.none);
  assert.equal(display.caption, applicationProgressLabelsKo.noOfficialApplicationQuestions);
  assert.doesNotMatch(display.value, zeroDenominatorRatio);
});

// 2. official questions 0 / answers 1
test("no official question and one saved answer renders a plain count", () => {
  const display = applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 0 });
  assert.equal(display.mode, "count");
  assert.equal(display.value, "1개");
  assert.equal(display.caption, applicationProgressLabelsKo.noOfficialApplicationQuestions);
  assert.doesNotMatch(display.value, zeroDenominatorRatio);
});

// 3. official questions 0 / answers 3
test("no official question and three saved answers renders a plain count", () => {
  const display = applicationAnswerProgress({ answerCount: 3, officialQuestionCount: 0 });
  assert.equal(display.mode, "count");
  assert.equal(display.value, "3개");
  assert.doesNotMatch(display.value, zeroDenominatorRatio);
});

// 4. official questions 3 / answers 0
test("official questions without answers keep the existing ratio", () => {
  const display = applicationAnswerProgress({ answerCount: 0, officialQuestionCount: 3 });
  assert.equal(display.mode, "ratio");
  assert.equal(display.value, "0/3");
  assert.equal(display.caption, applicationProgressLabelsKo.ratioCaption);
});

// 5. official questions 3 / answers 1
test("official questions with one answer keep the existing ratio", () => {
  assert.equal(applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 3 }).value, "1/3");
});

// 6. official questions 3 / answers 3
test("official questions fully answered keep the existing ratio", () => {
  assert.equal(applicationAnswerProgress({ answerCount: 3, officialQuestionCount: 3 }).value, "3/3");
});

// 7. a generic answer is counted as activity but never as an answered official question
test("a generic answer counts as saved activity without becoming an answered official question", () => {
  const answers = [answer("a1", undefined)];
  const journey = buildAirlineJourneyState({ airlineId: "jin_air", questions: [], answers });
  const status = buildPreparationStatus({ airlineId: "jin_air", questions: [], answers, attempts: [], experiences: [] });
  assert.equal(journey.answersDrafted, 1);
  assert.equal(journey.applicationQuestionCount, 0);
  assert.equal(status.answeredApplicationCount, 0);
  assert.equal(status.applicationQuestionCount, 0);
  const display = applicationAnswerProgress({ answerCount: journey.answersDrafted, officialQuestionCount: journey.applicationQuestionCount });
  assert.equal(display.value, "1개");
  assert.doesNotMatch(display.value, zeroDenominatorRatio);
});

// 8. journey completion is untouched by the display change
test("journey application step stays completed for a generic answer", () => {
  const journey = buildAirlineJourneyState({ airlineId: "jin_air", questions: [], answers: [answer("a1", undefined)] });
  const application = journey.steps.find((item) => item.id === "application");
  assert.equal(application?.status, "completed");
  assert.equal(application?.detail, "1개 저장");
});

// 9. workspace tile with zero official questions
test("workspace question tile drops the 0/0 ratio when no official question exists", () => {
  const display = applicationQuestionProgress({ answeredOfficialCount: 0, officialQuestionCount: 0 });
  assert.equal(display.mode, "empty");
  assert.equal(display.value, applicationProgressLabelsKo.none);
  assert.equal(display.caption, applicationProgressLabelsKo.noOfficialApplicationQuestions);
  assert.doesNotMatch(display.value, zeroDenominatorRatio);
});

test("workspace question tile keeps the ratio when official questions exist", () => {
  const questions = [officialApplicationQuestion("q1"), officialApplicationQuestion("q2")];
  const answers = [answer("a1", "q1")];
  const status = buildPreparationStatus({ airlineId: "jin_air", questions, answers, attempts: [], experiences: [] });
  const display = applicationQuestionProgress({ answeredOfficialCount: status.answeredApplicationCount, officialQuestionCount: status.applicationQuestionCount });
  assert.equal(display.mode, "ratio");
  assert.equal(display.value, "1/2");
});

// 10. the application empty state wording stays the source of truth for "no official question"
test("workspace empty state wording and the progress caption agree", () => {
  const source = readFileSync(new URL("../components/airline-targeting/airline-targeting-workspace.tsx", import.meta.url), "utf8");
  assert.match(source, /확인된 공식 지원서 질문이 없습니다/);
  assert.equal(applicationProgressLabelsKo.noOfficialApplicationQuestions, "확인된 공식 지원서 질문 없음");
});

// 11. multi-airline isolation
test("another airline's answers never reach this airline's counters", () => {
  const answers = [answer("a1", undefined, "jin_air"), answer("a2", undefined, "korean_air")];
  const journey = buildAirlineJourneyState({ airlineId: "korean_air", questions: [], answers });
  assert.equal(journey.answersDrafted, 1);
  const display = applicationAnswerProgress({ answerCount: journey.answersDrafted, officialQuestionCount: journey.applicationQuestionCount });
  assert.equal(display.value, "1개");
  const empty = buildAirlineJourneyState({ airlineId: "air_busan", questions: [], answers });
  assert.equal(applicationAnswerProgress({ answerCount: empty.answersDrafted, officialQuestionCount: empty.applicationQuestionCount }).mode, "empty");
});

// 12. ko locale
test("ko labels never produce a zero denominator in any branch", () => {
  for (const officialQuestionCount of [0, 1, 3]) {
    for (const answerCount of [0, 1, 3]) {
      const answers = applicationAnswerProgress({ answerCount, officialQuestionCount }, applicationProgressLabelsKo);
      const questions = applicationQuestionProgress({ answeredOfficialCount: answerCount, officialQuestionCount }, applicationProgressLabelsKo);
      assert.doesNotMatch(answers.value, zeroDenominatorRatio);
      assert.doesNotMatch(questions.value, zeroDenominatorRatio);
      assert.ok(answers.label.length > 0 && answers.caption.length > 0);
    }
  }
});

// 13. en locale
test("en labels never produce a zero denominator and stay text-labelled", () => {
  assert.equal(applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 0 }, applicationProgressLabelsEn).value, "1");
  assert.equal(applicationAnswerProgress({ answerCount: 0, officialQuestionCount: 0 }, applicationProgressLabelsEn).value, "None");
  assert.equal(applicationAnswerProgress({ answerCount: 1, officialQuestionCount: 3 }, applicationProgressLabelsEn).value, "1/3");
  assert.equal(applicationQuestionProgress({ answeredOfficialCount: 0, officialQuestionCount: 0 }, applicationProgressLabelsEn).value, "None");
  for (const officialQuestionCount of [0, 1, 3]) {
    for (const answerCount of [0, 1, 3]) {
      const display = applicationAnswerProgress({ answerCount, officialQuestionCount }, applicationProgressLabelsEn);
      assert.doesNotMatch(display.value, zeroDenominatorRatio);
      assert.equal(display.label, "Application answers");
    }
  }
});

test("negative or non-finite counts degrade to the empty state instead of a ratio", () => {
  assert.equal(applicationAnswerProgress({ answerCount: -2, officialQuestionCount: -1 }).mode, "empty");
  assert.equal(applicationAnswerProgress({ answerCount: Number.NaN, officialQuestionCount: Number.NaN }).mode, "empty");
});

test("neither counter tile renders a raw zero-denominator ratio in the component source", () => {
  const source = readFileSync(new URL("../components/airline-targeting/airline-targeting-workspace.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\{journey\.answersDrafted\}\/\{journey\.applicationQuestionCount\}/);
  assert.doesNotMatch(source, /\{status\.answeredApplicationCount\}\/\{status\.applicationQuestionCount\}/);
  assert.match(source, /data-testid="journey-application-answers"/);
  assert.match(source, /data-testid="workspace-application-questions"/);
});
