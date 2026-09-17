import type { OfficialAirlineBatchProfile } from "@/lib/airline-official-data-batch-1";
import type { AirlineFact, AirlineFleetEntry, AirlineRoute } from "@/lib/airline-targeting-workspace";

const verifiedAt = "2026-09-17T00:00:00.000Z";

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

const airSeoulCompany = fact(
  "company_profile",
  "Air Seoul Co., Ltd. publishes its Seoul headquarters, establishment details and current corporate identity on its official company page.",
  "https://flyairseoul.com/CW/en/company.do",
  "Air Seoul Company Profile",
);
const airSeoulOperations = fact(
  "operation_scope",
  "The current official homepage exposes domestic-flight notices and bookable international destination offers; exact domestic airport pairs are not inferred.",
  "https://flyairseoul.com/CW/KO/main.do",
  "Air Seoul Official Booking Home",
);
const airSeoulFleet = fact(
  "fleet",
  "The official aircraft guide currently identifies Airbus A321-200 configurations; aircraft quantity is not inferred from seat configurations.",
  "https://flyairseoul.com/CW/en/aircraft.do",
  "Air Seoul Aircraft Guide",
);
const airSeoulLowCost = fact(
  "carrier_type",
  "The official Air Seoul site identifies the airline within the Korean LCC (low-cost carrier) category.",
  "https://flyairseoul.com/CW/ko/card_ko.do",
  "Air Seoul Official LCC Card Information",
);
const airSeoulCareers = fact(
  "career_page",
  "Official Air Seoul recruitment entry point; current vacancy status must be checked on the portal.",
  "https://recruit.flyairseoul.com/",
  "Air Seoul Recruitment",
);

const eastarCompany = fact(
  "company_profile",
  "Eastar Jet's official company page identifies the company as a Korean low-cost carrier and describes its 2023 restart.",
  "https://main.eastarjet.com/company/greetings",
  "Eastar Jet Company Profile",
);
const eastarHeadquarters = fact(
  "headquarters",
  "The official company footer publishes Eastar Jet's Seoul address.",
  "https://www.eastarjet.com/newstar/PGWKC00001",
  "Eastar Jet Official Company Information",
);
const eastarDomesticRoutes = fact(
  "route",
  "The official live schedule page publishes domestic services and retrieves the current approved timetable; representative city pairs are retained without inferring airport codes.",
  "https://www.eastarjet.com/newstar/PGWIA00001",
  "Eastar Jet Domestic Flight Schedule",
);
const eastarInternationalRoutes = fact(
  "route",
  "The official live schedule page publishes Japan services and retrieves the current approved timetable; representative city pairs are retained without inferring airport codes.",
  "https://www.eastarjet.com/newstar/PGWIA00002",
  "Eastar Jet Japan Flight Schedule",
);
const eastarFleet = fact(
  "fleet",
  "The current official aircraft page lists B737-8 and B737-800 aircraft types; fleet quantities are not inferred.",
  "https://main.eastarjet.com/company/our-aircraft",
  "Eastar Jet Aircraft",
);
const eastarCareers = fact(
  "career_page",
  "Official Eastar Jet recruitment entry point; current vacancy status must be checked on the portal.",
  "https://recruit.eastarjet.com/",
  "Eastar Jet Recruitment",
);

export const airlineOfficialBatch3AProfiles: OfficialAirlineBatchProfile[] = [
  {
    airlineId: "air_seoul",
    headquarters: "6th floor, SH Building, 205 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea",
    hubs: [],
    website: "https://flyairseoul.com/",
    careersUrl: airSeoulCareers.sourceUrl,
    summary: "Air Seoul is a Korean low-cost carrier with current domestic and international booking activity. No hub is inferred from route departures.",
    operationScope: "BOTH",
    carrierType: "LOW_COST",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [airSeoulCompany, airSeoulOperations, airSeoulFleet, airSeoulLowCost, airSeoulCareers],
    lastVerifiedAt: verifiedAt,
  },
  {
    airlineId: "eastar_jet",
    headquarters: "236 Gonghang-daero, Gangseo-gu, Seoul, Republic of Korea",
    hubs: [],
    website: "https://main.eastarjet.com/",
    careersUrl: eastarCareers.sourceUrl,
    summary: "Eastar Jet is a Korean low-cost carrier whose official timetable currently exposes domestic and international services. No hub is inferred from route departures.",
    operationScope: "BOTH",
    carrierType: "LOW_COST",
    verified: true,
    published: true,
    aiContextEnabled: false,
    sources: [eastarCompany, eastarHeadquarters, eastarDomesticRoutes, eastarInternationalRoutes, eastarFleet, eastarCareers],
    lastVerifiedAt: verifiedAt,
  },
];

function route(
  id: string,
  airlineId: "air_seoul" | "eastar_jet",
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

// City labels are intentional where official pages did not expose both airport codes in stable page content.
export const airlineOfficialBatch3ARoutes: AirlineRoute[] = [
  route("batch3a-airseoul-icn-nrt", "air_seoul", "서울/인천", "도쿄/나리타", "KR", "JP", airSeoulOperations),
  route("batch3a-airseoul-icn-gum", "air_seoul", "서울/인천", "괌", "KR", "GU", airSeoulOperations),
  route("batch3a-eastar-gimpo-jeju", "eastar_jet", "김포", "제주", "KR", "KR", eastarDomesticRoutes),
  route("batch3a-eastar-incheon-narita", "eastar_jet", "인천", "도쿄/나리타", "KR", "JP", eastarInternationalRoutes),
];

function fleet(
  id: string,
  airlineId: "air_seoul" | "eastar_jet",
  manufacturer: string,
  aircraftFamily: string,
  aircraftModel: string,
  source: AirlineFact,
): AirlineFleetEntry {
  return {
    id,
    airlineId,
    manufacturer,
    aircraftFamily,
    aircraftModel,
    role: "MIXED",
    bodyType: "NARROWBODY",
    quantity: null,
    source,
    lastVerifiedAt: verifiedAt,
  };
}

export const airlineOfficialBatch3AFleet: AirlineFleetEntry[] = [
  fleet("batch3a-airseoul-a321-200", "air_seoul", "Airbus", "A321", "A321-200", airSeoulFleet),
  fleet("batch3a-eastar-b737-8", "eastar_jet", "Boeing", "737", "737-8", eastarFleet),
  fleet("batch3a-eastar-b737-800", "eastar_jet", "Boeing", "737", "737-800", eastarFleet),
];

// No official cabin-crew posting text was stable and directly verifiable at retrieval time.
export const airlineOfficialBatch3ARecruitmentPostings: never[] = [];

// No application-question wording met the official-posting or verified-archive standard.
export const airlineOfficialBatch3AQuestions: never[] = [];

export const airlineOfficialBatch3AStats = {
  retrievedAt: verifiedAt,
  profiles: airlineOfficialBatch3AProfiles.length,
  sources: airlineOfficialBatch3AProfiles.reduce((sum, profile) => sum + profile.sources.length, 0),
  routes: airlineOfficialBatch3ARoutes.length,
  fleet: airlineOfficialBatch3AFleet.length,
  recruitmentPostings: airlineOfficialBatch3ARecruitmentPostings.length,
  officialQuestions: airlineOfficialBatch3AQuestions.length,
};
