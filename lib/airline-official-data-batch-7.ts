import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";
import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import type { AirlineRecruitmentGuidance, AirlineRecruitmentStep, CabinCrewRequirement, CabinCrewRequirementType } from "@/lib/airline-official-data-batch-3b";

// First-party URLs in this batch were checked on 2026-09-19.
// Crew bases are guidance only; regional/express fleets and partner-operated routes are excluded.
const verifiedAt = "2026-09-19T00:00:00.000Z";

const fact = (
  type: string,
  value: string,
  sourceUrl: string,
  sourceTitle: string,
  accessStatus: AirlineFact["accessStatus"] = "ACCESSIBLE",
): AirlineFact => ({
  type, value, sourceUrl, sourceTitle, sourceAuthority: "AIRLINE_OFFICIAL", retrievedAt: verifiedAt,
  verifiedAt, status: "VERIFIED", accessStatus,
});

const dlCabin = fact("cabin_crew_careers", "Current Delta flight-attendant requirements, hiring process, training and FAQ.", "https://www.delta.com/us/en/careers/flight-attendant-careers", "Flight Attendant Careers | Delta Air Lines");
const dlCompany = fact("company_profile", "Delta headquarters, U.S. hubs and global network profile.", "https://news.delta.com/corporate-stats-and-facts", "Corporate Stats and Facts | Delta");
const dlFleet = fact("fleet", "Official Delta aircraft page; Delta Connection aircraft are excluded.", "https://www.delta.com/us/en/aircraft/overview", "Aircraft Overview | Delta Air Lines");
const dlKorea = fact("route", "Delta-operated ICN services to ATL, DTW, MSP, SEA and SLC are identified separately from partner services.", "https://news.delta.com/strategically-connecting-asia-and-americas-delta-incheon-international-airport", "Delta at Incheon International Airport");
const dlAirport = fact("route", "Official ICN airport guidance distinguishes Delta and partner operations at Terminal 2.", "https://www.delta.com/us/en/airports/asia/seoul-sky-club-airport-map", "Seoul-Incheon Airport | Delta");

const uaCabin = fact("cabin_crew_careers", "Current United flight-attendant qualifications, FAQ, training and base guidance.", "https://careers.united.com/us/en/flight-attendant-information", "Flight Attendant Information | United");
const uaPath = fact("recruitment_guidance", "Current United Path to Inflight selection and training roadmap.", "https://careers.united.com/us/en/path-to-inflight", "Path to Inflight | United");
const uaCompany = fact("company_profile", "Current United company profile and seven U.S. hubs.", "https://ir.united.com/", "Investor Relations | United Airlines Holdings");
const uaFleet = fact("fleet", "Official mainline fleet families; regional aircraft are excluded.", "https://ir.united.com/static-files/4e68b31c-fddf-4a62-9573-bdf931dd26cc", "United 2026 Fleet Plan");
const uaKorea = fact("route", "Current United-operated daily SFO-ICN schedule.", "https://businesstravel.united.com/tpac-asia-schedule-seoul", "Flights to Seoul | United");

const aaCabin = fact("cabin_crew_careers", "Current American flight-attendant role, hiring journey, appearance, training and base guidance.", "https://flightattendants.aa.com/", "Become a Flight Attendant | American Airlines", "AUTOMATED_ACCESS_RESTRICTED");
const aaCareers = fact("career_page", "Official American Airlines flight-attendant careers entry point and vacancy guidance.", "https://jobs.aa.com/go/Flight-Attendants/2537300/", "Flight Attendant Jobs | American Airlines");
const aaCompany = fact("company_profile", "American's nine hubs and global network are identified by the official newsroom.", "https://news.aa.com/centennial/our-stories/9-hubs-9-stories/", "American's 9 Hubs");
const aaFleet = fact("fleet", "Official current American mainline aircraft-type pages.", "https://www.aa.com/i18n/travel-info/experience/planes/planes.jsp", "Planes | American Airlines");
const aaKorea = fact("route", "The current Korean fare page identifies the ICN-DFW airport pair.", "https://www.aa.com/pubcontent/en_KR/customer-service/support/fares-and-fuel-surcharge.html", "Korea Fares and Fuel Surcharge | American Airlines");

