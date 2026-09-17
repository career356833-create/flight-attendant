import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";
import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";

const verifiedAt = "2026-09-17T00:00:00.000Z";
const twayHistoricalVerifiedAt = "2024-08-14T00:00:00.000Z";

function fact(
  type: string,
  value: string,
  sourceUrl: string,
  sourceTitle: string,
  options: Partial<Pick<AirlineFact, "verifiedAt" | "status">> = {},
): AirlineFact {
  const sourceVerifiedAt = options.verifiedAt ?? verifiedAt;
  return {
    type,
    value,
    sourceUrl,
    sourceTitle,
    sourceAuthority: "AIRLINE_OFFICIAL",
    retrievedAt: verifiedAt,
    verifiedAt: sourceVerifiedAt,
    status: options.status ?? "VERIFIED",
  };
}

const jejuCompany = fact(
  "company_profile",
  "Official company page describes Jeju Air's domestic and international network; displayed fleet and route figures are dated August 2025.",
  "https://www.jejuair.net/en/about/corp/page.do",
  "Jeju Air Company Profile",
);
const jejuRoutes = fact(
  "route",
  "Official booking homepage displayed Incheon–Jeju domestic service and Incheon–Kobe international service at retrieval time.",
  "https://www.jejuair.net/ko/main/base/index.do",
  "Jeju Air Official Booking Home",
);
const jejuCareerEntry = fact(
  "career_page",
  "Official homepage retained as the career entry point because a separate current recruitment deep link was not independently reachable at retrieval time.",
  "https://www.jejuair.net/",
  "Jeju Air Official Website",
);

const jinCompany = fact(
  "company_profile",
  "Official Jin Air agent portal identifies Jin Air and publishes its Seoul address.",
  "https://agent.jinair.com/main",
  "Jin Air Official Agent Portal",
);
const jinDomesticRoutes = fact(
  "route",
  "Official 2026 agent notice identifies GMP–CJU domestic schedule examples; schedules can change.",
  "https://agent.jinair.com/announce/getDetail?seq=486",
  "Jin Air 2026 Domestic Group Schedule Notice",
);
const jinInternationalRoutes = fact(
  "route",
  "Official agent notice updated in 2026 lists ICN–GUM and other international route examples; schedules can change.",
  "https://agent.jinair.com/announce/getDetail?seq=663",
  "Jin Air International Route Notice",
);
const jinCareerEntry = fact(
  "career_page",
  "Official Jin Air homepage is retained as the career entry point because a separate current recruitment deep link was not independently reachable at retrieval time.",
  "https://www.jinair.com/",
  "Jin Air Official Website",
);

const twayCurrentSite = fact(
  "company_profile",
  "The legacy T'way Air aircraft-information URL redirects to the current Trinity Airways site; the existing tway_air master identity is retained without automatic renaming.",
  "https://www.twayair.com/app/serviceInfo/contents/1322",
  "T'way Air / Trinity Airways Aircraft Information",
);
const twayHistoricalOperations = fact(
  "operation_scope",
  "Official 2024 T'way release describes domestic and international operations based at Gimpo, Incheon, Daegu and Cheongju; it is retained as stale historical evidence only.",
  "https://www.twayair.com/app/company/NEWS/retrieve/3886",
  "T'way Air 14th Anniversary Release",
  { verifiedAt: twayHistoricalVerifiedAt, status: "STALE" },
);
const twayCareerEntry = fact(
  "career_page",
  "The current successor recruiting portal is linked by the official successor site; vacancy status must be checked on that portal.",
  "https://trinityairways.recruiter.co.kr/career/home",
  "Trinity Airways Recruitment",
);

