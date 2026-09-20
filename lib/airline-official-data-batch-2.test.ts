import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedOfficialAirlineSource } from "./airline-official-data-batch-1";
import {
  airlineOfficialBatch2Fleet,
  airlineOfficialBatch2Profiles,
  airlineOfficialBatch2Questions,
  airlineOfficialBatch2RecruitmentPostings,
  airlineOfficialBatch2Routes,
  airlineOfficialBatch2Stats,
} from "./airline-official-data-batch-2";
import {
  buildAirlineWorkspaceProfiles,
  buildPracticeLineage,
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
const targetIds = ["jeju_air", "jin_air", "tway_air", "air_busan"] as const;
const profileFor = (id: (typeof targetIds)[number]) => profiles.find((profile) => profile.id === id);

test("Batch 2 connects all four existing Korean airline master profiles", () => {
  assert.equal(airlineOfficialBatch2Profiles.length, 4);
  assert.ok(targetIds.every((id) => profileFor(id)));
  assert.ok(targetIds.every((id) => profileFor(id)?.countryCode === "KR"));
});

test("Batch 2 sources are HTTPS and pass the expanded official host allowlist", () => {
  const sourceUrls = [
    ...airlineOfficialBatch2Profiles.flatMap((profile) => profile.sources.map((source) => source.sourceUrl)),
    ...airlineOfficialBatch2Fleet.map((entry) => entry.source.sourceUrl),
    ...airlineOfficialBatch2Routes.map((entry) => entry.source.sourceUrl),
    ...airlineOfficialBatch2RecruitmentPostings.map((entry) => entry.sourceUrl),
  ];
  assert.ok(sourceUrls.length > 0);
  assert.ok(sourceUrls.every(isAllowedOfficialAirlineSource));
});

test("Korea and low-cost carrier filters include the Batch 2 targets", () => {
  const koreanIds = filterAirlines(profiles, { countryGroup: "KOREA" }).map((profile) => profile.id);
  const lowCostIds = filterAirlines(profiles, { carrierType: "LOW_COST" }).map((profile) => profile.id);
  assert.ok(targetIds.every((id) => koreanIds.includes(id)));
  assert.ok(targetIds.every((id) => lowCostIds.includes(id)));
});

test("source-backed operation scope includes the later current T'way network patch", () => {
  assert.equal(profileFor("jeju_air")?.operationScope, "BOTH");
  assert.equal(profileFor("jin_air")?.operationScope, "BOTH");
  assert.equal(profileFor("air_busan")?.operationScope, "BOTH");
  assert.equal(airlineOfficialBatch2Profiles.find((profile) => profile.airlineId === "tway_air")?.operationScope, undefined);
  assert.equal(profileFor("tway_air")?.operationScope, "BOTH");
});

test("Air Busan's low-cost classification is explicitly source-backed and other existing classifications are retained", () => {
  assert.equal(profileFor("air_busan")?.carrierType, "LOW_COST");
  assert.ok(airlineOfficialBatch2Profiles.find((profile) => profile.airlineId === "air_busan")?.sources.some((source) => source.type === "carrier_type"));
});

test("Batch 2 does not infer hubs from departure cities", () => {
  assert.ok(airlineOfficialBatch2Profiles.every((profile) => profile.hubs.length === 0));
});

test("Jeju Air and Air Busan fleet are source-backed, while Jin Air has no invented fleet entry", () => {
  assert.equal(fleet.filter((entry) => entry.airlineId === "jeju_air").length, 2);
  assert.equal(fleet.filter((entry) => entry.airlineId === "air_busan").length, 4);
  assert.equal(fleet.filter((entry) => entry.airlineId === "jin_air").length, 0);
});

test("T'way legacy records are clearly source-backed and retain no inferred quantity", () => {
  const twayFleet = fleet.filter((entry) => entry.airlineId === "tway_air");
  assert.deepEqual(twayFleet.map((entry) => entry.aircraftModel), ["737-8", "737-800", "777-300ER", "A330-300", "A330-200"]);
  assert.ok(twayFleet.every((entry) => entry.quantity === null));
});

test("all Batch 2 fleet quantities remain nullable rather than inferred", () => {
  assert.ok(airlineOfficialBatch2Fleet.every((entry) => entry.quantity === null));
  assert.ok(airlineOfficialBatch2Fleet.every((entry) => Boolean(entry.source.sourceUrl) && Boolean(entry.lastVerifiedAt)));
});

test("Batch 2 routes include confirmed domestic and international examples", () => {
  assert.equal(airlineOfficialBatch2Routes.filter((route) => route.routeScope === "DOMESTIC").length, 3);
  assert.equal(airlineOfficialBatch2Routes.filter((route) => route.routeScope === "INTERNATIONAL").length, 3);
  assert.ok(airlineOfficialBatch2Routes.every((route) => route.routeScope === (route.originCountry === route.destinationCountry ? "DOMESTIC" : "INTERNATIONAL")));
});

test("city labels are retained when an official route source did not expose both airport codes", () => {
  const jejuDomestic = airlineOfficialBatch2Routes.find((route) => route.id === "batch2-jeju-icn-cju");
  const airBusanDomestic = airlineOfficialBatch2Routes.find((route) => route.id === "batch2-airbusan-pus-cju");
  assert.equal(jejuDomestic?.originAirport, "서울(인천)");
  assert.equal(airBusanDomestic?.originAirport, "부산");
});

test("freshness is explicit: current Batch 2 records are current and historical T'way operation evidence is stale", () => {
  assert.equal(freshnessFor(airlineOfficialBatch2Stats.retrievedAt), "CURRENT");
  const staleSource = airlineOfficialBatch2Profiles.find((profile) => profile.airlineId === "tway_air")?.sources.find((source) => source.status === "STALE");
  assert.ok(staleSource);
  assert.equal(freshnessFor(staleSource?.verifiedAt), "STALE");
});

test("all four profiles preserve a source-backed career entry without inventing a recruitment question", () => {
  assert.ok(targetIds.every((id) => Boolean(profileFor(id)?.careersUrl)));
  assert.equal(airlineOfficialBatch2Questions.length, 0);
  assert.equal(airlineOfficialBatch2Stats.officialQuestions, 0);
});

test("only an official archived cabin-crew posting is retained, with no fabricated recruitment period", () => {
  assert.equal(airlineOfficialBatch2RecruitmentPostings.length, 1);
  assert.deepEqual(airlineOfficialBatch2RecruitmentPostings[0], {
    airlineId: "tway_air",
    year: 2024,
    position: "신입 객실 인턴 승무원",
    sourceUrl: "https://www.twayair.com/app/company/NEWS/retrieve/3874",
    sourceTitle: "T'way Air Cabin Intern Recruitment Release",
    verifiedAt: "2024-10-30T00:00:00.000Z",
    status: "VERIFIED_ARCHIVE",
  });
});

test("no official questions means no pattern and no fake fresh-user preparation", () => {
  assert.equal(patternConfidence(airlineOfficialBatch2Questions.length), "INSUFFICIENT");
  assert.ok(targetIds.every((id) => profileFor(id) && !isAirlineEligibleForAi(profileFor(id)!)));
});

test("Batch 2 profiles never auto-enable canonical AI context", () => {
  assert.ok(airlineOfficialBatch2Profiles.every((profile) => profile.aiContextEnabled === false));
  assert.ok(targetIds.every((id) => !isAirlineEligibleForAi(profileFor(id)!)));
});

test("existing answer and practice lineage remains available only for an actual stored question", () => {
  const lineage = buildPracticeLineage("jeju_air", {
    id: "user-question",
    airlineId: "jeju_air",
    questionText: "직접 입력한 질문",
    kind: "INTERVIEW",
    sourceType: "USER_REPORTED",
    position: "객실승무원",
    category: "OTHER",
    verified: false,
    createdAt: "2026-09-17T00:00:00.000Z",
  });
  assert.deepEqual(lineage, { source: "airline_workspace", airlineId: "jeju_air", workspaceQuestionId: "user-question", questionKind: "INTERVIEW" });
});
