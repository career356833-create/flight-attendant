import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import type {
  AirlineRecruitmentGuidance,
  AirlineRecruitmentStep,
  CabinCrewRequirement,
  CabinCrewRequirementType,
} from "@/lib/airline-official-data-batch-3b";
import type { AirlineFact, AirlineOperationScope, AirlineRoute } from "@/lib/airline-targeting-workspace";

// Batch 8 is a gap-fill batch. Sources were checked on 2026-09-20 and no new
// airline identity is introduced. Closed recruitment exercises remain archived.
const verifiedAt = "2026-09-20T00:00:00.000Z";

const fact = (type: string, value: string, sourceUrl: string, sourceTitle: string): AirlineFact => ({
  type,
  value,
  sourceUrl,
  sourceTitle,
  sourceAuthority: "AIRLINE_OFFICIAL",
  retrievedAt: verifiedAt,
  verifiedAt,
  status: "VERIFIED",
  accessStatus: "ACCESSIBLE",
});

const koreanAirRecruitment2026 = fact(
  "cabin_crew_careers",
  "Archived official 2026-entry cabin-crew recruitment notice with eligibility and high-level selection stages.",
  "https://news.koreanair.com/%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-2026%EB%85%84-%EA%B3%B5%EA%B0%9C-%EC%B1%84%EC%9A%A9-%EC%8B%9C%EC%9E%91-%ED%86%B5%ED%95%A9-%ED%95%AD%EA%B3%B5%EC%82%AC-%EB%8C%80%EB%B9%84-%EC%9A%B0%EC%88%98/",
  "Korean Air begins 2026 recruitment | Korean Air Newsroom",
);
const koreanAirHub = fact(
  "hub",
  "Korean Air's official newsroom identifies Incheon International Airport as its global hub.",
  "https://www.koreanair.com/contents/footer/about-us/newsroom/list/250509-Korean-Air-and-Delta-Air-Lines-to-strengthen-partnerships",
  "Korean Air and Delta strengthen partnership | Korean Air",
);

const jalNewGraduate2027 = fact(
  "cabin_crew_careers",
  "Current JAL 2027-entry new-graduate cabin-attendant requirements and application guidance.",
  "https://www.job-jal.com/recruit/requirement/new-graduate06.html",
  "Cabin attendant requirements | JAL new-graduate recruitment",
);
const jalCareer2025 = fact(
  "recruitment_archive",
  "Archived JAL 2025-entry career cabin-attendant requirements and documented pre-selection steps.",
  "https://www.job-jal.com/recruit/requirement/career07.html",
  "Cabin attendant requirements | JAL career recruitment",
);

const twayRecruitment2026 = fact(
  "cabin_crew_careers",
  "Archived July 2026 T'way Air cabin-crew intern notice published on the airline's current official corporate site.",
  "https://www.trinityairways.com/app/company/NEWS/retrieve/4072",
  "T'way Air cabin-crew intern recruitment | Trinity Airways",
);
const twayNetwork2026 = fact(
  "operation_scope",
  "The current official company page reports both domestic and international scheduled routes as of September 2026.",
  "https://www.trinityairways.com/app/serviceInfo/contents/455",
  "Company and route overview | Trinity Airways",
);
const twaySchedule2026 = fact(
  "route",
  "The current official timetable lists representative domestic GMP-CJU and international ICN-KIX service.",
  "https://www.trinityairways.com/app/serviceInfo/flightSchedule?showWholeSchedule=Y",
  "Flight schedule | Trinity Airways",
);

export type AirlineOfficialBatch8ProfilePatch = {
  airlineId: "korean_air" | "japan_airlines" | "tway_air";
  hubs?: string[];
  operationScope?: AirlineOperationScope;
  summary?: string;
  expectedPreviousSummary?: string;
  sources: AirlineFact[];
  lastVerifiedAt: string;
};

export const airlineOfficialBatch8ProfilePatches: AirlineOfficialBatch8ProfilePatch[] = [
  {
    airlineId: "korean_air",
    hubs: ["Incheon International Airport (ICN)"],
    sources: [koreanAirRecruitment2026, koreanAirHub],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "japan_airlines",
    sources: [jalNewGraduate2027, jalCareer2025],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "tway_air",
    operationScope: "BOTH",
    summary: "The existing tway_air master identity is retained after the official Trinity Airways name change; current official sources confirm domestic and international operations.",
    expectedPreviousSummary: "The legacy T'way Air site currently redirects to Trinity Airways. The existing tway_air master identity remains intact, but current standalone T'way route scope is left unconfirmed rather than inferred.",
    sources: [twayRecruitment2026, twayNetwork2026, twaySchedule2026],
    lastVerifiedAt: verifiedAt,
  },
];

