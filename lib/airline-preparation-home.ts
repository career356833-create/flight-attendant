import ko from "@/lib/locales/ko.json";
import en from "@/lib/locales/en.json";
import { applicationAnswerProgress, applicationProgressLabelsEn, applicationProgressLabelsKo, type ApplicationProgressDisplay } from "@/lib/application-progress-display";
import type { AirlineJourneyAction, AirlineJourneyState } from "@/lib/airline-target-journey";
import type { DailyActionCandidate, DailyActionPlan, DailyActionTarget } from "@/lib/daily-action-plan";
import type { ApplicationImportantDate } from "@/lib/application-tracker";
import type { LearningActivity } from "@/lib/learning-analytics-service";

/**
 * Derived state for the preparation Home (Home V2).
 *
 * Everything here is read-only derivation over state the feature repositories already own: the daily
 * action plan, the airline target journey, the application tracker and the learning activity log.
 * The module stores nothing, owns no completion state and never scores the user — no readiness value,
 * no pass probability and no airline fit. Counts are counts of activities the user actually saved.
 */
export type PreparationHomeLabels = typeof ko.preparationHome;
export const preparationHomeLabelsKo: PreparationHomeLabels = ko.preparationHome;
export const preparationHomeLabelsEn: PreparationHomeLabels = en.preparationHome;

export type PreparationHomeTarget = {
  state: "set" | "unset";
  airlineId?: string;
  airlineName?: string;
  label: string;
  ctaLabel: string;
  recruitmentPeriodLabel?: string;
};

export type PreparationHomeActionKind = "today" | "airline_next" | "continue";
export type PreparationHomeAction = {
  kind: PreparationHomeActionKind;
  id: string;
  sectionLabel: string;
  title: string;
  description: string;
  reason: string;
  ctaLabel: string;
  resume: boolean;
  target: DailyActionTarget;
};

export type PreparationHomeSummaryItem = { key: "answers" | "experiences" | "interviews" | "selfIntros" | "mocks"; label: string; value: string };
export type PreparationHomeGap = { key: PreparationHomeSummaryItem["key"]; label: string };
export type PreparationHomeDeadline = { applicationId: string; airlineName: string; kindLabel: string; date: string; dday: string; days: number };
export type PreparationHomeActivity = { id: string; label: string; occurredAt: string; airlineId?: string; fromTargetAirline: boolean };
export type PreparationHomeQuickAction = { key: "application" | "interview" | "self_intro" | "airline"; label: string; target: DailyActionTarget };
export type PreparationHomeCompetencyAction = { completed: boolean; label: string };

export type PreparationHomeModel = {
  target: PreparationHomeTarget;
  todayAction?: PreparationHomeAction;
  airlineNextAction?: PreparationHomeAction;
  continueAction?: PreparationHomeAction;
  summary: PreparationHomeSummaryItem[];
  applicationProgress: ApplicationProgressDisplay;
  gaps: PreparationHomeGap[];
  deadline?: PreparationHomeDeadline;
  recentActivity: PreparationHomeActivity[];
  quickActions: PreparationHomeQuickAction[];
  competencyAction: PreparationHomeCompetencyAction;
};

export type PreparationHomeInput = {
  primaryAirline?: { id: string; name: string } | null;
  journey?: AirlineJourneyState | null;
  dailyPlan?: DailyActionPlan | null;
  upcomingApplications?: Array<{ application: { id: string; airlineId?: string; airlineNameSnapshot: string }; importantDate: ApplicationImportantDate }>;
  activities?: LearningActivity[];
  competencyCompleted?: boolean;
  /**
   * Reserved for a persisted self-introduction resume. The app does not store one today, so nothing
   * is fabricated for it; when a resume repository exists it can be passed here without a rule change.
   */
  selfIntroductionResume?: { startedAt: string } | null;
  labels?: PreparationHomeLabels;
};

export const MAX_PREPARATION_GAPS = 3;
export const MAX_RECENT_ACTIVITY = 5;
export const MAX_QUICK_ACTIONS = 4;

const template = (value: string, values: Record<string, string>) => value.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
const validTime = (value?: string) => {
  const time = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(time) ? 0 : time;
};
const count = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

function targetContext(input: PreparationHomeInput, labels: PreparationHomeLabels): PreparationHomeTarget {
  // A target airline is only ever the one the user chose; no airline is auto-selected as a sample.
  if (!input.primaryAirline) return { state: "unset", label: labels.targetUnset, ctaLabel: labels.targetSetCta };
  const period = input.journey?.recruitmentPeriods?.[0];
  return {
    state: "set",
    airlineId: input.primaryAirline.id,
    airlineName: input.primaryAirline.name,
    label: template(labels.targetPreparing, { name: input.primaryAirline.name }),
    ctaLabel: labels.targetOpenCta,
    recruitmentPeriodLabel: period ? template(labels.recruitmentPeriod, { period }) : undefined,
  };
}

