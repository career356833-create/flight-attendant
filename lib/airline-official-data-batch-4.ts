import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";
import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import type { AirlineRecruitmentGuidance, AirlineRecruitmentStep, CabinCrewRequirement, CabinCrewRequirementType } from "@/lib/airline-official-data-batch-3b";

// URLs in this batch were checked against the airlines' first-party surfaces on 2026-09-18.
const verifiedAt = "2026-09-18T00:00:00.000Z";

const fact = (type: string, value: string, sourceUrl: string, sourceTitle: string): AirlineFact => ({
  type, value, sourceUrl, sourceTitle, sourceAuthority: "AIRLINE_OFFICIAL", retrievedAt: verifiedAt,
  verifiedAt, status: "VERIFIED", accessStatus: "ACCESSIBLE",
});

const siaCareers = fact("cabin_crew_careers", "Official Singapore Airlines cabin crew careers page and application guidance.", "https://www.singaporeair.com/en_UK/hr/careers/cabin-crew-career/", "Cabin Crew | Singapore Airlines Careers");
const siaJobs = fact("career_page", "Official Singapore Airlines cabin crew vacancies listing.", "https://careers.singaporeair.com/sia/go/Cabin-Crew/689244/", "Cabin Crew | Singapore Airlines Careers");
const siaFleet = fact("fleet", "Official passenger fleet listing: A350-900, A380-800, 777-300ER, 787-10 and 737-8.", "https://www.singaporeair.com/en_UK/sg/flying-withus/our-story/our-fleet/", "The Singapore Airlines fleet");
const siaRoutes = fact("route", "Official current Singapore-to-Seoul route page confirms non-stop SIN-ICN service.", "https://www.singaporeair.com/sg/en/plan-travel/destinations/flights-from-singapore-to-seoul/", "Flights from Singapore to Seoul | Singapore Airlines");

const cathayCareers = fact("cabin_crew_careers", "Official Cathay Hong Kong-based flight attendant vacancy and requirements.", "https://careers.cathaypacific.com/en/careers/jobs/hong-kong/flight-attendant-based-in-hong-kong-hong-kong-recruitment-29373", "Flight Attendant (Based in Hong Kong) | Cathay Careers");
const cathayPortal = fact("career_page", "Official Cathay careers portal.", "https://careers.cathaypacific.com/", "Cathay Pacific | Careers");
const cathayFleet = fact("fleet", "Official passenger fleet listing: A321neo, A330, A350 and Boeing 777.", "https://www.cathaypacific.com/cx/en_US/flying-with-us/aircraft-and-fleet.html", "Aircraft and fleet | Cathay Pacific");
const cathayRoutes = fact("route", "Official current HKG-ICN page confirms direct Hong Kong to Seoul service.", "https://flights.cathaypacific.com/destinations/en_HK//flights-from-hong-kong-to-seoul", "Hong Kong to Seoul Flight | Cathay Pacific");

const anaCareers = fact("cabin_crew_careers", "Official ANA cabin attendant recruitment and role information.", "https://www.ana.co.jp/group/recruit/ana-recruit/career/ca/", "Cabin Attendant | ANA Recruitment");
const anaEntry = fact("career_page", "Official ANA recruitment portal and current cabin-attendant application requirements.", "https://www.ana.co.jp/group/recruit/ana-recruit/occupation/entry/", "New graduate recruitment | ANA Recruitment");
const anaFleet = fact("fleet", "Official ANA fleet statistics as of 31 March 2026.", "https://www.ana.co.jp/group/en/company/ana/scale/", "Business Statistics | ANA Group");
const anaRoutes = fact("route", "Official ANA travel information describes Seoul (Gimpo)-Tokyo (Haneda) international service and Japan domestic connections.", "https://www.ana.co.jp/en/kr/plan-book/promotions/domestic-add-on-free-flights/", "Japan domestic flights with ANA");

