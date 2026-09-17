import assert from "node:assert/strict";
import test from "node:test";
import { airlineById } from "./airline-data";
import { airlineMaster } from "./airline-master-data";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import {
  airlineOfficialBatch3BApplicationQuestions,
  airlineOfficialBatch3BFleet,
  airlineOfficialBatch3BGuidance,
  airlineOfficialBatch3BInterviewQuestions,
  airlineOfficialBatch3BProfiles,
  airlineOfficialBatch3BRecruitmentSteps,
  airlineOfficialBatch3BRequirements,
  airlineOfficialBatch3BRoutes,
  airlineOfficialBatch3BStats,
} from "./airline-official-data-batch-3b";
import {
  buildAirlineWorkspaceProfiles,
  buildPreparationStatus,
  compareAirlines,
  compareCabinCrewRequirements,
  filterAirlines,
  freshnessFor,
  isAirlineEligibleForAi,
  mergeAirlineFleet,
  mergeAirlineRoutes,
  patternConfidence,
} from "./airline-targeting-workspace";

const targetIds = ["emirates", "qatar_airways", "etihad_airways"] as const;
const routes = mergeAirlineRoutes();
const fleet = mergeAirlineFleet();
const profiles = buildAirlineWorkspaceProfiles(routes);
const profileFor = (id: (typeof targetIds)[number]) => profiles.find((profile) => profile.id === id)!;
const requirementsFor = (id: (typeof targetIds)[number]) => airlineOfficialBatch3BRequirements.filter((item) => item.airlineId === id);

test("Emirates reuses one canonical profile", () => {
  assert.equal(airlineById.get("emirates")?.name, "Emirates");
  assert.equal(airlineMaster.filter((item) => item.id === "emirates").length, 1);
});

test("Qatar Airways reuses one canonical profile", () => {
  assert.equal(airlineById.get("qatar_airways")?.name, "Qatar Airways");
  assert.equal(airlineMaster.filter((item) => item.id === "qatar_airways").length, 1);
});

test("Etihad Airways reuses one canonical profile", () => {
  assert.equal(airlineById.get("etihad_airways")?.name, "Etihad Airways");
  assert.equal(airlineMaster.filter((item) => item.id === "etihad_airways").length, 1);
});

test("Middle East filter includes all Batch 3B airlines", () => {
  const ids = filterAirlines(profiles, { countryGroup: "MIDDLE_EAST" }).map((item) => item.id);
  assert.ok(targetIds.every((id) => ids.includes(id)));
});

test("UAE filter includes Emirates and Etihad only", () => {
  const ids = filterAirlines(profiles, { countryCode: "AE" }).map((item) => item.id);
  assert.ok(ids.includes("emirates"));
  assert.ok(ids.includes("etihad_airways"));
  assert.ok(!ids.includes("qatar_airways"));
});

test("Qatar filter includes Qatar Airways", () => {
  assert.ok(filterAirlines(profiles, { countryCode: "QA" }).some((item) => item.id === "qatar_airways"));
});

test("full-service filter includes all three airlines", () => {
  const ids = filterAirlines(profiles, { carrierType: "FULL_SERVICE" }).map((item) => item.id);
  assert.ok(targetIds.every((id) => ids.includes(id)));
});

test("international filter includes all three airlines", () => {
  const ids = filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).map((item) => item.id);
  assert.ok(targetIds.every((id) => ids.includes(id)));
});

test("Korean and English names are searchable", () => {
  assert.deepEqual(filterAirlines(profiles, { search: "에미레이트" }).map((item) => item.id), ["emirates"]);
  assert.deepEqual(filterAirlines(profiles, { search: "Qatar Airways" }).map((item) => item.id), ["qatar_airways"]);
  assert.deepEqual(filterAirlines(profiles, { search: "에티하드" }).map((item) => item.id), ["etihad_airways"]);
});

test("Emirates hub is explicitly Dubai International", () => assert.deepEqual(profileFor("emirates").hubs, ["Dubai International Airport (DXB)"]));
test("Qatar Airways hub is explicitly Hamad International", () => assert.deepEqual(profileFor("qatar_airways").hubs, ["Hamad International Airport (DOH)"]));
test("Etihad hub is explicitly Zayed International", () => assert.deepEqual(profileFor("etihad_airways").hubs, ["Zayed International Airport (AUH)"]));

test("Emirates fleet contains only the current official families", () => {
  assert.deepEqual(airlineOfficialBatch3BFleet.filter((item) => item.airlineId === "emirates").map((item) => item.aircraftFamily), ["A350", "A380", "777"]);
});

test("Qatar fleet contains the current official passenger models", () => {
  const models = airlineOfficialBatch3BFleet.filter((item) => item.airlineId === "qatar_airways").map((item) => item.aircraftModel);
  assert.deepEqual(models, ["A320-200", "A330-200", "A330-300", "A350-900", "A350-1000", "A380", "787-8", "787-9", "777-200LR", "777-300ER"]);
});

test("Etihad fleet excludes the cargo-only aircraft", () => {
  const models = airlineOfficialBatch3BFleet.filter((item) => item.airlineId === "etihad_airways").map((item) => item.aircraftModel);
  assert.deepEqual(models, ["A320-200", "A321-200", "A321LR", "A350", "A380", "787-9", "787-10", "777-300ER"]);
  assert.ok(!models.some((model) => /freighter/i.test(model)));
});

test("fleet quantities remain nullable rather than inferred", () => assert.ok(airlineOfficialBatch3BFleet.every((item) => item.quantity === null)));
test("every fleet entry retains an official source", () => assert.ok(airlineOfficialBatch3BFleet.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl))));

