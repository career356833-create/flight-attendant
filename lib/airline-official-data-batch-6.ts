import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";
import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import type {
  AirlineRecruitmentGuidance,
  AirlineRecruitmentStep,
  CabinCrewRequirement,
  CabinCrewRequirementType,
} from "@/lib/airline-official-data-batch-3b";

// First-party URLs in this batch were checked on 2026-09-18.
// Subsidiary fleets and routes are excluded unless the source identifies the target airline as operator.
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

const lhCabin = fact("cabin_crew_careers", "Official Deutsche Lufthansa AG flight-attendant information for Frankfurt and Munich bases.", "https://www.lufthansagroup.careers/en/faq/lufthansa/flight-attendant-mfdiverse-deutsche-lufthansa-ag", "Flight attendant | Deutsche Lufthansa AG");
const lhApplication = fact("recruitment_guidance", "Official application, English-test, applicant-day, passport and appearance guidance.", "https://www.lufthansagroup.careers/en/faq/lufthansa/flight-attendant-mfdiverse-deutsche-lufthansa-ag/application", "Application | Lufthansa flight attendant");
const lhMedical = fact("recruitment_guidance", "Official flight-fitness and occupational medical-examination guidance.", "https://www.lufthansagroup.careers/en/faq/lufthansa/flight-attendant-mfdiverse-deutsche-lufthansa-ag/medical-examination", "Medical examination | Lufthansa flight attendant");
const lhTraining = fact("recruitment_guidance", "Official Lufthansa flight-attendant training-duration guidance.", "https://www.lufthansagroup.careers/en/faq/lufthansa/flight-attendant-mfdiverse-deutsche-lufthansa-ag/training", "Training | Lufthansa flight attendant");
const lhFleet = fact("fleet", "Official Lufthansa seat-map pages list current long-, short- and medium-haul aircraft models.", "https://www.lufthansa.com/au/en/seat-maps", "Lufthansa fleet");
const lhKorea = fact("route", "The 2026 Korea schedule lists Lufthansa-operated ICN-FRA and ICN-MUC services.", "https://www.lufthansa.com/kr/ko/local-page/korea-customer-info", "Lufthansa 2026 Korea schedule");

const baCabin = fact("cabin_crew_careers", "Official British Airways cabin-crew bases, role and recruitment journey.", "https://careers.ba.com/cabin-crew", "Cabin Crew | British Airways Careers");
const baHiring = fact("recruitment_guidance", "Official cabin-crew application, assessment, offer and pre-employment process.", "https://careers.ba.com/hiring-process", "Hiring Process | British Airways Careers");
const baVacancy = fact("career_page", "Current British Airways cabin-crew talent-pool eligibility and role requirements.", "https://careers.ba.com/job/heathrow/cabin-crew-talent-pool/22348/94593554544", "Cabin Crew Talent Pool | British Airways");
const baFaq = fact("recruitment_guidance", "Official cabin-crew work-eligibility, reach, appearance and training FAQ.", "https://careers.ba.com/cabin-crew-faqs", "Cabin Crew FAQs | British Airways");
const baFleet = fact("fleet", "Official British Airways fleet page; BA CityFlyer aircraft are excluded from mainline entries.", "https://www.britishairways.com/content/en/us/information/about-ba/fleet-facts", "Fleet facts | British Airways");
const baNetwork = fact("route", "Official destination surface covers domestic and international destinations; it does not establish a current BA-operated Korea service.", "https://www.britishairways.com/content/en/us/information/flight-information/our-route-network", "Our route network | British Airways");

