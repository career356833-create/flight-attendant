import type { InterviewAttempt, InterviewPracticeSourceContext } from "@/lib/interview-practice-data";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import type { SelfIntroductionLanguage } from "@/lib/self-introduction-language";
import type { SelfIntroductionChallengeSeconds } from "@/lib/self-introduction-challenge";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { InterviewPracticeQueueItem, InterviewQuestionFavorite } from "@/lib/interview-practice-queue";
import type { AirlineJourneyAction } from "@/lib/airline-target-journey";
import type { DailyActionTarget } from "@/lib/daily-action-plan";
import type { AirlineQuestionProvenance } from "@/lib/airline-question-provenance";
import type { ApplicationAnswer, ApplicationAnswerAnalysis, ApplicationAnswerVersion, ApplicationPrompt, DraftEvidence } from "@/lib/application-answer-repository";
import { journeyActionTarget } from "@/lib/airline-preparation-home";

/**
 * Training Loop V2 — the derived contract behind
 * practice -> result -> review -> retake or next -> completion.
 *
 * Nothing here is stored. Every value is derived from records the feature repositories already own
 * (attempts, sessions, answers, queue, favorites, journey). The module never scores the user: no
 * readiness value, no hiring probability, no airline fit, and no inference about personality. It only
 * repeats evidence that the saved analysis already produced, and it refuses to produce
 * transcript-based feedback for a practice whose transcript was never actually captured.
 */
export type TrainingType = "single_interview" | "mock_interview" | "self_introduction" | "application_answer";
export type TrainingEvidenceMode = "actual_audio" | "audio_only" | "text_practice" | "text_analysis";

export type TrainingLoopContext = {
  trainingType: TrainingType;
  origin?: InterviewPracticeSourceContext["source"] | "daily_plan" | "weekly_task" | "direct";
  airlineId?: string;
  questionId?: string;
  questionProvenance?: AirlineQuestionProvenance;
  recruitmentPeriod?: string;
  previousAttemptId?: string;
  attemptId?: string;
  attemptNumber?: number;
  returnTarget?: DailyActionTarget;
  /** Self-introduction only: the 30/60/90 target and the practice language identify the exercise. */
  selfIntroMode?: SelfIntroductionChallengeSeconds;
  language?: SelfIntroductionLanguage;
  /** Mock only: the session is the unit of practice, never one of its questions. */
  mockSessionId?: string;
  mockConfigId?: string;
  questionIds?: string[];
  attemptIds?: string[];
  completedQuestionCount?: number;
  previousSessionId?: string;
  /**
   * Application only: the saved answer is the unit of practice and the prompt identifies the exercise.
   * `applicationSourceType` keeps a practice template apart from an official application question, and
   * `recruitmentYear` travels with `recruitmentPeriod` so an archived question stays archived.
   */
  promptId?: string;
  applicationAnswerId?: string;
  applicationVersion?: number;
  applicationSourceType?: ApplicationPrompt["sourceType"];
  selectedExperienceIds?: string[];
  recruitmentYear?: number;
  previousVersionId?: string;
};

export type TrainingLoopPoint = { key: string; message: string; source: "content_analysis" | "speech_metrics" | "audio_metrics" | "timing" };
export type TrainingLoopDelta = { key: string; label: string; before: string; after: string };
export type TrainingLoopComparison = { previousAttemptId: string; attemptNumber: number; deltas: TrainingLoopDelta[] };
export type TrainingLoopHistoryItem = { attemptId: string; attemptNumber: number; occurredAt: string; durationSeconds: number };

export type TrainingLoopAction = {
  kind: "retake" | "focused_retake" | "next" | "return";
  label: string;
  reason: string;
  target: DailyActionTarget;
  focusKey?: string;
};

export type TrainingLoopModel = {
  context: TrainingLoopContext;
  evidenceMode: TrainingEvidenceMode;
  completed: boolean;
  strengths: TrainingLoopPoint[];
  improvementPoints: TrainingLoopPoint[];
  noImprovementFound: boolean;
  comparison?: TrainingLoopComparison;
  history: TrainingLoopHistoryItem[];
  retakeAction?: TrainingLoopAction;
  focusedRetakeAction?: TrainingLoopAction;
  nextAction?: TrainingLoopAction;
  favorited: boolean;
  queued: boolean;
  summary: { completedLabel: string; improvementCount: number; previousAttemptCount: number };
};

export type TrainingLoopInput = {
  attempt?: InterviewAttempt | null;
  attempts?: InterviewAttempt[];
  selfIntroductions?: SelfIntroductionAttempt[];
  sessions?: InterviewSession[];
  applicationAnswerCount?: number;
  queue?: InterviewPracticeQueueItem[];
  favorites?: InterviewQuestionFavorite[];
  journeyAction?: AirlineJourneyAction | null;
  dailyFallback?: DailyActionTarget;
  context?: Partial<TrainingLoopContext>;
};

export const MAX_TRAINING_STRENGTHS = 3;
export const MAX_TRAINING_IMPROVEMENTS = 3;
export const MAX_TRAINING_HISTORY = 3;
/** After this many consecutive attempts on one question the loop stops proposing the same question. */
export const REPEATED_QUESTION_LIMIT = 3;

export const NO_IMPROVEMENT_MESSAGE = "이번 결과에서 추가로 확인된 보완 포인트가 없습니다.";