test("Emirates official cabin crew careers link is connected", () => assert.equal(profileFor("emirates").cabinCrewCareersUrl, "https://www.emiratesgroupcareers.com/cabin-crew/"));
test("Qatar official cabin crew careers link is connected", () => assert.equal(profileFor("qatar_airways").cabinCrewCareersUrl, "https://www.qatarairways.com/en/careers/customer-experience/cabin-crew-recruitment.html"));
test("Etihad official cabin crew careers link is connected", () => assert.equal(profileFor("etihad_airways").cabinCrewCareersUrl, "https://careers.etihad.com/teams/cabin-crew"));

test("all cabin crew requirements have official provenance", () => {
  assert.ok(airlineOfficialBatch3BRequirements.every((item) => item.status === "VERIFIED"));
  assert.ok(airlineOfficialBatch3BRequirements.every((item) => item.source.sourceAuthority === "AIRLINE_OFFICIAL" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
});

test("current Qatar page does not invent a minimum-age requirement", () => {
  assert.ok(!requirementsFor("qatar_airways").some((item) => item.requirementType === "minimum_age"));
});

test("recruitment process steps are source-backed and ordered", () => {
  assert.ok(airlineOfficialBatch3BRecruitmentSteps.every((item) => isAllowedOfficialAirlineSource(item.source.sourceUrl)));
  for (const id of targetIds) {
    const orders = airlineOfficialBatch3BRecruitmentSteps.filter((item) => item.airlineId === id).map((item) => item.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  }
});

test("every route has an official current source", () => {
  assert.ok(airlineOfficialBatch3BRoutes.every((item) => item.routeScope === "INTERNATIONAL" && item.status === "CONFIRMED"));
  assert.ok(airlineOfficialBatch3BRoutes.every((item) => freshnessFor(item.lastVerifiedAt) === "CURRENT" && isAllowedOfficialAirlineSource(item.source.sourceUrl)));
});

test("each Batch 3B airline has a Korea-related route", () => {
  assert.ok(targetIds.every((id) => airlineOfficialBatch3BRoutes.some((item) => item.airlineId === id && [item.originCountry, item.destinationCountry].includes("KR"))));
});

test("route freshness never relies on a historical news item", () => assert.ok(airlineOfficialBatch3BRoutes.every((item) => item.source.type === "route")));

test("only official application questions could enter the batch", () => assert.deepEqual(airlineOfficialBatch3BApplicationQuestions, []));
test("unofficial application questions are excluded", () => assert.equal(airlineOfficialBatch3BStats.officialApplicationQuestions, 0));
test("unofficial interview questions are excluded", () => assert.deepEqual(airlineOfficialBatch3BInterviewQuestions, []));
test("zero stored questions keeps pattern confidence insufficient", () => assert.equal(patternConfidence(0), "INSUFFICIENT"));

test("Batch 3B profiles keep AI context disabled", () => assert.ok(airlineOfficialBatch3BProfiles.every((item) => item.aiContextEnabled === false)));
test("canonical AI gate remains closed for all Batch 3B airlines", () => assert.ok(targetIds.every((id) => !isAirlineEligibleForAi(profileFor(id)))));

test("comparison supports all three without rankings", () => {
  const compared = compareAirlines(profiles, [...targetIds], { questions: [], answers: [], attempts: [], experiences: [] });
  assert.deepEqual(compared.map((item) => item.profile.id), [...targetIds]);
  assert.ok(compared.every((item) => !Object.hasOwn(item, "score") && !Object.hasOwn(item, "passProbability")));
});

test("requirements comparison preserves unknown rather than inventing Qatar age", () => {
  const age = compareCabinCrewRequirements(profiles, [...targetIds]).find((item) => item.requirementType === "minimum_age")!;
  assert.deepEqual(age.airlines.find((item) => item.airlineId === "qatar_airways")?.requirements, []);
});

test("fresh user preparation is an honest zero state", () => {
  for (const id of targetIds) {
    assert.deepEqual(buildPreparationStatus({ airlineId: id, questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 });
  }
});

test("Batch 3B exposes no hiring score or probability", () => {
  assert.doesNotMatch(JSON.stringify({ profiles: airlineOfficialBatch3BProfiles, requirements: airlineOfficialBatch3BRequirements }), /hireProbability|passProbability|overallScore|readinessScore/i);
});

test("all stored official URLs are HTTPS and allowlisted", () => {
  const sources = airlineOfficialBatch3BProfiles.flatMap((profile) => profile.sources);
  assert.equal(sources.length, 16);
  assert.ok(sources.every((source) => source.sourceUrl.startsWith("https://") && isAllowedOfficialAirlineSource(source.sourceUrl)));
});

test("all volatile facts retain current verification dates", () => {
  const dates = [
    ...airlineOfficialBatch3BRequirements.map((item) => item.verifiedAt),
    ...airlineOfficialBatch3BRecruitmentSteps.map((item) => item.verifiedAt),
    ...airlineOfficialBatch3BGuidance.map((item) => item.verifiedAt),
    ...airlineOfficialBatch3BFleet.map((item) => item.lastVerifiedAt),
    ...airlineOfficialBatch3BRoutes.map((item) => item.lastVerifiedAt),
  ];
  assert.ok(dates.every((date) => freshnessFor(date) === "CURRENT"));
});

test("Batch 3B stats contain only stored production facts", () => {
  assert.deepEqual(airlineOfficialBatch3BStats, {
    retrievedAt: "2026-09-18T00:00:00.000Z",
    profiles: 3,
    sources: 16,
    routes: 6,
    fleet: 21,
    requirements: 26,
    recruitmentSteps: 7,
    guidance: 6,
    officialApplicationQuestions: 0,
    officialInterviewQuestions: 0,
  });
});
