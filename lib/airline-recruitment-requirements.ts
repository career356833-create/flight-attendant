import type { SourceGrade } from "./airline-knowledge-repository";
import { isAirlineKnowledgeEligibleForAiContext } from "./airline-ai-context-gate";

export type RecruitmentRequirementCategory =
  | "age"
  | "education"
  | "language"
  | "height"
  | "reach"
  | "experience"
  | "tattoo"
  | "health"
  | "relocation"
  | "documents"
  | "other";
export type RequirementVerificationStatus =
  "verified" | "needs_review" | "unverified";
export type CandidateVisibility = "visible" | "review" | "hidden";
export type RecruitmentRequirementScope =
  | "airline_global"
  | "france_mainland"
  | "jfk_base"
  | "papeete_base"
  | "unknown_base"
  | "ba_mainline_global"
  | "heathrow_mainline"
  | "gatwick_unverified"
  | "ba_euroflyer"
  | "ba_cityflyer"
  | "delta_mainline_global"
  | "general_flight_attendant"
  | "language_of_destination"
  | "base_specific"
  | "unknown_scope"
  | "united_mainline_global"
  | "language_qualified";
export type AirlineRecruitmentRequirement = {
  id: string;
  airlineId: string;
  category: RecruitmentRequirementCategory;
  requirement: string;
  description?: string;
  sourceReference: string[];
  sourceGrade: SourceGrade;
  confidence: "high" | "medium" | "low";
  verificationStatus: RequirementVerificationStatus;
  candidateVisibility: CandidateVisibility;
  aiContextEnabled: boolean;
  publishStatus?: "unpublished" | "published";
  scope: RecruitmentRequirementScope;
};
const emiratesCareers =
    "https://www.emiratesgroupcareers.com/search-and-apply/267",
  qatarCareers =
    "https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html",
  etihadCareers = "https://www.etihad.com/en-gb/about-us/careers",
  etihadPortal = "https://careers.etihad.com/",
  singaporeCareers = "https://www.singaporeair.com/ko_KR/kr/careers/",
  singaporeAirPortal = "https://www.airportal.go.kr:450/airworks/board.es?mid=a10200000000&bid=0016&act=view&list_no=3411&nPage=1&retUrl=blist",
  cathayCareers = "https://careers.cathaypacific.com/en/careers/our-teams/flight-attendant",
  cathayFaq = "https://jobsatcathaypacific.com/cabincrew/m/faqs/",
  cathayOverseas = "https://jobsatcathaypacific.com/cabincrew/m/overseas-applicants/",
  cathayTraining = "https://jobsatcathaypacific.com/cabincrew/m/training/";
  
const official = (
  id: string,
  airlineId: string,
  category: RecruitmentRequirementCategory,
  requirement: string,
  sourceReference: string[],
  scope: RecruitmentRequirementScope = "airline_global",
): AirlineRecruitmentRequirement => ({
  id,
  airlineId,
  category,
  requirement,
  sourceReference,
  sourceGrade: "A",
  confidence: "high",
  verificationStatus: "verified",
  candidateVisibility: "visible",
  aiContextEnabled: true,
  scope,
});
const review = (
  id: string,
  airlineId: string,
  category: RecruitmentRequirementCategory,
  requirement: string,
  sourceReference: string[],
  sourceGrade: SourceGrade = "E",
  scope: RecruitmentRequirementScope = "airline_global",
): AirlineRecruitmentRequirement => ({
  id,
  airlineId,
  category,
  requirement,
  sourceReference,
  sourceGrade,
  confidence: "low",
  verificationStatus: "needs_review",
  candidateVisibility: "review",
  aiContextEnabled: false,
  scope,
});
const anaCabin = "https://www.ana.co.jp/group/recruit/ana-recruit/career/ca/employment/",
  anaRunway = "https://ana-careerrecruit.snar.jp/jobboard/detail.aspx?id=K6bCBM0R7sk",
  anaRecruit = "https://www.ana.co.jp/group/recruit/ana-recruit/";
const jalCareers = "https://www.jal.co.jp/kr/ko/career/",
  jalPdf = "https://www.jal.com/ja/jasnews/030529-jal.pdf";
const koreanAirCareers = "https://koreanair.recruiter.co.kr/career/home",
  koreanAirCabin = "https://koreanair.recruiter.co.kr/career/jobs/117348",
  koreanAirNews = "https://news.koreanair.com/%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-2026%EB%85%84-%EA%B3%B5%EA%B0%9C-%EC%B1%84%EC%9A%A9-%EC%8B%9C%EC%9E%91-%ED%86%B5%ED%95%A9-%ED%95%AD%EA%B3%B5%EC%82%AC-%EB%8C%80%EB%B9%84-%EC%9A%B0%EC%88%98/",
  koreanAirSummary = "https://linkareer.com/activity/325402";
