import ko from "@/lib/locales/ko.json";
import en from "@/lib/locales/en.json";

/**
 * Presentation-only derivation for the airline application progress counters.
 *
 * Two different populations were previously divided against each other:
 * - the Target Journey tile used every saved answer for the airline (generic answers included) as the
 *   numerator and the confirmed official application questions as the denominator, so an airline with
 *   no official application questions rendered "1/0";
 * - the workspace tile counts official questions on both sides, so it rendered "0/0".
 *
 * A ratio is therefore only produced when an official denominator actually exists. Nothing here reads
 * or writes stored data, and no completion or score is derived from it.
 */
export type ApplicationProgressMode = "ratio" | "count" | "empty";
export type ApplicationProgressLabels = typeof ko.airlineProgress;
export type ApplicationProgressDisplay = {
  mode: ApplicationProgressMode;
  label: string;
  value: string;
  caption: string;
};

export const applicationProgressLabelsKo: ApplicationProgressLabels = ko.airlineProgress;
export const applicationProgressLabelsEn: ApplicationProgressLabels = en.airlineProgress;

const safeCount = (value: number) => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);
const countValue = (value: number, labels: ApplicationProgressLabels) => `${value}${labels.countSuffix}`;

/**
 * Target Journey "지원서 답변" tile. `answerCount` counts every answer saved for the airline, including
 * generic answers that do not belong to an official question, so it is only shown as a ratio when the
 * airline actually has confirmed official application questions.
 */
export function applicationAnswerProgress(
  input: { answerCount: number; officialQuestionCount: number },
  labels: ApplicationProgressLabels = applicationProgressLabelsKo,
): ApplicationProgressDisplay {
  const answerCount = safeCount(input.answerCount);
  const officialQuestionCount = safeCount(input.officialQuestionCount);
  if (officialQuestionCount > 0) {
    return { mode: "ratio", label: labels.applicationAnswers, value: `${answerCount}/${officialQuestionCount}`, caption: labels.ratioCaption };
  }
  if (answerCount > 0) {
    return { mode: "count", label: labels.applicationAnswers, value: countValue(answerCount, labels), caption: labels.noOfficialApplicationQuestions };
  }
  return { mode: "empty", label: labels.applicationAnswers, value: labels.none, caption: labels.noOfficialApplicationQuestions };
}

/**
 * Workspace "지원서 질문" tile. Both sides count confirmed official application questions, so with no
 * official question the ratio carries no information and the empty state is shown instead.
 */
export function applicationQuestionProgress(
  input: { answeredOfficialCount: number; officialQuestionCount: number },
  labels: ApplicationProgressLabels = applicationProgressLabelsKo,
): ApplicationProgressDisplay {
  const officialQuestionCount = safeCount(input.officialQuestionCount);
  if (officialQuestionCount > 0) {
    return { mode: "ratio", label: labels.applicationQuestions, value: `${safeCount(input.answeredOfficialCount)}/${officialQuestionCount}`, caption: labels.ratioCaption };
  }
  return { mode: "empty", label: labels.applicationQuestions, value: labels.none, caption: labels.noOfficialApplicationQuestions };
}
