import assert from "node:assert/strict";
import test from "node:test";
import {
  airlineOfficialBatch1Fleet,
  airlineOfficialBatch1Profiles,
  airlineOfficialBatch1Questions,
  airlineOfficialBatch1Routes,
  airlineOfficialBatch1Stats,
  isAllowedOfficialAirlineSource,
} from "./airline-official-data-batch-1";
import {
  buildAirlineWorkspaceProfiles,
  filterAirlines,
  freshnessFor,
  isAirlineEligibleForAi,
  mergeAirlineFleet,
  mergeAirlineRoutes,
  patternConfidence,
} from "./airline-targeting-workspace";

const routes = mergeAirlineRoutes();
const fleet = mergeAirlineFleet();
const profiles = buildAirlineWorkspaceProfiles(routes);
const koreanAir = profiles.find((profile) => profile.id === "korean_air");
const asiana = profiles.find((profile) => profile.id === "asiana_airlines");

test("Korean Air official profile is connected", () => {
  assert.ok(koreanAir);
  assert.equal(koreanAir.headquarters, "260 Haneul-gil, Gangseo-gu, Seoul, Republic of Korea");
  assert.equal(koreanAir.website, "https://www.koreanair.com/");
});

test("Asiana official profile is connected", () => {
  assert.ok(asiana);
  assert.equal(asiana.headquarters, "443-83 Ojeong-ro, Gangseo-gu, Seoul, Republic of Korea");
  assert.equal(asiana.website, "https://flyasiana.com/");
});

test("all stored sources pass the official host allowlist", () => {
  const sourceUrls = airlineOfficialBatch1Profiles.flatMap((profile) => profile.sources.map((source) => source.sourceUrl));
  assert.ok(sourceUrls.length > 0);
  assert.ok(sourceUrls.every(isAllowedOfficialAirlineSource));
});

test("non-official and malformed source URLs are rejected", () => {
  assert.equal(isAllowedOfficialAirlineSource("https://example.com/airline"), false);
  assert.equal(isAllowedOfficialAirlineSource("not-a-url"), false);
  assert.equal(isAllowedOfficialAirlineSource("http://www.koreanair.com/"), false);
});

test("Korea country filter includes both batch airlines", () => {
  const ids = filterAirlines(profiles, { countryGroup: "KOREA" }).map((profile) => profile.id);
  assert.ok(ids.includes("korean_air"));
  assert.ok(ids.includes("asiana_airlines"));
});

test("confirmed routes derive BOTH operation scope", () => {
  assert.equal(koreanAir?.operationScope, "BOTH");
  assert.equal(asiana?.operationScope, "BOTH");
});

test("both airlines retain full-service carrier type", () => {
  assert.equal(koreanAir?.carrierType, "FULL_SERVICE");
  assert.equal(asiana?.carrierType, "FULL_SERVICE");
});

test("Korean Air fleet stores only official current families", () => {
  const entries = fleet.filter((entry) => entry.airlineId === "korean_air");
  assert.equal(entries.length, 9);
  assert.deepEqual(entries.map((entry) => entry.aircraftFamily), ["787", "777", "747", "737", "A380", "A350", "A330", "A321", "A220"]);
});

test("Korean Air fleet quantities stay unknown rather than using stale counts", () => {
  assert.ok(fleet.filter((entry) => entry.airlineId === "korean_air").every((entry) => entry.quantity === null));
});

test("Asiana fleet uses quantities displayed by the official aircraft page", () => {
  const quantities = new Map(fleet.filter((entry) => entry.airlineId === "asiana_airlines").map((entry) => [entry.aircraftModel, entry.quantity]));
  assert.deepEqual(Object.fromEntries(quantities), { "A380-800": 6, "A350-900": 15, "B777-200ER": 8, "A330-300": 14, A321neo: 13, "A321-200": 11 });
});

test("every fleet entry retains source and verification metadata", () => {
  assert.ok(fleet.every((entry) => isAllowedOfficialAirlineSource(entry.source.sourceUrl) && Boolean(entry.lastVerifiedAt)));
});

test("batch contains representative domestic routes", () => {
  assert.ok(routes.some((route) => route.routeScope === "DOMESTIC" && route.originCountry === "KR" && route.destinationCountry === "KR"));
});

test("batch contains representative international routes", () => {
  assert.ok(routes.some((route) => route.routeScope === "INTERNATIONAL" && route.originCountry === "KR" && route.destinationCountry !== "KR"));
});

test("Batch 1 routes retain official airport-code pairs and all merged routes retain official sources", () => {
  assert.ok(airlineOfficialBatch1Routes.every((route) => /^[A-Z]{3}$/.test(route.originAirport) && /^[A-Z]{3}$/.test(route.destinationAirport)));
  assert.ok(routes.every((route) => isAllowedOfficialAirlineSource(route.source.sourceUrl)));
});

test("freshness metadata is current at batch verification time", () => {
  assert.equal(airlineOfficialBatch1Stats.retrievedAt, "2026-09-14T00:00:00.000Z");
  assert.ok(airlineOfficialBatch1Profiles.every((profile) => profile.lastVerifiedAt === airlineOfficialBatch1Stats.retrievedAt));
  assert.equal(freshnessFor(airlineOfficialBatch1Stats.retrievedAt), "CURRENT");
});

test("Korean Air careers entry is the verified recruiter host", () => {
  assert.equal(koreanAir?.careersUrl, "https://koreanair.recruiter.co.kr/career/home");
});

test("Asiana careers entry does not invent an unreachable separate URL", () => {
  assert.equal(asiana?.careersUrl, "https://flyasiana.com/C/KR/KO/index");
});

test("no official application question is created without official question text", () => {
  assert.equal(airlineOfficialBatch1Questions.length, 0);
  assert.equal(airlineOfficialBatch1Stats.officialQuestions, 0);
});

test("unverified hub designation is not inferred from route departures", () => {
  assert.deepEqual(koreanAir?.hubs, []);
  assert.deepEqual(asiana?.hubs, []);
});

test("small official-question samples cannot become a pattern", () => {
  assert.equal(patternConfidence(airlineOfficialBatch1Questions.length), "INSUFFICIENT");
});

test("official verified and published data does not auto-enable AI context", () => {
  assert.equal(koreanAir?.verified, true);
  assert.equal(koreanAir?.published, true);
  assert.equal(koreanAir?.aiContextEnabled, false);
  assert.equal(asiana?.aiContextEnabled, false);
});

test("canonical AI gate rejects both profiles until separately enabled", () => {
  assert.ok(koreanAir && asiana);
  assert.equal(isAirlineEligibleForAi(koreanAir), false);
  assert.equal(isAirlineEligibleForAi(asiana), false);
});

test("Batch 1 route records remain present when later official batches are merged", () => {
  assert.ok(airlineOfficialBatch1Routes.every((route) => routes.some((item) => item.id === route.id)));
});

test("Batch 1 fleet records remain present when later official batches are merged", () => {
  assert.ok(airlineOfficialBatch1Fleet.every((entry) => fleet.some((item) => item.id === entry.id)));
});

test("duplicate local records cannot replace official batch records", () => {
  const duplicate = { ...airlineOfficialBatch1Routes[0], destinationAirport: "FAK" };
  assert.equal(mergeAirlineRoutes([duplicate])[0].destinationAirport, airlineOfficialBatch1Routes[0].destinationAirport);
});