const trimmed = (value?: string) => (typeof value === "string" ? value.trim() : "");
const time = (value?: string) => {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * What the saved practice can honestly support.
 * - actual_audio: the transcript really came from the recording, so transcript-based points are allowed.
 * - audio_only: a recording exists but was never transcribed — audio/timing evidence only.
 * - text_practice: typed practice with no captured speech — no speech or audio metrics.
 */
export type TrainingEvidenceSource = {
  transcriptIntegrity?: InterviewAttempt["transcriptIntegrity"];
  transcript?: string;
  audioMetrics?: InterviewAttempt["audioMetrics"];
  speechMetrics?: InterviewAttempt["speechMetrics"];
};

export function trainingEvidenceMode(attempt: TrainingEvidenceSource | null | undefined): TrainingEvidenceMode {
  if (!attempt) return "text_practice";
  if (attempt.transcriptIntegrity?.mode === "actual_audio" && attempt.transcriptIntegrity.isActualTranscription === true) return "actual_audio";
  if (attempt.audioMetrics) return "audio_only";
  return trimmed(attempt.transcript) ? "text_analysis" : "text_practice";
}

const transcriptEvidenceAllowed = (mode: TrainingEvidenceMode) => mode === "actual_audio" || mode === "text_analysis";
const audioEvidenceAllowed = (mode: TrainingEvidenceMode) => mode === "actual_audio" || mode === "audio_only";

function strengthPoints(attempt: InterviewAttempt, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  if (!transcriptEvidenceAllowed(mode)) return [];
  return (attempt.contentAnalysis?.strongPoints ?? [])
    .map((message) => trimmed(message))
    .filter(Boolean)
    .slice(0, MAX_TRAINING_STRENGTHS)
    .map((message, index) => ({ key: `strength-${index}`, message, source: "content_analysis" as const }));
}

function improvementPointsFor(attempt: InterviewAttempt, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  const rows: TrainingLoopPoint[] = [];
  if (transcriptEvidenceAllowed(mode)) {
    for (const item of [...(attempt.contentAnalysis?.improvementPoints ?? [])].sort((a, b) => a.priority - b.priority)) {
      const message = trimmed(item.message);
      if (message) rows.push({ key: `content-${item.priority}-${rows.length}`, message, source: "content_analysis" });
    }
  }
  if (audioEvidenceAllowed(mode)) {
    const fillers = attempt.speechMetrics?.fillers?.totalCount ?? 0;
    if (mode === "actual_audio" && fillers >= 3) rows.push({ key: "filler", message: `추임새가 ${fillers}회 확인됐습니다. 문장 사이를 짧게 끊어 말해 보세요.`, source: "speech_metrics" });
    const longPauses = attempt.audioMetrics?.pauses?.longCount ?? 0;
    if (longPauses >= 2) rows.push({ key: "long_pause", message: `긴 쉼이 ${longPauses}회 있었습니다. 핵심 순서를 먼저 정하고 이어 말해 보세요.`, source: "audio_metrics" });
  }
  return rows.slice(0, MAX_TRAINING_IMPROVEMENTS);
}

/** Previous attempts of the very same question — a different question or airline is never compared. */
export function previousAttemptsFor(attempt: InterviewAttempt, attempts: InterviewAttempt[]): InterviewAttempt[] {
  return attempts
    .filter(
      (item) =>
        item.id !== attempt.id &&
        item.completed &&
        !item.isFollowUp &&
        item.questionId === attempt.questionId &&
        (item.targetAirlineId ?? undefined) === (attempt.targetAirlineId ?? undefined),
    )
    .sort((a, b) => time(b.createdAt) - time(a.createdAt) || b.attemptNumber - a.attemptNumber);
}

function comparisonFor(attempt: InterviewAttempt, previous: InterviewAttempt | undefined, mode: TrainingEvidenceMode): TrainingLoopComparison | undefined {
  if (!previous) return undefined;
  const previousMode = trainingEvidenceMode(previous);
  const deltas: TrainingLoopDelta[] = [];
  const both = (check: (value: TrainingEvidenceMode) => boolean) => check(mode) && check(previousMode);
  if (previous.durationSeconds > 0 && attempt.durationSeconds > 0) {
    deltas.push({ key: "duration", label: "답변 시간", before: `${previous.durationSeconds}초`, after: `${attempt.durationSeconds}초` });
  }
  if (both((value) => value === "actual_audio")) {
    const beforeFiller = previous.speechMetrics?.fillers?.totalCount, afterFiller = attempt.speechMetrics?.fillers?.totalCount;
    if (typeof beforeFiller === "number" && typeof afterFiller === "number") deltas.push({ key: "filler", label: "추임새", before: `${beforeFiller}회`, after: `${afterFiller}회` });
    const beforeWpm = previous.speechMetrics?.speechRate?.estimatedWpm, afterWpm = attempt.speechMetrics?.speechRate?.estimatedWpm;
    if (typeof beforeWpm === "number" && typeof afterWpm === "number") deltas.push({ key: "wpm", label: "말하기 속도", before: `${beforeWpm} WPM`, after: `${afterWpm} WPM` });
  }
  if (both(audioEvidenceAllowed)) {
    const beforePause = previous.audioMetrics?.pauses?.longCount, afterPause = attempt.audioMetrics?.pauses?.longCount;
    if (typeof beforePause === "number" && typeof afterPause === "number") deltas.push({ key: "long_pause", label: "긴 쉼", before: `${beforePause}회`, after: `${afterPause}회` });
  }
  if (both(transcriptEvidenceAllowed)) {
    const beforeAction = previous.contentAnalysis?.structure?.missingParts ?? [], afterAction = attempt.contentAnalysis?.structure?.missingParts ?? [];
    if (previous.contentAnalysis && attempt.contentAnalysis) {
      deltas.push({ key: "structure", label: "구조 누락", before: beforeAction.length ? `${beforeAction.length}개` : "없음", after: afterAction.length ? `${afterAction.length}개` : "없음" });
    }
  }
  if (!deltas.length) return undefined;
  return { previousAttemptId: previous.id, attemptNumber: previous.attemptNumber, deltas };
}

const interviewTarget = (attempt: InterviewAttempt): DailyActionTarget => ({
  kind: "interview_question",
  questionId: attempt.questionId,
  airlineId: attempt.targetAirlineId ?? attempt.sourceContext?.airlineId,
});

/** Consecutive completed attempts on this question, newest first, used to stop an endless retake loop. */
export function consecutiveQuestionAttempts(attempt: InterviewAttempt, attempts: InterviewAttempt[]): number {
  const ordered = [...attempts, attempt]
    .filter((item) => item.completed && !item.isFollowUp)
    .sort((a, b) => time(b.createdAt) - time(a.createdAt) || b.attemptNumber - a.attemptNumber);
  let count = 0;
  for (const item of ordered) {
    if (item.questionId !== attempt.questionId) break;
    count += 1;
  }
  return count;
}

function nextActionFor(input: TrainingLoopInput, attempt: InterviewAttempt, repeated: number): TrainingLoopAction | undefined {
  const airlineId = attempt.targetAirlineId ?? attempt.sourceContext?.airlineId;
  // A. the question was practised enough times in a row — move on to saved work instead of repeating it
  const openQueue = (input.queue ?? []).filter((item) => item.status === "open" && item.questionId !== attempt.questionId);
  if (repeated >= REPEATED_QUESTION_LIMIT && openQueue[0]) {
    return { kind: "next", label: "재연습 큐의 다음 질문", reason: "같은 질문을 연속으로 연습했습니다. 저장한 재연습 질문으로 넘어가 보세요.", target: { kind: "interview_question", questionId: openQueue[0].questionId, airlineId: openQueue[0].airlineId, queueItemId: openQueue[0].id } };
  }
  if (openQueue[0]) {
    return { kind: "next", label: "재연습 큐의 다음 질문", reason: "재연습 큐에 저장한 질문이 남아 있습니다.", target: { kind: "interview_question", questionId: openQueue[0].questionId, airlineId: openQueue[0].airlineId, queueItemId: openQueue[0].id } };
  }
  // B. no self-introduction recorded yet
  if (!(input.selfIntroductions ?? []).some((item) => item.completed)) {
    return { kind: "next", label: "60초 자기소개 연습", reason: "완료한 자기소개 기록이 아직 없습니다.", target: { kind: "self_introduction", targetSeconds: 60 } };
  }
  // C. self-introduction exists but no mock session
  if (!(input.sessions ?? []).some((item) => item.status === "completed")) {
    return { kind: "next", label: "모의면접 시작", reason: "단일 연습 다음에는 질문 흐름을 이어서 점검해 보세요.", target: { kind: "mock_start", airlineId } };
  }
  // D. no saved application answer
  if (!(input.applicationAnswerCount ?? 0)) {
    return { kind: "next", label: "지원서 답변 작성", reason: "저장한 지원서 답변이 아직 없습니다.", target: { kind: "application_coach", airlineId } };
  }
  // E. the target airline journey has its own next step
  if (input.journeyAction && airlineId) {
    return { kind: "next", label: input.journeyAction.label, reason: input.journeyAction.reason, target: journeyActionTarget(input.journeyAction, airlineId) };
  }
  // F. fall back to the existing daily plan target
  if (input.dailyFallback) return { kind: "next", label: "오늘의 기본 연습", reason: "이어할 작업이 없어 기본 훈련을 이어갑니다.", target: input.dailyFallback };
  return undefined;
}

export function buildTrainingLoopModel(input: TrainingLoopInput): TrainingLoopModel {
  const attempt = input.attempt ?? null;
  const baseContext: TrainingLoopContext = {
    trainingType: "single_interview",
    ...input.context,
    airlineId: input.context?.airlineId ?? attempt?.targetAirlineId ?? attempt?.sourceContext?.airlineId,
    questionId: input.context?.questionId ?? attempt?.questionId,
    questionProvenance: input.context?.questionProvenance ?? (attempt?.sourceContext?.questionProvenance as AirlineQuestionProvenance | undefined),
    origin: input.context?.origin ?? attempt?.sourceContext?.source ?? "direct",
    attemptId: input.context?.attemptId ?? attempt?.id,
    attemptNumber: input.context?.attemptNumber ?? attempt?.attemptNumber,
    previousAttemptId: input.context?.previousAttemptId ?? attempt?.previousAttemptId,
  };

  if (!attempt || !attempt.completed) {
    // A practice that was never completed produces no strengths, no gaps and no comparison.
    return {
      context: baseContext,
      evidenceMode: trainingEvidenceMode(attempt),
      completed: false,
      strengths: [],
      improvementPoints: [],
      noImprovementFound: false,
      history: [],
      favorited: false,
      queued: false,
      summary: { completedLabel: "미완료", improvementCount: 0, previousAttemptCount: 0 },
    };
  }

  const mode = trainingEvidenceMode(attempt);
  const strengths = strengthPoints(attempt, mode);
  const improvementPoints = improvementPointsFor(attempt, mode);
  const previous = previousAttemptsFor(attempt, input.attempts ?? []);
  const repeated = consecutiveQuestionAttempts(attempt, input.attempts ?? []);

  const retakeAction: TrainingLoopAction = {
    kind: "retake",
    label: "같은 질문 다시 연습",
    reason: "같은 질문과 연습 조건으로 새 답변을 기록합니다.",
    target: interviewTarget(attempt),
  };
  const focusPoint = improvementPoints[0];
  const focusedRetakeAction: TrainingLoopAction | undefined = focusPoint
    ? { kind: "focused_retake", label: "이 항목에 집중해서 다시 연습", reason: focusPoint.message, target: interviewTarget(attempt), focusKey: focusPoint.key }
    : undefined;

  return {
    context: baseContext,
    evidenceMode: mode,
    completed: true,
    strengths,
    improvementPoints,
    noImprovementFound: improvementPoints.length === 0,
    comparison: comparisonFor(attempt, previous[0], mode),
    history: previous.slice(0, MAX_TRAINING_HISTORY).map((item) => ({ attemptId: item.id, attemptNumber: item.attemptNumber, occurredAt: item.createdAt, durationSeconds: item.durationSeconds })),
    retakeAction,
    focusedRetakeAction,
    nextAction: nextActionFor(input, attempt, repeated),
    favorited: (input.favorites ?? []).some((item) => item.questionId === attempt.questionId),
    queued: (input.queue ?? []).some((item) => item.questionId === attempt.questionId && item.status === "open"),
    summary: { completedLabel: "완료", improvementCount: improvementPoints.length, previousAttemptCount: previous.length },
  };
}

/* ------------------------------------------------------------------ *
 * Self introduction
 *
 * The same loop contract, with the exercise identified by its 30/60/90 target and practice language
 * instead of a question id. A self-introduction has no question, so none is invented.
 * ------------------------------------------------------------------ */

export type SelfIntroTrainingLoopInput = {
  attempt?: SelfIntroductionAttempt | null;
  attempts?: SelfIntroductionAttempt[];
  sessions?: InterviewSession[];
  applicationAnswerCount?: number;
  journeyAction?: AirlineJourneyAction | null;
  dailyFallback?: DailyActionTarget;
  context?: Partial<TrainingLoopContext>;
};

const selfIntroSeconds = (attempt: SelfIntroductionAttempt) => attempt.targetSeconds;
const selfIntroLanguage = (attempt: SelfIntroductionAttempt) => attempt.practiceLanguage;

/**
 * Previous attempts of the very same exercise: same target seconds, same practice language and the
 * same airline context. A 30-second attempt is never compared against a 90-second one, and a Korean
 * attempt is never compared against an English one.
 */
export function previousSelfIntroAttemptsFor(attempt: SelfIntroductionAttempt, attempts: SelfIntroductionAttempt[]): SelfIntroductionAttempt[] {
  return attempts
    .filter(
      (item) =>
        item.id !== attempt.id &&
        item.completed &&
        selfIntroSeconds(item) === selfIntroSeconds(attempt) &&
        selfIntroLanguage(item) === selfIntroLanguage(attempt) &&
        (item.targetAirlineId ?? undefined) === (attempt.targetAirlineId ?? undefined),
    )
    .sort((a, b) => time(b.createdAt) - time(a.createdAt) || b.attemptNumber - a.attemptNumber);
}

function selfIntroStrengths(attempt: SelfIntroductionAttempt, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  if (!transcriptEvidenceAllowed(mode)) return [];
  const rows = [...(attempt.analysis?.challenge?.strengths ?? []), trimmed(attempt.analysis?.bestPoint)]
    .map((value) => trimmed(value))
    .filter(Boolean);
  return [...new Set(rows)].slice(0, MAX_TRAINING_STRENGTHS).map((message, index) => ({ key: `self-strength-${index}`, message, source: "content_analysis" as const }));
}

function selfIntroImprovements(attempt: SelfIntroductionAttempt, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  const rows: TrainingLoopPoint[] = [];
  if (transcriptEvidenceAllowed(mode)) {
    const content = [...(attempt.analysis?.challenge?.improvements ?? []), trimmed(attempt.analysis?.firstImprovement)].map((value) => trimmed(value)).filter(Boolean);
    for (const message of [...new Set(content)]) rows.push({ key: `self-content-${rows.length}`, message, source: "content_analysis" });
  }
  // Timing is measured from the recording itself, so it survives an audio-only result.
  const timing = attempt.analysis?.challenge?.timing;
  if (timing && timing.status !== "close" && audioEvidenceAllowed(mode)) {
    rows.push({ key: "self-duration", message: `목표 ${timing.targetSeconds}초 · 실제 ${timing.actualSeconds}초입니다.`, source: "timing" });
  }
  if (audioEvidenceAllowed(mode)) {
    const longPauses = attempt.audioMetrics?.pauses?.longCount ?? 0;
    if (longPauses >= 2) rows.push({ key: "self-long-pause", message: `긴 쉼이 ${longPauses}회 있었습니다. 핵심 순서를 먼저 정하고 이어 말해 보세요.`, source: "audio_metrics" });
    const fillers = attempt.speechMetrics?.fillers?.totalCount ?? 0;
    if (mode === "actual_audio" && fillers >= 3) rows.push({ key: "self-filler", message: `추임새가 ${fillers}회 확인됐습니다. 문장 사이를 짧게 끊어 말해 보세요.`, source: "speech_metrics" });
  }
  return rows.slice(0, MAX_TRAINING_IMPROVEMENTS);
}

function selfIntroComparison(attempt: SelfIntroductionAttempt, previous: SelfIntroductionAttempt | undefined, mode: TrainingEvidenceMode): TrainingLoopComparison | undefined {
  if (!previous) return undefined;
  const previousMode = trainingEvidenceMode(previous);
  const both = (check: (value: TrainingEvidenceMode) => boolean) => check(mode) && check(previousMode);
  const deltas: TrainingLoopDelta[] = [];
  if (previous.durationSeconds > 0 && attempt.durationSeconds > 0) {
    deltas.push({ key: "duration", label: "답변 시간", before: `${previous.durationSeconds}초`, after: `${attempt.durationSeconds}초` });
  }
  if (both((value) => value === "actual_audio")) {
    const beforeFiller = previous.speechMetrics?.fillers?.totalCount, afterFiller = attempt.speechMetrics?.fillers?.totalCount;
    if (typeof beforeFiller === "number" && typeof afterFiller === "number") deltas.push({ key: "filler", label: "추임새", before: `${beforeFiller}회`, after: `${afterFiller}회` });
  }
  if (both(audioEvidenceAllowed)) {
    const beforePause = previous.audioMetrics?.pauses?.longCount, afterPause = attempt.audioMetrics?.pauses?.longCount;
    if (typeof beforePause === "number" && typeof afterPause === "number") deltas.push({ key: "long_pause", label: "긴 쉼", before: `${beforePause}회`, after: `${afterPause}회` });
  }
  if (both(transcriptEvidenceAllowed)) {
    const missing = (item: SelfIntroductionAttempt) => Object.values(item.analysis?.challenge?.structure ?? {}).filter((value) => value === "missing").length;
    if (previous.analysis?.challenge?.structure && attempt.analysis?.challenge?.structure) {
      const before = missing(previous), after = missing(attempt);
      deltas.push({ key: "structure", label: "구조 누락", before: before ? `${before}개` : "없음", after: after ? `${after}개` : "없음" });
    }
  }
  return deltas.length ? { previousAttemptId: previous.id, attemptNumber: previous.attemptNumber, deltas } : undefined;
}

/** The navigation target is the shared self-introduction entry; the exact 30/60/90 mode and language
 * are restored by the flow's existing same-condition retake, not by this target. */
const selfIntroTarget: DailyActionTarget = { kind: "self_introduction", targetSeconds: 60 };

/** Consecutive completed attempts of this exact exercise, used to stop proposing it again as "next". */
export function consecutiveSelfIntroAttempts(attempt: SelfIntroductionAttempt, attempts: SelfIntroductionAttempt[]): number {
  const ordered = [...attempts, attempt].filter((item) => item.completed).sort((a, b) => time(b.createdAt) - time(a.createdAt) || b.attemptNumber - a.attemptNumber);
  let count = 0;
  for (const item of ordered) {
    if (selfIntroSeconds(item) !== selfIntroSeconds(attempt) || selfIntroLanguage(item) !== selfIntroLanguage(attempt)) break;
    count += 1;
  }
  return count;
}

function selfIntroNextAction(input: SelfIntroTrainingLoopInput, attempt: SelfIntroductionAttempt): TrainingLoopAction | undefined {
  const airlineId = attempt.targetAirlineId;
  // The loop never proposes the self introduction that was just practised; a retake is the user's choice.
  if (!(input.sessions ?? []).some((item) => item.status === "completed")) {
    return { kind: "next", label: "모의면접 시작", reason: "자기소개 다음에는 질문 흐름을 이어서 점검해 보세요.", target: { kind: "mock_start", airlineId } };
  }
  if (!(input.applicationAnswerCount ?? 0)) {
    return { kind: "next", label: "지원서 답변 작성", reason: "저장한 지원서 답변이 아직 없습니다.", target: { kind: "application_coach", airlineId } };
  }
  if (input.journeyAction && airlineId) {
    return { kind: "next", label: input.journeyAction.label, reason: input.journeyAction.reason, target: journeyActionTarget(input.journeyAction, airlineId) };
  }
  if (input.dailyFallback) return { kind: "next", label: "오늘의 기본 연습", reason: "이어할 작업이 없어 기본 훈련을 이어갑니다.", target: input.dailyFallback };
  return undefined;
}

export function buildSelfIntroTrainingLoopModel(input: SelfIntroTrainingLoopInput): TrainingLoopModel {
  const attempt = input.attempt ?? null;
  const baseContext: TrainingLoopContext = {
    trainingType: "self_introduction",
    ...input.context,
    airlineId: input.context?.airlineId ?? attempt?.targetAirlineId,
    // A self introduction has no question, so questionId stays undefined rather than being invented.
    questionId: undefined,
    origin: input.context?.origin ?? "direct",
    attemptId: input.context?.attemptId ?? attempt?.id,
    attemptNumber: input.context?.attemptNumber ?? attempt?.attemptNumber,
    previousAttemptId: input.context?.previousAttemptId ?? attempt?.previousAttemptId,
    selfIntroMode: input.context?.selfIntroMode ?? attempt?.targetSeconds,
    language: input.context?.language ?? attempt?.practiceLanguage,
  };

  if (!attempt || !attempt.completed) {
    return {
      context: baseContext,
      evidenceMode: trainingEvidenceMode(attempt),
      completed: false,
      strengths: [],
      improvementPoints: [],
      noImprovementFound: false,
      history: [],
      favorited: false,
      queued: false,
      summary: { completedLabel: "미완료", improvementCount: 0, previousAttemptCount: 0 },
    };
  }

  const mode = trainingEvidenceMode(attempt);
  const improvementPoints = selfIntroImprovements(attempt, mode);
  const previous = previousSelfIntroAttemptsFor(attempt, input.attempts ?? []);
  const retakeAction: TrainingLoopAction = {
    kind: "retake",
    label: "같은 자기소개 다시 연습",
    reason: "같은 시간 목표와 언어로 새 자기소개를 기록합니다.",
    target: selfIntroTarget,
  };
  const focusPoint = improvementPoints[0];

  return {
    context: baseContext,
    evidenceMode: mode,
    completed: true,
    strengths: selfIntroStrengths(attempt, mode),
    improvementPoints,
    noImprovementFound: improvementPoints.length === 0,
    comparison: selfIntroComparison(attempt, previous[0], mode),
    history: previous.slice(0, MAX_TRAINING_HISTORY).map((item) => ({ attemptId: item.id, attemptNumber: item.attemptNumber, occurredAt: item.createdAt, durationSeconds: item.durationSeconds })),
    retakeAction,
    focusedRetakeAction: focusPoint ? { kind: "focused_retake", label: "이 항목에 집중해서 다시 연습", reason: focusPoint.message, target: selfIntroTarget, focusKey: focusPoint.key } : undefined,
    nextAction: selfIntroNextAction(input, attempt),
    favorited: false,
    queued: false,
    summary: { completedLabel: "완료", improvementCount: improvementPoints.length, previousAttemptCount: previous.length },
  };
}

/* ------------------------------------------------------------------ *
 * Mock interview
 *
 * The unit of practice is the whole session, never one of its questions. A session counts as done
 * only when the session itself completed — answering the first question does not finish a mock, and
 * its question attempts are never counted as mock sessions.
 * ------------------------------------------------------------------ */

export type MockTrainingLoopInput = {
  session?: InterviewSession | null;
  sessions?: InterviewSession[];
  attempts?: InterviewAttempt[];
  selfIntroductions?: SelfIntroductionAttempt[];
  applicationAnswerCount?: number;
  queue?: InterviewPracticeQueueItem[];
  journeyAction?: AirlineJourneyAction | null;
  dailyFallback?: DailyActionTarget;
  context?: Partial<TrainingLoopContext>;
};

/**
 * The configuration that makes two mocks the same exercise: the session mode, the airline it was run
 * for and how many questions it asked. Sessions with a different configuration are never compared.
 */
export function mockConfigId(session: InterviewSession): string {
  return `${session.mode}:${session.airlineId ?? "generic"}:${session.questionIds.length}`;
}

/** A mock is finished only when the session itself completed. */
export const isMockSessionComplete = (session: InterviewSession | null | undefined) => session?.status === "completed";

const sessionAttempts = (session: InterviewSession, attempts: InterviewAttempt[]) =>
  attempts.filter((item) => session.attemptIds.includes(item.id) && !item.isFollowUp);

/** The strongest evidence any answer in the session actually carries. */
export function mockEvidenceMode(session: InterviewSession, attempts: InterviewAttempt[]): TrainingEvidenceMode {
  const rows = sessionAttempts(session, attempts);
  if (!rows.length) return "text_practice";
  if (rows.some((item) => trainingEvidenceMode(item) === "actual_audio")) return "actual_audio";
  if (rows.some((item) => trainingEvidenceMode(item) === "audio_only")) return "audio_only";
  if (rows.some((item) => trainingEvidenceMode(item) === "text_analysis")) return "text_analysis";
  return "text_practice";
}

/** An issue seen in more than one question of the same session, reported once with its count. */
export function repeatedMockIssues(session: InterviewSession, attempts: InterviewAttempt[]): Array<{ message: string; count: number }> {
  const counts = new Map<string, number>();
  for (const attempt of sessionAttempts(session, attempts)) {
    for (const part of new Set(attempt.contentAnalysis?.structure?.missingParts ?? [])) {
      const message = trimmed(part);
      if (message) counts.set(message, (counts.get(message) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([message, count]) => ({ message, count }));
}

function mockStrengths(session: InterviewSession, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  if (!transcriptEvidenceAllowed(mode)) return [];
  return (session.sessionAnalysis?.strengths ?? [])
    .map((value) => trimmed(value))
    .filter(Boolean)
    .slice(0, MAX_TRAINING_STRENGTHS)
    .map((message, index) => ({ key: `mock-strength-${index}`, message, source: "content_analysis" as const }));
}

function mockImprovements(session: InterviewSession, attempts: InterviewAttempt[], mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  const rows: TrainingLoopPoint[] = [];
  if (transcriptEvidenceAllowed(mode)) {
    for (const issue of repeatedMockIssues(session, attempts)) {
      rows.push({ key: `mock-repeated-${issue.message}`, message: `${issue.message}이(가) ${issue.count}개 문항에서 반복됐습니다.`, source: "content_analysis" });
    }
    for (const value of session.sessionAnalysis?.improvements ?? []) {
      const message = trimmed(value);
      if (message) rows.push({ key: `mock-content-${rows.length}`, message, source: "content_analysis" });
    }
  }
  const answered = sessionAttempts(session, attempts).length;
  if (session.questionIds.length && answered < session.questionIds.length) {
    rows.push({ key: "mock-unanswered", message: `${session.questionIds.length}문항 중 ${answered}문항을 기록했습니다.`, source: "timing" });
  }
  if (audioEvidenceAllowed(mode)) {
    const pauses = sessionAttempts(session, attempts).reduce((sum, item) => sum + (item.audioMetrics?.pauses?.longCount ?? 0), 0);
    if (pauses >= 2) rows.push({ key: "mock-long-pause", message: `세션 전체에서 긴 쉼이 ${pauses}회 있었습니다.`, source: "audio_metrics" });
  }
  return rows.slice(0, MAX_TRAINING_IMPROVEMENTS);
}

/** Completed sessions of the same configuration, newest first. */
export function previousMockSessionsFor(session: InterviewSession, sessions: InterviewSession[]): InterviewSession[] {
  const config = mockConfigId(session);
  return sessions
    .filter((item) => item.id !== session.id && item.status === "completed" && mockConfigId(item) === config)
    .sort((a, b) => time(b.completedAt ?? b.startedAt) - time(a.completedAt ?? a.startedAt) || a.id.localeCompare(b.id));
}

const sessionDuration = (session: InterviewSession, attempts: InterviewAttempt[]) =>
  sessionAttempts(session, attempts).reduce((sum, item) => sum + (item.durationSeconds || 0), 0);

function mockComparison(session: InterviewSession, previous: InterviewSession | undefined, attempts: InterviewAttempt[], mode: TrainingEvidenceMode): TrainingLoopComparison | undefined {
  if (!previous) return undefined;
  const previousMode = mockEvidenceMode(previous, attempts);
  const both = (check: (value: TrainingEvidenceMode) => boolean) => check(mode) && check(previousMode);
  const deltas: TrainingLoopDelta[] = [];
  const beforeAnswered = sessionAttempts(previous, attempts).length, afterAnswered = sessionAttempts(session, attempts).length;
  deltas.push({ key: "completed", label: "기록한 문항", before: `${beforeAnswered}/${previous.questionIds.length}`, after: `${afterAnswered}/${session.questionIds.length}` });
  const beforeDuration = sessionDuration(previous, attempts), afterDuration = sessionDuration(session, attempts);
  if (beforeDuration > 0 && afterDuration > 0) deltas.push({ key: "duration", label: "총 답변 시간", before: `${beforeDuration}초`, after: `${afterDuration}초` });
  if (both((value) => value === "actual_audio")) {
    const sum = (rows: InterviewAttempt[]) => rows.reduce((total, item) => total + (item.speechMetrics?.fillers?.totalCount ?? 0), 0);
    deltas.push({ key: "filler", label: "추임새", before: `${sum(sessionAttempts(previous, attempts))}회`, after: `${sum(sessionAttempts(session, attempts))}회` });
  }
  if (both(audioEvidenceAllowed)) {
    const sum = (rows: InterviewAttempt[]) => rows.reduce((total, item) => total + (item.audioMetrics?.pauses?.longCount ?? 0), 0);
    deltas.push({ key: "long_pause", label: "긴 쉼", before: `${sum(sessionAttempts(previous, attempts))}회`, after: `${sum(sessionAttempts(session, attempts))}회` });
  }
  if (both(transcriptEvidenceAllowed)) {
    const repeated = (item: InterviewSession) => repeatedMockIssues(item, attempts).length;
    deltas.push({ key: "repeated", label: "반복된 보완점", before: repeated(previous) ? `${repeated(previous)}개` : "없음", after: repeated(session) ? `${repeated(session)}개` : "없음" });
  }
  return deltas.length ? { previousAttemptId: previous.id, attemptNumber: previous.questionIds.length, deltas } : undefined;
}

function mockNextAction(input: MockTrainingLoopInput, session: InterviewSession): TrainingLoopAction | undefined {
  const airlineId = session.airlineId;
  // The mock that was just completed is never proposed again; a retake is the user's explicit choice.
  if (!(input.applicationAnswerCount ?? 0)) {
    return { kind: "next", label: "지원서 답변 작성", reason: "저장한 지원서 답변이 아직 없습니다.", target: { kind: "application_coach", airlineId } };
  }
  if (input.journeyAction && airlineId) {
    return { kind: "next", label: input.journeyAction.label, reason: input.journeyAction.reason, target: journeyActionTarget(input.journeyAction, airlineId) };
  }
  const openQueue = (input.queue ?? []).find((item) => item.status === "open");
  if (openQueue) {
    return { kind: "next", label: "재연습 큐의 다음 질문", reason: "재연습 큐에 저장한 질문이 남아 있습니다.", target: { kind: "interview_question", questionId: openQueue.questionId, airlineId: openQueue.airlineId, queueItemId: openQueue.id } };
  }
  if (!(input.selfIntroductions ?? []).some((item) => item.completed)) {
    return { kind: "next", label: "60초 자기소개 연습", reason: "완료한 자기소개 기록이 아직 없습니다.", target: { kind: "self_introduction", targetSeconds: 60 } };
  }
  if (input.dailyFallback) return { kind: "next", label: "오늘의 기본 연습", reason: "이어할 작업이 없어 기본 훈련을 이어갑니다.", target: input.dailyFallback };
  return undefined;
}

export function buildMockTrainingLoopModel(input: MockTrainingLoopInput): TrainingLoopModel {
  const session = input.session ?? null;
  const attempts = input.attempts ?? [];
  const baseContext: TrainingLoopContext = {
    trainingType: "mock_interview",
    ...input.context,
    airlineId: input.context?.airlineId ?? session?.airlineId,
    // A mock has no single question id; one of its questions must never stand in for the session.
    questionId: undefined,
    origin: input.context?.origin ?? "direct",
    mockSessionId: input.context?.mockSessionId ?? session?.id,
    mockConfigId: input.context?.mockConfigId ?? (session ? mockConfigId(session) : undefined),
    questionIds: input.context?.questionIds ?? session?.questionIds,
    attemptIds: input.context?.attemptIds ?? session?.attemptIds,
    completedQuestionCount: input.context?.completedQuestionCount ?? (session ? sessionAttempts(session, attempts).length : undefined),
    previousSessionId: input.context?.previousSessionId ?? (session ? previousMockSessionsFor(session, input.sessions ?? [])[0]?.id : undefined),
  };

  if (!isMockSessionComplete(session) || !session) {
    return {
      context: baseContext,
      evidenceMode: session ? mockEvidenceMode(session, attempts) : "text_practice",
      completed: false,
      strengths: [],
      improvementPoints: [],
      noImprovementFound: false,
      history: [],
      favorited: false,
      queued: false,
      summary: { completedLabel: "미완료", improvementCount: 0, previousAttemptCount: 0 },
    };
  }

  const mode = mockEvidenceMode(session, attempts);
  const improvementPoints = mockImprovements(session, attempts, mode);
  const previous = previousMockSessionsFor(session, input.sessions ?? []);
  const retakeTarget: DailyActionTarget = { kind: "mock_start", airlineId: session.airlineId };
  const focusPoint = improvementPoints[0];

  return {
    context: baseContext,
    evidenceMode: mode,
    completed: true,
    strengths: mockStrengths(session, mode),
    improvementPoints,
    noImprovementFound: improvementPoints.length === 0,
    comparison: mockComparison(session, previous[0], attempts, mode),
    history: previous.slice(0, MAX_TRAINING_HISTORY).map((item) => ({
      attemptId: item.id,
      attemptNumber: sessionAttempts(item, attempts).length,
      occurredAt: item.completedAt ?? item.startedAt,
      durationSeconds: sessionDuration(item, attempts),
    })),
    retakeAction: { kind: "retake", label: "같은 모의면접 다시 연습", reason: "같은 구성으로 새 모의면접을 기록합니다.", target: retakeTarget },
    focusedRetakeAction: focusPoint ? { kind: "focused_retake", label: "이 항목에 집중해서 다시 모의면접", reason: focusPoint.message, target: retakeTarget, focusKey: focusPoint.key } : undefined,
    nextAction: mockNextAction(input, session),
    favorited: false,
    queued: false,
    summary: { completedLabel: "완료", improvementCount: improvementPoints.length, previousAttemptCount: previous.length },
  };
}

/* ------------------------------------------------------------------ *
 * Application answer
 *
 * The unit of practice is the saved answer, and the exercise is identified by the prompt it answers —
 * not by the answer text, so the same wording written for another airline or another question is a
 * different exercise. Opening the editor or the analysis screen finishes nothing: the loop treats an
 * answer as done only once the repository actually holds a version of it.
 * ------------------------------------------------------------------ */

export type ApplicationTrainingLoopInput = {
  answer?: ApplicationAnswer | null;
  /** Versions as the repository stores them; rows for other answers are ignored. */
  versions?: ApplicationAnswerVersion[];
  attempts?: InterviewAttempt[];
  selfIntroductions?: SelfIntroductionAttempt[];
  sessions?: InterviewSession[];
  /** An interview question already derived from this answer (the existing drill selection), if any. */
  interviewQuestionId?: string;
  queue?: InterviewPracticeQueueItem[];
  journeyAction?: AirlineJourneyAction | null;
  dailyFallback?: DailyActionTarget;
  context?: Partial<TrainingLoopContext>;
};

/** Versions of this answer only, newest version number first. */
export function applicationVersionsFor(answer: ApplicationAnswer, versions: ApplicationAnswerVersion[]): ApplicationAnswerVersion[] {
  return versions.filter((item) => item.answerId === answer.id).sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt));
}

export const applicationCurrentVersion = (answer: ApplicationAnswer, versions: ApplicationAnswerVersion[]) =>
  applicationVersionsFor(answer, versions).find((item) => item.id === answer.currentVersionId);

/**
 * A saved answer: the repository holds the answer and the version it points at. A work draft has no
 * answer at all, and an answer whose current version is missing is not treated as practice done.
 */
export function isApplicationAnswerSaved(answer: ApplicationAnswer | null | undefined, versions: ApplicationAnswerVersion[]): boolean {
  return Boolean(answer && applicationCurrentVersion(answer, versions));
}

/** Previous versions of the same answer — a different answer, question or airline is never compared. */
export function previousApplicationVersionsFor(answer: ApplicationAnswer, versions: ApplicationAnswerVersion[]): ApplicationAnswerVersion[] {
  const current = applicationCurrentVersion(answer, versions);
  if (!current) return [];
  return applicationVersionsFor(answer, versions).filter((item) => item.id !== current.id && item.version < current.version);
}

/** The experiences this version was written with; a version without its own list inherits the answer's links. */
const versionExperienceIds = (answer: ApplicationAnswer, version: ApplicationAnswerVersion) => version.experienceIds ?? answer.selectedExperienceIds;

const needsImprovement = (analysis: ApplicationAnswerAnalysis | undefined) =>
  (analysis?.evaluations ?? []).filter((item) => item.status === "needs_improvement");
const missingRubricElements = (analysis: ApplicationAnswerAnalysis | undefined) =>
  (analysis?.rubric?.findings ?? []).filter((item) => item.status === "needs_improvement");
const sentenceCount = (content: string) => content.split(/(?<=[.!?。]|다\.|요\.)\s+|\n+/).map((item) => item.trim()).filter(Boolean).length;

function applicationStrengths(version: ApplicationAnswerVersion, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  if (!transcriptEvidenceAllowed(mode)) return [];
  const analysis = version.analysis;
  const rows: TrainingLoopPoint[] = [];
  for (const item of (analysis?.evaluations ?? []).filter((row) => row.status === "strong").sort((a, b) => b.score - a.score)) {
    const message = trimmed(item.feedback);
    if (message) rows.push({ key: `application-strength-${item.key}`, message: `${item.label}: ${message}`, source: "content_analysis" });
  }
  for (const value of analysis?.rubric?.strengths ?? []) {
    const message = trimmed(value);
    if (message) rows.push({ key: `application-rubric-strength-${rows.length}`, message, source: "content_analysis" });
  }
  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.message) ? false : (seen.add(row.message), true))).slice(0, MAX_TRAINING_STRENGTHS);
}