const afCabin = fact("cabin_crew_careers", "Official Air France commercial flight-attendant role and current application conditions.", "https://corporate.airfrance.com/en/cabin-crew-member", "Flight attendant | Air France Corporate");
const afCareers = fact("career_page", "Official Air France recruitment portal.", "https://recrutement.airfrance.com/homepage.aspx?LCID=2057", "Air France Recruitment");
const afRecruitment = fact("recruitment_guidance", "Official company recruitment process; individual vacancy stages may vary.", "https://corporate.airfrance.com/en/recruitment-process", "Recruitment process | Air France Corporate");
const afKeyFigures = fact("company_profile", "Current Air France staff, fleet and company key figures updated for year-end 2025.", "https://corporate.airfrance.com/en/about-air-france/key-figures", "Key figures | Air France Corporate");
const afFleet = fact("fleet", "Official training-centre release identifies the aircraft families covering the current Air France fleet.", "https://corporate.airfrance.com/fr/actualites/air-france-inaugure-deux-nouveaux-simulateurs-de-vol-dans-son-centre-de-formation-des", "Air France flight simulators and fleet families");
const afSchedule = fact("route", "The 2026 schedule identifies Paris-Charles de Gaulle as the central hub and confirms domestic and international operations.", "https://corporate.airfrance.com/en/press-releases/air-frances-2026-summer-schedule", "Air France 2026 summer schedule");
const afKorea = fact("route", "The official Korean booking surface lists current ICN-CDG offers.", "https://wwws.airfrance.co.kr/ko-kr/%ED%95%AD%EA%B3%B5%ED%8E%B8-%EC%B6%9C%EB%B0%9C-%EC%84%9C%EC%9A%B8-%EB%8F%84%EC%B0%A9-%ED%8C%8C%EB%A6%AC", "Seoul to Paris flights | Air France Korea");

const klmCabin = fact("cabin_crew_careers", "Official KLM mainline cabin role and current eligibility; Cityhopper-specific conditions are excluded.", "https://careers.klm.com/en/job-area/cabin/", "Cabin | KLM Careers");
const klmSelection = fact("recruitment_guidance", "Official KLM mainline cabin selection rounds and basic training.", "https://careers.klm.com/en/selection-and-training-klm-cabin/", "Selection and training: KLM cabin");
const klmFaq = fact("recruitment_guidance", "Official KLM cabin vacancy, diploma, selection-result and course guidance.", "https://careers.klm.com/en/klm-cabin-attendants-faq-s/", "KLM cabin attendants FAQs");
const klmFleet = fact("fleet", "Official KLM aircraft-type pages; Cityhopper Embraer aircraft are excluded from mainline entries.", "https://www.klm.com/information/travel-class-extra-options/aircraft-types", "Aircraft types | KLM");
const klmSchedule = fact("company_profile", "The 2026 KLM schedule confirms an international network from Amsterdam.", "https://news.klm.com/klm-announces-summer-schedule-with-over-160-destinations/", "KLM 2026 summer schedule");
const klmKorea = fact("route", "The official Korean booking surface lists current ICN-AMS offers.", "https://www.klm.co.kr/en-kr/flights-from-seoul-to-amsterdam", "Seoul to Amsterdam flights | KLM");

