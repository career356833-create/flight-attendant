import assert from "node:assert/strict";
import test from "node:test";
import { airlineById } from "./airline-data";
import { airlineMaster, validateAirlineMaster } from "./airline-master-data";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import {
  airlineOfficialBatch3AFleet,
  airlineOfficialBatch3AProfiles,
  airlineOfficialBatch3AQuestions,
  airlineOfficialBatch3ARecruitmentPostings,
  airlineOfficialBatch3ARoutes,
  airlineOfficialBatch3AStats,
} from "./airline-official-data-batch-3a";
import {
  buildAirlineWorkspaceProfiles,
  compareAirlines,
  filterAirlines,
  freshnessFor,
  isAirlineEligibleForAi,
  mergeAirlineFleet,
  mergeAirlineRoutes,
  patternConfidence,
} from "./airline-targeting-workspace";

const targetIds = ["air_seoul", "eastar_jet"] as const;
const routes = mergeAirlineRoutes();
const fleet = mergeAirlineFleet();
const profiles = buildAirlineWorkspaceProfiles(routes);
const profileFor = (id: (typeof targetIds)[number]) => profiles.find((profile) => profile.id === id);

test("Air Seoul reuses the existing canonical airline entity", () => {
  assert.equal(airlineById.get("air_seoul")?.name, "Air Seoul");
  assert.equal(airlineMaster.filter((item) => item.id === "air_seoul").length, 1);
});

test("Eastar Jet is added once with its canonical id and IATA code", () => {
  assert.equal(airlineById.get("eastar_jet")?.name, "Eastar Jet");
  assert.equal(airlineMaster.filter((item) => item.id === "eastar_jet").length, 1);
  assert.equal(airlineMaster.find((item) => item.id === "eastar_jet")?.iataCode, "ZE");
  assert.deepEqual(validateAirlineMaster(), []);
});

test("Batch 3A connects both Korean profiles", () => {
  assert.equal(airlineOfficialBatch3AProfiles.length, 2);
  assert.ok(targetIds.every((id) => profileFor(id)?.countryCode === "KR"));
});

test("Korea filter includes both Batch 3A airlines", () => {
  const ids = filterAirlines(profiles, { countryGroup: "KOREA" }).map((profile) => profile.id);
  assert.ok(targetIds.every((id) => ids.includes(id)));
});

test("LCC filter includes both source-backed carrier classifications", () => {
  const ids = filterAirlines(profiles, { carrierType: "LOW_COST" }).map((profile) => profile.id);
  assert.ok(targetIds.every((id) => ids.includes(id)));
  assert.ok(targetIds.every((id) => profileFor(id)?.carrierType === "LOW_COST"));
});

test("Korean and English search terms find the intended airline", () => {
  assert.deepEqual(filterAirlines(profiles, { search: "에어서울" }).map((profile) => profile.id), ["air_seoul"]);
  assert.deepEqual(filterAirlines(profiles, { search: "Eastar" }).map((profile) => profile.id), ["eastar_jet"]);
});

test("current official operation evidence marks both airlines as BOTH", () => {
  assert.ok(targetIds.every((id) => profileFor(id)?.operationScope === "BOTH"));
  assert.ok(targetIds.every((id) => filterAirlines(profiles, { operationScope: "DOMESTIC" }).some((profile) => profile.id === id)));
  assert.ok(targetIds.every((id) => filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).some((profile) => profile.id === id)));
});

test("T'way scope no longer depends on passed routes after the later official network patch", () => {
  assert.equal(buildAirlineWorkspaceProfiles([]).find((profile) => profile.id === "tway_air")?.operationScope, "BOTH");
});

test("neither profile infers a hub from a departure airport", () => {
  assert.ok(airlineOfficialBatch3AProfiles.every((profile) => profile.hubs.length === 0));
});

test("Air Seoul fleet contains only the officially listed A321-200 family", () => {
  const entries = fleet.filter((entry) => entry.airlineId === "air_seoul");
  assert.deepEqual(entries.map((entry) => entry.aircraftModel), ["A321-200"]);
});

test("Eastar Jet fleet contains only the two officially listed 737 types", () => {
  const entries = fleet.filter((entry) => entry.airlineId === "eastar_jet");
  assert.deepEqual(entries.map((entry) => entry.aircraftModel), ["737-8", "737-800"]);
});

test("all Batch 3A fleet quantities stay null rather than inferred", () => {
  assert.ok(airlineOfficialBatch3AFleet.every((entry) => entry.quantity === null));
});

