import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { buildCompetencyProfiles, emptyResponses, type CompetencyResponses } from "./competency-assessment";
import {
  analyzeNonverbalSignals,
  buildPersonalVisionBaseline,
  deriveCameraCheckStatus,
  shouldResetPersonalBaseline,
  type NonverbalFrameSample,
} from "./nonverbal-signal-coach";
import {
  MEDIAPIPE_POSE_LANDMARKER_MODEL,
  NONVERBAL_POSE_SAMPLE_INTERVAL_MS,
  normalizeMediaPipePoseResult,
  poseFrameToSampleFields,
  selectNonverbalPoseEngine,
  type NonverbalPoseEngine,
} from "./nonverbal-vision-engine";

const frame = (index: number, overrides: Partial<NonverbalFrameSample> = {}): NonverbalFrameSample => ({
  timestampMs: index * 250,
  faceCount: 1,
  faceDetected: true,
  faceCenterX: .5,
  faceCenterY: .45,
  faceAreaRatio: .16,
  headYawApprox: .12,
  headPitchApprox: -.05,
  headRollApprox: 0,
  mouthShapeMetric: .22,
  poseDetected: true,
  poseQuality: "FULL",
  poseTimestampMs: Math.floor(index / 2) * 500,
  shoulderSlope: .18,
  shoulderMidpointX: .5,
  shoulderMidpointY: .56,
  torsoCenterX: .5,
  torsoCenterY: .7,
  landmarkScale: .36,
  ...overrides,
});
const calibration = (count = 17) => Array.from({ length: count }, (_, index) => frame(index));
const baseline = () => {
  const value = buildPersonalVisionBaseline(calibration());
  assert.ok(value);
  return value;
};
const session = (map?: (item: NonverbalFrameSample, index: number) => NonverbalFrameSample) =>
  Array.from({ length: 24 }, (_, index) => {
    const item = frame(index);
    return map ? map(item, index) : item;
  });
const analyze = (samples = session()) => analyzeNonverbalSignals({ enabled: true, supported: true, analyzedDurationMs: 6000, samples, baseline: baseline() });