const fromDailyCandidate = (candidate: DailyActionCandidate, kind: PreparationHomeActionKind, labels: PreparationHomeLabels): PreparationHomeAction => ({
  kind,
  id: candidate.id,
  sectionLabel: kind === "continue" ? labels.continueLabel : labels.todayLabel,
  title: candidate.title,
  description: candidate.description,
  reason: candidate.reason,
  ctaLabel: candidate.resume ? labels.continueCta : labels.startCta,
  resume: candidate.resume,
  target: candidate.target,
});

/** Maps a journey action onto the navigation targets the Home already knows how to open. */
export function journeyActionTarget(action: AirlineJourneyAction, airlineId: string): DailyActionTarget {
  if (action.kind === "resume_mock" && action.sessionId) return { kind: "mock_resume", sessionId: action.sessionId };
  if (action.kind === "resume_interview" && action.questionId) return { kind: "single_interview_resume", questionId: action.questionId };
  if (action.kind === "resume_application" || action.kind === "application") return { kind: "application_coach", airlineId };
  if (action.kind === "mock") return { kind: "mock_start", airlineId };
  if (action.kind === "self_intro") return { kind: "self_introduction", targetSeconds: 60 };
  if ((action.kind === "interview" || action.kind === "retake") && action.questionId) return { kind: "interview_question", questionId: action.questionId, airlineId };
  return { kind: "airline_workspace", airlineId };
}

function summaryItems(journey: AirlineJourneyState | null | undefined, labels: PreparationHomeLabels): PreparationHomeSummaryItem[] {
  const unit = (value: number, suffix: string) => `${count(value)}${suffix}`;
  return [
    { key: "answers", label: labels.summaryAnswers, value: unit(journey?.answersDrafted ?? 0, labels.countSuffix) },
    { key: "experiences", label: labels.summaryExperiences, value: unit(journey?.experiencesLinked ?? 0, labels.countSuffix) },
    { key: "interviews", label: labels.summaryInterviews, value: unit(journey?.interviewAttemptCount ?? 0, labels.timesSuffix) },
    { key: "selfIntros", label: labels.summarySelfIntros, value: unit(journey?.selfIntroAttempts ?? 0, labels.timesSuffix) },
    { key: "mocks", label: labels.summaryMocks, value: unit(journey?.mockAttempts ?? 0, labels.timesSuffix) },
  ];
}

/** Gaps are empty activity areas, stated as "no record yet" — never a weakness verdict or a score. */
function preparationGaps(journey: AirlineJourneyState | null | undefined, labels: PreparationHomeLabels): PreparationHomeGap[] {
  const rows: Array<[PreparationHomeGap["key"], number, string]> = [
    ["answers", journey?.answersDrafted ?? 0, labels.gapAnswers],
    ["experiences", journey?.experiencesLinked ?? 0, labels.gapExperiences],
    ["interviews", journey?.interviewAttemptCount ?? 0, labels.gapInterviews],
    ["selfIntros", journey?.selfIntroAttempts ?? 0, labels.gapSelfIntros],
    ["mocks", journey?.mockAttempts ?? 0, labels.gapMocks],
  ];
  return rows.filter(([, value]) => count(value) === 0).slice(0, MAX_PREPARATION_GAPS).map(([key, , label]) => ({ key, label }));
}

function recentActivity(input: PreparationHomeInput, labels: PreparationHomeLabels): PreparationHomeActivity[] {
  const airlineId = input.primaryAirline?.id;
  const journeyRows: PreparationHomeActivity[] = (input.journey?.recentActivity ?? []).map((item) => ({
    id: `journey:${item.id}`,
    label: item.label,
    occurredAt: item.occurredAt,
    airlineId,
    fromTargetAirline: true,
  }));
  // The journey and the learning log record the same save from two sides, so one event is listed once:
  // journey ids carry the entity they came from ("answer:<id>", "interview:<id>", …).
  const seen = new Set(journeyRows.map((item) => item.id.replace(/^journey:/, "")));
  const seenEntities = new Set([...seen].map((id) => id.slice(id.indexOf(":") + 1)).filter(Boolean));
  const generalRows: PreparationHomeActivity[] = (input.activities ?? [])
    .filter((item) => !seen.has(item.id) && ![item.sourceEntityId, item.answerId, item.experienceId].some((id) => id && seenEntities.has(id)))
    .map((item) => ({
      id: `activity:${item.id}`,
      label: item.title,
      occurredAt: item.occurredAt,
      airlineId: item.airlineId,
      fromTargetAirline: Boolean(airlineId) && item.airlineId === airlineId,
    }));
  const byRecency = (a: PreparationHomeActivity, b: PreparationHomeActivity) => validTime(b.occurredAt) - validTime(a.occurredAt) || a.id.localeCompare(b.id);
  // Target-airline activity is surfaced first, but general training activity is never hidden entirely.
  const targetRows = [...journeyRows, ...generalRows.filter((item) => item.fromTargetAirline)].sort(byRecency);
  const otherRows = generalRows.filter((item) => !item.fromTargetAirline).sort(byRecency);
  return [...targetRows, ...otherRows].slice(0, MAX_RECENT_ACTIVITY);
}