function applicationImprovements(version: ApplicationAnswerVersion, mode: TrainingEvidenceMode): TrainingLoopPoint[] {
  if (!transcriptEvidenceAllowed(mode)) return [];
  const analysis = version.analysis;
  const rows: TrainingLoopPoint[] = [];
  for (const item of needsImprovement(analysis).sort((a, b) => a.score - b.score)) {
    const message = trimmed(item.feedback);
    if (message) rows.push({ key: `application-improvement-${item.key}`, message: `${item.label}: ${message}`, source: "content_analysis" });
  }
  const generic = trimmed(analysis?.genericExpressionWarning);
  if (generic) rows.push({ key: "application-generic", message: generic, source: "content_analysis" });
  for (const item of missingRubricElements(analysis)) {
    const message = trimmed(item.feedback);
    if (message) rows.push({ key: `application-rubric-${item.dimension}`, message, source: "content_analysis" });
  }
  for (const value of analysis?.missingCompetency ?? []) {
    const message = trimmed(value);
    if (message) rows.push({ key: `application-missing-${message}`, message: `${message} 근거가 아직 확인되지 않았습니다.`, source: "content_analysis" });
  }
  const seen = new Set<string>();
  return rows.filter((row) => (seen.has(row.message) ? false : (seen.add(row.message), true))).slice(0, MAX_TRAINING_IMPROVEMENTS);
}