export function applyAirlineOfficialBatch8Patch(
  profile: OfficialAirlineBatchProfile,
  patch: AirlineOfficialBatch8ProfilePatch,
): { profile: OfficialAirlineBatchProfile; conflicts: string[] } {
  const conflicts: string[] = [];
  const next = { ...profile, sources: [...profile.sources] };

  if (patch.hubs) {
    if (profile.hubs.length > 0 && JSON.stringify(profile.hubs) !== JSON.stringify(patch.hubs)) conflicts.push("hubs");
    else next.hubs = patch.hubs;
  }
  if (patch.operationScope) {
    if (profile.operationScope && profile.operationScope !== patch.operationScope) conflicts.push("operationScope");
    else next.operationScope = patch.operationScope;
  }
  if (patch.summary) {
    if (profile.summary && profile.summary !== patch.expectedPreviousSummary && profile.summary !== patch.summary) conflicts.push("summary");
    else next.summary = patch.summary;
  }

  next.sources = [...profile.sources, ...patch.sources].filter(
    (source, index, all) => all.findIndex((candidate) => candidate.type === source.type && candidate.sourceUrl === source.sourceUrl) === index,
  );
  next.lastVerifiedAt = patch.lastVerifiedAt;
  return { profile: next, conflicts };
}

type RecruitmentMeta = Pick<CabinCrewRequirement, "recruitmentType" | "recruitmentPeriod" | "recordStatus">;
const requirement = (
  id: string,
  airlineId: string,
  requirementType: CabinCrewRequirementType,
  text: string,
  source: AirlineFact,
  meta: RecruitmentMeta,
): CabinCrewRequirement => ({ id, airlineId, requirementType, text, source, verifiedAt, status: "VERIFIED", ...meta });

const ke2026 = { recruitmentType: "OTHER", recruitmentPeriod: "2026 entry", recordStatus: "ARCHIVED" } as const;
const jal2027 = { recruitmentType: "NEW_GRADUATE", recruitmentPeriod: "2027 entry", recordStatus: "CURRENT" } as const;
const jal2025Career = { recruitmentType: "CAREER", recruitmentPeriod: "2025 entry", recordStatus: "ARCHIVED" } as const;
const tw2026 = { recruitmentType: "INTERN", recruitmentPeriod: "2026-07 recruitment / 2026-10 entry", recordStatus: "ARCHIVED" } as const;

export const airlineOfficialBatch8Requirements: CabinCrewRequirement[] = [
  requirement("8-ke-education", "korean_air", "education", "Applicants had to be graduates or expected to graduate by August 2026 for the archived exercise.", koreanAirRecruitment2026, ke2026),
  requirement("8-ke-language", "korean_air", "language", "A qualifying language-test result was required; the official newsroom article does not publish the numeric threshold.", koreanAirRecruitment2026, ke2026),
  requirement("8-ke-vision", "korean_air", "medical_fitness", "Corrected vision of at least 1.0 was required for the archived exercise.", koreanAirRecruitment2026, ke2026),

  requirement("8-jl-education", "japan_airlines", "education", "Expected graduation between April 2026 and March 2027 from one of the listed post-secondary institution categories.", jalNewGraduate2027, jal2027),
  requirement("8-jl-medical", "japan_airlines", "medical_fitness", "Health and physical fitness must permit aircraft duty; unaided or contact-lens-corrected vision must be at least 1.0 in both eyes.", jalNewGraduate2027, jal2027),
  requirement("8-jl-roster", "japan_airlines", "other", "Able to work a variable schedule including early mornings, late nights, weekends, public holidays and year-end holidays.", jalNewGraduate2027, jal2027),
  requirement("8-jl-passport", "japan_airlines", "passport_work_eligibility", "Able to obtain a passport before beginning international flight duty.", jalNewGraduate2027, jal2027),
  requirement("8-jl-language", "japan_airlines", "language", "TOEIC 600 or equivalent English ability is desirable for the listed new-graduate exercise.", jalNewGraduate2027, jal2027),

  requirement("8-tw-education", "tway_air", "education", "Graduates and candidates expected to graduate by February 2027 were eligible, subject to October 2026 availability for the archived exercise.", twayRecruitment2026, tw2026),
  requirement("8-tw-language", "tway_air", "language", "TOEIC 600 or TOEIC Speaking/OPIc IM or above from the stated validity period was required.", twayRecruitment2026, tw2026),
  requirement("8-tw-travel", "tway_air", "passport_work_eligibility", "Applicants had to have no restriction on overseas travel.", twayRecruitment2026, tw2026),
];

const step = (
  id: string,
  airlineId: string,
  order: number,
  title: string,
  description: string,
  source: AirlineFact,
  meta: Pick<AirlineRecruitmentStep, "recruitmentType" | "recruitmentPeriod" | "recordStatus">,
): AirlineRecruitmentStep => ({ id, airlineId, order, title, description, source, verifiedAt, ...meta });

