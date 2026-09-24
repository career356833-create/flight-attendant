import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPreparationHomeModel,
  journeyActionTarget,
  preparationHomeLabelsEn,
  preparationHomeLabelsKo,
  MAX_PREPARATION_GAPS,
  MAX_RECENT_ACTIVITY,
  MAX_QUICK_ACTIONS,
  type PreparationHomeInput,
} from "@/lib/airline-preparation-home";
import type { AirlineJourneyState } from "@/lib/airline-target-journey";
import type { DailyActionCandidate, DailyActionPlan } from "@/lib/daily-action-plan";
import type { LearningActivity } from "@/lib/learning-analytics-service";

const jinAir = { id: "jin_air", name: "Jin Air" };

const candidate = (over: Partial<DailyActionCandidate> & Pick<DailyActionCandidate, "id" | "target">): DailyActionCandidate => ({
  dedupeKey: over.id,
  type: "fallback",
  title: "제목",
  description: "설명",
  reason: "이유",
  priority: 100,
  source: "balanced_fallback",
  resume: false,
  ...over,
});

const plan = (primary: DailyActionCandidate, secondary: DailyActionCandidate[] = []): DailyActionPlan => ({
  primary,
  secondary,
  completedCount: 0,
  totalCount: 1 + secondary.length,
  generatedAt: "2026-09-23T00:00:00.000Z",
});

const journey = (over: Partial<AirlineJourneyState> = {}): AirlineJourneyState =>
  ({
    airlineId: "jin_air",
    companyViewed: true,
    applicationQuestionCount: 0,
    answersDrafted: 0,
    answersReady: 0,
    experiencesLinked: 0,
    interviewQuestionsPracticed: 0,
    interviewAttemptCount: 0,
    selfIntroAttempts: 0,
    mockAttempts: 0,
    recruitmentPeriods: [],
    favoriteCount: 0,
    queueCount: 0,
    steps: [],
    nextRecommendedAction: { kind: "interview", label: "예상 질문 연습", reason: "첫 연습을 시작해 보세요." },
    resumeActions: [],
    recentActivity: [],
    ...over,
  }) as AirlineJourneyState;

const activity = (id: string, title: string, occurredAt: string, airlineId?: string): LearningActivity =>
  ({ id, type: "other", occurredAt, title, sourceEntityType: "system", relatedCapabilityKeys: [], airlineId }) as LearningActivity;

const build = (input: PreparationHomeInput = {}) => buildPreparationHomeModel(input);

// 1. fresh user
test("fresh user gets no airline, no action target and no fabricated activity", () => {
  const model = build();
  assert.equal(model.target.state, "unset");
  assert.equal(model.target.label, preparationHomeLabelsKo.targetUnset);
  assert.equal(model.todayAction, undefined);
  assert.equal(model.airlineNextAction, undefined);
  assert.equal(model.continueAction, undefined);
  assert.equal(model.recentActivity.length, 0);
  assert.equal(model.deadline, undefined);
});

// 2. primary airline only
test("primary airline sets the target header without inventing progress", () => {
  const model = build({ primaryAirline: jinAir, journey: journey() });
  assert.equal(model.target.state, "set");
  assert.equal(model.target.label, "Jin Air 준비 중");
  assert.equal(model.target.airlineId, "jin_air");
  assert.deepEqual(model.summary.map((item) => item.value), ["0개", "0개", "0회", "0회", "0회"]);
});

// 3. resume application
test("an interrupted application draft becomes the continue action", () => {
  const primary = candidate({ id: "p", target: { kind: "self_introduction", targetSeconds: 60 } });
  const draft = candidate({ id: "application-draft:a1", resume: true, createdAt: "2026-09-22T10:00:00.000Z", target: { kind: "application_coach", airlineId: "jin_air", applicationAnswerId: "a1" } });
  const model = build({ dailyPlan: plan(primary, [draft]) });
  assert.equal(model.continueAction?.id, "application-draft:a1");
  assert.equal(model.continueAction?.resume, true);
  assert.equal(model.continueAction?.ctaLabel, preparationHomeLabelsKo.continueCta);
  assert.equal(model.continueAction?.sectionLabel, preparationHomeLabelsKo.continueLabel);
});

// 4. resume interview
test("an interrupted single interview becomes the continue action", () => {
  const primary = candidate({ id: "p", target: { kind: "self_introduction", targetSeconds: 60 } });
  const resume = candidate({ id: "resume:single:q1", resume: true, createdAt: "2026-09-22T11:00:00.000Z", target: { kind: "single_interview_resume", questionId: "q1" } });
  assert.equal(build({ dailyPlan: plan(primary, [resume]) }).continueAction?.target.kind, "single_interview_resume");
});

