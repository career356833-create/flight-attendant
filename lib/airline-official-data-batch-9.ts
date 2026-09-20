import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import type {
  AirlineRecruitmentGuidance,
  AirlineRecruitmentStep,
  CabinCrewRequirement,
  CabinCrewRequirementType,
} from "@/lib/airline-official-data-batch-3b";
import type {
  AirlineFact,
  AirlineFleetEntry,
  AirlineInterviewQuestion,
} from "@/lib/airline-targeting-workspace";

// Batch 9 is a source-backed gap fill. Closed exercises remain archived and
// absence from a current timetable is never converted into a negative route fact.
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

const jejuRecruitment = fact(
  "cabin_crew_careers",
  "Archived August 2026 new cabin-crew recruitment notice for Seoul and Busan, including eligibility, language evidence and selection guidance.",
  "https://jejuair.recruiter.co.kr/career/jobs/123458",
  "2026 second-half new cabin crew recruitment | Jeju Air",
);
const jejuCareers = fact(
  "career_page",
  "Official Jeju Air recruitment portal.",
  "https://jejuair.recruiter.co.kr/career/home",
  "Jeju Air recruitment",
);

const jinVideoGuide = fact(
  "recruitment_archive",
  "Archived 2025 new cabin-crew online presentation instructions, including the official presentation prompt and submission sequence.",
  "https://jinair.recruiter.co.kr/com/attachFile/downloadFile?fileUid=7ed8f5bf-b79a-4dc8-a60d-1284e5408c37.pdf",
  "2025 Jin Air new cabin crew video submission guide",
);
const jinVideoPrecautions = fact(
  "recruitment_guidance",
  "Official identity, appearance, browser and connection precautions for the archived cabin-crew video assessment.",
  "https://jinair.recruiter.co.kr/com/attachFile/downloadFile?fileUid=b080ea0f-7272-4ed4-bf9a-833cd578bff0.pdf",
  "Jin Air cabin crew video assessment precautions",
);
const jinCareers = fact(
  "career_page",
  "Official Jin Air recruitment portal.",
  "https://jinair.recruiter.co.kr/",
  "Jin Air recruitment",
);
const jinFleet = fact(
  "fleet",
  "An official 2026 Jin Air business guide identifies B737-800 operation; it does not provide a complete fleet or quantity.",
  "https://files.jinair.com/documents/%EC%A7%84%EC%97%90%EC%96%B4%20%EC%83%81%EC%9A%A9%EC%9A%B0%EB%8C%80%20%EC%9D%B4%EC%9A%A9%EC%95%88%EB%82%B4%EC%84%9C%282026%29.pdf",
  "Jin Air 2026 business benefit guide",
);

const airBusanRecruitment = fact(
  "cabin_crew_careers",
  "Archived August 2026 new cabin-crew recruitment notice with eligibility, selection stages and employment guidance.",
  "https://airbusan.recruiter.co.kr/app/jobnotice/view?jobnoticeSn=263073&systemKindCode=MRS2",
  "August 2026 new cabin crew recruitment | Air Busan",
);
const airBusanCareers = fact(
  "career_page",
  "Official Air Busan recruitment portal.",
  "https://airbusan.recruiter.co.kr/",
  "Air Busan recruitment",
);
const airBusanBase = fact(
  "hub",
  "Air Busan's official company introduction describes the airline as based in Busan; no airport hub is inferred.",
  "https://www.airbusan.com/content/common/introduction/greeting",
  "CEO greeting | Air Busan",
);

const baKoreaStatus = fact(
  "route_status",
  "The current official destination surface includes Seoul, but it does not identify British Airways as the operating carrier for a direct Korea service; Korea operator status remains unknown.",
  "https://www.britishairways.com/content/information/flight-information/our-route-network",
  "Our route network | British Airways",
);
const baTimetableBoundary = fact(
  "route_status_boundary",
  "British Airways' timetable is the operating-flight authority; no current BA-operated Korea sector was established from the verified source set.",
  "https://www.britishairways.com/travel/schedules/public/en_gb",
  "Flight timetable | British Airways",
);