/**
 * Measured differences between this version and the one before it. Every row is a value both versions
 * actually carry — never an improvement score, a percentage or a verdict. Analyzer counts are compared
 * only when both versions stored an analysis, so a version that was never analysed is left out.
 */
function applicationComparison(answer: ApplicationAnswer, version: ApplicationAnswerVersion, previous: ApplicationAnswerVersion | undefined): TrainingLoopComparison | undefined {
  if (!previous) return undefined;
  const deltas: TrainingLoopDelta[] = [];
  deltas.push({ key: "length", label: "답변 길이", before: `${previous.characterCount}자`, after: `${version.characterCount}자` });
  const sentencesBefore = sentenceCount(previous.content), sentencesAfter = sentenceCount(version.content);
  if (sentencesBefore || sentencesAfter) deltas.push({ key: "sentences", label: "문장 수", before: `${sentencesBefore}개`, after: `${sentencesAfter}개` });
  const experiencesBefore = versionExperienceIds(answer, previous).length, experiencesAfter = versionExperienceIds(answer, version).length;
  deltas.push({ key: "experience", label: "연결 경험", before: `${experiencesBefore}개`, after: `${experiencesAfter}개` });
  if (previous.analysis && version.analysis) {
    const before = needsImprovement(previous.analysis).length, after = needsImprovement(version.analysis).length;
    deltas.push({ key: "improvement_count", label: "보완 항목", before: before ? `${before}개` : "없음", after: after ? `${after}개` : "없음" });
    const missingBefore = missingRubricElements(previous.analysis).length, missingAfter = missingRubricElements(version.analysis).length;
    deltas.push({ key: "missing", label: "누락 요소", before: missingBefore ? `${missingBefore}개` : "없음", after: missingAfter ? `${missingAfter}개` : "없음" });
  }
  return { previousAttemptId: previous.id, attemptNumber: previous.version, deltas };
}