const airBusanCompany = fact(
  "company_profile",
  "Official Air Busan homepage identifies the company and its Busan address, and exposes the recruitment menu.",
  "https://en.airbusan.com/content/ko",
  "Air Busan Official Website",
);
const airBusanRoutes = fact(
  "route",
  "Official route page separates domestic and international destinations; schedules remain subject to change.",
  "https://www.airbusan.com/content/individual/booking/route",
  "Air Busan Route Information",
);
const airBusanDomesticRoute = fact(
  "route",
  "Official domestic fare page lists Busan–Jeju.",
  "https://www.airbusan.com/content/individual/booking/fareDomestic",
  "Air Busan Domestic Fares",
);
const airBusanInternationalRoute = fact(
  "route",
  "Official international fare page lists Busan–Fukuoka and other international services.",
  "https://www.airbusan.com/content/individual/booking/fareInternational",
  "Air Busan International Fares",
);
const airBusanFleet = fact(
  "fleet",
  "Official aircraft page lists A321neo LR, A321neo, A321-200 and A320-200; no quantity is inferred from tail-number displays.",
  "https://www.airbusan.com/content/individual/booking/bookingAircraft",
  "Air Busan Aircraft Information",
);
const airBusanLowCost = fact(
  "carrier_type",
  "Official Air Busan release describes the company in the domestic low-cost-carrier context.",
  "https://www.airbusan.com/content/common/introduction/newsDetail?id=382",
  "Air Busan Official News Release",
);

export const airlineOfficialBatch2Profiles: OfficialAirlineBatchProfile[] = [
  {
    airlineId: "jeju_air",
    hubs: [],
    website: "https://www.jejuair.net/",
    careersUrl: jejuCareerEntry.sourceUrl,
    summary: "Jeju Air's official company and booking pages show domestic and international passenger services. No hub is inferred from departures.",
    operationScope: "BOTH",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [jejuCompany, jejuRoutes, jejuCareerEntry],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "jin_air",
    headquarters: "Seoul, Gangseo-gu, Gonghang-daero 453, Republic of Korea",
    hubs: [],
    website: "https://www.jinair.com/",
    careersUrl: jinCareerEntry.sourceUrl,
    summary: "Jin Air's official agent materials currently publish domestic and international schedule notices. No hub is inferred from route departures.",
    operationScope: "BOTH",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [jinCompany, jinDomesticRoutes, jinInternationalRoutes, jinCareerEntry],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "tway_air",
    hubs: [],
    website: "https://www.twayair.com/",
    careersUrl: twayCareerEntry.sourceUrl,
    summary: "The legacy T'way Air site currently redirects to Trinity Airways. The existing tway_air master identity remains intact, but current standalone T'way route scope is left unconfirmed rather than inferred.",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [twayCurrentSite, twayHistoricalOperations, twayCareerEntry],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "air_busan",
    headquarters: "6, Yutongdanji 1-ro 57beon-gil, Gangseo-gu, Busan, Republic of Korea",
    hubs: [],
    website: "https://en.airbusan.com/content/ko",
    careersUrl: airBusanCompany.sourceUrl,
    summary: "Air Busan's official site publishes domestic and international booking information. No hub is inferred from its departure cities.",
    operationScope: "BOTH",
    carrierType: "LOW_COST",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [airBusanCompany, airBusanRoutes, airBusanFleet, airBusanLowCost],
    lastVerifiedAt: verifiedAt,
  },
];

function route(
  id: string,
  airlineId: string,
  originAirport: string,
  destinationAirport: string,
  originCountry: string,
  destinationCountry: string,
  source: AirlineFact,
): AirlineRoute {
  return {
    id,
    airlineId,
    originAirport,
    destinationAirport,
    originCountry,
    destinationCountry,
    routeScope: originCountry === destinationCountry ? "DOMESTIC" : "INTERNATIONAL",
    status: "CONFIRMED",
    source,
    lastVerifiedAt: verifiedAt,
  };
}

