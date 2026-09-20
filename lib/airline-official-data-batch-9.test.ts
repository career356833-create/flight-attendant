import assert from "node:assert/strict";
import test from "node:test";
import { airlineOfficialBatch2Profiles } from "./airline-official-data-batch-2";
import { airlineOfficialBatch8Stats } from "./airline-official-data-batch-8";
import {
  airlineOfficialBatch9ApplicationQuestions,
  airlineOfficialBatch9Coverage,
  airlineOfficialBatch9Fleet,
  airlineOfficialBatch9Guidance,
  airlineOfficialBatch9InterviewQuestions,
  airlineOfficialBatch9KoreaRouteStatus,
  airlineOfficialBatch9ProfilePatches,
  airlineOfficialBatch9RecruitmentSteps,
  airlineOfficialBatch9Requirements,
  airlineOfficialBatch9Stats,
  applyAirlineOfficialBatch9Patch,
} from "./airline-official-data-batch-9";
import {
  buildAirlineWorkspaceProfiles,
  buildPreparationStatus,
  getSourceBackedWorkspaceQuestions,
  isAirlineEligibleForAi,
  mergeAirlineFleet,
  mergeAirlineRoutes,
  patternConfidence,
} from "./airline-targeting-workspace";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";

const ids = ["jeju_air", "jin_air", "air_busan", "british_airways"] as const;
const profiles = buildAirlineWorkspaceProfiles(mergeAirlineRoutes());
const profile = (id: (typeof ids)[number]) => profiles.find((item) => item.id === id)!;
const count = <T extends { airlineId: string }>(items: T[], airlineId: string) => items.filter((item) => item.airlineId === airlineId).length;

test("1 Jeju archived recruitment adds only directly sourced requirements", () => {
  const items = airlineOfficialBatch9Requirements.filter((item) => item.airlineId === "jeju_air");
  assert.equal(items.length, 4);
  assert.ok(items.every((item) => item.recordStatus === "ARCHIVED" && item.recruitmentType === "INTERN"));
});

test("2 Jeju profile uses the official recruiter without inventing a hub", () => {
  assert.equal(profile("jeju_air").careersUrl, "https://jejuair.recruiter.co.kr/career/home");
  assert.deepEqual(profile("jeju_air").hubs, []);
});

test("3 Jeju stages and guidance preserve their documented boundaries", () => {
  assert.deepEqual(airlineOfficialBatch9RecruitmentSteps.filter((item) => item.airlineId === "jeju_air").map((item) => item.order), [1, 2, 3]);
  assert.equal(count(airlineOfficialBatch9Guidance, "jeju_air"), 3);
});

test("4 Jeju has no inferred official question", () => {
  assert.equal(airlineOfficialBatch9InterviewQuestions.filter((item) => item.airlineId === "jeju_air").length, 0);
  assert.equal(airlineOfficialBatch9ApplicationQuestions.length, 0);
});

test("5 Jin fleet contains only the source-backed 737-800 record", () => {
  assert.deepEqual(airlineOfficialBatch9Fleet.map((item) => [item.airlineId, item.aircraftModel]), [["jin_air", "737-800"]]);
  assert.ok(mergeAirlineFleet().some((item) => item.id === "9-jin-b737-800"));
});

test("6 Jin fleet quantity stays nullable", () => assert.equal(airlineOfficialBatch9Fleet[0].quantity, null));

test("7 Jin recruitment is an archived online-presentation record", () => {
  const steps = airlineOfficialBatch9RecruitmentSteps.filter((item) => item.airlineId === "jin_air");
  assert.equal(steps.length, 1);
  assert.equal(steps[0].recordStatus, "ARCHIVED");
  assert.match(steps[0].title, /Online presentation/);
});

test("8 Jin unsupported general requirements are not invented", () => assert.equal(count(airlineOfficialBatch9Requirements, "jin_air"), 0));

test("9 Jin's directly published presentation prompt is the sole official question", () => {
  assert.equal(airlineOfficialBatch9InterviewQuestions.length, 1);
  assert.equal(airlineOfficialBatch9InterviewQuestions[0].airlineId, "jin_air");
  assert.equal(airlineOfficialBatch9InterviewQuestions[0].sourceType, "OFFICIAL_INTERVIEW");
  assert.match(airlineOfficialBatch9InterviewQuestions[0].questionText, /다른 직업을 가진 승객/);
});

test("10 the Jin official question is connected to the workspace", () => {
  assert.deepEqual(getSourceBackedWorkspaceQuestions("jin_air").map((item) => item.id), ["9-jin-2025-video-presentation"]);
  assert.equal(patternConfidence(1), "INSUFFICIENT");
});

test("11 Air Busan requirements remain bound to the archived intern exercise", () => {
  const items = airlineOfficialBatch9Requirements.filter((item) => item.airlineId === "air_busan");
  assert.equal(items.length, 4);
  assert.ok(items.every((item) => item.recordStatus === "ARCHIVED" && item.recruitmentType === "INTERN"));
});