test("baseline calibration starts only after camera-ready geometry", () => {
  assert.equal(deriveCameraCheckStatus({ enabled: true, permission: "granted", samples: calibration(8), calibration: "CALIBRATING" }), "CALIBRATING");
});
test("baseline requires its minimum face and pose sample counts", () => assert.equal(buildPersonalVisionBaseline(calibration(7)), null));
test("baseline is insufficient before three seconds", () => assert.equal(buildPersonalVisionBaseline(calibration(10)), null));
test("baseline resets after a major framing change", () => assert.equal(shouldResetPersonalBaseline(session(item => ({ ...item, faceCenterX: .85 })), baseline()), true));
test("camera restart clears the baseline buffer", () => {
  const source = readFileSync(new URL("../components/self-introduction/use-nonverbal-camera.ts", import.meta.url), "utf8");
  assert.match(source, /stopCamera[\s\S]*baselineRef\.current = null/);
  assert.match(source, /startCamera[\s\S]*resetBaseline\(\)/);
});
test("shoulder slope is captured in the personal baseline", () => assert.ok(Math.abs(baseline().shoulderSlope - .18) < Number.EPSILON));
test("shoulder slope delta is relative to the baseline", () => assert.ok((analyze(session(item => ({ ...item, shoulderSlope: .23 }))).shoulderSlopeDelta ?? 1) < .051));
test("torso center delta is relative to the baseline", () => assert.ok((analyze(session(item => ({ ...item, torsoCenterX: .54 }))).torsoCenterDelta ?? 1) < .041));
test("stable pose remains stable near the personal baseline", () => assert.equal(analyze().shoulderAlignment, "STABLE"));
test("variable shoulder pose is separated from stable pose", () => assert.equal(analyze(session((item, index) => ({ ...item, shoulderSlope: Math.floor(index / 2) % 2 ? .32 : .18 }))).shoulderAlignment, "VARIABLE"));
test("high shoulder movement is detected from a large baseline delta", () => assert.equal(analyze(session(item => ({ ...item, shoulderSlope: .4 }))).shoulderAlignment, "HIGH_MOVEMENT"));
test("pose unavailable limits only pose metrics", () => {
  const result = analyze(session(item => ({ ...item, poseDetected: false, poseQuality: "INSUFFICIENT", shoulderSlope: undefined })));
  assert.equal(result.fusion, "FACE_ONLY");
  assert.equal(result.shoulderAlignment, "INSUFFICIENT");
  assert.notEqual(result.framingStability, "INSUFFICIENT_SIGNAL");
});
test("face-only fusion is explicit", () => assert.equal(analyzeNonverbalSignals({ enabled: true, supported: true, analyzedDurationMs: 6000, samples: session(item => ({ ...item, poseDetected: false, shoulderSlope: undefined })) }).fusion, "FACE_ONLY"));
test("face-and-pose fusion is explicit", () => assert.equal(analyze().fusion, "FACE_AND_POSE"));
test("multiple faces invalidate baseline calibration", () => assert.equal(buildPersonalVisionBaseline(calibration().map((item, index) => index === 5 ? { ...item, faceCount: 2 } : item)), null));
test("partial body preserves shoulders but withholds torso center", () => {
  const landmarks = Array.from({ length: 33 }, () => ({ x: .5, y: .5, z: 0, visibility: 0 } satisfies NormalizedLandmark));
  landmarks[11] = { x: .3, y: .5, z: 0, visibility: 1 };
  landmarks[12] = { x: .7, y: .52, z: 0, visibility: 1 };
  const normalized = normalizeMediaPipePoseResult({ landmarks: [landmarks] });
  const fields = poseFrameToSampleFields(normalized, 500);
  assert.equal(normalized.signalQuality, "PARTIAL_POSE");
  assert.equal(fields.torsoCenterX, undefined);
});
test("personal baseline prevents an absolute shoulder-slope penalty", () => {
  const customBaseline = { ...baseline(), shoulderSlope: .3 };
  const result = analyzeNonverbalSignals({ enabled: true, supported: true, analyzedDurationMs: 6000, samples: session(item => ({ ...item, shoulderSlope: .3 })), baseline: customBaseline });
  assert.equal(result.shoulderAlignment, "STABLE");
});
test("timeline includes pose summaries in all three phases", () => assert.deepEqual(analyze().timeline.map(item => item.poseMovement), ["STABLE", "STABLE", "STABLE"]));
test("nonverbal result has no overall score", () => assert.doesNotMatch(JSON.stringify(analyze()), /overallScore|aggregateScore|nonverbalScore/i));
test("nonverbal result has no emotion inference", () => assert.doesNotMatch(JSON.stringify(analyze()), /emotion/i));
test("nonverbal result has no personality inference", () => assert.doesNotMatch(JSON.stringify(analyze()), /personality/i));
test("nonverbal result has no hiring inference", () => assert.doesNotMatch(JSON.stringify(analyze()), /hire|hiring|passProbability/i));
test("vision availability cannot change competency bands", () => {
  const responses = emptyResponses();
  const videoBase = { attemptId: "a", completedAt: new Date(0).toISOString(), transcript: "실제 답변", actualTranscript: true };
  const withVision: CompetencyResponses = { ...responses, video: { "VID-01": { ...videoBase, nonverbalAvailable: true } } };
  const withoutVision: CompetencyResponses = { ...responses, video: { "VID-01": { ...videoBase, nonverbalAvailable: false } } };
  assert.deepEqual(buildCompetencyProfiles(withVision), buildCompetencyProfiles(withoutVision));
});
test("pose failure does not remove face coaching", () => assert.equal(analyze(session(item => ({ ...item, poseDetected: false, shoulderSlope: undefined }))).fusion, "FACE_ONLY"));
test("speech failure does not remove pose-only coaching", () => {
  const result = analyzeNonverbalSignals({ enabled: true, supported: true, analyzedDurationMs: 6000, samples: session(item => ({ ...item, faceCount: 0, faceDetected: false, faceCenterX: undefined, faceCenterY: undefined })) , baseline: baseline() });
  assert.equal(result.fusion, "POSE_ONLY");
  assert.equal(result.shoulderAlignment, "STABLE");
});
test("raw pose landmarks and frames are not persisted in summaries", () => assert.doesNotMatch(JSON.stringify(analyze()), /landmarks|rawFrame|rawVideo|screenshot/i));
test("camera hook has no raw frame upload path", () => {
  const source = readFileSync(new URL("../components/self-introduction/use-nonverbal-camera.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /fetch\(|FormData|drawImage|toDataURL|upload/);
});
test("face and pose engines are both closed during cleanup", () => {
  const source = readFileSync(new URL("../components/self-introduction/use-nonverbal-camera.ts", import.meta.url), "utf8");
  assert.match(source, /faceEngineRef\.current\?\.dispose\(\)/);
  assert.match(source, /poseEngineRef\.current\?\.dispose\(\)/);
  assert.match(source, /getTracks\(\)\.forEach\(track => track\.stop\(\)\)/);
});
test("face and pose inference each have independent backpressure", () => {
  const source = readFileSync(new URL("../components/self-introduction/use-nonverbal-camera.ts", import.meta.url), "utf8");
  assert.match(source, /faceDetectingRef\.current/);
  assert.match(source, /poseDetectingRef\.current/);
  assert.match(source, /visionDetectingRef\.current/);
  assert.match(source, /faceDropped/);
  assert.match(source, /poseDropped/);
});
test("Korean and English result copy stays observational", () => {
  const source = readFileSync(new URL("../components/self-introduction/nonverbal-signal-components.tsx", import.meta.url), "utf8");
  assert.match(source, /관찰|변화/);
  assert.doesNotMatch(source, /전문성이 떨어|면접에 부적합/);
  assert.match(source, /Shoulder alignment varied more/);
  assert.match(source, /Upper-body position shifted more/);
  assert.doesNotMatch(source, /unprofessional|bad posture/i);
});
test("pose uses the official pinned model and two-FPS sampling", () => {
  assert.match(MEDIAPIPE_POSE_LANDMARKER_MODEL, /pose_landmarker_lite\/float16\/1\/pose_landmarker_lite\.task$/);
  assert.equal(NONVERBAL_POSE_SAMPLE_INTERVAL_MS, 500);
});
test("pose initialization fails closed without affecting face engine selection", async () => {
  const fake: NonverbalPoseEngine = { initialize: async () => { throw new Error("pose"); }, analyzeFrame: async () => ({ poseDetected: false, signalQuality: "INSUFFICIENT" }), dispose: () => undefined };
  const result = await selectNonverbalPoseEngine(() => fake);
  assert.equal(result.status, "POSE_INIT_FAILED");
  assert.equal(result.engine, null);
});