const acCabin = fact("cabin_crew_careers", "Official Air Canada flight-attendant role and published minimum requirements.", "https://www.aircanada.com/content/aircanada/ca/en/aco/home/about/careers/career-opportunities.html", "Career Opportunities | Air Canada");
const acCareers = fact("career_page", "Official Air Canada careers and cabin-crew entry point.", "https://careers.aircanada.com/ca/en", "Air Canada Careers");
const acFaq = fact("recruitment_guidance", "Official application, job-alert, minimum-age and reapplication FAQ.", "https://careers.aircanada.com/ca/en/faqs", "Careers FAQ | Air Canada");
const acCompany = fact("company_profile", "Current Air Canada headquarters and major hubs.", "https://www.aircanada.com/content/dam/aircanada/portal/documents/PDF/en/AC-2026-Accessibility-PLAN-EN.pdf", "Air Canada Accessibility Plan 2026-2029");
const acFleet = fact("fleet", "Official Air Canada-operated aircraft list; Express and Rouge aircraft are excluded.", "https://www.aircanada.com/ca/en/aco/home/fly/onboard/fleet.html", "Our Fleet | Air Canada");
const acKorea = fact("route", "The official direct-destination list identifies ICN-YYZ and ICN-YVR; other Korea offers are not stored.", "https://vacations.aircanada.com/en/plan-your-trip/travel-info/where-we-fly", "Where We Fly | Air Canada Vacations");