// City labels are retained where an official source showed the city pair but not both airport codes.
export const airlineOfficialBatch2Routes: AirlineRoute[] = [
  route("batch2-jeju-icn-cju", "jeju_air", "서울(인천)", "제주", "KR", "KR", jejuRoutes),
  route("batch2-jeju-icn-kobe", "jeju_air", "서울(인천)", "고베", "KR", "JP", jejuRoutes),
  route("batch2-jin-gmp-cju", "jin_air", "GMP", "CJU", "KR", "KR", jinDomesticRoutes),
  route("batch2-jin-icn-gum", "jin_air", "ICN", "GUM", "KR", "GU", jinInternationalRoutes),
  route("batch2-airbusan-pus-cju", "air_busan", "부산", "제주", "KR", "KR", airBusanDomesticRoute),
  route("batch2-airbusan-pus-fukuoka", "air_busan", "부산", "후쿠오카", "KR", "JP", airBusanInternationalRoute),
];

function fleet(
  id: string,
  airlineId: string,
  manufacturer: string,
  aircraftFamily: string,
  aircraftModel: string,
  bodyType: AirlineFleetEntry["bodyType"],
  source: AirlineFact,
): AirlineFleetEntry {
  return { id, airlineId, manufacturer, aircraftFamily, aircraftModel, bodyType, quantity: null, source, lastVerifiedAt: verifiedAt };
}

export const airlineOfficialBatch2Fleet: AirlineFleetEntry[] = [
  fleet("batch2-jeju-b737-8", "jeju_air", "Boeing", "737", "737-8", "NARROWBODY", jejuCompany),
  fleet("batch2-jeju-b737-800", "jeju_air", "Boeing", "737", "737-800", "NARROWBODY", jejuCompany),
  fleet("batch2-tway-b737-8", "tway_air", "Boeing", "737", "737-8", "NARROWBODY", twayCurrentSite),
  fleet("batch2-tway-b737-800", "tway_air", "Boeing", "737", "737-800", "NARROWBODY", twayCurrentSite),
  fleet("batch2-tway-b777-300er", "tway_air", "Boeing", "777", "777-300ER", "WIDEBODY", twayCurrentSite),
  fleet("batch2-tway-a330-300", "tway_air", "Airbus", "A330", "A330-300", "WIDEBODY", twayCurrentSite),
  fleet("batch2-tway-a330-200", "tway_air", "Airbus", "A330", "A330-200", "WIDEBODY", twayCurrentSite),
  fleet("batch2-airbusan-a321neo-lr", "air_busan", "Airbus", "A321", "A321neo LR", "NARROWBODY", airBusanFleet),
  fleet("batch2-airbusan-a321neo", "air_busan", "Airbus", "A321", "A321neo", "NARROWBODY", airBusanFleet),
  fleet("batch2-airbusan-a321-200", "air_busan", "Airbus", "A321", "A321-200", "NARROWBODY", airBusanFleet),
  fleet("batch2-airbusan-a320-200", "air_busan", "Airbus", "A320", "A320-200", "NARROWBODY", airBusanFleet),
];

export type OfficialRecruitmentPosting = {
  airlineId: "jeju_air" | "jin_air" | "tway_air" | "air_busan";
  recruitmentPeriod?: string;
  year: number;
  position: string;
  sourceUrl: string;
  sourceTitle: string;
  verifiedAt: string;
  status: "VERIFIED_ARCHIVE";
};

export const airlineOfficialBatch2RecruitmentPostings: OfficialRecruitmentPosting[] = [
  {
    airlineId: "tway_air",
    year: 2024,
    position: "신입 객실 인턴 승무원",
    sourceUrl: "https://www.twayair.com/app/company/NEWS/retrieve/3874",
    sourceTitle: "T'way Air Cabin Intern Recruitment Release",
    verifiedAt: "2024-10-30T00:00:00.000Z",
    status: "VERIFIED_ARCHIVE",
  },
];

// No question text met the official-posting or verified-archive standard at retrieval time.
export const airlineOfficialBatch2Questions: never[] = [];

export const airlineOfficialBatch2Stats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch2Profiles.length,
  sources: airlineOfficialBatch2Profiles.reduce((sum, profile) => sum + profile.sources.length, 0),
  routes: airlineOfficialBatch2Routes.length,
  fleet: airlineOfficialBatch2Fleet.length,
  recruitmentPostings: airlineOfficialBatch2RecruitmentPostings.length,
  officialQuestions: airlineOfficialBatch2Questions.length,
};
