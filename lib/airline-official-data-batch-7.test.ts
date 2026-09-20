import assert from "node:assert/strict";
import test from "node:test";
import { airlineById } from "./airline-data";
import { airlineMaster } from "./airline-master-data";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import { airlineOfficialBatch6Stats } from "./airline-official-data-batch-6";
import {
  airlineOfficialBatch7ApplicationQuestions,
  airlineOfficialBatch7Fleet,
  airlineOfficialBatch7Guidance,
  airlineOfficialBatch7InterviewQuestions,
  airlineOfficialBatch7Profiles,
  airlineOfficialBatch7RecruitmentSteps,
  airlineOfficialBatch7Requirements,
  airlineOfficialBatch7Routes,
  airlineOfficialBatch7Stats,
} from "./airline-official-data-batch-7";
import { buildAirlineWorkspaceProfiles, buildPreparationStatus, filterAirlines, freshnessFor, isAirlineEligibleForAi, mergeAirlineFleet, mergeAirlineRoutes, patternConfidence } from "./airline-targeting-workspace";

const ids = ["delta_air_lines", "united_airlines", "american_airlines", "air_canada"] as const;
const profiles = buildAirlineWorkspaceProfiles(mergeAirlineRoutes());
const profile = (id: (typeof ids)[number]) => profiles.find((item) => item.id === id)!;
const count = <T extends { airlineId: string }>(items: T[], airlineId: string) => items.filter((item) => item.airlineId === airlineId).length;