const jalCareers = fact("cabin_crew_careers", "Official JAL corporate site links to JAL Group recruitment information; current role-specific vacancy terms must be checked there.", "https://www.jal.com/ja-jp/", "JAL corporate website");
const jalRoutes = fact("route", "Official JAL Group route page lists current domestic and international network scope, including Seoul airports.", "https://www.jal.com/en-jp/about/air/route.html", "Number of Routes | JAPAN AIRLINES");
const jalFleet = fact("fleet", "Official JAL Group fleet table as of 31 March 2026.", "https://www.jal.com/en/investor/library/finance/pdf/fy2025q4_en0430.pdf", "Fleet as of March 31, 2026 | JAL");
const jalSafety = fact("recruitment_guidance", "Official JAL safety page describes cabin-attendant safety and emergency-preparation responsibilities.", "https://www.jal.com/en-jp/safety/staff/", "Staff who support daily flight safety | JAL");

export const airlineOfficialBatch4Profiles: OfficialAirlineBatchProfile[] = [
  { airlineId: "singapore_airlines", headquarters: "Singapore", hubs: ["Singapore Changi Airport (SIN)"], website: "https://www.singaporeair.com/", careersUrl: "https://careers.singaporeair.com/", summary: "Singapore Airlines operates a full-service international network from Singapore.", operationScope: "INTERNATIONAL", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [siaCareers, siaJobs, siaFleet, siaRoutes], lastVerifiedAt: verifiedAt },
  { airlineId: "cathay_pacific", headquarters: "Hong Kong", hubs: ["Hong Kong International Airport (HKG)"], website: "https://www.cathaypacific.com/", careersUrl: "https://careers.cathaypacific.com/", summary: "Cathay Pacific operates a full-service international network from Hong Kong.", operationScope: "INTERNATIONAL", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [cathayCareers, cathayPortal, cathayFleet, cathayRoutes], lastVerifiedAt: verifiedAt },
  { airlineId: "ana", headquarters: "Tokyo, Japan", hubs: ["Tokyo Haneda Airport (HND)", "Tokyo Narita Airport (NRT)"], website: "https://www.ana.co.jp/", careersUrl: "https://www.ana.co.jp/group/recruit/ana-recruit/", summary: "ANA operates domestic and international full-service services from Japan.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [anaCareers, anaEntry, anaFleet, anaRoutes], lastVerifiedAt: verifiedAt },
  { airlineId: "japan_airlines", headquarters: "Tokyo, Japan", hubs: ["Tokyo Haneda Airport (HND)", "Tokyo Narita Airport (NRT)"], website: "https://www.jal.com/", careersUrl: "https://www.jal.com/ja-jp/", summary: "Japan Airlines operates a full-service domestic and international network from Japan.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [jalCareers, jalRoutes, jalFleet, jalSafety], lastVerifiedAt: verifiedAt },
];

const requirement = (id: string, airlineId: string, requirementType: CabinCrewRequirementType, text: string, source: AirlineFact): CabinCrewRequirement => ({ id, airlineId, requirementType, text, source, verifiedAt, status: "VERIFIED" });

export const airlineOfficialBatch4Requirements: CabinCrewRequirement[] = [
  requirement("4-sq-age", "singapore_airlines", "minimum_age", "Minimum age of 18 years due to legislative requirements for the listed recruitment exercise.", siaCareers),
  requirement("4-sq-service", "singapore_airlines", "customer_service_experience", "Pleasant personality and service-oriented approach.", siaCareers),
  requirement("4-sq-language", "singapore_airlines", "language", "Fluent English with good communication skills for international customers.", siaCareers),
  requirement("4-sq-education", "singapore_airlines", "education", "Bachelor's degree from a recognised university for the listed recruitment exercise.", siaCareers),
  requirement("4-sq-relocation", "singapore_airlines", "relocation", "Willing to relocate to Singapore.", siaCareers),
  requirement("4-sq-bond", "singapore_airlines", "other", "Willingness and commitment to serve the stated compulsory service bond.", siaCareers),
  requirement("4-cx-reach", "cathay_pacific", "height_or_reach", "Minimum arm reach of 208 cm on tiptoe.", cathayCareers),
  requirement("4-cx-medical", "cathay_pacific", "medical_fitness", "Physical fitness to pass the pre-employment medical assessment.", cathayCareers),
  requirement("4-cx-language", "cathay_pacific", "language", "The listed Hong Kong-based vacancy requires the stated English-language evidence; confirm the live vacancy for current details.", cathayCareers),
  requirement("4-ana-education", "ana", "education", "Expected graduation from the listed post-secondary institution categories for the 2026 cabin-attendant entry.", anaEntry),
  requirement("4-ana-vision", "ana", "medical_fitness", "Unaided or corrected vision of at least 1.0 in both eyes for the listed entry.", anaEntry),
  requirement("4-ana-fitness", "ana", "medical_fitness", "Physical fitness required for aircraft duty; respiratory, circulatory, ENT, eye and lumbar conditions must not impede work.", anaEntry),
  requirement("4-ana-residence", "ana", "relocation", "Live, or plan to live, within 120 minutes by public transport of Haneda and Narita airports for the listed entry.", anaEntry),
  requirement("4-ana-passport", "ana", "passport_work_eligibility", "Able to obtain a passport before joining; nationality is not restricted by the listed entry.", anaEntry),
];

const step = (id: string, airlineId: string, order: number, title: string, description: string, source: AirlineFact): AirlineRecruitmentStep => ({ id, airlineId, order, title, description, source, verifiedAt });
export const airlineOfficialBatch4RecruitmentSteps: AirlineRecruitmentStep[] = [
  step("4-sq-apply", "singapore_airlines", 1, "Online application", "Apply only through the official Singapore Airlines career page.", siaCareers),
  step("4-sq-video", "singapore_airlines", 2, "Video interview", "Selected applicants receive a link to complete an online video interview.", siaCareers),
  step("4-sq-final", "singapore_airlines", 3, "Final interview", "Shortlisted candidates are invited to final interviews.", siaCareers),
  step("4-cx-apply", "cathay_pacific", 1, "Online application", "Use the official Cathay vacancy application entry; later selection stages are not asserted here.", cathayCareers),
  step("4-ana-entry", "ana", 1, "Recruiting Runway entry", "Apply through ANA's official recruitment entry flow; the page directs applicants to the official recruitment portal.", anaCareers),
];

export const airlineOfficialBatch4Guidance: AirlineRecruitmentGuidance[] = [
  { id: "4-sq-direct", airlineId: "singapore_airlines", topic: "application", text: "Singapore Airlines states that cabin crew recruitment is direct and applicants should use its official career page only.", source: siaCareers, verifiedAt },
  { id: "4-sq-status", airlineId: "singapore_airlines", topic: "application", text: "Recruitment status varies by exercise and location; check the official career page before applying.", source: siaCareers, verifiedAt },
  { id: "4-cx-training", airlineId: "cathay_pacific", topic: "training", text: "The official Cathay vacancy describes world-class training and a structured career-progression path.", source: cathayCareers, verifiedAt },
  { id: "4-ana-training", airlineId: "ana", topic: "training", text: "ANA describes specialist training and OJT before domestic and international cabin duty.", source: anaCareers, verifiedAt },
  { id: "4-ana-qualification", airlineId: "ana", topic: "application", text: "ANA's cabin-attendant FAQ says employees obtain domestic and international duty qualifications on joining.", source: anaCareers, verifiedAt },
  { id: "4-jal-safety", airlineId: "japan_airlines", topic: "training", text: "JAL's official safety information describes pre-flight emergency-procedure and emergency-equipment checks by cabin attendants.", source: jalSafety, verifiedAt },
];

const fleet = (id: string, airlineId: string, manufacturer: string, aircraftFamily: string, aircraftModel: string, bodyType: NonNullable<AirlineFleetEntry["bodyType"]>, source: AirlineFact): AirlineFleetEntry => ({ id, airlineId, manufacturer, aircraftFamily, aircraftModel, bodyType, role: "MIXED", quantity: null, source, lastVerifiedAt: verifiedAt });
export const airlineOfficialBatch4Fleet: AirlineFleetEntry[] = [
  fleet("4-sq-a350", "singapore_airlines", "Airbus", "A350", "A350-900", "WIDEBODY", siaFleet), fleet("4-sq-a380", "singapore_airlines", "Airbus", "A380", "A380-800", "WIDEBODY", siaFleet), fleet("4-sq-b777", "singapore_airlines", "Boeing", "777", "777-300ER", "WIDEBODY", siaFleet), fleet("4-sq-b787", "singapore_airlines", "Boeing", "787", "787-10", "WIDEBODY", siaFleet), fleet("4-sq-b737", "singapore_airlines", "Boeing", "737", "737-8", "NARROWBODY", siaFleet),
  fleet("4-cx-a321", "cathay_pacific", "Airbus", "A321", "A321neo", "NARROWBODY", cathayFleet), fleet("4-cx-a330", "cathay_pacific", "Airbus", "A330", "A330", "WIDEBODY", cathayFleet), fleet("4-cx-a350", "cathay_pacific", "Airbus", "A350", "A350", "WIDEBODY", cathayFleet), fleet("4-cx-b777", "cathay_pacific", "Boeing", "777", "777", "WIDEBODY", cathayFleet),
  fleet("4-nh-a320", "ana", "Airbus", "A320", "A320neo", "NARROWBODY", anaFleet), fleet("4-nh-a321", "ana", "Airbus", "A321", "A321neo", "NARROWBODY", anaFleet), fleet("4-nh-a380", "ana", "Airbus", "A380", "A380", "WIDEBODY", anaFleet), fleet("4-nh-b737", "ana", "Boeing", "737", "737-800", "NARROWBODY", anaFleet), fleet("4-nh-b767", "ana", "Boeing", "767", "767-300", "WIDEBODY", anaFleet), fleet("4-nh-b777", "ana", "Boeing", "777", "777-300", "WIDEBODY", anaFleet), fleet("4-nh-b787", "ana", "Boeing", "787", "787-9", "WIDEBODY", anaFleet),
  fleet("4-jl-a350-1000", "japan_airlines", "Airbus", "A350", "A350-1000", "WIDEBODY", jalFleet), fleet("4-jl-a350-900", "japan_airlines", "Airbus", "A350", "A350-900", "WIDEBODY", jalFleet), fleet("4-jl-b777", "japan_airlines", "Boeing", "777", "777-300ER", "WIDEBODY", jalFleet), fleet("4-jl-b787-8", "japan_airlines", "Boeing", "787", "787-8", "WIDEBODY", jalFleet), fleet("4-jl-b787-9", "japan_airlines", "Boeing", "787", "787-9", "WIDEBODY", jalFleet), fleet("4-jl-b767", "japan_airlines", "Boeing", "767", "767-300ER", "WIDEBODY", jalFleet), fleet("4-jl-b737", "japan_airlines", "Boeing", "737", "737-800", "NARROWBODY", jalFleet),
];

const route = (id: string, airlineId: string, originAirport: string, destinationAirport: string, originCountry: string, destinationCountry: string, routeScope: AirlineRoute["routeScope"], source: AirlineFact): AirlineRoute => ({ id, airlineId, originAirport, destinationAirport, originCountry, destinationCountry, routeScope, status: "CONFIRMED", source, lastVerifiedAt: verifiedAt });
export const airlineOfficialBatch4Routes: AirlineRoute[] = [
  route("4-sq-sin-icn", "singapore_airlines", "SIN", "ICN", "SG", "KR", "INTERNATIONAL", siaRoutes),
  route("4-cx-hkg-icn", "cathay_pacific", "HKG", "ICN", "HK", "KR", "INTERNATIONAL", cathayRoutes),
  route("4-nh-hnd-gmp", "ana", "HND", "GMP", "JP", "KR", "INTERNATIONAL", anaRoutes),
  route("4-jl-tyo-icn", "japan_airlines", "TYO", "ICN", "JP", "KR", "INTERNATIONAL", jalRoutes),
];

export const airlineOfficialBatch4ApplicationQuestions = [] as const;
export const airlineOfficialBatch4InterviewQuestions = [] as const;
export const airlineOfficialBatch4Stats = { retrievedAt: verifiedAt, profiles: 4, sources: 16, routes: airlineOfficialBatch4Routes.length, fleet: airlineOfficialBatch4Fleet.length, requirements: airlineOfficialBatch4Requirements.length, recruitmentSteps: airlineOfficialBatch4RecruitmentSteps.length, guidance: airlineOfficialBatch4Guidance.length, officialApplicationQuestions: 0, officialInterviewQuestions: 0 } as const;