// 5. resume mock
test("an interrupted mock session becomes the continue action", () => {
  const primary = candidate({ id: "p", target: { kind: "self_introduction", targetSeconds: 60 } });
  const resume = candidate({ id: "resume:s1", resume: true, createdAt: "2026-09-22T12:00:00.000Z", target: { kind: "mock_resume", sessionId: "s1" } });
  assert.equal(build({ dailyPlan: plan(primary, [resume]) }).continueAction?.target.kind, "mock_resume");
});

// 6. resume self intro
test("no self-introduction resume is invented while the app does not persist one", () => {
  const model = build({ primaryAirline: jinAir, journey: journey(), selfIntroductionResume: null });
  assert.equal(model.continueAction, undefined);
});

// 7. most recent resume wins, deterministically
test("the most recent interrupted work is the one offered", () => {
  const primary = candidate({ id: "p", target: { kind: "self_introduction", targetSeconds: 60 } });
  const older = candidate({ id: "resume:old", resume: true, createdAt: "2026-09-20T00:00:00.000Z", target: { kind: "mock_resume", sessionId: "old" } });
  const newer = candidate({ id: "resume:new", resume: true, createdAt: "2026-09-22T00:00:00.000Z", target: { kind: "mock_resume", sessionId: "new" } });
  assert.equal(build({ dailyPlan: plan(primary, [older, newer]) }).continueAction?.id, "resume:new");
});

// 8. deadline priority is carried from the daily engine, not recomputed
test("a deadline-driven daily primary stays the today action", () => {
  const deadlinePrimary = candidate({ id: "deadline:a1:deadline", type: "deadline", source: "deadline", title: "Jin Air 지원서 준비", target: { kind: "application_coach", airlineId: "jin_air" } });
  const model = build({ dailyPlan: plan(deadlinePrimary) });
  assert.equal(model.todayAction?.id, "deadline:a1:deadline");
  assert.equal(model.todayAction?.sectionLabel, preparationHomeLabelsKo.todayLabel);
});

// 9. journey next action
test("the airline journey next action is shown separately from today", () => {
  const primary = candidate({ id: "p", target: { kind: "self_introduction", targetSeconds: 60 } });
  const model = build({ primaryAirline: jinAir, journey: journey({ nextRecommendedAction: { kind: "application", label: "지원서 답변 작성", reason: "확인된 지원서 질문에 아직 저장한 답변이 없습니다." } }), dailyPlan: plan(primary) });
  assert.equal(model.airlineNextAction?.title, "지원서 답변 작성");
  assert.equal(model.airlineNextAction?.sectionLabel, preparationHomeLabelsKo.airlineNextLabel);
  assert.notEqual(model.airlineNextAction?.id, model.todayAction?.id);
});

// 10. the airline action is dropped when it duplicates today's action
test("the airline next action is hidden when it would repeat today's action", () => {
  const primary = candidate({ id: "p", target: { kind: "self_introduction", targetSeconds: 60 } });
  const model = build({ primaryAirline: jinAir, journey: journey({ nextRecommendedAction: { kind: "self_intro", label: "60초 자기소개", reason: "아직 없습니다." } }), dailyPlan: plan(primary) });
  assert.equal(model.airlineNextAction, undefined);
});

// 11. daily fallback
test("with no airline and no journey the daily fallback is still the today action", () => {
  const fallback = candidate({ id: "fallback:balanced", title: "오늘의 균형 면접 연습", target: { kind: "interview_question", questionId: "im2" } });
  const model = build({ dailyPlan: plan(fallback) });
  assert.equal(model.todayAction?.title, "오늘의 균형 면접 연습");
  assert.equal(model.airlineNextAction, undefined);
});

// 12-16. counts come from saved activity only
test("summary reports the journey's saved counts", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 2, experiencesLinked: 1, interviewAttemptCount: 3, selfIntroAttempts: 4, mockAttempts: 5 }) });
  assert.deepEqual(
    model.summary.map((item) => [item.key, item.value]),
    [["answers", "2개"], ["experiences", "1개"], ["interviews", "3회"], ["selfIntros", "4회"], ["mocks", "5회"]],
  );
});

// 17. no readiness score anywhere in the model
test("the model exposes no readiness, probability or fit score", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 2, interviewAttemptCount: 3 }), dailyPlan: plan(candidate({ id: "p", target: { kind: "experience_library" } })) });
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /readiness|Readiness/);
  assert.doesNotMatch(serialized, /score|Score/);
  assert.doesNotMatch(serialized, /probability|합격 확률|적합도|fit/i);
  assert.doesNotMatch(serialized, /\d+%/);
});

