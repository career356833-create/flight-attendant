import assert from "node:assert/strict";
import test from "node:test";
import { airlineById } from "./airline-data";
import { airlineMaster } from "./airline-master-data";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import { airlineOfficialBatch5Stats } from "./airline-official-data-batch-5";
import {
  airlineOfficialBatch6ApplicationQuestions,
  airlineOfficialBatch6Fleet,
  airlineOfficialBatch6Guidance,
  airlineOfficialBatch6InterviewQuestions,
  airlineOfficialBatch6Profiles,
  airlineOfficialBatch6RecruitmentSteps,
  airlineOfficialBatch6Requirements,
  airlineOfficialBatch6Routes,
  airlineOfficialBatch6Stats,
} from "./airline-official-data-batch-6";
import {
  buildAirlineWorkspaceProfiles,
  buildPreparationStatus,
  filterAirlines,
  freshnessFor,
  isAirlineEligibleForAi,
  mergeAirlineFleet,
  mergeAirlineRoutes,
  patternConfidence,
} from "./airline-targeting-workspace";

const ids = ["lufthansa", "british_airways", "air_france", "klm"] as const;
const profiles = buildAirlineWorkspaceProfiles(mergeAirlineRoutes());
const profile = (id: (typeof ids)[number]) => profiles.find((item) => item.id === id)!;
const count = <T extends { airlineId: string }>(items: T[], airlineId: string) => items.filter((item) => item.airlineId === airlineId).length;

