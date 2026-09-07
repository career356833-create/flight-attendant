import type { WeeklyTaskContext } from "./weekly-task-completion";

export type WeeklyResultReturn = {
  context: WeeklyTaskContext;
  entityId: string;
};

export function isWeeklyResultReturnEligible(
  value: WeeklyResultReturn | null,
  targetKind: NonNullable<WeeklyTaskContext["targetKind"]>,
  entityId?: string,
) {
  return Boolean(
    value &&
      entityId &&
      value.context.source === "weekly_plan" &&
      value.context.targetKind === targetKind &&
      value.entityId === entityId,
  );
}
