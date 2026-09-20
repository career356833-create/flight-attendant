import type { ApplicationAnswer, ApplicationWorkDraft } from "@/lib/application-answer-repository";
import type { WorkspaceQuestion } from "@/lib/airline-targeting-workspace";
import type { InterviewAttempt } from "@/lib/interview-practice-data";
import type { InterviewQuestionFavorite, InterviewPracticeQueueItem } from "@/lib/interview-practice-queue";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import type { SingleInterviewResume } from "@/lib/single-interview-resume";
import { safeLocalStorageWrite } from "@/lib/safe-local-storage";
import { airlineJourneyContextFromQuestion } from "@/lib/airline-journey-context";

export type AirlineJourneyStepId = "company" | "requirements" | "questions" | "application" | "experience" | "interview" | "self_intro" | "mock" | "result" | "next_practice";
export type AirlineJourneyStepStatus = "completed" | "in_progress" | "not_started" | "unavailable";
export type AirlineJourneyActionKind = "application" | "interview" | "self_intro" | "mock" | "resume_application" | "resume_interview" | "resume_mock" | "review_result" | "retake";
export type AirlineJourneyActivityKind = "application" | "experience" | "interview" | "self_intro" | "mock";

export type AirlineJourneyStep = { id: AirlineJourneyStepId; label: string; status: AirlineJourneyStepStatus; detail: string };
export type AirlineJourneyAction = { kind: AirlineJourneyActionKind; label: string; reason: string; questionId?: string; attemptId?: string; sessionId?: string };
export type AirlineJourneyActivity = { id: string; kind: AirlineJourneyActivityKind; label: string; occurredAt: string; questionId?: string };
export type AirlineJourneyState = {
  airlineId: string;
  companyViewed: boolean;
  applicationQuestionCount: number;
  answersDrafted: number;
  answersReady: number;
  experiencesLinked: number;
  interviewQuestionsPracticed: number;
  interviewAttemptCount: number;
  selfIntroAttempts: number;
  mockAttempts: number;
  recentAttemptId?: string;
  deadlineLabel?: string;
  recruitmentPeriods: string[];
  favoriteCount: number;
  queueCount: number;
  steps: AirlineJourneyStep[];
  nextRecommendedAction: AirlineJourneyAction;
  resumeActions: AirlineJourneyAction[];
  recentActivity: AirlineJourneyActivity[];
};

export type AirlineJourneyInput = {
  airlineId: string;
  companyViewedAt?: string;
  requirementsAvailable?: boolean;
  questions?: WorkspaceQuestion[];
  answers?: ApplicationAnswer[];
  workDrafts?: ApplicationWorkDraft[];
  attempts?: InterviewAttempt[];
  selfIntroductions?: SelfIntroductionAttempt[];
  sessions?: InterviewSession[];
  favorites?: InterviewQuestionFavorite[];
  queue?: InterviewPracticeQueueItem[];
  singleResume?: SingleInterviewResume | null;
  deadlineLabel?: string;
};

const labels: Record<AirlineJourneyStepId, string> = {
  company: "항공사 정보 확인", requirements: "채용요건 확인", questions: "지원서 질문 확인", application: "지원서 답변 작성", experience: "관련 경험 연결",
  interview: "면접 질문 연습", self_intro: "자기소개 연습", mock: "모의면접", result: "결과 복습", next_practice: "다음 연습",
};
const statusText: Record<AirlineJourneyStepStatus, string> = { completed: "완료", in_progress: "진행 중", not_started: "시작 전", unavailable: "데이터 없음" };
const validTime = (value?: string) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const step = (id: AirlineJourneyStepId, status: AirlineJourneyStepStatus, detail?: string): AirlineJourneyStep => ({ id, label: labels[id], status, detail: detail ?? statusText[status] });

export function buildApplicationJourneyLineage(question: WorkspaceQuestion) {
  return airlineJourneyContextFromQuestion(question);
}

