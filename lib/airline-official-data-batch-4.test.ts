import assert from "node:assert/strict";
import test from "node:test";
import { airlineById } from "./airline-data";
import { airlineMaster } from "./airline-master-data";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import { airlineOfficialBatch4ApplicationQuestions, airlineOfficialBatch4Fleet, airlineOfficialBatch4Guidance, airlineOfficialBatch4InterviewQuestions, airlineOfficialBatch4Profiles, airlineOfficialBatch4RecruitmentSteps, airlineOfficialBatch4Requirements, airlineOfficialBatch4Routes, airlineOfficialBatch4Stats } from "./airline-official-data-batch-4";
import { buildAirlineWorkspaceProfiles, buildPreparationStatus, compareAirlines, compareCabinCrewRequirements, filterAirlines, freshnessFor, isAirlineEligibleForAi, mergeAirlineFleet, mergeAirlineRoutes } from "./airline-targeting-workspace";

const ids = ["singapore_airlines", "cathay_pacific", "ana", "japan_airlines"] as const;
const profiles = buildAirlineWorkspaceProfiles(mergeAirlineRoutes());
const profile = (id: (typeof ids)[number]) => profiles.find((item) => item.id === id)!;

for (const id of ids) test(`${id} reuses its canonical entity`, () => {
  assert.ok(airlineById.has(id));
  assert.equal(airlineMaster.filter((item) => item.id === id).length, 1);
});

test("country and regional filters retain all Batch 4 airlines", () => {
  assert.ok(filterAirlines(profiles, { countryGroup: "SOUTHEAST_ASIA" }).some((item) => item.id === "singapore_airlines"));
  const eastAsia = filterAirlines(profiles, { countryGroup: "CHINA" }).map((item) => item.id);
  assert.ok(eastAsia.includes("cathay_pacific"));
  const japan = filterAirlines(profiles, { countryCode: "JP" }).map((item) => item.id);
  assert.ok(japan.includes("ana") && japan.includes("japan_airlines"));
});

test("full-service and operation-scope filters are source-backed", () => {
  assert.ok(ids.every((id) => filterAirlines(profiles, { carrierType: "FULL_SERVICE" }).some((item) => item.id === id)));
  assert.ok(filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).some((item) => item.id === "singapore_airlines"));
  assert.ok(["ana", "japan_airlines"].every((id) => filterAirlines(profiles, { operationScope: "BOTH" }).some((item) => item.id === id)));
});

test("Korean and English search work for Batch 4 canonical names", () => {
  assert.ok(filterAirlines(profiles, { search: "싱가포르항공" }).some((item) => item.id === "singapore_airlines"));
  assert.ok(filterAirlines(profiles, { search: "Cathay Pacific" }).some((item) => item.id === "cathay_pacific"));
  assert.ok(filterAirlines(profiles, { search: "전일본공수" }).some((item) => item.id === "ana"));
  assert.ok(filterAirlines(profiles, { search: "JAL" }).some((item) => item.id === "japan_airlines"));
});

test("every profile has an official career source and declared hub", () => {
  assert.equal(airlineOfficialBatch4Profiles.length, 4);
  assert.ok(airlineOfficialBatch4Profiles.every((item) => item.sources.some((source) => source.type === "cabin_crew_careers") && item.hubs.length > 0));
});

test("fleet facts are current, official and do not infer quantities", () => {
  assert.ok(airlineOfficialBatch4Fleet.every((item) => item.quantity === null && freshnessFor(item.lastVerifiedAt) === "CURRENT" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  assert.ok(ids.every((id) => airlineOfficialBatch4Fleet.some((item) => item.airlineId === id)));
});

test("routes are official, current Korea-related representative routes", () => {
  assert.ok(airlineOfficialBatch4Routes.every((item) => item.status === "CONFIRMED" && freshnessFor(item.lastVerifiedAt) === "CURRENT" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  assert.ok(ids.every((id) => airlineOfficialBatch4Routes.some((item) => item.airlineId === id && [item.originCountry, item.destinationCountry].includes("KR"))));
  assert.ok(mergeAirlineRoutes().some((item) => item.id === "4-nh-hnd-gmp"));
  assert.ok(mergeAirlineFleet().some((item) => item.id === "4-jl-a350-1000"));
});

test("requirements retain official provenance and do not fabricate missing JAL terms", () => {
  assert.ok(airlineOfficialBatch4Requirements.every((item) => item.status === "VERIFIED" && item.source.sourceAuthority === "AIRLINE_OFFICIAL"));
  assert.equal(airlineOfficialBatch4Requirements.filter((item) => item.airlineId === "japan_airlines").length, 0);
  assert.equal(profile("japan_airlines").cabinCrewRequirements?.length, 0);
});

test("selection steps and guidance contain only documented stages", () => {
  assert.ok(airlineOfficialBatch4RecruitmentSteps.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  assert.ok(airlineOfficialBatch4Guidance.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  const sqOrders = airlineOfficialBatch4RecruitmentSteps.filter((item) => item.airlineId === "singapore_airlines").map((item) => item.order);
  assert.deepEqual(sqOrders, [1, 2, 3]);
});

test("official question arrays are intentionally empty", () => {
  assert.deepEqual(airlineOfficialBatch4ApplicationQuestions, []);
  assert.deepEqual(airlineOfficialBatch4InterviewQuestions, []);
});

test("canonical AI gate remains closed and comparison has no hiring score", () => {
  assert.ok(ids.every((id) => !isAirlineEligibleForAi(profile(id))));
  const compared = compareAirlines(profiles, [...ids].slice(0, 3), { questions: [], answers: [], attempts: [], experiences: [] });
  assert.equal(compared.length, 3);
  assert.ok(compared.every((item) => !Object.hasOwn(item, "score") && !Object.hasOwn(item, "passProbability")));
});

test("requirements comparison preserves an official-information gap", () => {
  const types = compareCabinCrewRequirements(profiles, ["ana", "japan_airlines"]);
  assert.ok(types.every((row) => row.airlines.find((item) => item.airlineId === "japan_airlines")?.requirements.length === 0));
});

test("fresh user preparation remains a zero state", () => {
  assert.deepEqual(buildPreparationStatus({ airlineId: "ana", questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 });
});

test("Batch 4 statistics count only the stored, provenance-backed facts", () => {
  assert.deepEqual(airlineOfficialBatch4Stats, { retrievedAt: "2026-09-18T00:00:00.000Z", profiles: 4, sources: 16, routes: 4, fleet: 23, requirements: 14, recruitmentSteps: 5, guidance: 6, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
});
