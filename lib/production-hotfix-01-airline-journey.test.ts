import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { airlineOfficialBatch9InterviewQuestions } from "./airline-official-data-batch-9";
import {
  airlineJourneyContextFromQuestion,
  airlineJourneyDraftId,
  genericAirlineJourneyContext,
  journeyContextForExperience,
  journeyContextFromPracticeLineage,
  journeyContextWithExperience,
} from "./airline-journey-context";
import {
  findJourneyWorkDraft,
  getWorkDraft,
  LEGACY_ACTIVE_WORK_DRAFT_ID,
  linkExperienceToWorkDraft,
  listWorkDrafts,
  saveWorkDraft,
  type ApplicationPrompt,
} from "./application-answer-repository";
import {
  buildPracticeLineage,
  buildPreparationStatus,
  countPendingUserReports,
  isWorkspacePracticeQuestionId,
  resolveWorkspaceInterviewQuestion,
  workspacePracticeQuestionId,
  workspaceQuestionInterviewCategory,
  workspaceQuestionPracticeGuidance,
  workspaceQuestionToInterviewQuestion,
  type WorkspaceQuestion,
} from "./airline-targeting-workspace";
import { buildAirlineJourneyState } from "./airline-target-journey";
import { isAllowedInterviewQuestion, resolveInterviewQuestion } from "./interview-practice-queue";
import { interviewQuestionById, type InterviewAttempt } from "./interview-practice-data";
import { interviewReturnTargetForSource, resumeFromConfig } from "./single-interview-resume";
import { ApplicationCoachHome } from "@/components/application-coach/application-coach";

const memoryStorage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key), clear: () => values.clear(), key: () => null, length: 0 };
};
const freshStorage = () => Object.assign(globalThis, { localStorage: memoryStorage(), window: { dispatchEvent: () => true, addEventListener: () => undefined, removeEventListener: () => undefined } });

const jinQuestion = airlineOfficialBatch9InterviewQuestions.find((question) => question.id === "9-jin-2025-video-presentation") as WorkspaceQuestion;
const templatePrompt: ApplicationPrompt = { id: "practice-teamwork", documentType: "application_question", prompt: "팀원과 협력하여 성과를 만든 경험을 작성해 주세요.", locale: "ko", sourceType: "practice_template", sourceIds: [], recommendedStructure: "experience_star", targetCapabilities: ["interview_communication"], status: "practice" };
const baseDraft = { documentType: "application_question" as const, prompt: templatePrompt, selectedExperienceIds: [] as string[], coachingAnswers: {}, structure: [], coreMessage: "", updatedAt: "" };
const attempt = (overrides: Partial<InterviewAttempt> = {}): InterviewAttempt => ({ id: "attempt-1", questionId: workspacePracticeQuestionId(jinQuestion), category: "customer_situation", createdAt: "2026-09-22T05:00:00.000Z", transcript: "", durationSeconds: 30, analysis: { overallScore: 40, summary: "", strengths: [], improvements: [], evaluationScores: [], timingAnalysis: { durationSeconds: 30, status: "within_range", label: "", guidance: "" }, speakingMetrics: { wordsPerMinute: 0, speakingPaceLabel: "", longSilenceCount: 0, fillerCount: 0, repeatedPhraseCount: 0 }, recommendedRetryMode: "repeat_current_structure", nextQuestionIds: [] } as unknown as InterviewAttempt["analysis"], targetAirlineId: "jin_air", sourceContext: { ...buildPracticeLineage("jin_air", jinQuestion), questionId: workspacePracticeQuestionId(jinQuestion) }, attemptNumber: 1, completed: true, ...overrides });