export function buildAirlineJourneyState(input: AirlineJourneyInput): AirlineJourneyState {
  const questions = (input.questions ?? []).filter((item) => item.airlineId === input.airlineId);
  const applicationQuestions = questions.filter((item) => item.kind === "APPLICATION");
  const answers = (input.answers ?? []).filter((item) => item.airlineId === input.airlineId);
  const drafts = (input.workDrafts ?? []).filter((item) => item.airlineId === input.airlineId);
  const attempts = (input.attempts ?? []).filter((item) => item.targetAirlineId === input.airlineId);
  const completedAttempts = attempts.filter((item) => item.completed);
  const selfIntroductions = (input.selfIntroductions ?? []).filter((item) => item.targetAirlineId === input.airlineId);
  const completedSelfIntroductions = selfIntroductions.filter((item) => item.completed);
  const sessions = (input.sessions ?? []).filter((item) => item.airlineId === input.airlineId);
  const completedSessions = sessions.filter((item) => item.status === "completed");
  const inProgressSessions = sessions.filter((item) => item.status === "in_progress" || item.status === "created");
  const linkedExperienceIds = new Set([...answers.flatMap((item) => item.selectedExperienceIds), ...drafts.flatMap((item) => item.selectedExperienceIds), ...completedAttempts.map((item) => item.experienceId).filter((id): id is string => Boolean(id)), ...completedSelfIntroductions.map((item) => item.experienceId).filter((id): id is string => Boolean(id))]);
  const practicedQuestions = new Set(completedAttempts.map((item) => item.sourceContext?.workspaceQuestionId ?? item.questionId));
  const favorites = (input.favorites ?? []).filter((item) => item.airlineId === input.airlineId);
  const queue = (input.queue ?? []).filter((item) => item.airlineId === input.airlineId && item.status === "open");
  const applicationStarted = answers.length > 0 || drafts.length > 0;
  const hasResult = completedAttempts.length + completedSelfIntroductions.length + completedSessions.length > 0;
  const recentAttempt = [...completedAttempts].sort((a, b) => validTime(b.createdAt) - validTime(a.createdAt))[0];

  const resumeActions: AirlineJourneyAction[] = [];
  if (drafts.length) resumeActions.push({ kind: "resume_application", label: "지원서 이어쓰기", reason: "저장된 지원서 초안이 있습니다." });
  if (input.singleResume?.targetAirlineId === input.airlineId) resumeActions.push({ kind: "resume_interview", label: "단일 면접 이어하기", reason: "중단된 면접 연습이 있습니다.", questionId: input.singleResume.questionId });
  if (inProgressSessions[0]) resumeActions.push({ kind: "resume_mock", label: "모의면접 이어하기", reason: "진행 중인 모의면접이 있습니다.", sessionId: inProgressSessions[0].id });

  let nextRecommendedAction: AirlineJourneyAction;
  if (resumeActions[0]) nextRecommendedAction = resumeActions[0];
  else if (applicationQuestions.length && !applicationStarted) nextRecommendedAction = { kind: "application", label: "지원서 답변 작성", reason: "확인된 지원서 질문에 아직 저장한 답변이 없습니다.", questionId: applicationQuestions[0].id };
  else if (!completedAttempts.length) nextRecommendedAction = { kind: "interview", label: "예상 질문 연습", reason: answers.length ? "저장한 답변을 바탕으로 면접 답변을 연습해 보세요." : "항공사 질문으로 첫 면접 연습을 시작해 보세요.", questionId: questions.find((item) => item.kind === "INTERVIEW")?.id };
  else if (!completedSelfIntroductions.length) nextRecommendedAction = { kind: "self_intro", label: "60초 자기소개", reason: "이 항공사를 타겟으로 완료한 자기소개가 없습니다." };
  else if (!completedSessions.length) nextRecommendedAction = { kind: "mock", label: "Quick 5 모의면접", reason: "단일 연습 다음에는 질문 흐름을 이어서 점검해 보세요." };
  else if (queue[0]) nextRecommendedAction = { kind: "retake", label: "재연습 큐 이어하기", reason: "보완할 질문이 재연습 큐에 남아 있습니다.", questionId: queue[0].questionId, attemptId: queue[0].sourceAttemptId };
  else nextRecommendedAction = { kind: "review_result", label: "최근 결과 복습", reason: "완료한 활동의 결과와 다음 연습 방향을 확인해 보세요.", attemptId: recentAttempt?.id };

  const activity: AirlineJourneyActivity[] = [
    ...answers.map((item) => ({ id: `answer:${item.id}`, kind: "application" as const, label: `지원서 답변 저장 · ${item.title}`, occurredAt: item.updatedAt, questionId: item.promptId })),
    ...answers.filter((item) => item.selectedExperienceIds.length > 0).map((item) => ({ id: `experience:${item.id}`, kind: "experience" as const, label: `경험 ${item.selectedExperienceIds.length}개 연결`, occurredAt: item.updatedAt, questionId: item.promptId })),
    ...completedAttempts.map((item) => ({ id: `interview:${item.id}`, kind: "interview" as const, label: "단일 면접 완료", occurredAt: item.createdAt, questionId: item.sourceContext?.workspaceQuestionId ?? item.questionId })),
    ...completedSelfIntroductions.map((item) => ({ id: `self:${item.id}`, kind: "self_intro" as const, label: "자기소개 완료", occurredAt: item.createdAt })),
    ...completedSessions.map((item) => ({ id: `mock:${item.id}`, kind: "mock" as const, label: "모의면접 완료", occurredAt: item.completedAt ?? item.startedAt })),
  ].sort((a, b) => validTime(b.occurredAt) - validTime(a.occurredAt)).slice(0, 5);

  const steps = [
    step("company", input.companyViewedAt ? "completed" : "not_started"),
    step("requirements", input.requirementsAvailable ? (input.companyViewedAt ? "completed" : "not_started") : "unavailable"),
    step("questions", applicationQuestions.length ? (applicationStarted ? "completed" : "not_started") : "unavailable", applicationQuestions.length ? `${applicationQuestions.length}개 확인 가능` : undefined),
    step("application", answers.length ? "completed" : drafts.length ? "in_progress" : applicationQuestions.length ? "not_started" : "unavailable", answers.length ? `${answers.length}개 저장` : undefined),
    step("experience", linkedExperienceIds.size ? "completed" : applicationStarted || completedAttempts.length ? "not_started" : "unavailable", linkedExperienceIds.size ? `${linkedExperienceIds.size}개 연결` : undefined),
    step("interview", completedAttempts.length ? "completed" : attempts.length ? "in_progress" : "not_started", completedAttempts.length ? `${completedAttempts.length}회 완료` : undefined),
    step("self_intro", completedSelfIntroductions.length ? "completed" : selfIntroductions.length ? "in_progress" : "not_started", completedSelfIntroductions.length ? `${completedSelfIntroductions.length}회 완료` : undefined),
    step("mock", completedSessions.length ? "completed" : inProgressSessions.length ? "in_progress" : "not_started", completedSessions.length ? `${completedSessions.length}회 완료` : undefined),
    step("result", hasResult ? "completed" : "not_started"),
    step("next_practice", queue.length ? "in_progress" : hasResult ? "not_started" : "unavailable", queue.length ? `${queue.length}개 대기` : undefined),
  ];
  const recruitmentPeriods = [...new Set(questions.map((item) => item.recruitmentPeriod).filter((value): value is string => Boolean(value)))];
  return { airlineId: input.airlineId, companyViewed: Boolean(input.companyViewedAt), applicationQuestionCount: applicationQuestions.length, answersDrafted: answers.length, answersReady: answers.filter((item) => item.status === "ready").length, experiencesLinked: linkedExperienceIds.size, interviewQuestionsPracticed: practicedQuestions.size, interviewAttemptCount: completedAttempts.length, selfIntroAttempts: completedSelfIntroductions.length, mockAttempts: completedSessions.length, recentAttemptId: recentAttempt?.id, deadlineLabel: input.deadlineLabel, recruitmentPeriods, favoriteCount: favorites.length, queueCount: queue.length, steps, nextRecommendedAction, resumeActions, recentActivity: activity };
}

const VIEW_KEY = "cabin-airline-journey-views-v1";
type ViewStore = Record<string, string>;
export const airlineJourneyViewRepository = {
  load(): ViewStore { if (typeof localStorage === "undefined") return {}; try { const value = JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } },
  markViewed(airlineId: string, date = new Date()) { const next = { ...this.load(), [airlineId]: date.toISOString() }; return safeLocalStorageWrite(VIEW_KEY, next, { category: "learning" }); },
  viewedAt(airlineId: string) { return this.load()[airlineId]; },
};
