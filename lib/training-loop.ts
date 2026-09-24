import type { InterviewAttempt, InterviewPracticeSourceContext } from "@/lib/interview-practice-data";
import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import type { SelfIntroductionLanguage } from "@/lib/self-introduction-language";
import type { SelfIntroductionChallengeSeconds } from "@/lib/self-introduction-challenge";
import type { InterviewSession } from "@/lib/mock-interview-session";
import type { InterviewPracticeQueueItem, InterviewQuestionFavorite } from "@/lib/interview-practice-queue";
import type { AirlineJourneyAction } from "@/lib/airline-target-journey";
import type { DailyActionTarget } from "@/lib/daily-action-plan";
import type { AirlineQuestionProvenance } from "@/lib/airline-question-provenance";
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