export const airlineOfficialBatch8RecruitmentSteps: AirlineRecruitmentStep[] = [
  step("8-ke-document", "korean_air", 1, "Document screening", "The archived official notice lists document screening as the first high-level stage.", koreanAirRecruitment2026, ke2026),
  step("8-ke-interview", "korean_air", 2, "Interview stages", "Interview stages followed document screening; detailed schedules were communicated individually.", koreanAirRecruitment2026, ke2026),
  step("8-ke-medical", "korean_air", 3, "Medical examination", "A health examination followed the interview stages.", koreanAirRecruitment2026, ke2026),

  step("8-jl-entry", "japan_airlines", 1, "Web entry sheet", "The archived career exercise required a web entry sheet by its published deadline.", jalCareer2025, jal2025Career),
  step("8-jl-aptitude", "japan_airlines", 2, "Aptitude assessment", "The archived career exercise required an aptitude assessment by its published deadline.", jalCareer2025, jal2025Career),
  step("8-jl-ai", "japan_airlines", 3, "AI interview", "An AI interview was required before first selection and was not used as the sole pass/fail decision.", jalCareer2025, jal2025Career),

  step("8-tw-screen", "tway_air", 1, "Document, competency and video screening", "The archived notice groups document screening, a competency assessment and a video interview in the opening stage.", twayRecruitment2026, tw2026),
  step("8-tw-first", "tway_air", 2, "First interview", "Candidates passing the opening stage proceeded to a first interview.", twayRecruitment2026, tw2026),
  step("8-tw-second", "tway_air", 3, "Second interview", "A second interview followed the first interview.", twayRecruitment2026, tw2026),
  step("8-tw-medical", "tway_air", 4, "Employment medical examination", "The published sequence ends with an employment medical examination.", twayRecruitment2026, tw2026),
];

const guidance = (
  id: string,
  airlineId: string,
  topic: AirlineRecruitmentGuidance["topic"],
  text: string,
  source: AirlineFact,
  meta: Pick<AirlineRecruitmentGuidance, "recruitmentType" | "recruitmentPeriod" | "recordStatus">,
): AirlineRecruitmentGuidance => ({ id, airlineId, topic, text, source, verifiedAt, ...meta });

export const airlineOfficialBatch8Guidance: AirlineRecruitmentGuidance[] = [
  guidance("8-ke-schedule", "korean_air", "assessment", "Detailed schedules after document screening were to be communicated individually to candidates.", koreanAirRecruitment2026, ke2026),
  guidance("8-jl-term", "japan_airlines", "application", "Applicants may apply in only one of the spring or summer selection terms; both use the same eligibility and selection criteria.", jalNewGraduate2027, jal2027),
  guidance("8-jl-training", "japan_airlines", "training", "The role includes new-employee education, specialist flight training and safety education after joining.", jalNewGraduate2027, jal2027),
  guidance("8-tw-preference", "tway_air", "application", "Relevant certificates and strong Japanese or Chinese ability were listed as preferences, not mandatory requirements.", twayRecruitment2026, tw2026),
  guidance("8-tw-conversion", "tway_air", "training", "Successful candidates were to work as interns for one year before review for permanent conversion.", twayRecruitment2026, tw2026),
];

const route = (
  id: string,
  originAirport: string,
  destinationAirport: string,
  originCountry: string,
  destinationCountry: string,
): AirlineRoute => ({
  id,
  airlineId: "tway_air",
  originAirport,
  destinationAirport,
  originCountry,
  destinationCountry,
  routeScope: originCountry === destinationCountry ? "DOMESTIC" : "INTERNATIONAL",
  status: "CONFIRMED",
  source: twaySchedule2026,
  lastVerifiedAt: verifiedAt,
});

export const airlineOfficialBatch8Routes: AirlineRoute[] = [
  route("8-tw-gmp-cju", "GMP", "CJU", "KR", "KR"),
  route("8-tw-icn-kix", "ICN", "KIX", "KR", "JP"),
];

export const airlineOfficialBatch8ApplicationQuestions = [] as const;
export const airlineOfficialBatch8InterviewQuestions = [] as const;
export const airlineOfficialBatch8Unresolved = {
  asianaRecruitment: "No accessible first-party cabin-crew requirement or selection text was verified; existing gaps remain unchanged.",
  officialQuestions: ["korean_air", "asiana_airlines", "japan_airlines", "tway_air"],
} as const;

export const airlineOfficialBatch8Stats = {
  retrievedAt: verifiedAt,
  profilePatches: airlineOfficialBatch8ProfilePatches.length,
  sources: airlineOfficialBatch8ProfilePatches.reduce((sum, patch) => sum + patch.sources.length, 0),
  routes: airlineOfficialBatch8Routes.length,
  requirements: airlineOfficialBatch8Requirements.length,
  recruitmentSteps: airlineOfficialBatch8RecruitmentSteps.length,
  guidance: airlineOfficialBatch8Guidance.length,
  officialApplicationQuestions: 0,
  officialInterviewQuestions: 0,
} as const;