export type AirlineOfficialBatch9ProfilePatch = {
  airlineId: "jeju_air" | "jin_air" | "air_busan" | "british_airways";
  careersUrl?: string;
  expectedPreviousCareersUrl?: string;
  hubs?: string[];
  sources: AirlineFact[];
  lastVerifiedAt: string;
};

export const airlineOfficialBatch9ProfilePatches: AirlineOfficialBatch9ProfilePatch[] = [
  {
    airlineId: "jeju_air",
    careersUrl: jejuCareers.sourceUrl,
    expectedPreviousCareersUrl: "https://www.jejuair.net/",
    sources: [jejuRecruitment, jejuCareers],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "jin_air",
    careersUrl: jinCareers.sourceUrl,
    expectedPreviousCareersUrl: "https://www.jinair.com/",
    sources: [jinCareers, jinVideoGuide, jinVideoPrecautions, jinFleet],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "air_busan",
    careersUrl: airBusanCareers.sourceUrl,
    expectedPreviousCareersUrl: "https://en.airbusan.com/content/ko",
    hubs: ["Busan, Republic of Korea"],
    sources: [airBusanRecruitment, airBusanCareers, airBusanBase],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "british_airways",
    sources: [baKoreaStatus, baTimetableBoundary],
    lastVerifiedAt: verifiedAt,
  },
];

export function applyAirlineOfficialBatch9Patch(
  profile: OfficialAirlineBatchProfile,
  patch: AirlineOfficialBatch9ProfilePatch,
): { profile: OfficialAirlineBatchProfile; conflicts: string[] } {
  const conflicts: string[] = [];
  const next = { ...profile, sources: [...profile.sources] };

  if (patch.careersUrl) {
    if (profile.careersUrl && profile.careersUrl !== patch.expectedPreviousCareersUrl && profile.careersUrl !== patch.careersUrl) conflicts.push("careersUrl");
    else next.careersUrl = patch.careersUrl;
  }
  if (patch.hubs) {
    if (profile.hubs.length > 0 && JSON.stringify(profile.hubs) !== JSON.stringify(patch.hubs)) conflicts.push("hubs");
    else next.hubs = patch.hubs;
  }

  next.sources = [...profile.sources, ...patch.sources].filter(
    (source, index, all) => all.findIndex((candidate) => candidate.type === source.type && candidate.sourceUrl === source.sourceUrl) === index,
  );
  next.lastVerifiedAt = patch.lastVerifiedAt;
  return { profile: next, conflicts };
}

type RecruitmentMeta = Pick<CabinCrewRequirement, "recruitmentType" | "recruitmentPeriod" | "recordStatus">;
const requirement = (id: string, airlineId: string, requirementType: CabinCrewRequirementType, text: string, source: AirlineFact, meta: RecruitmentMeta): CabinCrewRequirement => ({
  id, airlineId, requirementType, text, source, verifiedAt, status: "VERIFIED", ...meta,
});

const jeju2026 = { recruitmentType: "INTERN", recruitmentPeriod: "2026-08 recruitment / 2027-02 graduation boundary", recordStatus: "ARCHIVED" } as const;
const jin2025 = { recruitmentType: "NEW_GRADUATE", recruitmentPeriod: "2025 first-half recruitment", recordStatus: "ARCHIVED" } as const;
const airBusan2026 = { recruitmentType: "INTERN", recruitmentPeriod: "2026-08 recruitment / 2026-10 entry", recordStatus: "ARCHIVED" } as const;