test("12 Air Busan stages follow the six published stages", () => {
  assert.deepEqual(airlineOfficialBatch9RecruitmentSteps.filter((item) => item.airlineId === "air_busan").map((item) => item.order), [1, 2, 3, 4, 5, 6]);
});

test("13 Air Busan city-base provenance does not invent an airport", () => {
  assert.deepEqual(profile("air_busan").hubs, ["Busan, Republic of Korea"]);
  const source = profile("air_busan").sources.find((item) => item.type === "hub")!;
  assert.match(source.value, /no airport hub is inferred/i);
});

test("14 British Airways Korea route remains UNKNOWN", () => {
  assert.equal(airlineOfficialBatch9KoreaRouteStatus.status, "UNKNOWN");
  assert.match(airlineOfficialBatch9KoreaRouteStatus.reason, /operating carrier/i);
});

test("15 British Airways partner and codeshare surfaces create no route record", () => {
  assert.equal(mergeAirlineRoutes().filter((item) => item.airlineId === "british_airways" && [item.originCountry, item.destinationCountry].includes("KR")).length, 0);
});

test("16 current and archived semantics are not fabricated", () => {
  const records = [...airlineOfficialBatch9Requirements, ...airlineOfficialBatch9RecruitmentSteps, ...airlineOfficialBatch9Guidance];
  assert.ok(records.length > 0);
  assert.ok(records.every((item) => item.recordStatus === "ARCHIVED" && item.recruitmentPeriod));
});

test("17 applying a patch twice prevents duplicate type and source URL pairs", () => {
  const base = airlineOfficialBatch2Profiles.find((item) => item.airlineId === "jeju_air")!;
  const patch = airlineOfficialBatch9ProfilePatches.find((item) => item.airlineId === "jeju_air")!;
  const once = applyAirlineOfficialBatch9Patch(base, patch).profile;
  const twice = applyAirlineOfficialBatch9Patch(once, patch).profile;
  assert.equal(twice.sources.length, once.sources.length);
  assert.equal(new Set(twice.sources.map((item) => `${item.type}:${item.sourceUrl}`)).size, twice.sources.length);
});

test("18 conflicting profile values fail safe", () => {
  const base = airlineOfficialBatch2Profiles.find((item) => item.airlineId === "air_busan")!;
  const patch = airlineOfficialBatch9ProfilePatches.find((item) => item.airlineId === "air_busan")!;
  const result = applyAirlineOfficialBatch9Patch({ ...base, hubs: ["A separately verified airport"] }, patch);
  assert.deepEqual(result.profile.hubs, ["A separately verified airport"]);
  assert.deepEqual(result.conflicts, ["hubs"]);
});

test("19 exact recruiter hosts are allowlisted without wildcard trust", () => {
  ["https://jejuair.recruiter.co.kr/career/home", "https://jinair.recruiter.co.kr/", "https://airbusan.recruiter.co.kr/"].forEach((url) => assert.equal(isAllowedOfficialAirlineSource(url), true));
  assert.equal(isAllowedOfficialAirlineSource("https://fake.jejuair.recruiter.co.kr/career/home"), false);
});

test("20 AI context remains disabled for all targets", () => {
  assert.ok(ids.every((id) => profile(id).aiContextEnabled === false && !isAirlineEligibleForAi(profile(id))));
});

test("21 coverage records honest deltas instead of invented scores", () => {
  assert.deepEqual(airlineOfficialBatch9Coverage.before, { jeju_air: 33, jin_air: 30, air_busan: 38, british_airways: 73 });
  assert.deepEqual(airlineOfficialBatch9Coverage.after, { jeju_air: null, jin_air: null, air_busan: null, british_airways: 73 });
});

test("22 official data does not create fresh-user activity", () => {
  ids.forEach((airlineId) => assert.deepEqual(buildPreparationStatus({ airlineId, questions: [], answers: [], attempts: [], experiences: [] }), { applicationQuestionCount: 0, answeredApplicationCount: 0, interviewQuestionCount: 0, practicedInterviewCount: 0, linkedExperienceCount: 0 }));
});

test("23 prior Batch 8 aggregate remains unchanged", () => {
  assert.deepEqual(airlineOfficialBatch8Stats, { retrievedAt: "2026-09-20T00:00:00.000Z", profilePatches: 3, sources: 7, routes: 2, requirements: 11, recruitmentSteps: 10, guidance: 5, officialApplicationQuestions: 0, officialInterviewQuestions: 0 });
});

test("24 Batch 9 aggregate is deterministic", () => {
  assert.deepEqual(airlineOfficialBatch9Stats, { retrievedAt: "2026-09-20T00:00:00.000Z", profilePatches: 4, sources: 11, fleet: 1, requirements: 8, recruitmentSteps: 10, guidance: 9, officialApplicationQuestions: 0, officialInterviewQuestions: 1 });
});
