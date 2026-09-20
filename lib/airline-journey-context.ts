import type { ApplicationPrompt, ApplicationWorkDraft } from "@/lib/application-answer-repository";
import type { WorkspaceQuestion } from "@/lib/airline-targeting-workspace";

export type AirlineJourneyOrigin = "airline_workspace" | "application" | "experience" | "single_interview" | "mock" | "self_intro";
export type AirlineJourneyReturnTab = "overview" | "application" | "questions" | "experience" | "practice";

export type AirlineJourneyContext = {
  airlineId: string;
  questionId?: string;
  questionText?: string;
  questionKind?: WorkspaceQuestion["kind"];
  sourceType?: WorkspaceQuestion["sourceType"];
  provenance?: WorkspaceQuestion["provenance"];
  recruitmentPeriod?: string;
  recruitmentYear?: number;
  origin: AirlineJourneyOrigin;
  returnTab: AirlineJourneyReturnTab;
  applicationAnswerId?: string;
  experienceId?: string;
  previousAttemptId?: string;
};

export function airlineJourneyContextFromQuestion(
  question: WorkspaceQuestion,
  origin: AirlineJourneyOrigin = "airline_workspace",
  returnTab: AirlineJourneyReturnTab = question.kind === "APPLICATION" ? "application" : "questions",
): AirlineJourneyContext {
  return {
    airlineId: question.airlineId,
    questionId: question.id,
    questionText: question.questionText,
    questionKind: question.kind,
    sourceType: question.sourceType,
    provenance: question.provenance,
    recruitmentPeriod: question.recruitmentPeriod,
    recruitmentYear: question.year,
    origin,
    returnTab,
  };
}

export const genericAirlineJourneyContext = (
  airlineId: string,
  returnTab: AirlineJourneyReturnTab = "overview",
): AirlineJourneyContext => ({ airlineId, origin: "airline_workspace", returnTab });

export const airlineJourneyDraftId = (context: Pick<AirlineJourneyContext, "airlineId" | "questionId">) =>
  `airline-journey:${context.airlineId}:${context.questionId ?? "general"}`;

export function applicationPromptFromJourneyContext(context?: AirlineJourneyContext): ApplicationPrompt | undefined {
  if (!context?.questionId || !context.questionText || context.questionKind !== "APPLICATION") return undefined;
  const verified = context.provenance === "OFFICIAL_CURRENT" || context.provenance === "OFFICIAL_ARCHIVE" || context.provenance === "VERIFIED_SECONDARY";
  return {
    id: context.questionId,
    airlineId: context.airlineId,
    documentType: "application_question",
    prompt: context.questionText,
    locale: "ko",
    sourceType: context.provenance === "VERIFIED_SECONDARY" ? "published_airline_question" : verified ? "official_application" : "custom_user_input",
    sourceIds: [context.questionId],
    recommendedStructure: "experience_star",
    targetCapabilities: ["application_readiness"],
    status: verified ? "verified" : "custom",
    journeyContext: context,
  };
}

export function mergeJourneyExperienceIds(existing: string[], experienceId: string) {
  return Array.from(new Set([...existing, experienceId]));
}

export const journeyContextForExperience = (context: AirlineJourneyContext): AirlineJourneyContext => ({ ...context, origin: "application" });
export const journeyContextWithExperience = (context: AirlineJourneyContext, experienceId: string): AirlineJourneyContext => ({ ...context, origin: "application", experienceId });
export const journeyContextWithAttempt = (context: AirlineJourneyContext, previousAttemptId: string): AirlineJourneyContext => ({ ...context, previousAttemptId });

export function journeyDraftMatches(draft: ApplicationWorkDraft, context: AirlineJourneyContext) {
  return draft.airlineId === context.airlineId && draft.journeyContext?.questionId === context.questionId;
}