test("1 Batch 7 profiles reuse canonical airline entities", () => ids.forEach((id) => assert.equal(airlineMaster.filter((item) => item.id === id).length, 1)));
test("2 country and North America taxonomy stays canonical", () => {
  assert.deepEqual(ids.map((id) => profile(id).countryCode), ["US", "US", "US", "CA"]);
  assert.ok(ids.every((id) => profile(id).region === "north_america"));
});
test("3 all four airlines have domestic and international scope", () => assert.ok(ids.every((id) => profile(id).operationScope === "BOTH")));
test("4 all four airlines remain full service", () => assert.ok(ids.every((id) => profile(id).carrierType === "FULL_SERVICE")));
test("5 hubs are source backed and do not copy crew-base guidance", () => {
  assert.ok(ids.every((id) => profile(id).hubs.length > 0 && profile(id).sources.some((item) => item.type === "company_profile")));
  assert.ok(!profile("delta_air_lines").hubs.some((hub) => /20 bases/i.test(hub)));
  assert.ok(!profile("air_canada").hubs.includes("Calgary (YYC)"));
});
test("6 official careers and cabin pages are connected", () => assert.ok(ids.every((id) => profile(id).careersUrl?.startsWith("https://") && profile(id).cabinCrewCareersUrl?.startsWith("https://"))));
test("7 requirements are verified, sourced and allowlisted", () => {
  assert.ok(airlineOfficialBatch7Requirements.every((item) => item.status === "VERIFIED"));
  assert.ok(airlineOfficialBatch7Requirements.every((item) => item.source.sourceAuthority === "AIRLINE_OFFICIAL" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
});
test("8 unsupported American numeric eligibility stays missing", () => {
  assert.equal(count(airlineOfficialBatch7Requirements, "american_airlines"), 1);
  assert.ok(!airlineOfficialBatch7Requirements.some((item) => item.airlineId === "american_airlines" && ["minimum_age", "height_or_reach", "education"].includes(item.requirementType)));
});
test("9 hiring stages are ordered and sourced", () => {
  for (const id of ids) {
    const steps = airlineOfficialBatch7RecruitmentSteps.filter((item) => item.airlineId === id);
    assert.ok(steps.length > 0);
    assert.deepEqual(steps.map((item) => item.order), steps.map((item) => item.order).sort((a, b) => a - b));
    assert.ok(steps.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  }
});
test("10 guidance remains separate from questions", () => {
  assert.ok(airlineOfficialBatch7Guidance.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  assert.equal(airlineOfficialBatch7ApplicationQuestions.length + airlineOfficialBatch7InterviewQuestions.length, 0);
});
test("11 Delta fleet excludes Delta Connection aircraft", () => {
  assert.equal(count(airlineOfficialBatch7Fleet, "delta_air_lines"), 17);
  assert.ok(!airlineOfficialBatch7Fleet.some((item) => item.airlineId === "delta_air_lines" && ["Bombardier", "Embraer"].includes(item.manufacturer)));
});
test("12 United fleet preserves official family granularity", () => assert.equal(count(airlineOfficialBatch7Fleet, "united_airlines"), 8));
test("13 American fleet uses official current aircraft types", () => assert.equal(count(airlineOfficialBatch7Fleet, "american_airlines"), 10));
test("14 Air Canada fleet excludes Express and Rouge", () => {
  assert.equal(count(airlineOfficialBatch7Fleet, "air_canada"), 10);
  assert.ok(!airlineOfficialBatch7Fleet.some((item) => item.airlineId === "air_canada" && ["CRJ900", "E175", "Dash 8-400"].includes(item.aircraftModel)));
});
test("15 volatile fleet quantities remain null", () => assert.ok(airlineOfficialBatch7Fleet.every((item) => item.quantity === null)));
test("16 Korea routes use only source-backed airport pairs", () => {
  assert.deepEqual(airlineOfficialBatch7Routes.map((item) => item.id), ["7-dl-icn-atl", "7-dl-icn-dtw", "7-dl-icn-msp", "7-dl-icn-sea", "7-dl-icn-slc", "7-ua-icn-sfo", "7-aa-icn-dfw", "7-ac-icn-yyz", "7-ac-icn-yvr"]);
  assert.ok(airlineOfficialBatch7Routes.every((item) => item.originAirport === "ICN" && item.status === "CONFIRMED"));
});
test("17 stored routes are current", () => assert.ok(airlineOfficialBatch7Routes.every((item) => freshnessFor(item.lastVerifiedAt) === "CURRENT")));
test("18 seasonal, connecting and partner-only routes are excluded", () => {
  assert.ok(!airlineOfficialBatch7Routes.some((item) => ["LAX", "YUL", "YYC"].includes(item.destinationAirport)));
  assert.ok(!airlineOfficialBatch7Routes.some((item) => item.originAirport === "GMP"));
});
test("19 unsupported official question wording stays excluded", () => {
  assert.deepEqual(airlineOfficialBatch7ApplicationQuestions, []);
  assert.deepEqual(airlineOfficialBatch7InterviewQuestions, []);
  assert.equal(patternConfidence(0), "INSUFFICIENT");
});
test("20 AI context remains disabled and canonical gate stays closed", () => {
  assert.ok(airlineOfficialBatch7Profiles.every((item) => item.aiContextEnabled === false));
  assert.ok(ids.every((id) => !isAirlineEligibleForAi(profile(id))));
});
test("21 all sources are HTTPS and exact-host allowlisted", () => {
  const sources = airlineOfficialBatch7Profiles.flatMap((item) => item.sources);
  assert.equal(sources.length, 21);
  assert.ok(sources.every((source) => source.sourceUrl.startsWith("https://") && isAllowedOfficialAirlineSource(source.sourceUrl)));
  assert.equal(isAllowedOfficialAirlineSource("https://fake.news.delta.com/example"), false);
});
test("22 Korean aliases and English names are searchable", () => {
  assert.equal(filterAirlines(profiles, { search: "델타항공" })[0]?.id, "delta_air_lines");
  assert.equal(filterAirlines(profiles, { search: "유나이티드항공" })[0]?.id, "united_airlines");
  assert.equal(filterAirlines(profiles, { search: "아메리칸항공" })[0]?.id, "american_airlines");
  assert.equal(filterAirlines(profiles, { search: "에어캐나다" })[0]?.id, "air_canada");
});
test("23 country, scope and full-service filters include Batch 7", () => {
  assert.ok(ids.every((id) => filterAirlines(profiles, { countryGroup: "NORTH_AMERICA" }).some((item) => item.id === id)));
  assert.ok(ids.every((id) => filterAirlines(profiles, { operationScope: "DOMESTIC" }).some((item) => item.id === id)));
  assert.ok(ids.every((id) => filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).some((item) => item.id === id)));
  assert.ok(ids.every((id) => filterAirlines(profiles, { carrierType: "FULL_SERVICE" }).some((item) => item.id === id)));
});
test("24 fresh user state has no generated activity", () => ids.forEach((id) => assert.deepEqual(buildPreparationStatus({ airlineId: id, questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 })));
test("25 Batch 7 creates no fake readiness or hiring score", () => assert.doesNotMatch(JSON.stringify({ profiles: airlineOfficialBatch7Profiles, requirements: airlineOfficialBatch7Requirements }), /readinessScore|hireProbability|passProbability|overallScore/i));
test("26 Batch 7 counts stored facts exactly", () => {
  assert.deepEqual(airlineOfficialBatch7Stats, { retrievedAt: "2026-09-19T00:00:00.000Z", profiles: 4, sources: 21, routes: 9, fleet: 45, requirements: 21, recruitmentSteps: 22, guidance: 12, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
  assert.ok(ids.every((id) => airlineById.has(id)));
  assert.ok(mergeAirlineFleet().some((item) => item.id === "7-dl-a350"));
});
test("27 Batch 6 aggregate remains unchanged", () => assert.deepEqual(airlineOfficialBatch6Stats, { retrievedAt: "2026-09-18T00:00:00.000Z", profiles: 4, sources: 25, routes: 4, fleet: 41, requirements: 21, recruitmentSteps: 21, guidance: 12, officialApplicationQuestions: 0, officialInterviewQuestions: 0 }));
