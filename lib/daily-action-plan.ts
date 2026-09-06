import type { AirlineApplication } from "./supabase/application-sync-repository";
import { getNextImportantDate } from "./application-tracker";
import type { InterviewSession } from "./mock-interview-session";
import type { InterviewPracticeQueueItem } from "./interview-practice-queue";
import type { AdaptiveWeakness } from "./learning-analytics-adaptive";
import type { WeeklyRoutineTask } from "./learning-analytics-service";
import type { SingleInterviewResume } from "./single-interview-resume";

export const DAILY_DEADLINE_WINDOW_DAYS = 7;

export type DailyActionTarget =
  | { kind: "mock_resume"; sessionId: string }
  | { kind: "single_interview_resume"; questionId: string }
  | { kind: "mock_start"; airlineId?: string }
  | { kind: "interview_question"; questionId: string; airlineId?: string; queueItemId?: string }
  | { kind: "application_coach"; airlineId?: string; applicationAnswerId?: string }
  | { kind: "self_introduction"; targetSeconds: 60 }
  | { kind: "experience_library" };

export type DailyActionSource =
  | "resume"
  | "deadline"
  | "practice_queue"
  | "adaptive"
  | "weekly_plan"
  | "application_draft"
  | "balanced_fallback";

export type DailyActionCandidate = {
  id: string;
  dedupeKey: string;
  type: "resume" | "deadline" | "practice" | "weekly" | "fallback";
  title: string;
  description: string;
  reason: string;
  priority: number;
  target: DailyActionTarget;
  source: DailyActionSource;
  resume: boolean;
  dueAt?: string;
  createdAt?: string;
  weeklyTaskId?: string;
};

export type DailyCompletionEvent = {
  id: string;
  type: "interview_attempt" | "mock_session" | "self_introduction" | "application_answer" | "queue_practiced";
  completedAt: string;
};

export type DailyActionPlan = {
  primary: DailyActionCandidate;
  secondary: DailyActionCandidate[];
  completedCount: number;
  totalCount: number;
  generatedAt: string;
};

export type DailyActionPlanInput = {
  now?: Date;
  sessions?: InterviewSession[];
  applications?: AirlineApplication[];
  queue?: InterviewPracticeQueueItem[];
  queueQuestionTitles?: Record<string, string>;
  weaknesses?: Array<{ weakness: AdaptiveWeakness; questionId?: string }>;
  weeklyTasks?: WeeklyRoutineTask[];
  validQuestionIds?: string[];
  balancedQuestionId: string;
  currentApplicationDraft?: { id: string; airlineId?: string; updatedAt: string };
  singleInterviewResume?: SingleInterviewResume | null;
  recentSelfIntroductionAt?: string;
  completions?: DailyCompletionEvent[];
};

const localDateKey = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const targetKey = (target: DailyActionTarget) => {
  if (target.kind === "interview_question") return `question:${target.questionId}`;
  if (target.kind === "mock_resume") return `session:${target.sessionId}`;
  if (target.kind === "application_coach") return `application:${target.applicationAnswerId ?? target.airlineId ?? "general"}`;
  return target.kind;
};

export function weeklyTaskToDailyAction(
  task: WeeklyRoutineTask,
  options: { validQuestionIds: string[]; balancedQuestionId: string; queueItem?: InterviewPracticeQueueItem },
): DailyActionCandidate | null {
  let target: DailyActionTarget | null = null;
  if (task.type === "interview_question") {
    const questionId = task.sourceEntityId ?? options.balancedQuestionId;
    if (options.validQuestionIds.includes(questionId)) target = { kind: "interview_question", questionId };
  } else if (task.type === "self_introduction") target = { kind: "self_introduction", targetSeconds: 60 };
  else if (task.type === "application_work") target = { kind: "application_coach" };
  else if (task.type === "experience_work") target = { kind: "experience_library" };
  else if (task.type === "review" && options.queueItem) {
    target = { kind: "interview_question", questionId: options.queueItem.questionId, airlineId: options.queueItem.airlineId, queueItemId: options.queueItem.id };
  } else if (/mock|모의면접/i.test(task.title)) target = { kind: "mock_start" };
  if (!target) return null;
  return {
    id: `weekly:${task.id}`,
    dedupeKey: targetKey(target),
    type: "weekly",
    title: task.title,
    description: `${task.estimatedMinutes}분 계획`,
    reason: task.reason,
    priority: 500,
    target,
    source: "weekly_plan",
    resume: false,
    weeklyTaskId: task.id,
  };
}

