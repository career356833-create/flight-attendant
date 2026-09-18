import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";
import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import {
  airlineOfficialBatch3BApplicationQuestions,
  airlineOfficialBatch3BFleet,
  airlineOfficialBatch3BGuidance,
  airlineOfficialBatch3BInterviewQuestions,
  airlineOfficialBatch3BProfiles,
  airlineOfficialBatch3BRecruitmentSteps,
  airlineOfficialBatch3BRequirements,
  airlineOfficialBatch3BRoutes,
  type AirlineRecruitmentGuidance,
  type AirlineRecruitmentStep,
  type CabinCrewRequirement,
  type CabinCrewRequirementType,
} from "@/lib/airline-official-data-batch-3b";

// Batch 5 rolls forward the still-current Batch 3B facts and adds Turkish Airlines.
// All first-party URLs were checked on 2026-09-18.
const verifiedAt = "2026-09-18T00:00:00.000Z";

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

const turkishCabinCrew = fact(
  "cabin_crew_careers",
  "Official Turkish Airlines cabin crew role, selection process, training and applicant guidance.",
  "https://careers.turkishairlines.com/en-us/cabin-crew",
  "Cabin Crew | Turkish Airlines Careers",
);
const turkishCareers = fact(
  "career_page",
  "Official Turkish Airlines careers portal and current-vacancy entry point.",
  "https://careers.turkishairlines.com/en-US/",
  "Career | Turkish Airlines",
);
const turkishFleet = fact(
  "fleet",
  "Official passenger fleet page listing current Airbus and Boeing aircraft models.",
  "https://www.turkishairlines.com/en-cl/flights/fly-different/fleet/",
  "Our Fleet | Turkish Airlines",
);
const turkishRoute = fact(
  "route",
  "Official booking surface lists current Istanbul (IST) to Seoul (ICN) service.",
  "https://www.turkishairlines.com/en/flights-from-istanbul-to-seoul",
  "Flights From Istanbul to Seoul | Turkish Airlines",
);
const turkishCompany = fact(
  "company_profile",
  "Official corporate information identifies Istanbul as the airline's transfer hub.",
  "https://www.turkishairlines.com/uk-ua/press-room/about-us/index-alfa.html",
  "About Us | Turkish Airlines",
);

const turkishProfile: OfficialAirlineBatchProfile = {
  airlineId: "turkish_airlines",
  headquarters: "Istanbul, Türkiye",
  hubs: ["Istanbul Airport (IST)"],
  website: "https://www.turkishairlines.com/",
  careersUrl: "https://careers.turkishairlines.com/en-US/",
  summary: "Turkish Airlines operates full-service domestic and international services from Istanbul.",
  operationScope: "BOTH",
  carrierType: "FULL_SERVICE",
  verified: true,
  published: true,
  aiContextEnabled: false,
  sources: [turkishCompany, turkishCareers, turkishCabinCrew, turkishFleet, turkishRoute],
  lastVerifiedAt: verifiedAt,
};

const requirement = (id: string, requirementType: CabinCrewRequirementType, text: string): CabinCrewRequirement => ({
  id,
  airlineId: "turkish_airlines",
  requirementType,
  text,
  source: turkishCabinCrew,
  verifiedAt,
  status: "VERIFIED",
});

const turkishRequirements: CabinCrewRequirement[] = [
  requirement("5-tk-height", "height_or_reach", "Current cabin crew guidance checks height and weight against the criteria stated in the live vacancy."),
  requirement("5-tk-marks", "grooming_presentation", "Physical suitability review includes visible tattoo and scar checks."),
  requirement("5-tk-medical", "medical_fitness", "The final assessment stage requires a fit-to-fly medical evaluation."),
];

const step = (id: string, order: number, title: string, description: string): AirlineRecruitmentStep => ({
  id,
  airlineId: "turkish_airlines",
  order,
  title,
  description,
  source: turkishCabinCrew,
  verifiedAt,
});

const turkishRecruitmentSteps: AirlineRecruitmentStep[] = [
  step("5-tk-english", 1, "Online English test", "Applicants accepted into the process receive an online English test invitation."),
  step("5-tk-documents", 2, "Document check", "Required documents are checked against the live vacancy criteria."),
  step("5-tk-physical", 3, "Physical suitability", "Height, weight and visible tattoo or scar criteria are checked."),
  step("5-tk-interviews", 4, "Interview assessments", "Eligible applicants complete English and interview assessments."),
  step("5-tk-medical", 5, "Medical assessment", "The final assessment is a fit-to-fly medical evaluation."),
];