test("1 Lufthansa profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "lufthansa").length, 1));
test("2 British Airways profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "british_airways").length, 1));
test("3 Air France profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "air_france").length, 1));
test("4 KLM profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "klm").length, 1));

test("5 country and Europe taxonomy stays canonical", () => {
  assert.deepEqual(ids.map((id) => profile(id).countryCode), ["DE", "GB", "FR", "NL"]);
  assert.ok(ids.every((id) => profile(id).region === "europe"));
});

test("6 operation scope preserves domestic boundaries", () => {
  assert.equal(profile("lufthansa").operationScope, "BOTH");
  assert.equal(profile("british_airways").operationScope, "BOTH");
  assert.equal(profile("air_france").operationScope, "BOTH");
  assert.equal(profile("klm").operationScope, "INTERNATIONAL");
});

test("7 all Batch 6 airlines remain full service", () => assert.ok(ids.every((id) => profile(id).carrierType === "FULL_SERVICE")));
test("8 every stored hub has official profile provenance", () => assert.ok(ids.every((id) => profile(id).hubs.length > 0 && profile(id).sources.length > 0)));
test("9 official careers and cabin pages are connected", () => assert.ok(ids.every((id) => profile(id).careersUrl?.startsWith("https://") && profile(id).cabinCrewCareersUrl?.startsWith("https://"))));

test("10 requirements are verified and allowlisted", () => {
  assert.ok(airlineOfficialBatch6Requirements.every((item) => item.status === "VERIFIED"));
  assert.ok(airlineOfficialBatch6Requirements.every((item) => item.source.sourceAuthority === "AIRLINE_OFFICIAL" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
});

test("11 missing requirements stay missing", () => {
  assert.ok(!airlineOfficialBatch6Requirements.some((item) => item.airlineId === "lufthansa" && item.requirementType === "height_or_reach"));
  assert.ok(!airlineOfficialBatch6Requirements.some((item) => item.airlineId === "british_airways" && item.requirementType === "education"));
});

test("12 hiring stages are ordered and source backed", () => {
  for (const id of ids) {
    const steps = airlineOfficialBatch6RecruitmentSteps.filter((item) => item.airlineId === id);
    assert.deepEqual(steps.map((item) => item.order), steps.map((item) => item.order).sort((a, b) => a - b));
    assert.ok(steps.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  }
});

test("13 guidance stays separate from official questions", () => {
  assert.ok(airlineOfficialBatch6Guidance.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  assert.equal(airlineOfficialBatch6ApplicationQuestions.length + airlineOfficialBatch6InterviewQuestions.length, 0);
});

test("14 Lufthansa fleet uses only current official models", () => assert.equal(count(airlineOfficialBatch6Fleet, "lufthansa"), 13));
test("15 British Airways fleet excludes CityFlyer", () => {
  assert.equal(count(airlineOfficialBatch6Fleet, "british_airways"), 12);
  assert.ok(!airlineOfficialBatch6Fleet.some((item) => item.airlineId === "british_airways" && item.manufacturer === "Embraer"));
});
test("16 Air France fleet preserves official family granularity", () => assert.equal(count(airlineOfficialBatch6Fleet, "air_france"), 6));
test("17 KLM fleet excludes Cityhopper", () => {
  assert.equal(count(airlineOfficialBatch6Fleet, "klm"), 10);
  assert.ok(!airlineOfficialBatch6Fleet.some((item) => item.airlineId === "klm" && item.manufacturer === "Embraer"));
});
test("18 fleet quantity remains nullable", () => assert.ok(airlineOfficialBatch6Fleet.every((item) => item.quantity === null)));

test("19 only current source-backed Korea airport pairs are stored", () => {
  assert.deepEqual(airlineOfficialBatch6Routes.map((item) => item.id), ["6-lh-icn-fra", "6-lh-icn-muc", "6-af-icn-cdg", "6-klm-icn-ams"]);
  assert.ok(airlineOfficialBatch6Routes.every((item) => item.originAirport === "ICN" && item.status === "CONFIRMED"));
});
test("20 stored routes are current", () => assert.ok(airlineOfficialBatch6Routes.every((item) => freshnessFor(item.lastVerifiedAt) === "CURRENT")));
test("21 stale and operator-ambiguous British Airways Korea material is excluded", () => assert.equal(count(airlineOfficialBatch6Routes, "british_airways"), 0));

test("22 official question arrays only accept sourced records", () => {
  const questions = [...airlineOfficialBatch6ApplicationQuestions, ...airlineOfficialBatch6InterviewQuestions] as Array<{ verified: boolean; sourceUrl?: string }>;
  assert.ok(questions.every((item) => item.verified && item.sourceUrl && isAllowedOfficialAirlineSource(item.sourceUrl)));
});
test("23 unsupported cabin-specific question wording is excluded", () => {
  assert.deepEqual(airlineOfficialBatch6ApplicationQuestions, []);
  assert.deepEqual(airlineOfficialBatch6InterviewQuestions, []);
});
test("24 an empty official sample remains insufficient", () => assert.equal(patternConfidence(0), "INSUFFICIENT"));

test("25 AI context remains disabled", () => assert.ok(airlineOfficialBatch6Profiles.every((item) => item.aiContextEnabled === false)));
test("26 canonical AI gate remains closed", () => assert.ok(ids.every((id) => !isAirlineEligibleForAi(profile(id)))));

test("27 every Batch 6 source is HTTPS and exactly allowlisted", () => {
  const sources = airlineOfficialBatch6Profiles.flatMap((item) => item.sources);
  assert.equal(sources.length, 25);
  assert.ok(sources.every((source) => source.sourceUrl.startsWith("https://") && isAllowedOfficialAirlineSource(source.sourceUrl)));
});

test("28 Korean and English aliases are searchable", () => {
  assert.equal(filterAirlines(profiles, { search: "루프트한자" })[0]?.id, "lufthansa");
  assert.equal(filterAirlines(profiles, { search: "영국항공" })[0]?.id, "british_airways");
  assert.equal(filterAirlines(profiles, { search: "에어프랑스" })[0]?.id, "air_france");
  assert.equal(filterAirlines(profiles, { search: "네덜란드항공" })[0]?.id, "klm");
});

test("29 Europe, scope and full-service filters include Batch 6", () => {
  assert.ok(ids.every((id) => filterAirlines(profiles, { countryGroup: "EUROPE" }).some((item) => item.id === id)));
  assert.ok(filterAirlines(profiles, { operationScope: "DOMESTIC" }).some((item) => item.id === "lufthansa"));
  assert.ok(filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).some((item) => item.id === "klm"));
  assert.ok(ids.every((id) => filterAirlines(profiles, { carrierType: "FULL_SERVICE" }).some((item) => item.id === id)));
});

test("30 fresh user state has no generated activity", () => {
  for (const id of ids) assert.deepEqual(buildPreparationStatus({ airlineId: id, questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 });
});

test("31 Batch 6 creates no fake readiness or hiring score", () => {
  assert.doesNotMatch(JSON.stringify({ profiles: airlineOfficialBatch6Profiles, requirements: airlineOfficialBatch6Requirements }), /readinessScore|hireProbability|passProbability|overallScore/i);
});

test("32 Batch 6 statistics count only stored source-backed facts", () => {
  assert.deepEqual(airlineOfficialBatch6Stats, { retrievedAt: "2026-09-18T00:00:00.000Z", profiles: 4, sources: 25, routes: 4, fleet: 41, requirements: 21, recruitmentSteps: 21, guidance: 12, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
  assert.ok(ids.every((id) => airlineById.has(id)));
  assert.ok(mergeAirlineFleet().some((item) => item.id === "6-lh-a350"));
});

test("33 Batch 1 through 5 aggregate remains unchanged", () => {
  assert.deepEqual(airlineOfficialBatch5Stats, { retrievedAt: "2026-09-18T00:00:00.000Z", profiles: 4, sources: 21, routes: 7, fleet: 34, requirements: 29, recruitmentSteps: 12, guidance: 9, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
});