/**
 * The deterministic ladder after a saved answer. A rewrite is always the user's explicit choice, so the
 * answer that was just saved is never proposed here and the ladder never sends the user back to the
 * application coach.
 */
function applicationNextAction(input: ApplicationTrainingLoopInput, answer: ApplicationAnswer): TrainingLoopAction | undefined {
  const airlineId = answer.airlineId;
  if (!(input.attempts ?? []).some((item) => item.completed) && input.interviewQuestionId) {
    return { kind: "next", label: "예상 질문 면접 연습", reason: "저장한 답변을 면접 답변으로도 말해 보세요.", target: { kind: "interview_question", questionId: input.interviewQuestionId, airlineId } };
  }
  if (!(input.selfIntroductions ?? []).some((item) => item.completed)) {
    return { kind: "next", label: "60초 자기소개 연습", reason: "완료한 자기소개 기록이 아직 없습니다.", target: { kind: "self_introduction", targetSeconds: 60 } };
  }
  if (!(input.sessions ?? []).some((item) => item.status === "completed")) {
    return { kind: "next", label: "모의면접 시작", reason: "완료한 모의면접 기록이 아직 없습니다.", target: { kind: "mock_start", airlineId } };
  }
  if (input.journeyAction && airlineId) {
    return { kind: "next", label: input.journeyAction.label, reason: input.journeyAction.reason, target: journeyActionTarget(input.journeyAction, airlineId) };
  }
  if (input.dailyFallback) return { kind: "next", label: "오늘의 기본 연습", reason: "이어할 작업이 없어 기본 훈련을 이어갑니다.", target: input.dailyFallback };
  return undefined;
}