function candidates(input: DailyActionPlanInput): DailyActionCandidate[] {
  const now = input.now ?? new Date();
  const validQuestions = new Set(input.validQuestionIds ?? []);
  const rows: DailyActionCandidate[] = [];
  const active = [...(input.sessions ?? [])]
    .filter((session) => session.status === "in_progress" && session.questionIds.length > 0)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  if (active) rows.push({
    id: `resume:${active.id}`,
    dedupeKey: `session:${active.id}`,
    type: "resume",
    title: "이어하던 모의면접을 계속하세요",
    description: `${Math.min(active.currentQuestionIndex + 1, active.questionIds.length)} / ${active.questionIds.length} 진행`,
    reason: "완료하지 않은 모의면접이 저장되어 있습니다.",
    priority: 1000,
    target: { kind: "mock_resume", sessionId: active.id },
    source: "resume",
    resume: true,
    createdAt: active.startedAt,
  });
  if(input.singleInterviewResume&&validQuestions.has(input.singleInterviewResume.questionId))rows.push({
    id:`resume:single:${input.singleInterviewResume.questionId}`,dedupeKey:`question:${input.singleInterviewResume.questionId}`,type:'resume',
    title:'이어하던 면접 질문을 계속하세요',description:'같은 질문과 연습 조건에서 새 녹음을 시작합니다.',reason:'완료하지 않은 단일 면접 연습이 저장되어 있습니다.',
    priority:950,target:{kind:'single_interview_resume',questionId:input.singleInterviewResume.questionId},source:'resume',resume:true,createdAt:input.singleInterviewResume.startedAt,
  });

  for (const application of input.applications ?? []) {
    const important = getNextImportantDate(application, now);
    if (!important || important.days > DAILY_DEADLINE_WINDOW_DAYS) continue;
    const interview = important.kind === "interview";
    const target: DailyActionTarget = interview
      ? { kind: "mock_start", airlineId: application.airlineId }
      : { kind: "application_coach", airlineId: application.airlineId };
    rows.push({
      id: `deadline:${application.id}:${important.kind}`,
      dedupeKey: interview ? `deadline-interview:${application.id}` : `application:${application.airlineId ?? application.id}`,
      type: "deadline",
      title: interview ? `${application.airlineNameSnapshot} 면접 준비` : `${application.airlineNameSnapshot} 지원서 준비`,
      description: interview ? "모의면접으로 실전 흐름을 점검하세요." : "현재 지원 답변을 점검하고 저장하세요.",
      reason: `${important.dday} ${interview ? "면접" : "지원 마감"} 일정입니다.`,
      priority: (interview ? 900 : 850) - important.days,
      target,
      source: "deadline",
      resume: false,
      dueAt: important.date,
      createdAt: application.updatedAt,
    });
  }

  const criticalReasons = new Set(["safety", "missing_action", "missing_result"]);
  for (const item of input.queue ?? []) {
    if (item.status !== "open" || !validQuestions.has(item.questionId)) continue;
    rows.push({
      id: `queue:${item.id}`,
      dedupeKey: `question:${item.questionId}`,
      type: "practice",
      title: input.queueQuestionTitles?.[item.questionId] ?? "재연습 질문",
      description: "저장한 재연습 질문을 완료해 보세요.",
      reason: criticalReasons.has(item.reason) ? `${item.reason === "safety" ? "안전 판단" : item.reason === "missing_action" ? "본인 행동" : "결과와 배움"} 보완이 우선입니다.` : "재연습 큐에 저장한 질문입니다.",
      priority: (criticalReasons.has(item.reason) ? 800 : 560) - item.priority,
      target: { kind: "interview_question", questionId: item.questionId, airlineId: item.airlineId, queueItemId: item.id },
      source: "practice_queue",
      resume: false,
      createdAt: item.createdAt,
    });
  }

  for (const { weakness, questionId } of input.weaknesses ?? []) {
    if (weakness.state === "resolved" || weakness.state === "observed" || !questionId || !validQuestions.has(questionId)) continue;
    rows.push({
      id: `adaptive:${weakness.key}`,
      dedupeKey: `question:${questionId}`,
      type: "practice",
      title: `${weakness.title} 연습`,
      description: weakness.recommendedAction,
      reason: weakness.explanation,
      priority: weakness.state === "persistent" ? 700 + weakness.priority / 10 : weakness.state === "emerging" ? 650 + weakness.priority / 10 : 400 + weakness.priority / 10,
      target: { kind: "interview_question", questionId },
      source: "adaptive",
      resume: false,
      createdAt: weakness.latestObservedAt,
    });
  }

  const firstQueue = (input.queue ?? []).find((item) => item.status === "open" && validQuestions.has(item.questionId));
  for (const task of input.weeklyTasks ?? []) {
    const row = weeklyTaskToDailyAction(task, { validQuestionIds: [...validQuestions], balancedQuestionId: input.balancedQuestionId, queueItem: firstQueue });
    if (row) rows.push(row);
  }

  if (input.currentApplicationDraft) rows.push({
    id: `application-draft:${input.currentApplicationDraft.id}`,
    dedupeKey: `application:${input.currentApplicationDraft.id}`,
    type: "resume",
    title: "작성 중인 지원서를 이어가세요",
    description: "현재 버전의 답변을 이어서 작성할 수 있습니다.",
    reason: "저장된 지원서 초안이 아직 검토 완료되지 않았습니다.",
    priority: 610,
    target: { kind: "application_coach", airlineId: input.currentApplicationDraft.airlineId, applicationAnswerId: input.currentApplicationDraft.id },
    source: "application_draft",
    resume: true,
    createdAt: input.currentApplicationDraft.updatedAt,
  });

  const fallbackTarget: DailyActionTarget = validQuestions.has(input.balancedQuestionId)
    ? { kind: "interview_question", questionId: input.balancedQuestionId }
    : { kind: "self_introduction", targetSeconds: 60 };
  rows.push({
    id: "fallback:balanced",
    dedupeKey: targetKey(fallbackTarget),
    type: "fallback",
    title: fallbackTarget.kind === "interview_question" ? "오늘의 균형 면접 연습" : "60초 자기소개 연습",
    description: "기본 훈련으로 오늘의 준비 흐름을 시작하세요.",
    reason: "이어할 작업이나 긴급 일정이 없어 균형 훈련을 추천합니다.",
    priority: 100,
    target: fallbackTarget,
    source: "balanced_fallback",
    resume: false,
  });
  return rows;
}

export function buildDailyActionPlan(input: DailyActionPlanInput): DailyActionPlan {
  const now = input.now ?? new Date();
  const sorted = candidates(input).sort((a, b) =>
    b.priority - a.priority ||
    (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
    a.id.localeCompare(b.id),
  );
  const seen = new Set<string>();
  const selected = sorted.filter((item) => {
    if (seen.has(item.dedupeKey)) return false;
    seen.add(item.dedupeKey);
    return true;
  }).slice(0, 3);
  const primary = selected[0];
  const today = localDateKey(now);
  const completedCount = Math.min(
    selected.length,
    new Set((input.completions ?? []).filter((event) => localDateKey(event.completedAt) === today).map((event) => event.id)).size,
  );
  return { primary, secondary: selected.slice(1), completedCount, totalCount: selected.length, generatedAt: now.toISOString() };
}
