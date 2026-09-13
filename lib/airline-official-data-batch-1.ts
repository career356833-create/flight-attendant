import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";

const verifiedAt = "2026-09-14T00:00:00.000Z";
const allowedHosts = new Set([
  "www.koreanair.com",
  "koreanair.recruiter.co.kr",
  "kr.img.news.koreanair.com",
  "flyasiana.com",
]);

export function isAllowedOfficialAirlineSource(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    return url.protocol === "https:" && allowedHosts.has(url.hostname);
  } catch {
    return false;
  }
}

function fact(type: string, value: string, sourceUrl: string, sourceTitle: string): AirlineFact {
  return {
    type,
    value,
    sourceUrl,
    sourceTitle,
    sourceAuthority: "AIRLINE_OFFICIAL",
    retrievedAt: verifiedAt,
    verifiedAt,
    status: "VERIFIED",
  };
}

const koreanAirCompany = fact(
  "company_profile",
  "Korean Air Lines Co., Ltd.; passenger and cargo air transportation; Seoul headquarters.",
  "https://kr.img.news.koreanair.com/wp-content/uploads/2025/06/2025-ESG-%EB%B3%B4%EA%B3%A0%EC%84%9C.pdf",
  "Korean Air 2025 ESG Report",
);
const koreanAirFleetSource = fact(
  "fleet",
  "Official passenger-aircraft family listing.",
  "https://www.koreanair.com/contents/plan-your-travel/in-flight-experience/fleet",
  "Korean Air Fleet",
);
const koreanAirCareers = fact(
  "career_page",
  "Official Korean Air recruitment entry point; live vacancy status must be checked on the page.",
  "https://koreanair.recruiter.co.kr/career/home",
  "Korean Air Recruitment",
);
const koreanAirRoutes = fact(
  "route",
  "Current airport-pair offers shown on the official booking site at verification time.",
  "https://www.koreanair.com/flights/en-kr/",
  "Korean Air Flight Deals",
);
const koreanAirDomesticRoute = fact(
  "route",
  "GMP-CJU current booking offers shown on the official site at verification time.",
  "https://www.koreanair.com/flights/ko-kr/flights-from-seoul-to-jeju",
  "Korean Air Seoul to Jeju Flights",
);

const asianaCompany = fact(
  "company_profile",
  "Asiana Airlines, Inc.; passenger, cargo and related airline services; Seoul headquarters.",
  "https://flyasiana.com/C/KR/EN/contents/overview",
  "Asiana Airlines Company Overview",
);
const asianaHomepage = fact(
  "career_page",
  "Official homepage containing the current Talent Recruitment entry point; no separate reachable recruitment URL was verified.",
  "https://flyasiana.com/C/KR/KO/index",
  "Asiana Airlines Official Website",
);
const asianaFleetSource = fact(
  "fleet",
  "Official current aircraft list and displayed quantities.",
  "https://flyasiana.com/C/KR/EN/contents/about-the-aircraft",
  "Asiana Airlines Aircraft",
);
const asianaRoutes = fact(
  "route",
  "Routes operated by Asiana Airlines as shown by the official route page at verification time.",
  "https://flyasiana.com/C/KR/EN/booking/route",
  "Asiana Airlines Routes",
);

export type OfficialAirlineBatchProfile = {
  airlineId: "korean_air" | "asiana_airlines";
  headquarters: string;
  hubs: string[];
  website: string;
  careersUrl: string;
  summary: string;
  verified: true;
  published: true;
  aiContextEnabled: false;
  sources: AirlineFact[];
  lastVerifiedAt: string;
};

export const airlineOfficialBatch1Profiles: OfficialAirlineBatchProfile[] = [
  {
    airlineId: "korean_air",
    headquarters: "260 Haneul-gil, Gangseo-gu, Seoul, Republic of Korea",
    hubs: [],
    website: "https://www.koreanair.com/",
    careersUrl: koreanAirCareers.sourceUrl,
    summary: "Korean Air Lines Co., Ltd. operates passenger and cargo air transportation services.",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [koreanAirCompany, koreanAirFleetSource, koreanAirCareers, koreanAirRoutes, koreanAirDomesticRoute],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "asiana_airlines",
    headquarters: "443-83 Ojeong-ro, Gangseo-gu, Seoul, Republic of Korea",
    hubs: [],
    website: "https://flyasiana.com/",
    careersUrl: asianaHomepage.sourceUrl,
    summary: "Asiana Airlines, Inc. operates passenger, cargo and related airline services.",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [asianaCompany, asianaHomepage, asianaFleetSource, asianaRoutes],
    lastVerifiedAt: verifiedAt,
  },
];