export const airlineOfficialBatch9Requirements: CabinCrewRequirement[] = [
  requirement("9-jeju-education", "jeju_air", "education", "No education restriction applied; candidates expected to obtain their final qualification by February 2027 were included in the archived exercise.", jejuRecruitment, jeju2026),
  requirement("9-jeju-language", "jeju_air", "language", "One qualifying domestic English score was required: TOEIC 600+, TOEIC Speaking IM1+ or OPIc IM1+, within the stated validity window.", jejuRecruitment, jeju2026),
  requirement("9-jeju-travel", "jeju_air", "passport_work_eligibility", "Applicants had to have no disqualification for overseas travel.", jejuRecruitment, jeju2026),
  requirement("9-jeju-fitness", "jeju_air", "medical_fitness", "A National Fitness 100 certificate at grade 1–3 had to be submitted by the second interview.", jejuRecruitment, jeju2026),

  requirement("9-airbusan-education", "air_busan", "education", "Graduates or candidates expected to graduate by February 2027 who could join in October 2026 were eligible for the archived exercise.", airBusanRecruitment, airBusan2026),
  requirement("9-airbusan-vision", "air_busan", "medical_fitness", "Corrected vision of at least 1.0 was required.", airBusanRecruitment, airBusan2026),
  requirement("9-airbusan-language", "air_busan", "language", "TOEIC 550 or TOEIC Speaking/OPIc IM1+ from the stated domestic-test validity period was required.", airBusanRecruitment, airBusan2026),
  requirement("9-airbusan-travel", "air_busan", "passport_work_eligibility", "Applicants had to have no restriction on overseas travel.", airBusanRecruitment, airBusan2026),
];

const step = (id: string, airlineId: string, order: number, title: string, description: string, source: AirlineFact, meta: Pick<AirlineRecruitmentStep, "recruitmentType" | "recruitmentPeriod" | "recordStatus">): AirlineRecruitmentStep => ({
  id, airlineId, order, title, description, source, verifiedAt, ...meta,
});

export const airlineOfficialBatch9RecruitmentSteps: AirlineRecruitmentStep[] = [
  step("9-jeju-screen", "jeju_air", 1, "Document and competency screening", "Document and competency results were assessed together to select candidates for the first interview.", jejuRecruitment, jeju2026),
  step("9-jeju-first", "jeju_air", 2, "First interview", "Candidates selected by the opening screening proceeded to a first interview.", jejuRecruitment, jeju2026),
  step("9-jeju-second", "jeju_air", 3, "Second interview", "The official notice identifies a second-interview deadline for the required fitness certificate.", jejuRecruitment, jeju2026),

  step("9-jin-video", "jin_air", 1, "Online presentation", "The archived exercise required a PDF of up to two pages and a two-minute online presentation.", jinVideoGuide, jin2025),

  step("9-airbusan-document", "air_busan", 1, "Document screening", "The published sequence starts with document screening.", airBusanRecruitment, airBusan2026),
  step("9-airbusan-video", "air_busan", 2, "Video assessment", "A video assessment follows document screening.", airBusanRecruitment, airBusan2026),
  step("9-airbusan-first", "air_busan", 3, "First interview", "The first interview includes discussion and practical assessment.", airBusanRecruitment, airBusan2026),
  step("9-airbusan-second", "air_busan", 4, "Second interview", "The second interview includes English and executive assessment.", airBusanRecruitment, airBusan2026),
  step("9-airbusan-medical", "air_busan", 5, "Medical examination", "A health examination follows the interview stages.", airBusanRecruitment, airBusan2026),
  step("9-airbusan-final", "air_busan", 6, "Final selection", "The published sequence ends with final selection.", airBusanRecruitment, airBusan2026),
];

const guidance = (id: string, airlineId: string, topic: AirlineRecruitmentGuidance["topic"], text: string, source: AirlineFact, meta: Pick<AirlineRecruitmentGuidance, "recruitmentType" | "recruitmentPeriod" | "recordStatus">): AirlineRecruitmentGuidance => ({
  id, airlineId, topic, text, source, verifiedAt, ...meta,
});

