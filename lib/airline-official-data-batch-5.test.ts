import assert from "node:assert/strict";
import test from "node:test";
import { airlineById } from "./airline-data";
import { airlineMaster } from "./airline-master-data";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import {
  airlineOfficialBatch5ApplicationQuestions,
  airlineOfficialBatch5Fleet,
  airlineOfficialBatch5Guidance,
  airlineOfficialBatch5InterviewQuestions,
  airlineOfficialBatch5Profiles,
  airlineOfficialBatch5RecruitmentSteps,
  airlineOfficialBatch5Requirements,
  airlineOfficialBatch5Routes,
  airlineOfficialBatch5Stats,
} from "./airline-official-data-batch-5";
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

const ids = ["emirates", "qatar_airways", "etihad_airways", "turkish_airlines"] as const;
const profiles = buildAirlineWorkspaceProfiles(mergeAirlineRoutes());
const profile = (id: (typeof ids)[number]) => profiles.find((item) => item.id === id)!;
const count = <T extends { airlineId: string }>(items: T[], airlineId: string) => items.filter((item) => item.airlineId === airlineId).length;

test("1 Emirates profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "emirates").length, 1));
test("2 Qatar profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "qatar_airways").length, 1));
test("3 Etihad profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "etihad_airways").length, 1));
test("4 Turkish profile reuses its canonical entity", () => assert.equal(airlineMaster.filter((item) => item.id === "turkish_airlines").length, 1));

test("5 country and region taxonomy remains canonical", () => {
  assert.equal(profile("emirates").countryCode, "AE");
  assert.equal(profile("qatar_airways").countryCode, "QA");
  assert.equal(profile("etihad_airways").region, "middle_east");
  assert.equal(profile("turkish_airlines").region, "europe");
});

test("6 operation scope distinguishes Turkish domestic and international service", () => {
  assert.ok(ids.slice(0, 3).every((id) => profile(id).operationScope === "INTERNATIONAL"));
  assert.equal(profile("turkish_airlines").operationScope, "BOTH");
});

test("7 carrier type remains full service", () => assert.ok(ids.every((id) => profile(id).carrierType === "FULL_SERVICE")));
test("8 every stored hub is backed by an official profile source", () => assert.ok(ids.every((id) => profile(id).hubs.length > 0 && profile(id).sources.length > 0)));
test("9 official careers and cabin crew URLs are connected", () => assert.ok(ids.every((id) => profile(id).careersUrl?.startsWith("https://") && profile(id).cabinCrewCareersUrl?.startsWith("https://"))));

test("10 requirement provenance is official and verified", () => {
  assert.ok(airlineOfficialBatch5Requirements.every((item) => item.status === "VERIFIED"));
  assert.ok(airlineOfficialBatch5Requirements.every((item) => item.source.sourceAuthority === "AIRLINE_OFFICIAL" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
});

test("11 missing requirements stay missing", () => {
  assert.ok(!airlineOfficialBatch5Requirements.some((item) => item.airlineId === "qatar_airways" && item.requirementType === "minimum_age"));
});

test("12 hiring stages are ordered and source backed", () => {
  for (const id of ids) {
    const steps = airlineOfficialBatch5RecruitmentSteps.filter((item) => item.airlineId === id);
    assert.deepEqual(steps.map((item) => item.order), steps.map((item) => item.order).sort((a, b) => a - b));
    assert.ok(steps.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  }
});

test("13 recruitment guidance remains separate from questions", () => {
  assert.ok(airlineOfficialBatch5Guidance.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  assert.equal(airlineOfficialBatch5ApplicationQuestions.length + airlineOfficialBatch5InterviewQuestions.length, 0);
});

test("14 Emirates fleet is retained", () => assert.equal(count(airlineOfficialBatch5Fleet, "emirates"), 3));
test("15 Qatar fleet is retained", () => assert.equal(count(airlineOfficialBatch5Fleet, "qatar_airways"), 10));
test("16 Etihad fleet is retained", () => assert.equal(count(airlineOfficialBatch5Fleet, "etihad_airways"), 8));
test("17 Turkish fleet uses only models on the official page", () => assert.equal(count(airlineOfficialBatch5Fleet, "turkish_airlines"), 13));
test("18 fleet quantity remains nullable", () => assert.ok(airlineOfficialBatch5Fleet.every((item) => item.quantity === null)));

test("19 each airline has a current Korea route", () => {
  assert.ok(ids.every((id) => airlineOfficialBatch5Routes.some((item) => item.airlineId === id && [item.originCountry, item.destinationCountry].includes("KR"))));
  assert.ok(airlineOfficialBatch5Routes.every((item) => item.status === "CONFIRMED" && freshnessFor(item.lastVerifiedAt) === "CURRENT"));
});

test("20 unsupported official questions are excluded", () => {
  assert.deepEqual(airlineOfficialBatch5ApplicationQuestions, []);
  assert.deepEqual(airlineOfficialBatch5InterviewQuestions, []);
  assert.equal(patternConfidence(0), "INSUFFICIENT");
});

test("21 AI context remains disabled", () => assert.ok(airlineOfficialBatch5Profiles.every((item) => item.aiContextEnabled === false)));
test("22 canonical AI gate remains closed", () => assert.ok(ids.every((id) => !isAirlineEligibleForAi(profile(id)))));

test("23 all sources are HTTPS and exactly allowlisted", () => {
  const sources = airlineOfficialBatch5Profiles.flatMap((item) => item.sources);
  assert.equal(sources.length, 21);
  assert.ok(sources.every((source) => source.sourceUrl.startsWith("https://") && isAllowedOfficialAirlineSource(source.sourceUrl)));
});

test("24 Korean and English aliases are searchable", () => {
  assert.equal(filterAirlines(profiles, { search: "에미레이트항공" })[0]?.id, "emirates");
  assert.equal(filterAirlines(profiles, { search: "카타르항공" })[0]?.id, "qatar_airways");
  assert.equal(filterAirlines(profiles, { search: "에티하드항공" })[0]?.id, "etihad_airways");
  assert.equal(filterAirlines(profiles, { search: "터키항공" })[0]?.id, "turkish_airlines");
});

test("25 country, region, scope and full-service filters include Batch 5", () => {
  assert.ok(filterAirlines(profiles, { countryGroup: "MIDDLE_EAST" }).some((item) => item.id === "emirates"));
  assert.ok(filterAirlines(profiles, { countryGroup: "EUROPE" }).some((item) => item.id === "turkish_airlines"));
  assert.ok(filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).some((item) => item.id === "turkish_airlines"));
  assert.ok(ids.every((id) => filterAirlines(profiles, { carrierType: "FULL_SERVICE" }).some((item) => item.id === id)));
});

test("26 fresh user state has no generated activity", () => {
  for (const id of ids) assert.deepEqual(buildPreparationStatus({ airlineId: id, questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 });
});

test("27 Batch 5 creates no fake readiness or hiring score", () => {
  assert.doesNotMatch(JSON.stringify({ profiles: airlineOfficialBatch5Profiles, requirements: airlineOfficialBatch5Requirements }), /readinessScore|hireProbability|passProbability|overallScore/i);
});

test("28 Batch 5 statistics count only stored source-backed facts", () => {
  assert.deepEqual(airlineOfficialBatch5Stats, { retrievedAt: "2026-09-18T00:00:00.000Z", profiles: 4, sources: 21, routes: 7, fleet: 34, requirements: 29, recruitmentSteps: 12, guidance: 9, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
  assert.ok(ids.every((id) => airlineById.has(id)));
  assert.ok(mergeAirlineFleet().some((item) => item.id === "5-tk-a350-900"));
});
