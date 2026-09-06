export type PrimaryNavigationTarget =
  | "home"
  | "routine"
  | "interview"
  | "resume"
  | "my";

export function exitSelfIntroductionForNavigation(
  target: PrimaryNavigationTarget,
) {
  return {
    activeNav: target,
    trainingView: "dashboard" as const,
    clearActiveWeeklyTask: true as const,
    clearChallengeTarget: true as const,
  };
}

export function resolveSelfIntroductionResultNavigation(
  action: "back" | "home",
  isHistoryRevisit: boolean,
) {
  return action === "back" && isHistoryRevisit ? "intro" : "exit";
}