function quickActions(airlineId: string | undefined, labels: PreparationHomeLabels): PreparationHomeQuickAction[] {
  return [
    { key: "application", label: labels.quickApplication, target: { kind: "application_coach", airlineId } },
    { key: "interview", label: labels.quickInterview, target: { kind: "interview_question", questionId: "im2", airlineId } },
    { key: "self_intro", label: labels.quickSelfIntro, target: { kind: "self_introduction", targetSeconds: 60 } },
    { key: "airline", label: labels.quickAirline, target: airlineId ? { kind: "airline_workspace", airlineId } : { kind: "airline_workspace", airlineId: "" } },
  ].slice(0, MAX_QUICK_ACTIONS) as PreparationHomeQuickAction[];
}

export function buildPreparationHomeModel(input: PreparationHomeInput): PreparationHomeModel {
  const labels = input.labels ?? preparationHomeLabelsKo;
  const progressLabels = labels === preparationHomeLabelsEn ? applicationProgressLabelsEn : applicationProgressLabelsKo;
  const target = targetContext(input, labels);
  const plan = input.dailyPlan ?? null;

  // "오늘 할 일" stays exactly the existing daily engine's primary — this module adds no recommender.
  const todayAction = plan?.primary ? fromDailyCandidate(plan.primary, "today", labels) : undefined;

  // The most recent interrupted work, taken from the same plan so the resume contract is not duplicated.
  const resumeCandidate = [...(plan ? [plan.primary, ...plan.secondary] : [])]
    .filter((item): item is DailyActionCandidate => Boolean(item) && item.resume && item.id !== plan?.primary?.id)
    .sort((a, b) => validTime(b.createdAt) - validTime(a.createdAt) || a.id.localeCompare(b.id))[0];
  const continueAction = resumeCandidate ? fromDailyCandidate(resumeCandidate, "continue", labels) : undefined;

  // The target airline's own next step is shown beside, never merged into, the daily primary.
  const journeyAction = input.journey?.nextRecommendedAction;
  const airlineTarget = input.primaryAirline && journeyAction ? journeyActionTarget(journeyAction, input.primaryAirline.id) : undefined;
  const duplicatesToday = airlineTarget && todayAction ? JSON.stringify(airlineTarget) === JSON.stringify(todayAction.target) : false;
  const duplicatesContinue = airlineTarget && continueAction ? JSON.stringify(airlineTarget) === JSON.stringify(continueAction.target) : false;
  const airlineNextAction: PreparationHomeAction | undefined =
    journeyAction && airlineTarget && !duplicatesToday && !duplicatesContinue
      ? {
          kind: "airline_next",
          id: `airline-next:${input.primaryAirline!.id}:${journeyAction.kind}`,
          sectionLabel: labels.airlineNextLabel,
          title: journeyAction.label,
          description: target.airlineName ?? "",
          reason: journeyAction.reason,
          ctaLabel: journeyAction.kind.startsWith("resume_") ? labels.continueCta : labels.startCta,
          resume: journeyAction.kind.startsWith("resume_"),
          target: airlineTarget,
        }
      : undefined;

  const upcoming = (input.upcomingApplications ?? [])[0];
  const deadline: PreparationHomeDeadline | undefined = upcoming
    ? {
        applicationId: upcoming.application.id,
        airlineName: upcoming.application.airlineNameSnapshot,
        kindLabel: upcoming.importantDate.kind === "interview" ? labels.deadlineInterview : labels.deadlineApplication,
        date: upcoming.importantDate.date,
        dday: upcoming.importantDate.dday,
        days: upcoming.importantDate.days,
      }
    : undefined;

  return {
    target,
    todayAction,
    airlineNextAction,
    continueAction,
    summary: summaryItems(input.journey, labels),
    applicationProgress: applicationAnswerProgress(
      { answerCount: input.journey?.answersDrafted ?? 0, officialQuestionCount: input.journey?.applicationQuestionCount ?? 0 },
      progressLabels,
    ),
    gaps: preparationGaps(input.journey, labels),
    deadline,
    recentActivity: recentActivity(input, labels),
    quickActions: quickActions(input.primaryAirline?.id, labels),
    competencyAction: { completed: Boolean(input.competencyCompleted), label: input.competencyCompleted ? labels.competencyOpen : labels.competencyStart },
  };
}