export const airlineOfficialBatch7Profiles: OfficialAirlineBatchProfile[] = [
  { airlineId: "delta_air_lines", headquarters: "Atlanta, Georgia, United States", hubs: ["Atlanta (ATL)", "Boston (BOS)", "Detroit (DTW)", "Los Angeles (LAX)", "Minneapolis-St. Paul (MSP)", "New York-JFK (JFK)", "New York-LaGuardia (LGA)", "Salt Lake City (SLC)", "Seattle (SEA)"], website: "https://www.delta.com/", careersUrl: "https://www.delta.com/us/en/careers/overview", summary: "Delta operates a full-service domestic and international network from its U.S. hubs.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [dlCabin, dlCompany, dlFleet, dlKorea, dlAirport], lastVerifiedAt: verifiedAt },
  { airlineId: "united_airlines", headquarters: "Chicago, Illinois, United States", hubs: ["Chicago (ORD)", "Denver (DEN)", "Houston (IAH)", "Los Angeles (LAX)", "New York/Newark (EWR)", "San Francisco (SFO)", "Washington Dulles (IAD)"], website: "https://www.united.com/", careersUrl: "https://careers.united.com/", summary: "United operates a full-service domestic and international network from seven U.S. hubs.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [uaCabin, uaPath, uaCompany, uaFleet, uaKorea], lastVerifiedAt: verifiedAt },
  { airlineId: "american_airlines", headquarters: "Fort Worth, Texas, United States", hubs: ["Charlotte (CLT)", "Chicago (ORD)", "Dallas-Fort Worth (DFW)", "Los Angeles (LAX)", "Miami (MIA)", "New York (JFK/LGA)", "Philadelphia (PHL)", "Phoenix (PHX)", "Washington National (DCA)"], website: "https://www.aa.com/", careersUrl: "https://jobs.aa.com/", summary: "American operates a full-service domestic and international network centered on nine U.S. hubs.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [aaCabin, aaCareers, aaCompany, aaFleet, aaKorea], lastVerifiedAt: verifiedAt },
  { airlineId: "air_canada", headquarters: "Montreal, Quebec, Canada", hubs: ["Toronto Pearson (YYZ)", "Vancouver (YVR)", "Montreal-Trudeau (YUL)"], website: "https://www.aircanada.com/", careersUrl: "https://careers.aircanada.com/", summary: "Air Canada operates a full-service domestic and international network from its major Canadian hubs.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [acCabin, acCareers, acFaq, acCompany, acFleet, acKorea], lastVerifiedAt: verifiedAt },
];

const requirement = (id: string, airlineId: string, requirementType: CabinCrewRequirementType, text: string, source: AirlineFact): CabinCrewRequirement => ({ id, airlineId, requirementType, text, source, verifiedAt, status: "VERIFIED" });
export const airlineOfficialBatch7Requirements: CabinCrewRequirement[] = [
  requirement("7-dl-age", "delta_air_lines", "minimum_age", "At least 21 years old.", dlCabin),
  requirement("7-dl-passport", "delta_air_lines", "passport_work_eligibility", "A valid passport with at least 30 months remaining when reporting for training.", dlCabin),
  requirement("7-dl-language", "delta_air_lines", "language", "Bilingual LOD candidates must speak, read and write the language for which they apply.", dlCabin),
  requirement("7-dl-screening", "delta_air_lines", "other", "Pre-employment paperwork includes a background check and drug screening.", dlCabin),

  requirement("7-ua-age", "united_airlines", "minimum_age", "At least 21 years old at application.", uaCabin),
  requirement("7-ua-education", "united_airlines", "education", "High school graduate or GED.", uaCabin),
  requirement("7-ua-experience", "united_airlines", "customer_service_experience", "At least one year of service-industry customer-service experience.", uaCabin),
  requirement("7-ua-language", "united_airlines", "language", "Fluent in speaking, reading, writing and understanding English.", uaCabin),
  requirement("7-ua-appearance", "united_airlines", "grooming_presentation", "Professional appearance and compliance with uniform, hair, tattoo and piercing guidance.", uaCabin),
  requirement("7-ua-passport", "united_airlines", "passport_work_eligibility", "A passport with 12 months validity and two consecutive blank pages, unrestricted travel and U.S. work authorization.", uaCabin),
  requirement("7-ua-reach", "united_airlines", "height_or_reach", "Pass a simultaneous 76-inch vertical and 43.5-inch horizontal functional reach assessment without shoes.", uaCabin),
  requirement("7-ua-hearing", "united_airlines", "medical_fitness", "Ability to hear all types and ranges of sound.", uaCabin),
  requirement("7-ua-schedule", "united_airlines", "other", "Available for a flexible 24/7 schedule including weekends and holidays.", uaCabin),

  requirement("7-aa-appearance", "american_airlines", "grooming_presentation", "Professional interview appearance with no visible tattoos or body art and the published piercing limits.", aaCabin),

  requirement("7-ac-age", "air_canada", "minimum_age", "At least 18 years old.", acCabin),
  requirement("7-ac-passport", "air_canada", "passport_work_eligibility", "A valid Canadian passport permitting travel to all countries served by Air Canada.", acCabin),
  requirement("7-ac-appearance", "air_canada", "grooming_presentation", "Able to meet uniform and personal-grooming standards.", acCabin),
  requirement("7-ac-medical", "air_canada", "medical_fitness", "Must meet Air Canada medical standards.", acCabin),
  requirement("7-ac-security", "air_canada", "other", "Must pass the criminal background check required for Transport Canada security clearance.", acCabin),
  requirement("7-ac-schedule", "air_canada", "other", "Available for irregular, shift, weekend, holiday and on-call work.", acCabin),
  requirement("7-ac-language", "air_canada", "language", "English-French bilingual candidates are preferred; additional listed languages include Korean.", acCabin),
];

const step = (id: string, airlineId: string, order: number, title: string, description: string, source: AirlineFact): AirlineRecruitmentStep => ({ id, airlineId, order, title, description, source, verifiedAt });
export const airlineOfficialBatch7RecruitmentSteps: AirlineRecruitmentStep[] = [
  step("7-dl-application", "delta_air_lines", 1, "Application", "Submit the official Delta flight-attendant application.", dlCabin),
  step("7-dl-candidate", "delta_air_lines", 2, "Candidate assessment", "Complete the MakiPeople candidate assessment.", dlCabin),
  step("7-dl-values", "delta_air_lines", 3, "Values assessment", "Complete the Fitme values assessment.", dlCabin),
  step("7-dl-video", "delta_air_lines", 4, "On-demand interview", "Record the HireVue on-demand interview.", dlCabin),
  step("7-dl-event", "delta_air_lines", 5, "In-person Event Day", "Attend Event Day at Delta headquarters in Atlanta.", dlCabin),
  step("7-dl-offer", "delta_air_lines", 6, "Conditional job offer", "Successful candidates receive a conditional offer and complete pre-employment checks.", dlCabin),
  step("7-dl-training", "delta_air_lines", 7, "Onsite training", "Begin seven-week onsite training in Atlanta after successful pre-employment.", dlCabin),

  step("7-ua-application", "united_airlines", 1, "Application", "Apply to an available United flight-attendant requisition with a resume.", uaPath),
  step("7-ua-assessment", "united_airlines", 2, "Talent assessment", "Complete the online talent assessment.", uaPath),
  step("7-ua-recorded", "united_airlines", 3, "Pre-recorded interview", "Complete the invited pre-recorded interview.", uaPath),
  step("7-ua-live", "united_airlines", 4, "Live virtual interview", "Complete a live virtual interview with Talent Acquisition.", uaPath),
  step("7-ua-person", "united_airlines", 5, "In-person interview", "Attend group and one-to-one assessments in Houston.", uaPath),
  step("7-ua-offer", "united_airlines", 6, "Conditional training offer", "Receive a conditional training offer and complete required checks.", uaPath),
  step("7-ua-training", "united_airlines", 7, "Inflight training", "Complete 6.5-week onsite training in Houston.", uaPath),
  step("7-ua-graduation", "united_airlines", 8, "Graduation and base orientation", "Graduate, receive base support and complete orientation.", uaPath),

  step("7-aa-application", "american_airlines", 1, "Application and assessment", "Submit the application and complete the AON assessment.", aaCabin),
  step("7-aa-recorded", "american_airlines", 2, "Recorded introduction", "Record responses to the official situational prompts.", aaCabin),
  step("7-aa-virtual", "american_airlines", 3, "Virtual conversation", "Complete the recruiting-team virtual conversation.", aaCabin),
  step("7-aa-person", "american_airlines", 4, "In-person experience", "Attend the campus interview and essential-function assessment.", aaCabin),
  step("7-aa-training", "american_airlines", 5, "Training", "Complete seven-week training at the DFW campus.", aaCabin),
  step("7-aa-wings", "american_airlines", 6, "Earn your wings", "Graduate and begin the American flight-attendant role.", aaCabin),

  step("7-ac-application", "air_canada", 1, "Official application", "Apply to a current vacancy through the official careers site; later stages are not asserted without a live role posting.", acFaq),
];

export const airlineOfficialBatch7Guidance: AirlineRecruitmentGuidance[] = [
  { id: "7-dl-assessment", airlineId: "delta_air_lines", topic: "assessment", text: "Delta advises completing assessments without distraction and answering honestly.", source: dlCabin, verifiedAt },
  { id: "7-dl-bases", airlineId: "delta_air_lines", topic: "training", text: "Base availability is communicated before training and is operationally assigned; crew bases are not stored as company hubs.", source: dlCabin, verifiedAt },
  { id: "7-dl-reapply", airlineId: "delta_air_lines", topic: "application", text: "Unsuccessful candidates may reapply after six months when a new requisition is posted.", source: dlCabin, verifiedAt },
  { id: "7-ua-base", airlineId: "united_airlines", topic: "training", text: "Base assignment occurs during initial training and is separate from the corporate hub list.", source: uaCabin, verifiedAt },
  { id: "7-ua-training", airlineId: "united_airlines", topic: "training", text: "Initial training lasts 6.5 weeks in Houston and includes safety, service and evaluations.", source: uaCabin, verifiedAt },
  { id: "7-ua-interview", airlineId: "united_airlines", topic: "assessment", text: "United recommends a situation-task-action-result structure for the live virtual interview.", source: uaPath, verifiedAt },
  { id: "7-aa-base", airlineId: "american_airlines", topic: "training", text: "Base assignment occurs in training week three and is based on seniority, availability and operational need; it is not used as hub provenance.", source: aaCabin, verifiedAt },
  { id: "7-aa-reserve", airlineId: "american_airlines", topic: "training", text: "The current role guide says most new flight attendants spend their first two or more years on reserve.", source: aaCabin, verifiedAt },
  { id: "7-aa-training", airlineId: "american_airlines", topic: "training", text: "The current guide describes seven weeks of unpaid training with lodging and meals provided.", source: aaCabin, verifiedAt },
  { id: "7-ac-alerts", airlineId: "air_canada", topic: "application", text: "Applicants can create job alerts and join the official talent network when no matching opening is available.", source: acFaq, verifiedAt },
  { id: "7-ac-training", airlineId: "air_canada", topic: "training", text: "The published flight-attendant page describes full-time training in Vancouver, Toronto or Montreal.", source: acCabin, verifiedAt },
  { id: "7-ac-reapply", airlineId: "air_canada", topic: "application", text: "The careers FAQ permits reapplication to the same position after six months.", source: acFaq, verifiedAt },
];

const fleet = (id: string, airlineId: string, manufacturer: string, aircraftFamily: string, aircraftModel: string, bodyType: NonNullable<AirlineFleetEntry["bodyType"]>, source: AirlineFact): AirlineFleetEntry => ({ id, airlineId, manufacturer, aircraftFamily, aircraftModel, bodyType, role: "MIXED", quantity: null, source, lastVerifiedAt: verifiedAt });
export const airlineOfficialBatch7Fleet: AirlineFleetEntry[] = [
  fleet("7-dl-a220-100", "delta_air_lines", "Airbus", "A220", "A220-100", "NARROWBODY", dlFleet), fleet("7-dl-a220-300", "delta_air_lines", "Airbus", "A220", "A220-300", "NARROWBODY", dlFleet), fleet("7-dl-a319", "delta_air_lines", "Airbus", "A319", "A319-100", "NARROWBODY", dlFleet), fleet("7-dl-a320", "delta_air_lines", "Airbus", "A320", "A320-200", "NARROWBODY", dlFleet), fleet("7-dl-a321", "delta_air_lines", "Airbus", "A321", "A321-200", "NARROWBODY", dlFleet), fleet("7-dl-a321neo", "delta_air_lines", "Airbus", "A321", "A321neo", "NARROWBODY", dlFleet), fleet("7-dl-a330-200", "delta_air_lines", "Airbus", "A330", "A330-200", "WIDEBODY", dlFleet), fleet("7-dl-a330-300", "delta_air_lines", "Airbus", "A330", "A330-300", "WIDEBODY", dlFleet), fleet("7-dl-a330-900", "delta_air_lines", "Airbus", "A330", "A330-900neo", "WIDEBODY", dlFleet), fleet("7-dl-a350", "delta_air_lines", "Airbus", "A350", "A350-900", "WIDEBODY", dlFleet), fleet("7-dl-b717", "delta_air_lines", "Boeing", "717", "717-200", "NARROWBODY", dlFleet), fleet("7-dl-b737-800", "delta_air_lines", "Boeing", "737", "737-800", "NARROWBODY", dlFleet), fleet("7-dl-b737-900", "delta_air_lines", "Boeing", "737", "737-900ER", "NARROWBODY", dlFleet), fleet("7-dl-b757-200", "delta_air_lines", "Boeing", "757", "757-200", "NARROWBODY", dlFleet), fleet("7-dl-b757-300", "delta_air_lines", "Boeing", "757", "757-300", "NARROWBODY", dlFleet), fleet("7-dl-b767-300", "delta_air_lines", "Boeing", "767", "767-300ER", "WIDEBODY", dlFleet), fleet("7-dl-b767-400", "delta_air_lines", "Boeing", "767", "767-400ER", "WIDEBODY", dlFleet),
  fleet("7-ua-b777", "united_airlines", "Boeing", "777", "777-200/300", "WIDEBODY", uaFleet), fleet("7-ua-b787", "united_airlines", "Boeing", "787", "787-8/9/10", "WIDEBODY", uaFleet), fleet("7-ua-b767", "united_airlines", "Boeing", "767", "767-300/400", "WIDEBODY", uaFleet), fleet("7-ua-b757", "united_airlines", "Boeing", "757", "757-200/300", "NARROWBODY", uaFleet), fleet("7-ua-b737max", "united_airlines", "Boeing", "737", "737 MAX", "NARROWBODY", uaFleet), fleet("7-ua-b737ng", "united_airlines", "Boeing", "737", "737-700/800/900", "NARROWBODY", uaFleet), fleet("7-ua-a319-a320", "united_airlines", "Airbus", "A320", "A319/A320", "NARROWBODY", uaFleet), fleet("7-ua-a321", "united_airlines", "Airbus", "A321", "A321neo/XLR", "NARROWBODY", uaFleet),
  fleet("7-aa-a319", "american_airlines", "Airbus", "A319", "A319", "NARROWBODY", aaFleet), fleet("7-aa-a320", "american_airlines", "Airbus", "A320", "A320", "NARROWBODY", aaFleet), fleet("7-aa-a321", "american_airlines", "Airbus", "A321", "A321", "NARROWBODY", aaFleet), fleet("7-aa-a321neo", "american_airlines", "Airbus", "A321", "A321neo", "NARROWBODY", aaFleet), fleet("7-aa-b737-800", "american_airlines", "Boeing", "737", "737-800", "NARROWBODY", aaFleet), fleet("7-aa-b737max", "american_airlines", "Boeing", "737", "737 MAX 8", "NARROWBODY", aaFleet), fleet("7-aa-b777-200", "american_airlines", "Boeing", "777", "777-200", "WIDEBODY", aaFleet), fleet("7-aa-b777-300", "american_airlines", "Boeing", "777", "777-300ER", "WIDEBODY", aaFleet), fleet("7-aa-b787-8", "american_airlines", "Boeing", "787", "787-8", "WIDEBODY", aaFleet), fleet("7-aa-b787-9", "american_airlines", "Boeing", "787", "787-9", "WIDEBODY", aaFleet),
  fleet("7-ac-b777-300", "air_canada", "Boeing", "777", "777-300ER", "WIDEBODY", acFleet), fleet("7-ac-b777-200", "air_canada", "Boeing", "777", "777-200LR", "WIDEBODY", acFleet), fleet("7-ac-a330", "air_canada", "Airbus", "A330", "A330-300", "WIDEBODY", acFleet), fleet("7-ac-b787-9", "air_canada", "Boeing", "787", "787-9", "WIDEBODY", acFleet), fleet("7-ac-b787-8", "air_canada", "Boeing", "787", "787-8", "WIDEBODY", acFleet), fleet("7-ac-a321xlr", "air_canada", "Airbus", "A321", "A321XLR", "NARROWBODY", acFleet), fleet("7-ac-a321", "air_canada", "Airbus", "A321", "A321-200", "NARROWBODY", acFleet), fleet("7-ac-b737max", "air_canada", "Boeing", "737", "737 MAX 8", "NARROWBODY", acFleet), fleet("7-ac-a220", "air_canada", "Airbus", "A220", "A220-300", "NARROWBODY", acFleet), fleet("7-ac-a320", "air_canada", "Airbus", "A320", "A320-200", "NARROWBODY", acFleet),
];

const route = (id: string, airlineId: string, originAirport: string, destinationAirport: string, destinationCountry: string, source: AirlineFact): AirlineRoute => ({ id, airlineId, originAirport, destinationAirport, originCountry: "KR", destinationCountry, routeScope: "INTERNATIONAL", status: "CONFIRMED", source, lastVerifiedAt: verifiedAt });
export const airlineOfficialBatch7Routes: AirlineRoute[] = [
  route("7-dl-icn-atl", "delta_air_lines", "ICN", "ATL", "US", dlKorea), route("7-dl-icn-dtw", "delta_air_lines", "ICN", "DTW", "US", dlKorea), route("7-dl-icn-msp", "delta_air_lines", "ICN", "MSP", "US", dlKorea), route("7-dl-icn-sea", "delta_air_lines", "ICN", "SEA", "US", dlKorea), route("7-dl-icn-slc", "delta_air_lines", "ICN", "SLC", "US", dlKorea),
  route("7-ua-icn-sfo", "united_airlines", "ICN", "SFO", "US", uaKorea),
  route("7-aa-icn-dfw", "american_airlines", "ICN", "DFW", "US", aaKorea),
  route("7-ac-icn-yyz", "air_canada", "ICN", "YYZ", "CA", acKorea), route("7-ac-icn-yvr", "air_canada", "ICN", "YVR", "CA", acKorea),
];

// No cabin-specific application or interview wording was directly published as reusable question data.
export const airlineOfficialBatch7ApplicationQuestions = [] as const;
export const airlineOfficialBatch7InterviewQuestions = [] as const;

export const airlineOfficialBatch7Stats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch7Profiles.length,
  sources: airlineOfficialBatch7Profiles.reduce((count, profile) => count + profile.sources.length, 0),
  routes: airlineOfficialBatch7Routes.length,
  fleet: airlineOfficialBatch7Fleet.length,
  requirements: airlineOfficialBatch7Requirements.length,
  recruitmentSteps: airlineOfficialBatch7RecruitmentSteps.length,
  guidance: airlineOfficialBatch7Guidance.length,
  officialApplicationQuestions: airlineOfficialBatch7ApplicationQuestions.length,
  officialInterviewQuestions: airlineOfficialBatch7InterviewQuestions.length,
} as const;