/**
 * The evidence a saved answer can honestly support: typed text with a stored analysis allows content
 * points, and an answer saved without analysis carries none. Speech and audio evidence never apply.
 */
export function applicationEvidenceMode(version: ApplicationAnswerVersion | undefined): TrainingEvidenceMode {
  return trainingEvidenceMode(version ? { transcript: version.content } : null);
}

/**
 * Evidence for re-analysing a rewrite. Version rows do not store sentence evidence, so it is rebuilt
 * from what is still true of the answer: the experiences it is linked to, and the saved text itself as
 * the user's own answer. The original draft's airline or coaching evidence is never re-asserted, and an
 * experience that is no longer linked is never claimed.
 */
export function applicationRewriteEvidence(answer: ApplicationAnswer, content?: string): DraftEvidence[] {
  const rows: DraftEvidence[] = answer.experienceSnapshots
    .filter((item) => answer.selectedExperienceIds.includes(item.id))
    .map((item) => ({ sentenceId: `experience-${item.id}`, sourceType: "experience" as const, sourceId: item.id, sourceExcerpt: trimmed(item.shortSummary) || trimmed(item.title) }));
  const text = trimmed(content);
  if (text) rows.push({ sentenceId: "saved-answer", sourceType: "user_answer", sourceId: answer.currentVersionId, sourceExcerpt: text.slice(0, 180) });
  return rows;
}

