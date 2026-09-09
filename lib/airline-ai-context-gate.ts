export type AirlineAiContextEligibility = {
  verified?: boolean;
  published?: boolean;
  sourceReferences?: readonly string[];
  aiContextEnabled?: boolean;
};

export function isValidAirlineContextSource(reference: string) {
  try {
    const url = new URL(reference);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Canonical, fail-closed boundary for every airline AI/context consumer. */
export function isAirlineKnowledgeEligibleForAiContext(
  record: AirlineAiContextEligibility,
) {
  return (
    record.verified === true &&
    record.published === true &&
    record.aiContextEnabled === true &&
    Boolean(record.sourceReferences?.some(isValidAirlineContextSource))
  );
}