const asianaCareers = "https://flyasiana.recruiter.co.kr",
  asianaSummary2025 = "https://linkareer.com/activity/237868",
  asianaSummary2026 = "https://www.invione.com/jobs/recruitment/open/detail/140768";
const evaThai = "https://www.evaair.com/en-th/about-eva-air/careers/job-openings/cabin-crew/",
  evaVietnam = "https://www.evaair.com/vi-vn/about-eva-air/careers/job-openings/cabin-crew/";
const chinaAirlinesCareers = "https://www.china-airlines.com/us/en/career";
const lufthansaCareers = "https://www.lufthansagroup.careers/en/";
const turkishAssessment = "https://www.turkishairlines.com/en-int/corporate/careers/assessment-process/cabin-crew/", turkishFaq = "https://www.turkishairlines.com/en-int/corporate/careers/faq/cabin-crew/", turkishCareers = "https://kariyer.thy.com/";
const airFranceCareers = "https://recrutement.airfrance.com/", airFrancePapeete = "https://recrutement.airfrance.com/job/pnc-ppt-cca", airFranceCorporate = "https://corporate.airfrance.com/en/cabin-crew-member", airFranceJfkThirdParty = "https://justpostedjobs.com/jobs/cabin-crew-air-france-jfk/";
const baCabinCrew = "https://careers.ba.com/jobs/cabin-crew", baTalentPool = "https://careers.ba.com/jobs/cabin-crew-talent-pool", baFaqs = "https://careers.ba.com/cabin-crew-faqs", baThirdParty = "https://www.turningleftforless.com/british-airways-cabin-crew-requirements/";
const deltaCareers = "https://careers.delta.com/", deltaOfficial = "https://www.delta.com/", deltaThirdParty = "https://www.jobtestprep.com/delta-flight-attendant-assessment";
const unitedCareers = "https://careers.united.com/", unitedOfficial = "https://www.united.com/", unitedThirdParty = "https://www.jobtestprep.com/united-airlines-flight-attendant-assessment";
export const airlineRecruitmentRequirements: AirlineRecruitmentRequirement[] = [
  official(
    "emirates-education",
    "emirates",
    "education",
    "High school graduate (Grade 12).",
    [emiratesCareers],
  ),
  official(
    "emirates-language",
    "emirates",
    "language",
    "Written and spoken English fluent.",
    [emiratesCareers],
  ),
  official(
    "emirates-experience",
    "emirates",
    "experience",
    "At least one year of hospitality or customer service experience.",
    [emiratesCareers],
  ),
  official(
    "emirates-reach",
    "emirates",
    "reach",
    "Minimum 160 cm and able to reach 212 cm on tiptoes.",
    [emiratesCareers],
  ),
  official(
    "emirates-tattoo",
    "emirates",
    "tattoo",
    "Visible tattoos while in uniform are not permitted.",
    [emiratesCareers],
  ),
  official("qatar-age", "qatar_airways", "age", "Minimum age 21.", [
    qatarCareers,
  ]),
  official(
    "qatar-reach",
    "qatar_airways",
    "reach",
    "Minimum arm reach 212 cm.",
    [qatarCareers],
  ),
  official(
    "qatar-education",
    "qatar_airways",
    "education",
    "High School Certificate.",
    [qatarCareers],
  ),
  official(
    "qatar-language",
    "qatar_airways",
    "language",
    "Fluent English, written and spoken.",
    [qatarCareers],
  ),
  official(
    "qatar-health",
    "qatar_airways",
    "health",
    "Excellent health and fitness.",
    [qatarCareers],
  ),
  official(
    "qatar-relocation",
    "qatar_airways",
    "relocation",
    "Ability to relocate to Doha.",
    [qatarCareers],
  ),
  official(
    "etihad-careers",
    "etihad_airways",
    "other",
    "Official Etihad Careers and recruitment portal.",
    [etihadCareers, etihadPortal],
  ),
  official(
    "etihad-health",
    "etihad_airways",
    "health",
    "UAE/GCAA medical and health screening requirements apply.",
    [etihadCareers],
  ),
  review(
    "etihad-age",
    "etihad_airways",
    "age",
    "Minimum age requires official vacancy confirmation.",
    [etihadCareers],
    "D",
  ),
  review(
    "etihad-education",
    "etihad_airways",
    "education",
    "Education requirement requires official vacancy confirmation.",
    [etihadCareers],
    "D",
  ),
  review(
    "etihad-language",
    "etihad_airways",
    "language",
    "Language requirement requires official vacancy confirmation.",
    [etihadCareers],
    "D",
  ),
  review(
    "etihad-reach",
    "etihad_airways",
    "reach",
    "Reach requirement requires official vacancy confirmation.",
    [etihadCareers],
    "D",
  ),
  review(
    "etihad-tattoo",
    "etihad_airways",
    "tattoo",
    "Tattoo policy requires official confirmation.",
    [etihadCareers],
    "D",
  ),
  review(
    "etihad-assessment",
    "etihad_airways",
    "other",
    "Assessment stages require official confirmation.",
    [etihadCareers],
  ),
  review(
    "etihad-interview",
    "etihad_airways",
    "other",
    "Interview stages require official confirmation.",
    [etihadCareers],
  ),
  review(
    "etihad-training",
    "etihad_airways",
    "other",
    "Training details require official confirmation.",
    [etihadCareers],
  ),
  review(
    "etihad-regional",
    "etihad_airways",
    "relocation",
    "Current regional eligibility requires confirmation per vacancy.",
    [etihadPortal],
  ),
  review("singapore-language", "singapore_airlines", "language", "Fluent English with good communication skills.", [singaporeAirPortal], "C"),
  review("singapore-education", "singapore_airlines", "education", "Recognised university / Bachelor's Degree.", [singaporeAirPortal], "C"),
  review("singapore-relocation", "singapore_airlines", "relocation", "Relocate to Singapore.", [singaporeAirPortal], "C"),
  review("singapore-height", "singapore_airlines", "height", "At least 1.58m for females and 1.65m for males.", [singaporeAirPortal], "C"),
  review("singapore-grooming", "singapore_airlines", "other", "Grooming policy requires official confirmation.", [singaporeCareers]),
  review("singapore-medical", "singapore_airlines", "health", "Medical requirements require official confirmation.", [singaporeCareers]),
  review("singapore-training", "singapore_airlines", "other", "Training details require official confirmation.", [singaporeCareers]),
  review("singapore-headquarters", "singapore_airlines", "other", "Official headquarters wording requires confirmation from the supplied material.", [singaporeCareers]),
  review("singapore-hub", "singapore_airlines", "other", "Official hub wording requires confirmation from the supplied material.", [singaporeCareers]),
  review("singapore-establishment", "singapore_airlines", "other", "Establishment information requires confirmation.", [singaporeCareers]),
  review("cathay-language", "cathay_pacific", "language", "Fluent English and one Asian language.", [cathayFaq], "A"),
  review("cathay-reach", "cathay_pacific", "reach", "Minimum arm reach 208cm.", [cathayFaq], "A"),
  review("cathay-health", "cathay_pacific", "health", "Medical fitness to pass pre-employment assessment.", [cathayOverseas], "A"),
  review("cathay-experience", "cathay_pacific", "experience", "Service industry experience is preferred.", [cathayOverseas], "A"),
  review("cathay-customer-mindset", "cathay_pacific", "other", "Customer-oriented mindset.", [cathayOverseas], "A"),
  review("cathay-grooming", "cathay_pacific", "other", "Grooming policy requires official confirmation.", [cathayFaq]),
  review("cathay-tattoo", "cathay_pacific", "tattoo", "Tattoo policy requires official confirmation.", [cathayFaq]),
  review("cathay-hair-makeup", "cathay_pacific", "other", "Hair and makeup policy requires official confirmation.", [cathayFaq]),
  review("cathay-headquarters", "cathay_pacific", "other", "Official headquarters wording requires confirmation.", [cathayCareers]),
  review("cathay-hub", "cathay_pacific", "other", "Official hub wording requires confirmation.", [cathayCareers]),
  review("cathay-establishment", "cathay_pacific", "other", "Establishment information requires confirmation.", [cathayCareers]),
  review("cathay-base-conditions", "cathay_pacific", "relocation", "Base-specific conditions require vacancy confirmation.", [cathayOverseas], "B"),
  review("ana-education", "ana", "education", "Listed vocational school, junior college, college of technology, university or graduate school qualification.", [anaRunway], "A"),
  review("ana-language", "ana", "language", "English ability required; TOEIC 600-level ability desirable.", [anaCabin, anaRunway], "A"),
  review("ana-toeic", "ana", "language", "TOEIC 600-level ability is described as desirable.", [anaCabin, anaRunway], "A"),
  review("ana-vision", "ana", "other", "Corrected vision 1.0 or above in both eyes.", [anaRunway], "A"),
  review("ana-health", "ana", "health", "Physical suitability requirements are listed in the recruitment material.", [anaRunway], "A"),
  review("ana-passport", "ana", "documents", "Passport acquisition eligibility is indicated.", [anaCabin], "A"),
  review("ana-age", "ana", "age", "Minimum age requires vacancy confirmation.", [anaCabin]),
  review("ana-japanese", "ana", "language", "Japanese requirement requires confirmation.", [anaCabin]),
  review("ana-grooming", "ana", "other", "Grooming policy requires confirmation.", [anaCabin]),
  review("ana-medical-detail", "ana", "health", "Detailed medical criteria require confirmation.", [anaRunway]),
  review("ana-overseas", "ana", "relocation", "Domestic/overseas recruitment differences require vacancy confirmation.", [anaCabin]),
  review("jal-english", "japan_airlines", "language", "English ability is indicated; current requirement requires confirmation.", [jalPdf], "B"),
  review("jal-toeic", "japan_airlines", "language", "Older material references TOEIC around 600; do not treat as current without confirmation.", [jalPdf], "B"),
  review("jal-health", "japan_airlines", "health", "Health suitability requirement.", [jalPdf], "A"),
  review("jal-vision", "japan_airlines", "other", "Corrected vision 1.0 or above is listed in older material.", [jalPdf], "A"),
  review("jal-relocation", "japan_airlines", "relocation", "Relocation/commute readiness requires vacancy confirmation.", [jalPdf], "B"),
  review("jal-age", "japan_airlines", "age", "Minimum age requires latest vacancy confirmation.", [jalCareers]),
  review("jal-japanese", "japan_airlines", "language", "Japanese requirement requires confirmation.", [jalCareers]),
  review("jal-education", "japan_airlines", "education", "Latest education requirement requires confirmation.", [jalCareers]),
  review("jal-grooming", "japan_airlines", "other", "Grooming policy requires confirmation.", [jalCareers]),
  review("jal-physical", "japan_airlines", "health", "Latest physical criteria require confirmation.", [jalCareers]),
  review("jal-overseas", "japan_airlines", "relocation", "Overseas applicant differences require vacancy confirmation.", [jalCareers]),
  review("korean-air-graduation", "korean_air", "education", "Graduation requirement from supplied recruitment summary; confirm the current official posting.", [koreanAirSummary], "B"),
  review("korean-air-language", "korean_air", "language", "Language qualification requirement from supplied official-news context.", [koreanAirNews], "B"),
  review("korean-air-toeic", "korean_air", "language", "TOEIC 550 / TOEIC Speaking IM / OPIc IM from supplied recruitment summary; confirm the current official posting.", [koreanAirSummary], "B"),
  review("korean-air-vision", "korean_air", "other", "Corrected vision 1.0 or above from supplied recruitment summary; confirm the current official posting.", [koreanAirSummary], "B"),
  review("korean-air-health", "korean_air", "health", "Health examination is listed in supplied official-news process information.", [koreanAirNews], "B"),
  review("korean-air-travel", "korean_air", "other", "No overseas-travel disqualification from supplied recruitment summary; confirm the current official posting.", [koreanAirSummary], "B"),
  review("korean-air-age", "korean_air", "age", "Minimum age requires confirmation.", [koreanAirCabin]),
  review("korean-air-major", "korean_air", "education", "Major requirement requires confirmation.", [koreanAirCabin]),
  review("korean-air-second-language", "korean_air", "language", "Second-language preference requires confirmation.", [koreanAirCabin]),
  review("korean-air-physical", "korean_air", "health", "Detailed physical criteria require confirmation.", [koreanAirCabin]),
  review("korean-air-grooming", "korean_air", "other", "Grooming policy requires confirmation.", [koreanAirCabin]),
  review("korean-air-ai-assessment", "korean_air", "other", "AI assessment availability requires confirmation.", [koreanAirCabin]),
  review("asiana-graduation", "asiana_airlines", "education", "Graduation requirement from supplied recruitment summary; confirm the current official posting.", [asianaSummary2025], "B"),
  review("asiana-education", "asiana_airlines", "education", "Education requirement from supplied recruitment summaries; confirm the current official posting.", [asianaSummary2025, asianaSummary2026], "B"),
  review("asiana-language", "asiana_airlines", "language", "English qualification from supplied recruitment summaries; confirm the current official posting.", [asianaSummary2026], "B"),
  review("asiana-toeic", "asiana_airlines", "language", "TOEIC 550 / TOEIC Speaking IM1 / OPIc IM from supplied recruitment summaries; confirm the current official posting.", [asianaSummary2025, asianaSummary2026], "B"),
  review("asiana-vision", "asiana_airlines", "other", "Corrected vision 1.0 or above from supplied recruitment summaries; confirm the current official posting.", [asianaSummary2026], "B"),
  review("asiana-health", "asiana_airlines", "health", "Health examination and swimming test from supplied recruitment summaries; confirm the current official posting.", [asianaSummary2026], "B"),
  review("asiana-travel", "asiana_airlines", "other", "No overseas-travel disqualification from supplied recruitment summaries; confirm the current official posting.", [asianaSummary2025], "B"),
  review("asiana-age", "asiana_airlines", "age", "Minimum age requires confirmation.", [asianaCareers]),
  review("asiana-major", "asiana_airlines", "education", "Major requirement requires confirmation.", [asianaCareers]),
  review("asiana-second-language", "asiana_airlines", "language", "Second-language preference requires confirmation.", [asianaCareers]),
  review("asiana-medical-detail", "asiana_airlines", "health", "Detailed medical criteria require confirmation.", [asianaCareers]),
  review("asiana-grooming", "asiana_airlines", "other", "Grooming policy requires confirmation.", [asianaCareers]),
  review("asiana-integration", "asiana_airlines", "other", "Post-merger changes require confirmation.", [asianaCareers]),
  review("eva-education", "eva_air", "education", "University graduate requirement from Thai regional posting; confirm your regional posting.", [evaThai], "A"),
  review("eva-english", "eva_air", "language", "English/Thai proficiency and English-score thresholds from Thai regional posting.", [evaThai], "A"),
  review("eva-scores", "eva_air", "language", "TOEIC 650+, IELTS 5.0+, TOEFL ITP 495+, Linguaskill 155+ from Thai regional posting.", [evaThai], "A"),
  review("eva-chinese-preference", "eva_air", "language", "Chinese or Taiwanese ability is preferred in Thai regional posting; mandatory status requires confirmation.", [evaThai], "A"),
  review("eva-height-reach", "eva_air", "reach", "Height and 208cm arm-reach conditions from Thai regional posting.", [evaThai], "A"),
  review("eva-vision-medical", "eva_air", "health", "Vision, medical fitness, MMR and criminal-background check from Thai regional posting.", [evaThai], "A"),
  review("eva-chinese-mandatory", "eva_air", "language", "Chinese mandatory status requires confirmation.", [evaThai]),
  review("eva-country-difference", "eva_air", "other", "Country-specific applicant differences require confirmation.", [evaThai, evaVietnam]),
  review("eva-grooming", "eva_air", "other", "Grooming policy requires region-specific confirmation.", [evaThai]),
  review("eva-tattoo", "eva_air", "tattoo", "Tattoo policy requires region-specific confirmation.", [evaThai]),
  review("eva-country-physical", "eva_air", "height", "Physical criteria require confirmation for each regional posting.", [evaThai, evaVietnam]),
  review("china-careers-page", "china_airlines", "other", "Official recruitment page candidate; review before displaying as a current requirement.", [chinaAirlinesCareers]),
  review("china-education-development", "china_airlines", "education", "Education and development information requires review.", [chinaAirlinesCareers]),
  review("china-service-quality", "china_airlines", "other", "Service quality candidate from the supplied pack.", [chinaAirlinesCareers]),
  review("china-safety-training", "china_airlines", "health", "Safety training candidate from the supplied pack.", [chinaAirlinesCareers]),
  review("china-age", "china_airlines", "age", "Minimum age requires confirmation.", [chinaAirlinesCareers]),
  review("china-education", "china_airlines", "education", "Education and major requirements require confirmation.", [chinaAirlinesCareers]),
  review("china-english", "china_airlines", "language", "English and second-language requirements require confirmation.", [chinaAirlinesCareers]),
  review("china-chinese", "china_airlines", "language", "Chinese must not be inferred as mandatory.", [chinaAirlinesCareers]),
  review("china-physical", "china_airlines", "height", "Physical and medical conditions require confirmation.", [chinaAirlinesCareers]),
  review("china-grooming", "china_airlines", "other", "Grooming policy requires confirmation.", [chinaAirlinesCareers]),
  review("china-base", "china_airlines", "relocation", "Country-specific base conditions require confirmation.", [chinaAirlinesCareers]),
  review("lufthansa-online-application", "lufthansa", "other", "Online application candidate; review before treating as a current requirement.", [lufthansaCareers]),
  review("lufthansa-screening", "lufthansa", "other", "First screening candidate; details require confirmation.", [lufthansaCareers]),
  review("lufthansa-applicant-day", "lufthansa", "other", "Applicant day candidate; details require confirmation.", [lufthansaCareers]),
  review("lufthansa-career-portal", "lufthansa", "other", "Career portal candidate; review current posting.", [lufthansaCareers]),
  review("lufthansa-work-permit", "lufthansa", "relocation", "EU citizenship or work-permit conditions require confirmation.", [lufthansaCareers]),
  review("lufthansa-german", "lufthansa", "language", "German requirement requires confirmation.", [lufthansaCareers]),
  review("lufthansa-english", "lufthansa", "language", "English requirement requires confirmation.", [lufthansaCareers]),
  review("lufthansa-education", "lufthansa", "education", "Education requirement requires confirmation.", [lufthansaCareers]),
  review("lufthansa-age", "lufthansa", "age", "Minimum age requires confirmation.", [lufthansaCareers]),
  review("lufthansa-physical", "lufthansa", "height", "Physical criteria require confirmation.", [lufthansaCareers]),
  review("lufthansa-grooming", "lufthansa", "other", "Grooming policy requires confirmation.", [lufthansaCareers]),
  review("lufthansa-base", "lufthansa", "relocation", "Base-specific requirements require confirmation.", [lufthansaCareers]),
  review("turkish-career-portal", "turkish_airlines", "other", "Official Career Portal candidate.", [turkishCareers], "A"),
  review("turkish-online-english", "turkish_airlines", "language", "Online English Test and English video assessment are listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-face-to-face-english", "turkish_airlines", "language", "Face-to-face English proficiency assessment is listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-document-check", "turkish_airlines", "documents", "Online Document Check is listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-inventory", "turkish_airlines", "other", "Online Inventory Assessment is listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-physical", "turkish_airlines", "height", "Height/weight measurement and Physical Suitability Check are listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-visible-skin", "turkish_airlines", "tattoo", "Visible tattoo, scar and skin-condition review is listed in the supplied official process; no additional numeric inference.", [turkishAssessment], "A"),
  review("turkish-medical", "turkish_airlines", "health", "Preliminary Medical Check and Medical Check (Airworthiness) are listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-hr", "turkish_airlines", "other", "HR Assessment is listed in the supplied official process.", [turkishAssessment], "A"),
  review("turkish-training", "turkish_airlines", "other", "Approximately two-month Cabin Crew Training is listed in the supplied official material.", [turkishFaq], "A"),
  review("turkish-age", "turkish_airlines", "age", "Minimum age requires confirmation.", [turkishFaq]),
  review("turkish-education", "turkish_airlines", "education", "Education and major requirements require confirmation.", [turkishFaq]),
  review("turkish-language", "turkish_airlines", "language", "Turkish and second-language requirements require confirmation.", [turkishFaq]),
  review("turkish-nationality", "turkish_airlines", "relocation", "Nationality, work permit and residency conditions require confirmation.", [turkishFaq]),
  review("turkish-numeric-physical", "turkish_airlines", "height", "Exact height and weight thresholds require confirmation.", [turkishAssessment]),
  review("turkish-base", "turkish_airlines", "relocation", "Country and base-specific conditions require confirmation.", [turkishFaq]),
  review("af-online-application", "air_france", "other", "Official online application candidate.", [airFranceCareers], "A"),
  review("af-document-screening", "air_france", "documents", "Document screening candidate.", [airFranceCareers], "A"),
  review("af-interview", "air_france", "other", "Interview or video-interview candidate.", [airFranceCareers], "A"),
  review("af-english-assessment", "air_france", "language", "English assessment candidate.", [airFranceCorporate], "A"),
  review("af-medical", "air_france", "health", "Medical-fitness candidate.", [airFranceCorporate], "A"),
  review("af-background", "air_france", "other", "Background-check candidate.", [airFranceCareers], "A"),
  review("af-training", "air_france", "other", "Training candidate.", [airFranceCorporate], "A"),
  review("af-papeete-baccalaureat", "air_france", "education", "Papeete-base only: Baccalaureat candidate.", [airFrancePapeete], "A", "papeete_base"),
  review("af-papeete-cca", "air_france", "other", "Papeete-base only: European CCA candidate.", [airFrancePapeete], "A", "papeete_base"),
  review("af-papeete-english", "air_france", "language", "Papeete-base only: English B2 and designated test; TOEIC not accepted.", [airFrancePapeete], "A", "papeete_base"),
  review("af-papeete-work-right", "air_france", "relocation", "Papeete-base only: Polynesian-residency and visa candidates.", [airFrancePapeete], "A", "papeete_base"),
  review("af-papeete-medical", "air_france", "health", "Papeete-base only: medical aptitude and criminal-record-document candidates.", [airFrancePapeete], "A", "papeete_base"),
  review("af-jfk-age", "air_france", "age", "JFK-base third-party candidate: minimum age 21.", [airFranceJfkThirdParty], "D", "jfk_base"),
  review("af-jfk-work-right", "air_france", "relocation", "JFK-base third-party candidate: US work right.", [airFranceJfkThirdParty], "D", "jfk_base"),
  review("af-jfk-language", "air_france", "language", "JFK-base third-party candidate: English fluent and French preferred.", [airFranceJfkThirdParty], "D", "jfk_base"),
  review("af-jfk-tattoo", "air_france", "tattoo", "JFK-base third-party candidate: no visible tattoos.", [airFranceJfkThirdParty], "D", "jfk_base"),
  review("af-jfk-background-training", "air_france", "other", "JFK-base third-party candidate: background check and Paris training.", [airFranceJfkThirdParty], "D", "jfk_base"),
  review("af-mainland-age", "air_france", "age", "France-mainland minimum age requires confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("af-mainland-education", "air_france", "education", "France-mainland education requirements require confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("af-mainland-language", "air_france", "language", "France-mainland French and English requirements require confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("af-mainland-cca", "air_france", "other", "CCA common requirement requires confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("af-mainland-work-right", "air_france", "relocation", "EU or French work authorization requires confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("af-mainland-physical", "air_france", "height", "Group exercise, physical, swimming, tattoo and grooming criteria require confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("af-mainland-base", "air_france", "relocation", "CDG, ORY and other base conditions require confirmation.", [airFranceCareers], "E", "france_mainland"),
  review("ba-age", "british_airways", "age", "Heathrow-mainline only: age 18+ at application.", [baTalentPool], "A", "heathrow_mainline"),
  review("ba-english", "british_airways", "language", "Heathrow-mainline only: fluent spoken and written English.", [baTalentPool], "A", "heathrow_mainline"),
  review("ba-service-experience", "british_airways", "experience", "Heathrow-mainline only: at least 12 months customer-service experience.", [baTalentPool], "A", "heathrow_mainline"),
  review("ba-work-right", "british_airways", "relocation", "Heathrow-mainline only: right to live and work in the UK; no sponsorship.", [baTalentPool], "A", "heathrow_mainline"),
  review("ba-passport", "british_airways", "documents", "Heathrow-mainline only: valid passport, unrestricted worldwide travel, required visas and airside pass.", [baTalentPool], "A", "heathrow_mainline"),
  review("ba-background", "british_airways", "other", "Heathrow-mainline only: satisfactory background checks and airside-security-pass eligibility.", [baTalentPool], "A", "heathrow_mainline"),
  review("ba-safety-grooming", "british_airways", "other", "Heathrow-mainline only: safety/security duties and high grooming standards.", [baTalentPool, baFaqs], "A", "heathrow_mainline"),
  review("ba-visible-tattoo", "british_airways", "tattoo", "Heathrow-mainline official FAQ candidate: visible tattoos while in BA uniform.", [baFaqs], "A", "heathrow_mainline"),
  review("ba-application", "british_airways", "other", "Online application and eligibility-screening candidates.", [baCabinCrew, baFaqs], "A", "heathrow_mainline"),
  review("ba-online-assessment", "british_airways", "other", "Online assessment candidate; exact format requires confirmation.", [baFaqs], "A", "heathrow_mainline"),
  review("ba-medical-training", "british_airways", "health", "Medical and training candidates; detailed process and duration require confirmation.", [baFaqs], "A", "heathrow_mainline"),
  review("ba-education", "british_airways", "education", "Specific education and major requirements require confirmation.", [baTalentPool], "E", "heathrow_mainline"),
  review("ba-second-language", "british_airways", "language", "Second-language preference requires confirmation.", [baTalentPool], "E", "heathrow_mainline"),
  review("ba-reach-swim", "british_airways", "height", "Reach, swimming, treading-water and vision details require confirmation.", [baThirdParty], "D", "unknown_base"),
  review("ba-medical-detail", "british_airways", "health", "Detailed medical criteria require confirmation.", [baThirdParty], "D", "unknown_base"),
  review("ba-commute", "british_airways", "relocation", "Commute-radius and 90-minute claims require confirmation.", [baThirdParty], "D", "unknown_base"),
  review("ba-assessment-centre", "british_airways", "other", "Video interview, assessment centre, group exercise, role-play and face-to-face interview require confirmation.", [baThirdParty], "C", "unknown_base"),
  review("ba-training-duration", "british_airways", "other", "Training 4-6 week claim requires confirmation.", [baThirdParty], "D", "unknown_base"),
  review("ba-gatwick", "british_airways", "other", "Gatwick conditions require a dedicated official posting.", [baThirdParty], "D", "gatwick_unverified"),
  review("ba-euroflyer", "british_airways", "other", "BA Euroflyer conditions are excluded; separate scope retained for review only.", [baCabinCrew], "E", "ba_euroflyer"),
  review("ba-cityflyer", "british_airways", "other", "BA Cityflyer conditions are excluded; separate scope retained for review only.", [baCabinCrew], "E", "ba_cityflyer"),
  review("delta-age", "delta_air_lines", "age", "Delta Mainline candidate: minimum age 21.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-education", "delta_air_lines", "education", "Delta Mainline candidate: high-school diploma or GED.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-english", "delta_air_lines", "language", "Delta Mainline candidate: English fluency.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-work-right", "delta_air_lines", "relocation", "Delta Mainline candidate: legally authorized to work in the US.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-passport", "delta_air_lines", "documents", "Delta Mainline candidate: passport and travel ability.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-background", "delta_air_lines", "other", "Delta Mainline candidate: background screening.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-drug-medical", "delta_air_lines", "health", "Delta Mainline candidate: drug testing and medical/fitness assessment.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-atlanta-training", "delta_air_lines", "other", "Delta Mainline candidate: initial training in Atlanta.", [deltaCareers], "A", "delta_mainline_global"),
  review("delta-online-process", "delta_air_lines", "other", "Online Application, Eligibility Screening and Talent Assessment candidates.", [deltaCareers], "A", "general_flight_attendant"),
  review("delta-lod", "delta_air_lines", "language", "Language of Destination conditions require separate confirmation and are not global.", [deltaOfficial], "E", "language_of_destination"),
  review("delta-base", "delta_air_lines", "relocation", "Base-assignment rules require confirmation.", [deltaCareers], "E", "base_specific"),
  review("delta-visa", "delta_air_lines", "relocation", "Visa sponsorship requires confirmation.", [deltaCareers], "E", "unknown_scope"),
  review("delta-physical", "delta_air_lines", "height", "Reach, jumpseat, water drill, swimming, eyesight, tattoo and grooming details require confirmation; third-party source only.", [deltaThirdParty], "D", "unknown_scope"),
  review("delta-process-detail", "delta_air_lines", "other", "VJT, video interview, Event Day, CJO and detailed background/drug-test process require confirmation.", [deltaCareers], "E", "unknown_scope"),
  review("united-age", "united_airlines", "age", "United mainline candidate: age 21+.", [unitedCareers], "A", "united_mainline_global"),
  review("united-education", "united_airlines", "education", "United mainline candidate: high-school diploma/GED; 2+ years college preferred.", [unitedCareers], "A", "united_mainline_global"),
  review("united-service-experience", "united_airlines", "experience", "United mainline candidate: one year customer-service experience.", [unitedCareers], "A", "united_mainline_global"),
  review("united-english", "united_airlines", "language", "United mainline candidate: English fluency.", [unitedCareers], "A", "united_mainline_global"),
  review("united-work-right", "united_airlines", "relocation", "United mainline candidate: legally authorized to work in the US.", [unitedCareers], "A", "united_mainline_global"),
  review("united-passport", "united_airlines", "documents", "United mainline candidate: passport and global travel ability.", [unitedCareers], "A", "united_mainline_global"),
  review("united-background", "united_airlines", "other", "United mainline candidate: background checks and fingerprinting.", [unitedCareers], "A", "united_mainline_global"),
  review("united-medical", "united_airlines", "health", "United mainline candidate: DOT drug screening, vision/hearing and functional medical exam.", [unitedCareers], "A", "united_mainline_global"),
  review("united-training", "united_airlines", "other", "United mainline candidate: 6.5-week initial training.", [unitedCareers], "A", "united_mainline_global"),
  review("united-general-process", "united_airlines", "other", "Online Application, Eligibility Screening, Training, Background Check, Drug Screening and Medical/Fitness candidates.", [unitedCareers], "A", "general_flight_attendant"),
  review("united-lod", "united_airlines", "language", "Language-qualified conditions require separate confirmation and are not global.", [unitedOfficial], "E", "language_qualified"),
  review("united-base", "united_airlines", "relocation", "Base-assignment rules require confirmation.", [unitedCareers], "E", "base_specific"),
  review("united-visa", "united_airlines", "relocation", "Visa sponsorship requires confirmation.", [unitedCareers], "E", "unknown_scope"),
  review("united-physical", "united_airlines", "height", "Reach, jumpseat, swimming, numeric eyesight, tattoo and grooming detail require confirmation; third-party source only.", [unitedThirdParty], "D", "unknown_scope"),
  review("united-regional", "united_airlines", "other", "United Express and regional-carrier conditions are excluded; retained as unknown scope only.", [unitedCareers], "E", "unknown_scope"),
];
export const getAirlineCandidateRequirements = (airlineId: string) =>
  airlineRecruitmentRequirements.filter(
    (item) =>
      item.airlineId === airlineId && item.candidateVisibility !== "hidden",
);
export const getAirlineAiRequirements = (airlineId: string) =>
  airlineRecruitmentRequirements.filter(
    (item) =>
      item.airlineId === airlineId &&
      isAirlineKnowledgeEligibleForAiContext({
        verified: item.verificationStatus === "verified",
        published: item.publishStatus === "published",
        sourceReferences: item.sourceReference,
        aiContextEnabled: item.aiContextEnabled,
      }) &&
      item.candidateVisibility === "visible",
  );