// 18-22. gaps
test("each empty activity area becomes a gap phrased as a missing record", () => {
  const model = build({ primaryAirline: jinAir, journey: journey() });
  assert.deepEqual(model.gaps.map((gap) => gap.key), ["answers", "experiences", "interviews"]);
  assert.equal(model.gaps[0].label, "저장한 지원서 답변 없음");
  for (const gap of model.gaps) assert.doesNotMatch(gap.label, /약점|부족|미흡/);
});

test("filled areas drop out of the gap list", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 1, experiencesLinked: 1 }) });
  assert.deepEqual(model.gaps.map((gap) => gap.key), ["interviews", "selfIntros", "mocks"]);
});

test("gaps never exceed three entries", () => {
  assert.equal(build({ primaryAirline: jinAir, journey: journey() }).gaps.length, MAX_PREPARATION_GAPS);
});

test("a fully recorded airline has no gaps", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 1, experiencesLinked: 1, interviewAttemptCount: 1, selfIntroAttempts: 1, mockAttempts: 1 }) });
  assert.deepEqual(model.gaps, []);
});

// 23. recent activity cap
test("recent activity is capped at five entries", () => {
  const rows = Array.from({ length: 9 }, (_, index) => activity(`a${index}`, `활동 ${index}`, `2026-09-${10 + index}T00:00:00.000Z`));
  assert.equal(build({ activities: rows }).recentActivity.length, MAX_RECENT_ACTIVITY);
});

// 24. airline activity first, general activity still visible
test("target-airline activity is listed first without hiding general activity", () => {
  const model = build({
    primaryAirline: jinAir,
    journey: journey({ recentActivity: [{ id: "answer:a1", kind: "application", label: "지원서 답변 저장", occurredAt: "2026-09-01T00:00:00.000Z" }] as AirlineJourneyState["recentActivity"] }),
    activities: [activity("g1", "일반 훈련", "2026-09-22T00:00:00.000Z")],
  });
  assert.equal(model.recentActivity[0].fromTargetAirline, true);
  assert.equal(model.recentActivity[0].label, "지원서 답변 저장");
  assert.ok(model.recentActivity.some((item) => item.label === "일반 훈련"));
});

// 25. no fake activity
test("no activity is produced when nothing was saved", () => {
  assert.deepEqual(build({ primaryAirline: jinAir, journey: journey() }).recentActivity, []);
});

// 26. duplicate journey/learning rows are not double counted
test("the same saved record is not listed twice", () => {
  const model = build({
    primaryAirline: jinAir,
    journey: journey({ recentActivity: [{ id: "answer:a1", kind: "application", label: "지원서 답변 저장", occurredAt: "2026-09-22T00:00:00.000Z" }] as AirlineJourneyState["recentActivity"] }),
    activities: [activity("answer:a1", "지원서 답변 저장", "2026-09-22T00:00:00.000Z")],
  });
  assert.equal(model.recentActivity.length, 1);
});

test("one saved answer is not listed twice when both sources describe it", () => {
  const model = build({
    primaryAirline: jinAir,
    journey: journey({ recentActivity: [{ id: "answer:ans-1", kind: "application", label: "지원서 답변 저장 · 지원동기", occurredAt: "2026-09-23T00:00:00.000Z" }] as AirlineJourneyState["recentActivity"] }),
    activities: [{ ...activity("learning-1", "지원동기", "2026-09-23T00:00:00.000Z", "jin_air"), answerId: "ans-1" } as LearningActivity],
  });
  assert.equal(model.recentActivity.length, 1);
  assert.equal(model.recentActivity[0].label, "지원서 답변 저장 · 지원동기");
});

// 27. application progress reuses the zero-denominator contract
test("application progress never renders a zero denominator on Home", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 1, applicationQuestionCount: 0 }) });
  assert.equal(model.applicationProgress.mode, "count");
  assert.equal(model.applicationProgress.value, "1개");
  assert.doesNotMatch(model.applicationProgress.value, /\d+\s*\/\s*0/);
});

test("application progress keeps the ratio when official questions exist", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 1, applicationQuestionCount: 3 }) });
  assert.equal(model.applicationProgress.mode, "ratio");
  assert.equal(model.applicationProgress.value, "1/3");
});

// 28. deadline present / absent
test("an upcoming application date is summarised without inventing one", () => {
  const model = build({
    upcomingApplications: [{ application: { id: "app1", airlineId: "jin_air", airlineNameSnapshot: "진에어" }, importantDate: { kind: "deadline", date: "2026-10-01", dday: "D-8", days: 8 } }],
  });
  assert.equal(model.deadline?.airlineName, "진에어");
  assert.equal(model.deadline?.dday, "D-8");
  assert.equal(model.deadline?.kindLabel, preparationHomeLabelsKo.deadlineApplication);
});

