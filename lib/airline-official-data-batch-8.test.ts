import assert from "node:assert/strict";
import test from "node:test";
import { airlineOfficialBatch1Profiles, isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import { airlineOfficialBatch7Stats } from "./airline-official-data-batch-7";
import {
  airlineOfficialBatch8ApplicationQuestions,
  airlineOfficialBatch8Guidance,
  airlineOfficialBatch8InterviewQuestions,
  airlineOfficialBatch8ProfilePatches,
  airlineOfficialBatch8RecruitmentSteps,
  airlineOfficialBatch8Requirements,
  airlineOfficialBatch8Routes,
  airlineOfficialBatch8Stats,
  airlineOfficialBatch8Unresolved,
  applyAirlineOfficialBatch8Patch,
} from "./airline-official-data-batch-8";
import {
  buildAirlineWorkspaceProfiles,
  buildPreparationStatus,
  filterAirlines,
  isAirlineEligibleForAi,
  mergeAirlineRoutes,
  patternConfidence,
} from "./airline-targeting-workspace";

const ids = ["korean_air", "asiana_airlines", "japan_airlines", "tway_air"] as const;
const profiles = buildAirlineWorkspaceProfiles(mergeAirlineRoutes());
const profile = (id: (typeof ids)[number]) => profiles.find((item) => item.id === id)!;
const count = <T extends { airlineId: string }>(items: T[], airlineId: string) => items.filter((item) => item.airlineId === airlineId).length;

test("1 Korean Air adds only sourced archived requirements", () => {
  const items = airlineOfficialBatch8Requirements.filter((item) => item.airlineId === "korean_air");
  assert.equal(items.length, 3);
  assert.ok(items.every((item) => item.recordStatus === "ARCHIVED" && item.source.sourceAuthority === "AIRLINE_OFFICIAL"));
});

test("2 Korean Air hiring stages preserve the official high-level sequence", () => {
  const items = airlineOfficialBatch8RecruitmentSteps.filter((item) => item.airlineId === "korean_air");
  assert.deepEqual(items.map((item) => item.order), [1, 2, 3]);
  assert.deepEqual(items.map((item) => item.title), ["Document screening", "Interview stages", "Medical examination"]);
});

test("3 Korean Air guidance is not promoted to a requirement", () => {
  assert.equal(count(airlineOfficialBatch8Guidance, "korean_air"), 1);
  assert.match(airlineOfficialBatch8Guidance.find((item) => item.airlineId === "korean_air")!.text, /communicated individually/i);
});

test("4 Korean Air hub is source backed and merged", () => {
  assert.deepEqual(profile("korean_air").hubs, ["Incheon International Airport (ICN)"]);
  assert.ok(profile("korean_air").sources.some((item) => item.type === "hub" && item.sourceUrl.includes("koreanair.com")));
});

test("5 Asiana requirements are not invented when no accessible first-party text was verified", () => {
  assert.equal(count(airlineOfficialBatch8Requirements, "asiana_airlines"), 0);
  assert.match(airlineOfficialBatch8Unresolved.asianaRecruitment, /No accessible first-party/i);
});

test("6 Asiana stages stay unresolved", () => assert.equal(count(airlineOfficialBatch8RecruitmentSteps, "asiana_airlines"), 0));
test("7 Asiana guidance stays unresolved", () => assert.equal(count(airlineOfficialBatch8Guidance, "asiana_airlines"), 0));

test("8 JAL uses the official Japanese recruitment host", () => {
  const urls = airlineOfficialBatch8ProfilePatches.find((item) => item.airlineId === "japan_airlines")!.sources.map((item) => item.sourceUrl);
  assert.ok(urls.every((url) => new URL(url).hostname === "www.job-jal.com"));
});

test("9 JAL requirements are sourced from the current new-graduate record", () => {
  const items = airlineOfficialBatch8Requirements.filter((item) => item.airlineId === "japan_airlines");
  assert.equal(items.length, 5);
  assert.ok(items.every((item) => item.recruitmentType === "NEW_GRADUATE" && item.recordStatus === "CURRENT"));
});

test("10 JAL stages are retained as an archived career record", () => {
  const items = airlineOfficialBatch8RecruitmentSteps.filter((item) => item.airlineId === "japan_airlines");
  assert.deepEqual(items.map((item) => item.order), [1, 2, 3]);
  assert.ok(items.every((item) => item.recordStatus === "ARCHIVED"));
});

test("11 JAL recruitment types never collapse new-graduate and career records", () => {
  assert.ok(airlineOfficialBatch8Requirements.filter((item) => item.airlineId === "japan_airlines").every((item) => item.recruitmentType === "NEW_GRADUATE"));
  assert.ok(airlineOfficialBatch8RecruitmentSteps.filter((item) => item.airlineId === "japan_airlines").every((item) => item.recruitmentType === "CAREER"));
});

test("12 T'way operation scope is BOTH only after official domestic and international evidence", () => {
  assert.equal(profile("tway_air").operationScope, "BOTH");
  assert.deepEqual(new Set(airlineOfficialBatch8Routes.map((item) => item.routeScope)), new Set(["DOMESTIC", "INTERNATIONAL"]));
});

test("13 T'way route records use current official timetable provenance", () => {
  assert.deepEqual(airlineOfficialBatch8Routes.map((item) => `${item.originAirport}-${item.destinationAirport}`), ["GMP-CJU", "ICN-KIX"]);
  assert.ok(airlineOfficialBatch8Routes.every((item) => item.source.sourceUrl.includes("trinityairways.com/app/serviceInfo/flightSchedule")));
});

test("14 T'way requirements stay bound to the archived intern exercise", () => {
  const items = airlineOfficialBatch8Requirements.filter((item) => item.airlineId === "tway_air");
  assert.equal(items.length, 3);
  assert.ok(items.every((item) => item.recruitmentType === "INTERN" && item.recordStatus === "ARCHIVED"));
});

test("15 T'way stages and guidance remain sourced and versioned", () => {
  const steps = airlineOfficialBatch8RecruitmentSteps.filter((item) => item.airlineId === "tway_air");
  const guidance = airlineOfficialBatch8Guidance.filter((item) => item.airlineId === "tway_air");
  assert.equal(steps.length, 4);
  assert.equal(guidance.length, 2);
  assert.ok([...steps, ...guidance].every((item) => item.recordStatus === "ARCHIVED" && item.recruitmentPeriod?.includes("2026")));
});

test("16 official-question strict gate stores no inferred wording", () => {
  assert.equal(airlineOfficialBatch8ApplicationQuestions.length, 0);
  assert.equal(airlineOfficialBatch8InterviewQuestions.length, 0);
  assert.equal(patternConfidence(0), "INSUFFICIENT");
});

test("17 unsupported application and interview questions remain excluded for every target", () => {
  assert.deepEqual(airlineOfficialBatch8Unresolved.officialQuestions, ids);
});

test("18 current and archived recruitment records remain distinguishable", () => {
  const records = [...airlineOfficialBatch8Requirements, ...airlineOfficialBatch8RecruitmentSteps, ...airlineOfficialBatch8Guidance];
  assert.ok(records.some((item) => item.recordStatus === "CURRENT"));
  assert.ok(records.some((item) => item.recordStatus === "ARCHIVED"));
  assert.ok(records.every((item) => item.recruitmentPeriod && item.recruitmentType && item.recordStatus));
});

test("19 applying the same profile patch twice does not duplicate a source", () => {
  const base = airlineOfficialBatch1Profiles.find((item) => item.airlineId === "korean_air")!;
  const patch = airlineOfficialBatch8ProfilePatches.find((item) => item.airlineId === "korean_air")!;
  const once = applyAirlineOfficialBatch8Patch(base, patch).profile;
  const twice = applyAirlineOfficialBatch8Patch(once, patch).profile;
  assert.equal(new Set(twice.sources.map((item) => `${item.type}:${item.sourceUrl}`)).size, twice.sources.length);
  assert.equal(twice.sources.length, once.sources.length);
});

test("20 conflicting profile facts fail safe instead of overwriting", () => {
  const base = airlineOfficialBatch1Profiles.find((item) => item.airlineId === "korean_air")!;
  const patch = airlineOfficialBatch8ProfilePatches.find((item) => item.airlineId === "korean_air")!;
  const conflictBase = { ...base, hubs: ["A different verified hub"] };
  const result = applyAirlineOfficialBatch8Patch(conflictBase, patch);
  assert.deepEqual(result.profile.hubs, conflictBase.hubs);
  assert.deepEqual(result.conflicts, ["hubs"]);
});

test("21 AI context remains disabled for all four target airlines", () => {
  assert.ok(ids.every((id) => profile(id).aiContextEnabled === false && !isAirlineEligibleForAi(profile(id))));
});

test("22 gap-fill coverage improves only where source-backed records exist", () => {
  const featureCount = (id: (typeof ids)[number]) => [
    (profile(id).cabinCrewRequirements?.length ?? 0) > 0,
    (profile(id).recruitmentProcess?.length ?? 0) > 0,
    (profile(id).recruitmentGuidance?.length ?? 0) > 0,
    profile(id).hubs.length > 0,
    mergeAirlineRoutes().some((item) => item.airlineId === id),
  ].filter(Boolean).length;
  assert.equal(featureCount("korean_air"), 5);
  assert.ok(featureCount("japan_airlines") >= 4);
  assert.ok(featureCount("tway_air") >= 4);
  assert.ok(featureCount("asiana_airlines") < featureCount("korean_air"));
});

test("23 prior Batch 7 aggregate remains unchanged", () => {
  assert.deepEqual(airlineOfficialBatch7Stats, { retrievedAt: "2026-09-19T00:00:00.000Z", profiles: 4, sources: 21, routes: 9, fleet: 45, requirements: 21, recruitmentSteps: 22, guidance: 12, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
  assert.deepEqual(airlineOfficialBatch8Stats, { retrievedAt: "2026-09-20T00:00:00.000Z", profilePatches: 3, sources: 7, routes: 2, requirements: 11, recruitmentSteps: 10, guidance: 5, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
});

test("24 fresh-user preparation status remains empty", () => {
  ids.forEach((id) => assert.deepEqual(buildPreparationStatus({ airlineId: id, questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 }));
});

test("25 every new source is HTTPS and exact-host allowlisted", () => {
  const sources = [
    ...airlineOfficialBatch8ProfilePatches.flatMap((item) => item.sources),
    ...airlineOfficialBatch8Requirements.map((item) => item.source),
    ...airlineOfficialBatch8RecruitmentSteps.map((item) => item.source),
    ...airlineOfficialBatch8Guidance.map((item) => item.source),
    ...airlineOfficialBatch8Routes.map((item) => item.source),
  ];
  assert.ok(sources.every((source) => source.sourceUrl.startsWith("https://") && isAllowedOfficialAirlineSource(source.sourceUrl)));
  assert.equal(isAllowedOfficialAirlineSource("https://fake.job-jal.com/recruit"), false);
});

test("26 search and operation filters retain all target identities", () => {
  assert.equal(filterAirlines(profiles, { search: "대한항공" })[0]?.id, "korean_air");
  assert.equal(filterAirlines(profiles, { search: "아시아나" })[0]?.id, "asiana_airlines");
  assert.equal(filterAirlines(profiles, { search: "JAL" })[0]?.id, "japan_airlines");
  assert.equal(filterAirlines(profiles, { search: "티웨이" })[0]?.id, "tway_air");
  assert.ok(filterAirlines(profiles, { operationScope: "DOMESTIC" }).some((item) => item.id === "tway_air"));
  assert.ok(filterAirlines(profiles, { operationScope: "INTERNATIONAL" }).some((item) => item.id === "tway_air"));
});