export const airlineOfficialBatch9Guidance: AirlineRecruitmentGuidance[] = [
  guidance("9-jeju-preference", "jeju_air", "application", "Japanese and Chinese conversation ability were preferences, not mandatory requirements.", jejuRecruitment, jeju2026),
  guidance("9-jeju-documents", "jeju_air", "application", "Graduation or enrollment evidence, language scores and the fitness certificate were listed submission documents.", jejuRecruitment, jeju2026),
  guidance("9-jeju-conversion", "jeju_air", "training", "The role was a one-year contract internship with permanent conversion subject to review.", jejuRecruitment, jeju2026),

  guidance("9-jin-equipment", "jin_air", "assessment", "The archived online presentation required a PC camera, microphone, earphones, mouse and keyboard; mobile and tablet use was prohibited.", jinVideoGuide, jin2025),
  guidance("9-jin-browser", "jin_air", "assessment", "Chrome and a stable wired connection were required, with other programs closed; the assessment could not be retried after starting.", jinVideoPrecautions, jin2025),
  guidance("9-jin-appearance", "jin_air", "assessment", "Identity had to remain visible; natural presentation was requested and cabin-crew-like uniforms were prohibited.", jinVideoPrecautions, jin2025),

  guidance("9-airbusan-preference", "air_busan", "application", "Japanese and Chinese proficiency were preferences rather than mandatory requirements.", airBusanRecruitment, airBusan2026),
  guidance("9-airbusan-conversion", "air_busan", "training", "The published role used a two-year internship followed by a permanent-conversion review.", airBusanRecruitment, airBusan2026),
  guidance("9-airbusan-aptitude", "air_busan", "assessment", "A separate online aptitude test applied to candidates selected for the second interview.", airBusanRecruitment, airBusan2026),
];

export const airlineOfficialBatch9Fleet: AirlineFleetEntry[] = [{
  id: "9-jin-b737-800",
  airlineId: "jin_air",
  manufacturer: "Boeing",
  aircraftFamily: "737",
  aircraftModel: "737-800",
  role: "MIXED",
  bodyType: "NARROWBODY",
  quantity: null,
  source: jinFleet,
  lastVerifiedAt: verifiedAt,
}];

export const airlineOfficialBatch9ApplicationQuestions = [] as const;
export const airlineOfficialBatch9InterviewQuestions: AirlineInterviewQuestion[] = [{
  id: "9-jin-2025-video-presentation",
  airlineId: "jin_air",
  kind: "INTERVIEW",
  questionText: "본인을 진에어 항공기에 탑승한 객실승무원이 아닌 다른 직업을 가진 승객이라 가정합니다. 어떤 직업을 선택했는지 제시한 후, 이 승객의 관점에서 본 객실승무원의 비행/업무 환경을 간략하게 서술해주세요.",
  year: 2025,
  recruitmentPeriod: "2025 first-half recruitment",
  position: "객실승무원",
  category: "SITUATIONAL",
  sourceUrl: jinVideoGuide.sourceUrl,
  sourceTitle: jinVideoGuide.sourceTitle,
  verified: true,
  createdAt: verifiedAt,
  sourceType: "OFFICIAL_INTERVIEW",
}];

export const airlineOfficialBatch9KoreaRouteStatus = {
  airlineId: "british_airways",
  status: "UNKNOWN",
  reason: "The official destination surface does not establish British Airways as operating carrier; partner, codeshare and connecting itineraries are excluded.",
  sources: [baKoreaStatus, baTimetableBoundary],
} as const;

export const airlineOfficialBatch9Coverage = {
  before: { jeju_air: 33, jin_air: 30, air_busan: 38, british_airways: 73 },
  // The repository does not contain the prior audit's numeric rubric. Batch 9
  // therefore records auditable feature deltas instead of inventing new scores.
  after: { jeju_air: null, jin_air: null, air_busan: null, british_airways: 73 },
  reason: "Numeric after-scores are withheld where the original coverage rubric is unavailable; British Airways remains unchanged because Korea operator status is still unknown.",
} as const;

export const airlineOfficialBatch9Stats = {
  retrievedAt: verifiedAt,
  profilePatches: airlineOfficialBatch9ProfilePatches.length,
  sources: airlineOfficialBatch9ProfilePatches.reduce((sum, patch) => sum + patch.sources.length, 0),
  fleet: airlineOfficialBatch9Fleet.length,
  requirements: airlineOfficialBatch9Requirements.length,
  recruitmentSteps: airlineOfficialBatch9RecruitmentSteps.length,
  guidance: airlineOfficialBatch9Guidance.length,
  officialApplicationQuestions: airlineOfficialBatch9ApplicationQuestions.length,
  officialInterviewQuestions: airlineOfficialBatch9InterviewQuestions.length,
} as const;
