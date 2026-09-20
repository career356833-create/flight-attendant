import type {
  AirlineFact,
  AirlineFleetEntry,
  AirlineRoute,
} from "@/lib/airline-targeting-workspace";
import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";

const verifiedAt = "2026-09-18T00:00:00.000Z";

const fact = (
  type: string,
  value: string,
  sourceUrl: string,
  sourceTitle: string,
): AirlineFact => ({
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

const emiratesCabinCrew = fact(
  "cabin_crew_careers",
  "Current Emirates cabin crew eligibility, recruitment-day process, training guidance and application entry point.",
  "https://www.emiratesgroupcareers.com/cabin-crew/",
  "Cabin Crew | Emirates Group Careers",
);
const emiratesFleet = fact(
  "fleet",
  "The current official passenger fleet page lists Emirates A350, A380 and Boeing 777 aircraft.",
  "https://www.emirates.com/english/experience/our-fleet/",
  "Our fleet | Emirates",
);
const emiratesRoutes = fact(
  "route",
  "The current official destination surface includes Seoul and Dubai in the Emirates network.",
  "https://www.emirates.com/kr/english/destinations/flights-from-seoul/",
  "Flights from Seoul | Emirates",
);
const emiratesLondon = fact(
  "route",
  "The current official schedule lists direct Dubai (DXB) to London Heathrow (LHR) service.",
  "https://www.emirates.com/uk/english/destinations/dxb/lhr/flights-from-dubai-to-london-heathrow/",
  "Flights from Dubai to London Heathrow | Emirates",
);
const emiratesCompany = fact(
  "company_profile",
  "Emirates is based in Dubai and operates an international network from the United Arab Emirates.",
  "https://www.emirates.com/media-centre/",
  "Emirates Media Centre",
);

const qatarCabinCrew = fact(
  "cabin_crew_careers",
  "Current Qatar Airways cabin crew qualifications, Doha relocation guidance and application entry point.",
  "https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html",
  "Cabin Crew Recruitment | Qatar Airways",
);
const qatarCareers = fact(
  "career_page",
  "Official Qatar Airways careers portal and cabin crew vacancies entry point.",
  "https://careers.qatarairways.com/global/en/c/cabin-crew-cabin-services-jobs",
  "Cabin Crew & Cabin Services Jobs | Qatar Airways Careers",
);
const qatarFleet = fact(
  "fleet",
  "The current official passenger fleet page lists Airbus A320, A330, A350 and A380 plus Boeing 777 and 787 models.",
  "https://www.qatarairways.com/en-tz/fleet.html",
  "Explore our fleet | Qatar Airways",
);
const qatarRoutes = fact(
  "route",
  "The April 2026 official network schedule lists Doha-based international destinations including Seoul.",
  "https://dmassets.qatarairways.com/adobe/assets/urn:aaid:aem:46c43466-defb-44be-92cc-15668586a966/original/as/Q60-Network-map-07APR26.pdf",
  "Qatar Airways Network Schedule | 7 April 2026",
);
const qatarCompany = fact(
  "company_profile",
  "Qatar Airways connects an international network through its Doha hub, Hamad International Airport.",
  "https://www.qatarairways.com/press-releases/en-WW/about/",
  "About Qatar Airways | Qatar Airways Newsroom",
);

const etihadCabinCrew = fact(
  "cabin_crew_careers",
  "Current Etihad cabin crew eligibility, application review, assessment-day process and application entry point.",
  "https://careers.etihad.com/teams/cabin-crew",
  "Cabin Crew | Etihad Careers",
);
const etihadGuidelines = fact(
  "recruitment_guidance",
  "Official cabin crew style, image and assessment-day guidance.",
  "https://careers.etihad.com/legal/cabin-crew-requirements",
  "Cabin Crew Guidelines | Etihad Careers",
);
const etihadFleet = fact(
  "fleet",
  "The current official passenger fleet page lists Airbus A320, A321, A321LR, A350 and A380 plus Boeing 777 and 787 aircraft.",
  "https://www.etihad.com/en/plan/fly-with-etihad/our-fleet",
  "Discover the Etihad fleet | Etihad Airways",
);
const etihadRoutes = fact(
  "route",
  "The current official destination page connects Abu Dhabi to an international network including Seoul.",
  "https://www.etihad.com/en/destinations",
  "Etihad destinations",
);
const etihadSeoul = fact(
  "route",
  "The official booking page offers Seoul (ICN) to Abu Dhabi (AUH) flights.",
  "https://www.etihad.com/en-kr/flights/flights-from-seoul-to-abu-dhabi",
  "Flights from Seoul to Abu Dhabi | Etihad Airways",
);
const etihadLondon = fact(
  "route",
  "The current official booking page lists direct Abu Dhabi (AUH) to London Heathrow (LHR) service.",
  "https://www.etihad.com/en-ae/flights/flights-from-abu-dhabi-to-london",
  "Flights from Abu Dhabi to London | Etihad Airways",
);

export const airlineOfficialBatch3BProfiles: OfficialAirlineBatchProfile[] = [
  {
    airlineId: "emirates",
    headquarters: "Dubai, United Arab Emirates",
    hubs: ["Dubai International Airport (DXB)"],
    website: "https://www.emirates.com/",
    careersUrl: "https://www.emiratesgroupcareers.com/",
    summary: "Emirates operates a full-service international network from Dubai.",
    operationScope: "INTERNATIONAL",
    carrierType: "FULL_SERVICE",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [emiratesCompany, emiratesCabinCrew, emiratesFleet, emiratesRoutes, emiratesLondon],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "qatar_airways",
    headquarters: "Doha, Qatar",
    hubs: ["Hamad International Airport (DOH)"],
    website: "https://www.qatarairways.com/",
    careersUrl: "https://careers.qatarairways.com/global/en/",
    summary: "Qatar Airways operates a full-service international network from Doha.",
    operationScope: "INTERNATIONAL",
    carrierType: "FULL_SERVICE",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [qatarCompany, qatarCabinCrew, qatarCareers, qatarFleet, qatarRoutes],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "etihad_airways",
    headquarters: "Abu Dhabi, United Arab Emirates",
    hubs: ["Zayed International Airport (AUH)"],
    website: "https://www.etihad.com/",
    careersUrl: "https://careers.etihad.com/",
    summary: "Etihad Airways operates a full-service international network from Abu Dhabi.",
    operationScope: "INTERNATIONAL",
    carrierType: "FULL_SERVICE",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [etihadCabinCrew, etihadGuidelines, etihadFleet, etihadRoutes, etihadSeoul, etihadLondon],
    lastVerifiedAt: verifiedAt,
  },
];

export type CabinCrewRequirementType =
  | "minimum_age"
  | "height_or_reach"
  | "education"
  | "language"
  | "grooming_presentation"
  | "passport_work_eligibility"
  | "customer_service_experience"
  | "relocation"
  | "medical_fitness"
  | "other";

export type CabinCrewRequirement = {
  id: string;
  airlineId: string;
  requirementType: CabinCrewRequirementType;
  text: string;
  source: AirlineFact;
  verifiedAt: string;
  status: "VERIFIED";
  recruitmentType?: "NEW_GRADUATE" | "CAREER" | "INTERN" | "OTHER";
  recruitmentPeriod?: string;
  recordStatus?: "CURRENT" | "ARCHIVED";
};

const requirement = (
  id: string,
  airlineId: CabinCrewRequirement["airlineId"],
  requirementType: CabinCrewRequirementType,
  text: string,
  source: AirlineFact,
): CabinCrewRequirement => ({ id, airlineId, requirementType, text, source, verifiedAt, status: "VERIFIED" });

export const airlineOfficialBatch3BRequirements: CabinCrewRequirement[] = [
  requirement("3b-ek-age", "emirates", "minimum_age", "At least 21 years old.", emiratesCabinCrew),
  requirement("3b-ek-reach", "emirates", "height_or_reach", "At least 160 cm tall and able to reach 212 cm high.", emiratesCabinCrew),
  requirement("3b-ek-education", "emirates", "education", "Minimum high school (Grade 12) education.", emiratesCabinCrew),
  requirement("3b-ek-language", "emirates", "language", "Fluent in written and spoken English; additional languages are an advantage.", emiratesCabinCrew),
  requirement("3b-ek-experience", "emirates", "customer_service_experience", "At least one year of hospitality or customer service experience.", emiratesCabinCrew),
  requirement("3b-ek-visa", "emirates", "passport_work_eligibility", "Able to meet the UAE employment visa requirements.", emiratesCabinCrew),
  requirement("3b-ek-tattoo", "emirates", "grooming_presentation", "No visible tattoos while in Emirates cabin crew uniform.", emiratesCabinCrew),
  requirement("3b-ek-team", "emirates", "other", "A natural team player with a personality that shines.", emiratesCabinCrew),

  requirement("3b-qr-reach", "qatar_airways", "height_or_reach", "Minimum arm reach of 212 cm.", qatarCabinCrew),
  requirement("3b-qr-education", "qatar_airways", "education", "At least 10 years of formal education.", qatarCabinCrew),
  requirement("3b-qr-language", "qatar_airways", "language", "Fluent in written and spoken English.", qatarCabinCrew),
  requirement("3b-qr-health", "qatar_airways", "medical_fitness", "Excellent health and physical fitness.", qatarCabinCrew),
  requirement("3b-qr-relocation", "qatar_airways", "relocation", "Ability to relocate to Doha, Qatar.", qatarCabinCrew),
  requirement("3b-qr-experience", "qatar_airways", "customer_service_experience", "Preferably two or more years in hospitality, customer service, aviation or another customer-facing role.", qatarCabinCrew),

  requirement("3b-ey-age", "etihad_airways", "minimum_age", "Minimum age of 21 at the time of application.", etihadCabinCrew),
  requirement("3b-ey-height", "etihad_airways", "height_or_reach", "Minimum height of 163 cm.", etihadCabinCrew),
  requirement("3b-ey-education", "etihad_airways", "education", "High school graduate (Grade 12 or equivalent).", etihadCabinCrew),
  requirement("3b-ey-language", "etihad_airways", "language", "Fluent in written and spoken English.", etihadCabinCrew),
  requirement("3b-ey-service", "etihad_airways", "other", "A genuine passion for people, travel and new experiences.", etihadCabinCrew),
  requirement("3b-ey-attitude", "etihad_airways", "other", "Positive, confident, flexible and approachable attitude.", etihadCabinCrew),
  requirement("3b-ey-adaptable", "etihad_airways", "other", "Adaptable to fast-paced, changing environments.", etihadCabinCrew),
  requirement("3b-ey-roster", "etihad_airways", "other", "Comfortable working irregular hours on a roster basis.", etihadCabinCrew),
  requirement("3b-ey-team", "etihad_airways", "other", "Able to work effectively within diverse, multicultural teams.", etihadCabinCrew),
  requirement("3b-ey-safety", "etihad_airways", "other", "Committed to onboard safety and strict adherence to procedures.", etihadCabinCrew),
  requirement("3b-ey-tattoo", "etihad_airways", "grooming_presentation", "No visible tattoos while wearing the Etihad cabin crew uniform.", etihadCabinCrew),
  requirement("3b-ey-presentation", "etihad_airways", "grooming_presentation", "Strong personal presentation and professionalism.", etihadCabinCrew),
];

export type AirlineRecruitmentStep = {
  id: string;
  airlineId: string;
  order: number;
  title: string;
  description: string;
  source: AirlineFact;
  verifiedAt: string;
  recruitmentType?: "NEW_GRADUATE" | "CAREER" | "INTERN" | "OTHER";
  recruitmentPeriod?: string;
  recordStatus?: "CURRENT" | "ARCHIVED";
};

const step = (
  id: string,
  airlineId: AirlineRecruitmentStep["airlineId"],
  order: number,
  title: string,
  description: string,
  source: AirlineFact,
): AirlineRecruitmentStep => ({ id, airlineId, order, title, description, source, verifiedAt });

export const airlineOfficialBatch3BRecruitmentSteps: AirlineRecruitmentStep[] = [
  step("3b-ek-introduction", "emirates", 1, "Introduction", "Recruitment-team introduction to the role and life in Dubai.", emiratesCabinCrew),
  step("3b-ek-assessment", "emirates", 2, "Assessment", "Group activities and an online test at the recruitment venue.", emiratesCabinCrew),
  step("3b-ek-interview", "emirates", 3, "Final interview", "A final interview about the applicant and motivation for cabin crew.", emiratesCabinCrew),
  step("3b-qr-application", "qatar_airways", 1, "Online application", "Use the official Apply now entry point; later stages are not asserted by the current public page.", qatarCabinCrew),
  step("3b-ey-review", "etihad_airways", 1, "Application review", "Talent Acquisition reviews the profile and may invite a shortlisted applicant to a short video interview.", etihadCabinCrew),
  step("3b-ey-assessment", "etihad_airways", 2, "Assessment day", "Virtual or in-person assessment may include height and tattoo checks, a conversation, group exercise or role play, final interview and English test.", etihadCabinCrew),
  step("3b-ey-outcome", "etihad_airways", 3, "Final review and outcome", "The recruitment team reviews performance across the stages and updates the applicant.", etihadCabinCrew),
];

export type AirlineRecruitmentGuidance = {
  id: string;
  airlineId: string;
  topic: "application" | "assessment" | "training" | "accommodation" | "benefits";
  text: string;
  source: AirlineFact;
  verifiedAt: string;
  recruitmentType?: "NEW_GRADUATE" | "CAREER" | "INTERN" | "OTHER";
  recruitmentPeriod?: string;
  recordStatus?: "CURRENT" | "ARCHIVED";
};

export const airlineOfficialBatch3BGuidance: AirlineRecruitmentGuidance[] = [
  { id: "3b-ek-training", airlineId: "emirates", topic: "training", text: "The official page describes seven and a half weeks of cabin crew training in Dubai.", source: emiratesCabinCrew, verifiedAt },
  { id: "3b-ek-documents", airlineId: "emirates", topic: "assessment", text: "Recruitment-day guidance asks candidates to have valid ID and digital CV, education certificate and passport copies available if required.", source: emiratesCabinCrew, verifiedAt },
  { id: "3b-qr-accommodation", airlineId: "qatar_airways", topic: "accommodation", text: "The official page states company-provided accommodation and transportation in Doha.", source: qatarCabinCrew, verifiedAt },
  { id: "3b-qr-training", airlineId: "qatar_airways", topic: "training", text: "The official page describes cabin crew training and development opportunities.", source: qatarCabinCrew, verifiedAt },
  { id: "3b-ey-assessment", airlineId: "etihad_airways", topic: "assessment", text: "Assessment days are invite-only and may be held virtually or in person depending on location.", source: etihadCabinCrew, verifiedAt },
  { id: "3b-ey-training", airlineId: "etihad_airways", topic: "training", text: "The official page lists hospitality, safety, emergency-procedure and aviation-security training themes.", source: etihadCabinCrew, verifiedAt },
];

const route = (
  id: string,
  airlineId: AirlineRoute["airlineId"],
  originAirport: string,
  destinationAirport: string,
  originCountry: string,
  destinationCountry: string,
  source: AirlineFact,
): AirlineRoute => ({
  id,
  airlineId,
  originAirport,
  destinationAirport,
  originCountry,
  destinationCountry,
  routeScope: "INTERNATIONAL",
  status: "CONFIRMED",
  source,
  lastVerifiedAt: verifiedAt,
});

export const airlineOfficialBatch3BRoutes: AirlineRoute[] = [
  route("batch3b-ek-dxb-icn", "emirates", "DXB", "ICN", "AE", "KR", emiratesRoutes),
  route("batch3b-ek-dxb-lhr", "emirates", "DXB", "LHR", "AE", "GB", emiratesLondon),
  route("batch3b-qr-doh-icn", "qatar_airways", "DOH", "ICN", "QA", "KR", qatarRoutes),
  route("batch3b-qr-doh-lhr", "qatar_airways", "DOH", "LHR", "QA", "GB", qatarRoutes),
  route("batch3b-ey-auh-icn", "etihad_airways", "AUH", "ICN", "AE", "KR", etihadSeoul),
  route("batch3b-ey-auh-lhr", "etihad_airways", "AUH", "LHR", "AE", "GB", etihadLondon),
];

const fleet = (
  id: string,
  airlineId: AirlineFleetEntry["airlineId"],
  manufacturer: string,
  aircraftFamily: string,
  aircraftModel: string,
  bodyType: NonNullable<AirlineFleetEntry["bodyType"]>,
  source: AirlineFact,
): AirlineFleetEntry => ({
  id,
  airlineId,
  manufacturer,
  aircraftFamily,
  aircraftModel,
  role: "MIXED",
  bodyType,
  quantity: null,
  source,
  lastVerifiedAt: verifiedAt,
});

export const airlineOfficialBatch3BFleet: AirlineFleetEntry[] = [
  fleet("batch3b-ek-a350", "emirates", "Airbus", "A350", "A350", "WIDEBODY", emiratesFleet),
  fleet("batch3b-ek-a380", "emirates", "Airbus", "A380", "A380", "WIDEBODY", emiratesFleet),
  fleet("batch3b-ek-b777", "emirates", "Boeing", "777", "777", "WIDEBODY", emiratesFleet),

  fleet("batch3b-qr-a320-200", "qatar_airways", "Airbus", "A320", "A320-200", "NARROWBODY", qatarFleet),
  fleet("batch3b-qr-a330-200", "qatar_airways", "Airbus", "A330", "A330-200", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-a330-300", "qatar_airways", "Airbus", "A330", "A330-300", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-a350-900", "qatar_airways", "Airbus", "A350", "A350-900", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-a350-1000", "qatar_airways", "Airbus", "A350", "A350-1000", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-a380", "qatar_airways", "Airbus", "A380", "A380", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-b787-8", "qatar_airways", "Boeing", "787", "787-8", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-b787-9", "qatar_airways", "Boeing", "787", "787-9", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-b777-200lr", "qatar_airways", "Boeing", "777", "777-200LR", "WIDEBODY", qatarFleet),
  fleet("batch3b-qr-b777-300er", "qatar_airways", "Boeing", "777", "777-300ER", "WIDEBODY", qatarFleet),

  fleet("batch3b-ey-a320-200", "etihad_airways", "Airbus", "A320", "A320-200", "NARROWBODY", etihadFleet),
  fleet("batch3b-ey-a321-200", "etihad_airways", "Airbus", "A321", "A321-200", "NARROWBODY", etihadFleet),
  fleet("batch3b-ey-a321lr", "etihad_airways", "Airbus", "A321", "A321LR", "NARROWBODY", etihadFleet),
  fleet("batch3b-ey-a350", "etihad_airways", "Airbus", "A350", "A350", "WIDEBODY", etihadFleet),
  fleet("batch3b-ey-a380", "etihad_airways", "Airbus", "A380", "A380", "WIDEBODY", etihadFleet),
  fleet("batch3b-ey-b787-9", "etihad_airways", "Boeing", "787", "787-9", "WIDEBODY", etihadFleet),
  fleet("batch3b-ey-b787-10", "etihad_airways", "Boeing", "787", "787-10", "WIDEBODY", etihadFleet),
  fleet("batch3b-ey-b777-300er", "etihad_airways", "Boeing", "777", "777-300ER", "WIDEBODY", etihadFleet),
];

export const airlineOfficialBatch3BApplicationQuestions = [] as const;
export const airlineOfficialBatch3BInterviewQuestions = [] as const;

export const airlineOfficialBatch3BStats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch3BProfiles.length,
  sources: airlineOfficialBatch3BProfiles.reduce((count, profile) => count + profile.sources.length, 0),
  routes: airlineOfficialBatch3BRoutes.length,
  fleet: airlineOfficialBatch3BFleet.length,
  requirements: airlineOfficialBatch3BRequirements.length,
  recruitmentSteps: airlineOfficialBatch3BRecruitmentSteps.length,
  guidance: airlineOfficialBatch3BGuidance.length,
  officialApplicationQuestions: 0,
  officialInterviewQuestions: 0,
} as const;