const route = (id: string, airlineId: string, originAirport: string, destinationAirport: string, originCountry: string, destinationCountry: string, source: AirlineFact): AirlineRoute => ({
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
});

export const airlineOfficialBatch1Routes: AirlineRoute[] = [
  route("batch1-ke-gmp-cju", "korean_air", "GMP", "CJU", "KR", "KR", koreanAirDomesticRoute),
  route("batch1-ke-icn-lax", "korean_air", "ICN", "LAX", "KR", "US", koreanAirRoutes),
  route("batch1-ke-icn-jfk", "korean_air", "ICN", "JFK", "KR", "US", koreanAirRoutes),
  route("batch1-ke-icn-fuk", "korean_air", "ICN", "FUK", "KR", "JP", koreanAirRoutes),
  route("batch1-oz-gmp-cju", "asiana_airlines", "GMP", "CJU", "KR", "KR", asianaRoutes),
  route("batch1-oz-icn-lax", "asiana_airlines", "ICN", "LAX", "KR", "US", asianaRoutes),
  route("batch1-oz-icn-jfk", "asiana_airlines", "ICN", "JFK", "KR", "US", asianaRoutes),
  route("batch1-oz-icn-bkk", "asiana_airlines", "ICN", "BKK", "KR", "TH", asianaRoutes),
];

const fleet = (id: string, airlineId: string, manufacturer: string, aircraftFamily: string, aircraftModel: string, bodyType: AirlineFleetEntry["bodyType"], quantity: number | null, source: AirlineFact): AirlineFleetEntry => ({
  id,
  airlineId,
  manufacturer,
  aircraftFamily,
  aircraftModel,
  bodyType,
  quantity,
  source,
  lastVerifiedAt: verifiedAt,
});

export const airlineOfficialBatch1Fleet: AirlineFleetEntry[] = [
  fleet("batch1-ke-b787", "korean_air", "Boeing", "787", "787", "WIDEBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-b777", "korean_air", "Boeing", "777", "777", "WIDEBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-b747", "korean_air", "Boeing", "747", "747", "WIDEBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-b737", "korean_air", "Boeing", "737", "737", "NARROWBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-a380", "korean_air", "Airbus", "A380", "A380", "WIDEBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-a350", "korean_air", "Airbus", "A350", "A350", "WIDEBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-a330", "korean_air", "Airbus", "A330", "A330", "WIDEBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-a321", "korean_air", "Airbus", "A321", "A321", "NARROWBODY", null, koreanAirFleetSource),
  fleet("batch1-ke-a220", "korean_air", "Airbus", "A220", "A220", "NARROWBODY", null, koreanAirFleetSource),
  fleet("batch1-oz-a380-800", "asiana_airlines", "Airbus", "A380", "A380-800", "WIDEBODY", 6, asianaFleetSource),
  fleet("batch1-oz-a350-900", "asiana_airlines", "Airbus", "A350", "A350-900", "WIDEBODY", 15, asianaFleetSource),
  fleet("batch1-oz-b777-200er", "asiana_airlines", "Boeing", "777", "B777-200ER", "WIDEBODY", 8, asianaFleetSource),
  fleet("batch1-oz-a330-300", "asiana_airlines", "Airbus", "A330", "A330-300", "WIDEBODY", 14, asianaFleetSource),
  fleet("batch1-oz-a321neo", "asiana_airlines", "Airbus", "A321", "A321neo", "NARROWBODY", 13, asianaFleetSource),
  fleet("batch1-oz-a321-200", "asiana_airlines", "Airbus", "A321", "A321-200", "NARROWBODY", 11, asianaFleetSource),
];

export const airlineOfficialBatch1Questions: never[] = [];

export const airlineOfficialBatch1Stats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch1Profiles.length,
  sources: airlineOfficialBatch1Profiles.reduce((sum, profile) => sum + profile.sources.length, 0),
  routes: airlineOfficialBatch1Routes.length,
  fleet: airlineOfficialBatch1Fleet.length,
  officialQuestions: airlineOfficialBatch1Questions.length,
};