export const airlineOfficialBatch6Profiles: OfficialAirlineBatchProfile[] = [
  { airlineId: "lufthansa", headquarters: "Frankfurt, Germany", hubs: ["Frankfurt Airport (FRA)", "Munich Airport (MUC)"], website: "https://www.lufthansa.com/", careersUrl: "https://www.lufthansagroup.careers/", summary: "Lufthansa operates full-service domestic and international services from Frankfurt and Munich.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [lhCabin, lhApplication, lhMedical, lhTraining, lhFleet, lhKorea], lastVerifiedAt: verifiedAt },
  { airlineId: "british_airways", headquarters: "London, United Kingdom", hubs: ["London Heathrow Airport (LHR)"], website: "https://www.britishairways.com/", careersUrl: "https://careers.ba.com/", summary: "British Airways operates full-service domestic and international services from London.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [baCabin, baHiring, baVacancy, baFaq, baFleet, baNetwork], lastVerifiedAt: verifiedAt },
  { airlineId: "air_france", headquarters: "Paris, France", hubs: ["Paris Charles de Gaulle Airport (CDG)"], website: "https://www.airfrance.com/", careersUrl: "https://recrutement.airfrance.com/", summary: "Air France operates full-service domestic and international services from Paris-Charles de Gaulle.", operationScope: "BOTH", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [afCabin, afCareers, afRecruitment, afKeyFigures, afFleet, afSchedule, afKorea], lastVerifiedAt: verifiedAt },
  { airlineId: "klm", headquarters: "Amstelveen, Netherlands", hubs: ["Amsterdam Airport Schiphol (AMS)"], website: "https://www.klm.com/", careersUrl: "https://careers.klm.com/", summary: "KLM operates a full-service international network from Amsterdam Schiphol.", operationScope: "INTERNATIONAL", carrierType: "FULL_SERVICE", verified: true, published: true, aiContextEnabled: false, sources: [klmCabin, klmSelection, klmFaq, klmFleet, klmSchedule, klmKorea], lastVerifiedAt: verifiedAt },
];

const requirement = (id: string, airlineId: string, requirementType: CabinCrewRequirementType, text: string, source: AirlineFact): CabinCrewRequirement => ({ id, airlineId, requirementType, text, source, verifiedAt, status: "VERIFIED" });
export const airlineOfficialBatch6Requirements: CabinCrewRequirement[] = [
  requirement("6-lh-passport", "lufthansa", "passport_work_eligibility", "An unrestricted passport, valid for at least one year at recruitment, is required for worldwide duty.", lhApplication),
  requirement("6-lh-appearance", "lufthansa", "grooming_presentation", "Visible tattoos, piercings and dental jewellery are assessed under the official appearance rules.", lhApplication),
  requirement("6-lh-medical", "lufthansa", "medical_fitness", "Applicants must pass the official flight-fitness and occupational medical examinations.", lhMedical),
  requirement("6-lh-vaccine", "lufthansa", "medical_fitness", "Yellow-fever vaccination is a stated prerequisite for worldwide deployment.", lhMedical),

  requirement("6-ba-age", "british_airways", "minimum_age", "Aged 18 or over at the time of application for the current talent pool.", baVacancy),
  requirement("6-ba-experience", "british_airways", "customer_service_experience", "Twelve months of customer-service experience for the current talent pool.", baVacancy),
  requirement("6-ba-language", "british_airways", "language", "Proficient in spoken and written English.", baVacancy),
  requirement("6-ba-work", "british_airways", "passport_work_eligibility", "Right to work in the UK and a passport allowing unrestricted global travel.", baVacancy),
  requirement("6-ba-reach", "british_airways", "height_or_reach", "Functional reach of at least 2.01 metres under the cabin-crew FAQ.", baFaq),
  requirement("6-ba-appearance", "british_airways", "grooming_presentation", "Tattoos must not be visible while wearing the uniform.", baFaq),

  requirement("6-af-education", "air_france", "education", "At least a baccalaureate qualification or recognised level-4 equivalent.", afCabin),
  requirement("6-af-language", "air_france", "language", "English B2 in speaking, reading and listening, evidenced by a current accepted certificate.", afCabin),
  requirement("6-af-work", "air_france", "passport_work_eligibility", "Nationality of a European Economic Area country for the commercial flight-attendant route.", afCabin),
  requirement("6-af-cca", "air_france", "other", "A valid Cabin Crew Certificate is required for the commercial route; the work-study route is explicitly different.", afCabin),
  requirement("6-af-medical", "air_france", "medical_fitness", "Physical and mental fitness for the profession must be maintained.", afCabin),

  requirement("6-klm-age", "klm", "minimum_age", "At least 21 years old for KLM mainline cabin crew.", klmCabin),
  requirement("6-klm-height", "klm", "height_or_reach", "Between 1.58 and 1.90 metres tall for KLM mainline cabin crew.", klmCabin),
  requirement("6-klm-education", "klm", "education", "Minimum HAVO or MBO level 4 for KLM mainline cabin crew.", klmCabin),
  requirement("6-klm-language", "klm", "language", "Fluent in both Dutch and English.", klmCabin),
  requirement("6-klm-appearance", "klm", "grooming_presentation", "No visible tattoos, piercings or dental decorations.", klmCabin),
  requirement("6-klm-base", "klm", "relocation", "Able to reach Schiphol within one hour during standby duty.", klmCabin),
];

const step = (id: string, airlineId: string, order: number, title: string, description: string, source: AirlineFact): AirlineRecruitmentStep => ({ id, airlineId, order, title, description, source, verifiedAt });
export const airlineOfficialBatch6RecruitmentSteps: AirlineRecruitmentStep[] = [
  step("6-lh-application", "lufthansa", 1, "Application review", "The completed application form and documents are reviewed.", lhApplication),
  step("6-lh-english", "lufthansa", 2, "Online English test", "Eligible applicants receive an online English test.", lhApplication),
  step("6-lh-applicant-day", "lufthansa", 3, "Applicant day", "Applicants attend an applicant day in Frankfurt or Munich, including a German-language interview.", lhApplication),
  step("6-lh-medical", "lufthansa", 4, "Medical examination", "Successful applicants complete flight-fitness and occupational medical examinations.", lhMedical),

  step("6-ba-application", "british_airways", 1, "Application", "Apply through the official careers website.", baHiring),
  step("6-ba-online", "british_airways", 2, "Online assessment", "Complete situational online-assessment questions.", baHiring),
  step("6-ba-centre", "british_airways", 3, "Assessment centre", "Complete group and individual exercises and an interview.", baHiring),
  step("6-ba-offer", "british_airways", 4, "Offer", "Successful applicants receive an offer and contract through the portal.", baHiring),
  step("6-ba-checks", "british_airways", 5, "Pre-employment checks", "Complete security, employment, medical, substance, uniform, height and reach checks.", baHiring),
  step("6-ba-training", "british_airways", 6, "New entrant training", "Attend cabin-crew new-entrant training after successful checks.", baHiring),

  step("6-af-eligibility", "air_france", 1, "Eligibility and application", "Submit the official application and required supporting evidence.", afRecruitment),
  step("6-af-prequalification", "air_france", 2, "Prequalification", "Air France reviews the application against role requirements.", afRecruitment),
  step("6-af-hr", "air_france", 3, "HR interview", "Selected applicants may complete an HR interview under the official company process.", afRecruitment),
  step("6-af-manager", "air_france", 4, "Managerial interview", "Selected applicants may complete a managerial interview; vacancy-specific stages can vary.", afRecruitment),
  step("6-af-onboarding", "air_france", 5, "Decision and onboarding", "The official process concludes with a decision and onboarding for successful applicants.", afRecruitment),

  step("6-klm-basic", "klm", 1, "Basic requirements", "KLM checks the published mainline cabin requirements.", klmSelection),
  step("6-klm-digital", "klm", 2, "Digital tests and video pitch", "Complete ability and competency tests and a video pitch.", klmSelection),
  step("6-klm-game", "klm", 3, "Serious Game", "Complete the published Serious Game stage when applicable.", klmSelection),
  step("6-klm-interview", "klm", 4, "Recruiter interview", "Interview with two recruiters, including an English-speaking assessment.", klmSelection),
  step("6-klm-security", "klm", 5, "Security screening", "Complete the official security-screening stage.", klmSelection),
  step("6-klm-medical", "klm", 6, "Medical examination", "Complete medical, blood and urine examinations.", klmSelection),
];

export const airlineOfficialBatch6Guidance: AirlineRecruitmentGuidance[] = [
  { id: "6-lh-documents", airlineId: "lufthansa", topic: "application", text: "The application page requests a school-leaving certificate and CV.", source: lhApplication, verifiedAt },
  { id: "6-lh-location", airlineId: "lufthansa", topic: "application", text: "Applications are vacancy- and location-specific for Frankfurt or Munich.", source: lhApplication, verifiedAt },
  { id: "6-lh-training", airlineId: "lufthansa", topic: "training", text: "The official Lufthansa page states training takes approximately 12 to 13 weeks.", source: lhTraining, verifiedAt },
  { id: "6-ba-application", airlineId: "british_airways", topic: "application", text: "Current vacancies and the talent pool must be accessed through the official careers site.", source: baVacancy, verifiedAt },
  { id: "6-ba-assessment", airlineId: "british_airways", topic: "assessment", text: "Cabin assessment includes group and individual exercises and an interview.", source: baHiring, verifiedAt },
  { id: "6-ba-training", airlineId: "british_airways", topic: "training", text: "A wet-drill course may be required before new-entrant training as described in the FAQ.", source: baFaq, verifiedAt },
  { id: "6-af-documents", airlineId: "air_france", topic: "application", text: "Applicants should prepare the education, English, passport and CCA evidence applicable to their route.", source: afCabin, verifiedAt },
  { id: "6-af-route", airlineId: "air_france", topic: "application", text: "Commercial and work-study cabin routes have different CCA and swimming requirements and must not be conflated.", source: afCabin, verifiedAt },
  { id: "6-af-stages", airlineId: "air_france", topic: "assessment", text: "The corporate recruitment stages are guidance; the live cabin vacancy controls the actual sequence.", source: afRecruitment, verifiedAt },
  { id: "6-klm-openings", airlineId: "klm", topic: "application", text: "KLM accepts cabin applications only when an official vacancy is open.", source: klmFaq, verifiedAt },
  { id: "6-klm-diploma", airlineId: "klm", topic: "application", text: "A foreign diploma should be accredited before the first selection round.", source: klmFaq, verifiedAt },
  { id: "6-klm-training", airlineId: "klm", topic: "training", text: "Basic training includes 40 hours of digital preparation and 20 full-time days at Schiphol-East.", source: klmSelection, verifiedAt },
];

const fleet = (id: string, airlineId: string, manufacturer: string, aircraftFamily: string, aircraftModel: string, bodyType: NonNullable<AirlineFleetEntry["bodyType"]>, source: AirlineFact): AirlineFleetEntry => ({ id, airlineId, manufacturer, aircraftFamily, aircraftModel, bodyType, role: "MIXED", quantity: null, source, lastVerifiedAt: verifiedAt });
export const airlineOfficialBatch6Fleet: AirlineFleetEntry[] = [
  fleet("6-lh-a380", "lufthansa", "Airbus", "A380", "A380-800", "WIDEBODY", lhFleet), fleet("6-lh-a350", "lufthansa", "Airbus", "A350", "A350-900", "WIDEBODY", lhFleet), fleet("6-lh-a340-600", "lufthansa", "Airbus", "A340", "A340-600", "WIDEBODY", lhFleet), fleet("6-lh-a340-300", "lufthansa", "Airbus", "A340", "A340-300", "WIDEBODY", lhFleet), fleet("6-lh-a330", "lufthansa", "Airbus", "A330", "A330-300", "WIDEBODY", lhFleet), fleet("6-lh-b747-8", "lufthansa", "Boeing", "747", "747-8", "WIDEBODY", lhFleet), fleet("6-lh-b747-400", "lufthansa", "Boeing", "747", "747-400", "WIDEBODY", lhFleet), fleet("6-lh-b787", "lufthansa", "Boeing", "787", "787 Dreamliner", "WIDEBODY", lhFleet), fleet("6-lh-a321", "lufthansa", "Airbus", "A321", "A321-100/200", "NARROWBODY", lhFleet), fleet("6-lh-a321neo", "lufthansa", "Airbus", "A321", "A321neo", "NARROWBODY", lhFleet), fleet("6-lh-a320", "lufthansa", "Airbus", "A320", "A320-200", "NARROWBODY", lhFleet), fleet("6-lh-a320neo", "lufthansa", "Airbus", "A320", "A320neo", "NARROWBODY", lhFleet), fleet("6-lh-a319", "lufthansa", "Airbus", "A319", "A319-100", "NARROWBODY", lhFleet),
  fleet("6-ba-a319", "british_airways", "Airbus", "A319", "A319-100", "NARROWBODY", baFleet), fleet("6-ba-a320", "british_airways", "Airbus", "A320", "A320-200", "NARROWBODY", baFleet), fleet("6-ba-a320neo", "british_airways", "Airbus", "A320", "A320neo", "NARROWBODY", baFleet), fleet("6-ba-a321", "british_airways", "Airbus", "A321", "A321-200", "NARROWBODY", baFleet), fleet("6-ba-a321neo", "british_airways", "Airbus", "A321", "A321neo", "NARROWBODY", baFleet), fleet("6-ba-a350", "british_airways", "Airbus", "A350", "A350-1000", "WIDEBODY", baFleet), fleet("6-ba-a380", "british_airways", "Airbus", "A380", "A380-800", "WIDEBODY", baFleet), fleet("6-ba-b777-200", "british_airways", "Boeing", "777", "777-200", "WIDEBODY", baFleet), fleet("6-ba-b777-300", "british_airways", "Boeing", "777", "777-300", "WIDEBODY", baFleet), fleet("6-ba-b787-8", "british_airways", "Boeing", "787", "787-8", "WIDEBODY", baFleet), fleet("6-ba-b787-9", "british_airways", "Boeing", "787", "787-9", "WIDEBODY", baFleet), fleet("6-ba-b787-10", "british_airways", "Boeing", "787", "787-10", "WIDEBODY", baFleet),
  fleet("6-af-a220", "air_france", "Airbus", "A220", "A220", "NARROWBODY", afFleet), fleet("6-af-a320-family", "air_france", "Airbus", "A320", "A320 family", "NARROWBODY", afFleet), fleet("6-af-a330", "air_france", "Airbus", "A330", "A330 family", "WIDEBODY", afFleet), fleet("6-af-a350", "air_france", "Airbus", "A350", "A350 family", "WIDEBODY", afFleet), fleet("6-af-b777", "air_france", "Boeing", "777", "777 family", "WIDEBODY", afFleet), fleet("6-af-b787", "air_france", "Boeing", "787", "787 family", "WIDEBODY", afFleet),
  fleet("6-klm-a330-200", "klm", "Airbus", "A330", "A330-200", "WIDEBODY", klmFleet), fleet("6-klm-a330-300", "klm", "Airbus", "A330", "A330-300", "WIDEBODY", klmFleet), fleet("6-klm-a321neo", "klm", "Airbus", "A321", "A321neo", "NARROWBODY", klmFleet), fleet("6-klm-b737-700", "klm", "Boeing", "737", "737-700", "NARROWBODY", klmFleet), fleet("6-klm-b737-800", "klm", "Boeing", "737", "737-800", "NARROWBODY", klmFleet), fleet("6-klm-b737-900", "klm", "Boeing", "737", "737-900", "NARROWBODY", klmFleet), fleet("6-klm-b777-200", "klm", "Boeing", "777", "777-200ER", "WIDEBODY", klmFleet), fleet("6-klm-b777-300", "klm", "Boeing", "777", "777-300ER", "WIDEBODY", klmFleet), fleet("6-klm-b787-9", "klm", "Boeing", "787", "787-9", "WIDEBODY", klmFleet), fleet("6-klm-b787-10", "klm", "Boeing", "787", "787-10", "WIDEBODY", klmFleet),
];

const route = (id: string, airlineId: string, originAirport: string, destinationAirport: string, originCountry: string, destinationCountry: string, source: AirlineFact): AirlineRoute => ({ id, airlineId, originAirport, destinationAirport, originCountry, destinationCountry, routeScope: "INTERNATIONAL", status: "CONFIRMED", source, lastVerifiedAt: verifiedAt });
export const airlineOfficialBatch6Routes: AirlineRoute[] = [
  route("6-lh-icn-fra", "lufthansa", "ICN", "FRA", "KR", "DE", lhKorea),
  route("6-lh-icn-muc", "lufthansa", "ICN", "MUC", "KR", "DE", lhKorea),
  route("6-af-icn-cdg", "air_france", "ICN", "CDG", "KR", "FR", afKorea),
  route("6-klm-icn-ams", "klm", "ICN", "AMS", "KR", "NL", klmKorea),
];

// No cabin-specific question wording was directly verified on the current official pages.
export const airlineOfficialBatch6ApplicationQuestions = [] as const;
export const airlineOfficialBatch6InterviewQuestions = [] as const;

export const airlineOfficialBatch6Stats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch6Profiles.length,
  sources: airlineOfficialBatch6Profiles.reduce((count, profile) => count + profile.sources.length, 0),
  routes: airlineOfficialBatch6Routes.length,
  fleet: airlineOfficialBatch6Fleet.length,
  requirements: airlineOfficialBatch6Requirements.length,
  recruitmentSteps: airlineOfficialBatch6RecruitmentSteps.length,
  guidance: airlineOfficialBatch6Guidance.length,
  officialApplicationQuestions: airlineOfficialBatch6ApplicationQuestions.length,
  officialInterviewQuestions: airlineOfficialBatch6InterviewQuestions.length,
} as const;