// ---------------------------------------------------------------- BUG-1 · draft identity and experience linking
test("1 generic airline application uses the canonical journey draft id", () => {
  assert.equal(airlineJourneyDraftId(genericAirlineJourneyContext("jin_air", "application")), "airline-journey:jin_air:general");
});
test("2 legacy active draft for the same airline is found as a fallback", () => {
  freshStorage();
  saveWorkDraft({ id: LEGACY_ACTIVE_WORK_DRAFT_ID, airlineId: "jin_air", ...baseDraft });
  const found = findJourneyWorkDraft(genericAirlineJourneyContext("jin_air", "application"));
  assert.equal(found?.id, LEGACY_ACTIVE_WORK_DRAFT_ID);
  assert.equal(findJourneyWorkDraft(genericAirlineJourneyContext("korean_air", "application")), undefined);
});
test("3 experience link finds the generic airline draft and promotes a legacy id", () => {
  freshStorage();
  const context = genericAirlineJourneyContext("jin_air", "application");
  saveWorkDraft({ id: LEGACY_ACTIVE_WORK_DRAFT_ID, airlineId: "jin_air", ...baseDraft });
  assert.equal(linkExperienceToWorkDraft(journeyContextForExperience(context), "exp-1").ok, true);
  assert.equal(getWorkDraft(airlineJourneyDraftId(context))?.selectedExperienceIds[0], "exp-1");
  assert.equal(listWorkDrafts().some((draft) => draft.id === LEGACY_ACTIVE_WORK_DRAFT_ID), false);
});
test("4 selectedExperienceIds are updated on the canonical draft", () => {
  freshStorage();
  const context = genericAirlineJourneyContext("jin_air", "application");
  saveWorkDraft({ id: airlineJourneyDraftId(context), airlineId: "jin_air", journeyContext: context, ...baseDraft });
  assert.equal(linkExperienceToWorkDraft(context, "exp-2").ok, true);
  assert.deepEqual(getWorkDraft(airlineJourneyDraftId(context))?.selectedExperienceIds, ["exp-2"]);
});
test("5 duplicate experience link is blocked", () => {
  freshStorage();
  const context = genericAirlineJourneyContext("jin_air", "application");
  saveWorkDraft({ id: airlineJourneyDraftId(context), airlineId: "jin_air", journeyContext: context, ...baseDraft });
  linkExperienceToWorkDraft(context, "exp-2");
  linkExperienceToWorkDraft(context, "exp-2");
  assert.deepEqual(getWorkDraft(airlineJourneyDraftId(context))?.selectedExperienceIds, ["exp-2"]);
});
test("6 experience save returns to the application context with the experience attached", () => {
  const context = journeyContextForExperience(genericAirlineJourneyContext("jin_air", "application"));
  const back = journeyContextWithExperience(context, "exp-3");
  assert.equal(back.origin, "application");
  assert.equal(back.airlineId, "jin_air");
  assert.equal(back.experienceId, "exp-3");
  assert.equal(back.returnTab, "application");
});
test("7 experience cancel keeps the same draft context (no fabricated draft, no lost identity)", () => {
  freshStorage();
  const context = journeyContextForExperience(genericAirlineJourneyContext("jin_air", "application"));
  saveWorkDraft({ id: airlineJourneyDraftId(context), airlineId: "jin_air", journeyContext: context, ...baseDraft });
  assert.equal(findJourneyWorkDraft(context)?.prompt?.id, "practice-teamwork");
  assert.equal(listWorkDrafts().length, 1);
});
test("8 airline lineage survives the link", () => {
  freshStorage();
  const context = genericAirlineJourneyContext("jin_air", "application");
  saveWorkDraft({ id: airlineJourneyDraftId(context), airlineId: "jin_air", journeyContext: context, ...baseDraft });
  linkExperienceToWorkDraft(context, "exp-1");
  const draft = getWorkDraft(airlineJourneyDraftId(context));
  assert.equal(draft?.airlineId, "jin_air");
  assert.equal(draft?.journeyContext?.airlineId, "jin_air");
  assert.equal(draft?.journeyContext?.questionId, undefined);
});
test("9 question lineage still links to the question draft, never the general one", () => {
  freshStorage();
  const question = airlineJourneyContextFromQuestion({ ...jinQuestion, kind: "APPLICATION", sourceType: "OFFICIAL_POSTING" } as WorkspaceQuestion);
  saveWorkDraft({ id: airlineJourneyDraftId(question), airlineId: "jin_air", journeyContext: question, ...baseDraft });
  saveWorkDraft({ id: airlineJourneyDraftId(genericAirlineJourneyContext("jin_air")), airlineId: "jin_air", journeyContext: genericAirlineJourneyContext("jin_air"), ...baseDraft });
  assert.equal(linkExperienceToWorkDraft(question, "exp-9").ok, true);
  assert.deepEqual(getWorkDraft(airlineJourneyDraftId(question))?.selectedExperienceIds, ["exp-9"]);
  assert.deepEqual(getWorkDraft(airlineJourneyDraftId(genericAirlineJourneyContext("jin_air")))?.selectedExperienceIds, []);
  assert.equal(getWorkDraft(airlineJourneyDraftId(question))?.journeyContext?.provenance, "OFFICIAL_ARCHIVE");
  assert.equal(getWorkDraft(airlineJourneyDraftId(question))?.journeyContext?.recruitmentPeriod, "2025 first-half recruitment");
});