const turkishGuidance: AirlineRecruitmentGuidance[] = [
  { id: "5-tk-apply", airlineId: "turkish_airlines", topic: "application", text: "Cabin crew applications are accepted only through the official Turkish Airlines career page when a vacancy is published.", source: turkishCabinCrew, verifiedAt },
  { id: "5-tk-results", airlineId: "turkish_airlines", topic: "assessment", text: "The official FAQ says assessment results are communicated within one to three weeks.", source: turkishCabinCrew, verifiedAt },
  { id: "5-tk-training", airlineId: "turkish_airlines", topic: "training", text: "Cabin crew training takes about two months at the Turkish Airlines Flight Academy in Istanbul.", source: turkishCabinCrew, verifiedAt },
];

const fleet = (id: string, manufacturer: string, family: string, model: string, bodyType: NonNullable<AirlineFleetEntry["bodyType"]>): AirlineFleetEntry => ({
  id,
  airlineId: "turkish_airlines",
  manufacturer,
  aircraftFamily: family,
  aircraftModel: model,
  bodyType,
  role: "MIXED",
  quantity: null,
  source: turkishFleet,
  lastVerifiedAt: verifiedAt,
});

const turkishFleetEntries: AirlineFleetEntry[] = [
  fleet("5-tk-b787-9", "Boeing", "787", "787-9", "WIDEBODY"),
  fleet("5-tk-a350-900", "Airbus", "A350", "A350-900", "WIDEBODY"),
  fleet("5-tk-b777-300er", "Boeing", "777", "777-300ER", "WIDEBODY"),
  fleet("5-tk-a330-300", "Airbus", "A330", "A330-300", "WIDEBODY"),
  fleet("5-tk-a330-200", "Airbus", "A330", "A330-200", "WIDEBODY"),
  fleet("5-tk-a321neo", "Airbus", "A321", "A321neo", "NARROWBODY"),
  fleet("5-tk-b737-900er", "Boeing", "737", "737-900ER", "NARROWBODY"),
  fleet("5-tk-a321-200", "Airbus", "A321", "A321-200", "NARROWBODY"),
  fleet("5-tk-a320-200", "Airbus", "A320", "A320-200", "NARROWBODY"),
  fleet("5-tk-b737-800", "Boeing", "737", "737-800", "NARROWBODY"),
  fleet("5-tk-a319", "Airbus", "A319", "A319-132/100", "NARROWBODY"),
  fleet("5-tk-b737-max9", "Boeing", "737 MAX", "737 MAX 9", "NARROWBODY"),
  fleet("5-tk-b737-max8", "Boeing", "737 MAX", "737 MAX 8", "NARROWBODY"),
];

const turkishKoreaRoute: AirlineRoute = {
  id: "5-tk-ist-icn",
  airlineId: "turkish_airlines",
  originAirport: "IST",
  destinationAirport: "ICN",
  originCountry: "TR",
  destinationCountry: "KR",
  routeScope: "INTERNATIONAL",
  status: "CONFIRMED",
  source: turkishRoute,
  lastVerifiedAt: verifiedAt,
};

export const airlineOfficialBatch5Profiles = [...airlineOfficialBatch3BProfiles, turkishProfile];
export const airlineOfficialBatch5Requirements = [...airlineOfficialBatch3BRequirements, ...turkishRequirements];
export const airlineOfficialBatch5RecruitmentSteps = [...airlineOfficialBatch3BRecruitmentSteps, ...turkishRecruitmentSteps];
export const airlineOfficialBatch5Guidance = [...airlineOfficialBatch3BGuidance, ...turkishGuidance];
export const airlineOfficialBatch5Fleet = [...airlineOfficialBatch3BFleet, ...turkishFleetEntries];
export const airlineOfficialBatch5Routes = [...airlineOfficialBatch3BRoutes, turkishKoreaRoute];
export const airlineOfficialBatch5ApplicationQuestions = [...airlineOfficialBatch3BApplicationQuestions] as const;
export const airlineOfficialBatch5InterviewQuestions = [...airlineOfficialBatch3BInterviewQuestions] as const;

export const airlineOfficialBatch5Stats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch5Profiles.length,
  sources: airlineOfficialBatch5Profiles.reduce((count, profile) => count + profile.sources.length, 0),
  routes: airlineOfficialBatch5Routes.length,
  fleet: airlineOfficialBatch5Fleet.length,
  requirements: airlineOfficialBatch5Requirements.length,
  recruitmentSteps: airlineOfficialBatch5RecruitmentSteps.length,
  guidance: airlineOfficialBatch5Guidance.length,
  officialApplicationQuestions: airlineOfficialBatch5ApplicationQuestions.length,
  officialInterviewQuestions: airlineOfficialBatch5InterviewQuestions.length,
} as const;