test("all Batch 3A fleet records have current verification timestamps", () => {
  assert.ok(airlineOfficialBatch3AFleet.every((entry) => freshnessFor(entry.lastVerifiedAt) === "CURRENT"));
});

test("Air Seoul has representative source-backed international routes", () => {
  const entries = airlineOfficialBatch3ARoutes.filter((route) => route.airlineId === "air_seoul");
  assert.equal(entries.length, 2);
  assert.ok(entries.every((route) => route.routeScope === "INTERNATIONAL"));
});

test("Eastar Jet has representative domestic and international routes", () => {
  const entries = airlineOfficialBatch3ARoutes.filter((route) => route.airlineId === "eastar_jet");
  assert.equal(entries.length, 2);
  assert.ok(entries.some((route) => route.routeScope === "DOMESTIC"));
  assert.ok(entries.some((route) => route.routeScope === "INTERNATIONAL"));
});

test("route scope is derived only from country pairs", () => {
  assert.ok(airlineOfficialBatch3ARoutes.every((route) => route.routeScope === (route.originCountry === route.destinationCountry ? "DOMESTIC" : "INTERNATIONAL")));
});

test("stable city labels avoid unsupported airport-code inference", () => {
  assert.equal(airlineOfficialBatch3ARoutes.find((route) => route.id === "batch3a-eastar-gimpo-jeju")?.originAirport, "김포");
  assert.equal(airlineOfficialBatch3ARoutes.find((route) => route.id === "batch3a-eastar-incheon-narita")?.destinationAirport, "도쿄/나리타");
});

test("all route records are confirmed, current and source-backed", () => {
  assert.ok(airlineOfficialBatch3ARoutes.every((route) => route.status === "CONFIRMED"));
  assert.ok(airlineOfficialBatch3ARoutes.every((route) => freshnessFor(route.lastVerifiedAt) === "CURRENT"));
  assert.ok(airlineOfficialBatch3ARoutes.every((route) => isAllowedOfficialAirlineSource(route.source.sourceUrl)));
});

test("official recruitment entry points are preserved for both airlines", () => {
  assert.equal(profileFor("air_seoul")?.careersUrl, "https://recruit.flyairseoul.com/");
  assert.equal(profileFor("eastar_jet")?.careersUrl, "https://recruit.eastarjet.com/");
});

test("every stored source is HTTPS and allowlisted", () => {
  const urls = airlineOfficialBatch3AProfiles.flatMap((profile) => profile.sources.map((source) => source.sourceUrl));
  assert.equal(urls.length, airlineOfficialBatch3AStats.sources);
  assert.ok(urls.every((url) => url.startsWith("https://") && isAllowedOfficialAirlineSource(url)));
});

test("no unsupported recruitment posting or application question is stored", () => {
  assert.equal(airlineOfficialBatch3ARecruitmentPostings.length, 0);
  assert.equal(airlineOfficialBatch3AQuestions.length, 0);
  assert.equal(airlineOfficialBatch3AStats.officialQuestions, 0);
});

test("zero official questions produces an insufficient pattern", () => {
  assert.equal(patternConfidence(airlineOfficialBatch3AQuestions.length), "INSUFFICIENT");
});

test("Batch 3A never auto-enables canonical AI context", () => {
  assert.ok(airlineOfficialBatch3AProfiles.every((profile) => profile.aiContextEnabled === false));
  assert.ok(targetIds.every((id) => profileFor(id) && !isAirlineEligibleForAi(profileFor(id)!)));
});

test("comparison includes both airlines without rankings or probability fields", () => {
  const comparison = compareAirlines(profiles, [...targetIds], { questions: [], answers: [], attempts: [], experiences: [] });
  assert.deepEqual(comparison.map((item) => item.profile.id), [...targetIds]);
  assert.ok(comparison.every((item) => !("score" in item) && !("passProbability" in item)));
});

test("empty question and recruitment states remain valid rather than receiving sample data", () => {
  assert.deepEqual(airlineOfficialBatch3AQuestions, []);
  assert.deepEqual(airlineOfficialBatch3ARecruitmentPostings, []);
});

test("Batch 3A stats reflect only stored production facts", () => {
  assert.deepEqual(airlineOfficialBatch3AStats, {
    retrievedAt: "2026-09-17T00:00:00.000Z",
    profiles: 2,
    sources: 11,
    routes: 4,
    fleet: 3,
    recruitmentPostings: 0,
    officialQuestions: 0,
  });
});