// ---------------------------------------------------------------- BUG-2 · application coach return
test("10 application coach home offers a return action", () => {
  const html = renderToStaticMarkup(createElement(ApplicationCoachHome, { answers: [], onNew: () => undefined, onOpen: () => undefined, onExit: () => undefined, returnLabel: "타겟 항공사 준비로 돌아가기" }));
  assert.match(html, /application-coach-journey-return/);
  assert.match(html, /타겟 항공사 준비로 돌아가기/);
  assert.match(html, /aria-label="이전"/);
});
test("11 return action is a full-width 44px target usable without the desktop sidebar", () => {
  const html = renderToStaticMarkup(createElement(ApplicationCoachHome, { answers: [], onNew: () => undefined, onOpen: () => undefined, onExit: () => undefined, returnLabel: "타겟 항공사 준비로 돌아가기" }));
  assert.match(html, /min-h-11 w-full[^"]*"[^>]*>타겟 항공사 준비로 돌아가기/);
  assert.doesNotMatch(html, /<nav/);
});
test("12 back arrow alone is offered when there is no workspace origin", () => {
  const html = renderToStaticMarkup(createElement(ApplicationCoachHome, { answers: [], onNew: () => undefined, onOpen: () => undefined, onExit: () => undefined }));
  assert.match(html, /aria-label="이전"/);
  assert.doesNotMatch(html, /application-coach-journey-return/);
});
test("13 returnTab is preserved through experience and back", () => {
  const context = genericAirlineJourneyContext("jin_air", "application");
  assert.equal(journeyContextWithExperience(journeyContextForExperience(context), "exp-1").returnTab, "application");
  assert.equal(journeyContextForExperience(context).returnTab, "application");
});
test("14 return never requires a reload: exit handler is invoked synchronously", () => {
  let exits = 0;
  const element = createElement(ApplicationCoachHome, { answers: [], onNew: () => undefined, onOpen: () => undefined, onExit: () => { exits += 1; }, returnLabel: "타겟 항공사 준비로 돌아가기" });
  renderToStaticMarkup(element);
  (element.props as { onExit: () => void }).onExit();
  assert.equal(exits, 1);
});

// ---------------------------------------------------------------- ISSUE-6 · official question practice
test("15 official workspace question becomes a practice question", () => {
  const practice = workspaceQuestionToInterviewQuestion(jinQuestion);
  assert.ok(practice);
  assert.equal(practice?.id, "airline-question:9-jin-2025-video-presentation");
  assert.equal(practice?.category, "customer_situation");
  assert.deepEqual(practice?.airlineTags, ["jin_air"]);
});
test("16 original question text is preserved verbatim", () => {
  assert.equal(workspaceQuestionToInterviewQuestion(jinQuestion)?.prompt, jinQuestion.questionText);
});
test("17 archived provenance is kept in the lineage and shown as a past official question", () => {
  const lineage = { ...buildPracticeLineage("jin_air", jinQuestion), questionId: workspacePracticeQuestionId(jinQuestion) };
  assert.equal(lineage.questionProvenance, "OFFICIAL_ARCHIVE");
  assert.equal(lineage.workspaceQuestionId, "9-jin-2025-video-presentation");
  assert.match(workspaceQuestionPracticeGuidance(jinQuestion), /과거 공식 질문/);
  assert.match(workspaceQuestionPracticeGuidance(jinQuestion), /2025 first-half recruitment/);
  assert.doesNotMatch(workspaceQuestionToInterviewQuestion(jinQuestion)?.evaluationRubric.guidance ?? "", /^공식 채용 자료의 질문입니다/);
});
test("18 no generic replacement when the source question exists", () => {
  freshStorage();
  const id = workspacePracticeQuestionId(jinQuestion);
  assert.equal(isWorkspacePracticeQuestionId(id), true);
  assert.equal(interviewQuestionById.has(id), false);
  assert.equal(resolveInterviewQuestion(id, "jin_air")?.prompt, jinQuestion.questionText);
  assert.equal(resolveInterviewQuestion(id)?.prompt, jinQuestion.questionText);
  assert.equal(isAllowedInterviewQuestion(workspaceQuestionToInterviewQuestion(jinQuestion)!, "jin_air"), true);
});
test("19 generic fallback still works for legacy paths and non-practicable questions", () => {
  freshStorage();
  assert.equal(resolveInterviewQuestion("im2")?.id, "im2");
  assert.equal(resolveWorkspaceInterviewQuestion("im2"), undefined);
  const pending = { ...jinQuestion, id: "user-1", provenance: "USER_REPORTED", sourceType: "USER_REPORTED", moderationStatus: "PENDING", verified: false } as WorkspaceQuestion;
  assert.equal(workspaceQuestionToInterviewQuestion(pending), null);
  assert.equal(workspaceQuestionToInterviewQuestion({ ...jinQuestion, kind: "APPLICATION", sourceType: "OFFICIAL_POSTING" } as WorkspaceQuestion), null);
  assert.equal(workspaceQuestionInterviewCategory("SAFETY"), "safety_and_role_judgment");
  assert.equal(workspaceQuestionInterviewCategory("TEAMWORK"), "behavioral_experience");
  assert.equal(workspaceQuestionInterviewCategory("MOTIVATION"), "introduction_and_motivation");
});

// ---------------------------------------------------------------- ISSUE-7 · retake lineage
test("20 retake carries targetAirlineId from the previous attempt", () => {
  const previous = attempt();
  const airlineId = previous.targetAirlineId ?? previous.sourceContext?.airlineId;
  const config = resumeFromConfig({ question: resolveInterviewQuestion(previous.questionId, airlineId)!, attemptType: "retry", previousAttemptId: previous.id, targetAirlineId: airlineId, sourceContext: previous.sourceContext }, "airline_workspace");
  assert.equal(config.targetAirlineId, "jin_air");
});
test("21 retake carries the workspace question id", () => {
  const previous = attempt();
  assert.equal(resolveInterviewQuestion(previous.questionId, previous.targetAirlineId)?.id, previous.questionId);
  assert.equal(previous.sourceContext?.workspaceQuestionId, "9-jin-2025-video-presentation");
});
test("22 retake carries provenance", () => {
  const previous = attempt();
  const config = resumeFromConfig({ question: resolveInterviewQuestion(previous.questionId, "jin_air")!, attemptType: "retry", previousAttemptId: previous.id, targetAirlineId: "jin_air", sourceContext: previous.sourceContext }, "airline_workspace");
  assert.equal(config.sourceContext?.questionProvenance, "OFFICIAL_ARCHIVE");
});
test("23 previousAttemptId is preserved", () => {
  const retake = attempt({ id: "attempt-2", previousAttemptId: "attempt-1", attemptNumber: 2 });
  assert.equal(retake.previousAttemptId, "attempt-1");
});
test("24 attemptNumber increments", () => {
  const retake = attempt({ id: "attempt-2", previousAttemptId: "attempt-1", attemptNumber: 2 });
  assert.equal(retake.attemptNumber, attempt().attemptNumber + 1);
});
test("25 airline practice count includes the retake when targetAirlineId is carried", () => {
  const first = attempt();
  const retake = attempt({ id: "attempt-2", previousAttemptId: "attempt-1", attemptNumber: 2 });
  const status = buildPreparationStatus({ airlineId: "jin_air", questions: [jinQuestion], answers: [], attempts: [first, retake], experiences: [] });
  assert.equal(status.practicedInterviewCount, 2);
  assert.equal(buildAirlineJourneyState({ airlineId: "jin_air", questions: [jinQuestion], attempts: [first, retake] }).interviewAttemptCount, 2);
  const dropped = attempt({ id: "attempt-3", previousAttemptId: "attempt-1", attemptNumber: 2, targetAirlineId: undefined });
  assert.equal(buildPreparationStatus({ airlineId: "jin_air", questions: [jinQuestion], answers: [], attempts: [first, dropped], experiences: [] }).practicedInterviewCount, 1);
});
test("26 result return goes back to the airline workspace question tab", () => {
  const previous = attempt();
  assert.equal(interviewReturnTargetForSource("airline_workspace"), "airline-workspace");
  const context = journeyContextFromPracticeLineage(previous.sourceContext, jinQuestion.questionText);
  assert.equal(context?.airlineId, "jin_air");
  assert.equal(context?.questionId, "9-jin-2025-video-presentation");
  assert.equal(context?.questionText, jinQuestion.questionText);
  assert.equal(context?.provenance, "OFFICIAL_ARCHIVE");
  assert.equal(context?.returnTab, "questions");
  assert.equal(journeyContextFromPracticeLineage({ source: "application_drill" }), undefined);
});

// ---------------------------------------------------------------- ISSUE-5 · pending user reports stay out of official counts
test("27 pending user reports are excluded from official question counts and periods", () => {
  const pending = { ...jinQuestion, id: "user-1", provenance: "USER_REPORTED", sourceType: "USER_REPORTED", moderationStatus: "PENDING", verified: false, recruitmentPeriod: "QA period" } as WorkspaceQuestion;
  const status = buildPreparationStatus({ airlineId: "jin_air", questions: [jinQuestion, pending], answers: [], attempts: [], experiences: [] });
  assert.equal(status.interviewQuestionCount, 1);
  assert.equal(countPendingUserReports([jinQuestion, pending], "jin_air"), 1);
  const journey = buildAirlineJourneyState({ airlineId: "jin_air", questions: [jinQuestion, pending] });
  assert.deepEqual(journey.recruitmentPeriods, ["2025 first-half recruitment"]);
  const accepted = { ...pending, id: "user-2", moderationStatus: "ACCEPTED" } as WorkspaceQuestion;
  assert.equal(buildPreparationStatus({ airlineId: "jin_air", questions: [jinQuestion, accepted], answers: [], attempts: [], experiences: [] }).interviewQuestionCount, 2);
});