test("no deadline card data is produced without a saved date", () => {
  assert.equal(build({ upcomingApplications: [] }).deadline, undefined);
});

// 29. multi-airline isolation
test("only the primary airline drives the Home target and summary", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ airlineId: "jin_air", answersDrafted: 1 }) });
  assert.equal(model.target.airlineId, "jin_air");
  assert.equal(model.summary.find((item) => item.key === "answers")?.value, "1개");
  const other = build({ primaryAirline: { id: "korean_air", name: "Korean Air" }, journey: journey({ airlineId: "korean_air" }) });
  assert.equal(other.summary.find((item) => item.key === "answers")?.value, "0개");
});

// 30. determinism
test("the same input always produces the same model", () => {
  const input: PreparationHomeInput = {
    primaryAirline: jinAir,
    journey: journey({ answersDrafted: 1, interviewAttemptCount: 2 }),
    dailyPlan: plan(candidate({ id: "p", target: { kind: "experience_library" } }), [candidate({ id: "r", resume: true, createdAt: "2026-09-21T00:00:00.000Z", target: { kind: "mock_resume", sessionId: "s" } })]),
    activities: [activity("a1", "활동", "2026-09-22T00:00:00.000Z")],
    upcomingApplications: [{ application: { id: "app1", airlineNameSnapshot: "진에어" }, importantDate: { kind: "interview", date: "2026-10-02", dday: "D-9", days: 9 } }],
  };
  assert.deepEqual(buildPreparationHomeModel(input), buildPreparationHomeModel(input));
});

// 31. ko locale
test("ko labels are used by default and stay text-labelled", () => {
  const model = build({ primaryAirline: jinAir, journey: journey() });
  assert.equal(model.summary[0].label, "지원서 답변");
  assert.equal(model.quickActions[0].label, "지원서 작성");
  for (const item of model.summary) assert.ok(item.label.length > 0 && item.value.length > 0);
});

// 32. en locale
test("en labels mirror the ko structure without a zero denominator", () => {
  const model = build({ primaryAirline: jinAir, journey: journey({ answersDrafted: 1 }), labels: preparationHomeLabelsEn });
  assert.equal(model.target.label, "Preparing for Jin Air");
  assert.equal(model.summary[0].label, "Application answers");
  assert.equal(model.summary[0].value, "1");
  assert.equal(model.applicationProgress.value, "1");
  assert.equal(model.quickActions[0].label, "Write application");
});

// 33. navigation destinations
test("every journey action maps onto an existing navigation target", () => {
  assert.deepEqual(journeyActionTarget({ kind: "application", label: "", reason: "" }, "jin_air"), { kind: "application_coach", airlineId: "jin_air" });
  assert.deepEqual(journeyActionTarget({ kind: "self_intro", label: "", reason: "" }, "jin_air"), { kind: "self_introduction", targetSeconds: 60 });
  assert.deepEqual(journeyActionTarget({ kind: "mock", label: "", reason: "" }, "jin_air"), { kind: "mock_start", airlineId: "jin_air" });
  assert.deepEqual(journeyActionTarget({ kind: "resume_mock", label: "", reason: "", sessionId: "s1" }, "jin_air"), { kind: "mock_resume", sessionId: "s1" });
  assert.deepEqual(journeyActionTarget({ kind: "resume_interview", label: "", reason: "", questionId: "q1" }, "jin_air"), { kind: "single_interview_resume", questionId: "q1" });
  assert.deepEqual(journeyActionTarget({ kind: "interview", label: "", reason: "", questionId: "q1" }, "jin_air"), { kind: "interview_question", questionId: "q1", airlineId: "jin_air" });
  assert.deepEqual(journeyActionTarget({ kind: "review_result", label: "", reason: "" }, "jin_air"), { kind: "airline_workspace", airlineId: "jin_air" });
});

// 34. fresh user gets no auto-selected airline and a bounded quick action set
test("a fresh user is offered a target-airline CTA and at most four quick actions", () => {
  const model = build();
  assert.equal(model.target.ctaLabel, preparationHomeLabelsKo.targetSetCta);
  assert.equal(model.target.airlineId, undefined);
  assert.equal(model.quickActions.length, MAX_QUICK_ACTIONS);
  assert.deepEqual(model.quickActions.map((item) => item.key), ["application", "interview", "self_intro", "airline"]);
});

test("competency stays a secondary action in both states", () => {
  assert.equal(build({ competencyCompleted: false }).competencyAction.label, "승무원 역량검사");
  assert.equal(build({ competencyCompleted: true }).competencyAction.label, "역량 프로파일 확인");
  assert.doesNotMatch(JSON.stringify(build({ competencyCompleted: true }).competencyAction), /\d/);
});