export function buildApplicationTrainingLoopModel(input: ApplicationTrainingLoopInput): TrainingLoopModel {
  const answer = input.answer ?? null;
  const versions = input.versions ?? [];
  const current = answer ? applicationCurrentVersion(answer, versions) : undefined;
  const journey = answer?.journeyContext;
  const baseContext: TrainingLoopContext = {
    trainingType: "application_answer",
    ...input.context,
    airlineId: input.context?.airlineId ?? answer?.airlineId,
    // An answer is identified by the question it answers; a generic template keeps questionId undefined.
    questionId: input.context?.questionId ?? journey?.questionId,
    questionProvenance: input.context?.questionProvenance ?? journey?.provenance,
    recruitmentPeriod: input.context?.recruitmentPeriod ?? journey?.recruitmentPeriod,
    recruitmentYear: input.context?.recruitmentYear ?? journey?.recruitmentYear,
    origin: input.context?.origin ?? (journey?.origin === "airline_workspace" ? "airline_workspace" : "direct"),
    promptId: input.context?.promptId ?? answer?.promptId,
    applicationAnswerId: input.context?.applicationAnswerId ?? answer?.id,
    applicationVersion: input.context?.applicationVersion ?? current?.version,
    selectedExperienceIds: input.context?.selectedExperienceIds ?? answer?.selectedExperienceIds,
    previousVersionId: input.context?.previousVersionId ?? (answer ? previousApplicationVersionsFor(answer, versions)[0]?.id : undefined),
  };

  if (!answer || !current) {
    return {
      context: baseContext,
      evidenceMode: applicationEvidenceMode(current),
      completed: false,
      strengths: [],
      improvementPoints: [],
      noImprovementFound: false,
      history: [],
      favorited: false,
      queued: false,
      summary: { completedLabel: "미완료", improvementCount: 0, previousAttemptCount: 0 },
    };
  }

  const mode = applicationEvidenceMode(current);
  const improvementPoints = applicationImprovements(current, mode);
  const previous = previousApplicationVersionsFor(answer, versions);
  const rewriteTarget: DailyActionTarget = { kind: "application_coach", airlineId: answer.airlineId, applicationAnswerId: answer.id };
  const focusPoint = improvementPoints[0];

  return {
    context: baseContext,
    evidenceMode: mode,
    completed: true,
    strengths: applicationStrengths(current, mode),
    improvementPoints,
    noImprovementFound: improvementPoints.length === 0,
    comparison: applicationComparison(answer, current, previous[0]),
    history: previous.slice(0, MAX_TRAINING_HISTORY).map((item) => ({ attemptId: item.id, attemptNumber: item.version, occurredAt: item.createdAt, durationSeconds: 0 })),
    retakeAction: { kind: "retake", label: "같은 답변 다시 다듬기", reason: "같은 질문과 연결 경험으로 이 답변의 새 버전을 저장합니다.", target: rewriteTarget },
    focusedRetakeAction: focusPoint ? { kind: "focused_retake", label: "이 항목에 집중해서 다시 다듬기", reason: focusPoint.message, target: rewriteTarget, focusKey: focusPoint.key } : undefined,
    nextAction: applicationNextAction(input, answer),
    favorited: false,
    queued: false,
    summary: { completedLabel: "완료", improvementCount: improvementPoints.length, previousAttemptCount: previous.length },
  };
}
