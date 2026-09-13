import assert from "node:assert/strict";
import { test } from "node:test";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  isFreshVisionVideoFrame,
  nextVisionAnalysisTimestamp,
  MEDIAPIPE_FACE_LANDMARKER_MODEL,
  MEDIAPIPE_VISION_VERSION,
  MEDIAPIPE_WASM_PATH,
  NONVERBAL_SAMPLE_INTERVAL_MS,
  normalizeMediaPipeResult,
  normalizeNativeFaces,
  selectNonverbalVisionEngine,
  visionFrameToSample,
  type NonverbalVisionBackend,
  type NonverbalVisionEngine,
  type VisionFrameAnalysis,
} from "./nonverbal-vision-engine";

const landmark = (x: number, y: number): NormalizedLandmark => ({ x, y, z: 0, visibility: 1 });
const face = () => {
  const values = Array.from({ length: 478 }, () => landmark(.5, .5));
  values[1] = landmark(.52, .48);
  values[13] = landmark(.5, .61);
  values[14] = landmark(.5, .64);
  values[33] = landmark(.38, .4);
  values[61] = landmark(.4, .62);
  values[263] = landmark(.62, .42);
  values[291] = landmark(.6, .62);
  values[100] = landmark(.3, .25);
  values[200] = landmark(.7, .75);
  return values;
};

class FakeEngine implements NonverbalVisionEngine {
  initialized = 0;
  disposed = 0;
  analyzed = 0;
  constructor(readonly backend: NonverbalVisionBackend, private readonly initError = false, private readonly analyzeError = false) {}
  async initialize() { this.initialized += 1; if (this.initError) throw new Error("init"); }
  async analyzeFrame() { this.analyzed += 1; if (this.analyzeError) throw new Error("analyze"); return { faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" as const }; }
  dispose() { this.disposed += 1; }
}

test("pins the official MediaPipe package and asset locations", () => {
  assert.equal(MEDIAPIPE_VISION_VERSION, "1.0.1");
  assert.match(MEDIAPIPE_WASM_PATH, /@mediapipe\/tasks-vision@1\.0\.1\/wasm$/);
  assert.match(MEDIAPIPE_FACE_LANDMARKER_MODEL, /face_landmarker\/float16\/1\/face_landmarker\.task$/);
});

test("samples at four frames per second", () => assert.equal(NONVERBAL_SAMPLE_INTERVAL_MS, 250));

test("keeps MediaPipe video timestamps monotonic across check and recording phases", () => {
  assert.equal(nextVisionAnalysisTimestamp(1200, 1000), 1200);
  assert.equal(nextVisionAnalysisTimestamp(5, 1200), 1200.001);
});

test("skips duplicate or stale video frames before MediaPipe inference", () => {
  assert.equal(isFreshVisionVideoFrame(1.25, 1.2), true);
  assert.equal(isFreshVisionVideoFrame(1.25, 1.25), false);
  assert.equal(isFreshVisionVideoFrame(1.2, 1.25), false);
  assert.equal(isFreshVisionVideoFrame(Number.NaN, 1.25), false);
});

test("normalizes no MediaPipe face", () => assert.deepEqual(normalizeMediaPipeResult({ faceLandmarks: [] }), { faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" }));

test("normalizes multiple MediaPipe faces without metrics", () => {
  assert.deepEqual(normalizeMediaPipeResult({ faceLandmarks: [face(), face()] }), { faceCount: 2, faceDetected: true, signalQuality: "INSUFFICIENT" });
});

test("normalizes one MediaPipe face bounding box", () => {
  const result = normalizeMediaPipeResult({ faceLandmarks: [face()] });
  assert.equal(result.faceBox?.x, .3);
  assert.equal(result.faceBox?.y, .25);
  assert.ok(Math.abs((result.faceBox?.width ?? 0) - .4) < Number.EPSILON);
  assert.equal(result.faceBox?.height, .5);
});

test("maps MediaPipe eyes", () => {
  const result = normalizeMediaPipeResult({ faceLandmarks: [face()] });
  assert.deepEqual(result.leftEye, { x: .38, y: .4, z: 0 });
  assert.deepEqual(result.rightEye, { x: .62, y: .42, z: 0 });
});

test("maps MediaPipe nose", () => assert.deepEqual(normalizeMediaPipeResult({ faceLandmarks: [face()] }).nose, { x: .52, y: .48, z: 0 }));

test("maps MediaPipe mouth geometry", () => {
  const result = normalizeMediaPipeResult({ faceLandmarks: [face()] });
  assert.deepEqual(result.mouthLeft, { x: .4, y: .62, z: 0 });
  assert.deepEqual(result.mouthRight, { x: .6, y: .62, z: 0 });
  assert.deepEqual(result.mouthTop, { x: .5, y: .61, z: 0 });
  assert.deepEqual(result.mouthBottom, { x: .5, y: .64, z: 0 });
});

test("MediaPipe landmarks provide full signal quality", () => {
  assert.equal(normalizeMediaPipeResult({ faceLandmarks: [face()] }).signalQuality, "FULL");
});

test("handles empty landmark rows as no face", () => assert.deepEqual(normalizeMediaPipeResult({ faceLandmarks: [[]] }), { faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" }));

test("converts a normalized frame to the existing coach sample contract", () => {
  const sample = visionFrameToSample(normalizeMediaPipeResult({ faceLandmarks: [face()] }), 500);
  assert.equal(sample.timestampMs, 500);
  assert.equal(sample.faceCount, 1);
  assert.equal(sample.faceDetected, true);
  assert.ok((sample.faceAreaRatio ?? 0) > 0);
});

test("derives a finite yaw proxy", () => assert.ok(Number.isFinite(visionFrameToSample(normalizeMediaPipeResult({ faceLandmarks: [face()] }), 0).headYawApprox)));
test("derives a finite pitch proxy", () => assert.ok(Number.isFinite(visionFrameToSample(normalizeMediaPipeResult({ faceLandmarks: [face()] }), 0).headPitchApprox)));
test("derives a finite roll proxy", () => assert.ok(Number.isFinite(visionFrameToSample(normalizeMediaPipeResult({ faceLandmarks: [face()] }), 0).headRollApprox)));
test("derives a finite mouth-shape proxy", () => assert.ok(Number.isFinite(visionFrameToSample(normalizeMediaPipeResult({ faceLandmarks: [face()] }), 0).mouthShapeMetric)));

test("does not fabricate metrics for zero faces", () => {
  assert.deepEqual(visionFrameToSample({ faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" }, 25), { timestampMs: 25, faceCount: 0, faceDetected: false });
});

test("does not fabricate metrics for multiple faces", () => {
  assert.deepEqual(visionFrameToSample({ faceCount: 2, faceDetected: true, signalQuality: "INSUFFICIENT" }, 25), { timestampMs: 25, faceCount: 2, faceDetected: true });
});

test("normalizes native FaceDetector coordinates", () => {
  const result = normalizeNativeFaces([{ boundingBox: { x: 100, y: 50, width: 200, height: 200 }, landmarks: [
    { type: "eye", locations: [{ x: 150, y: 100 }, { x: 250, y: 105 }] },
    { type: "nose", locations: [{ x: 205, y: 145 }] },
    { type: "mouth", locations: [{ x: 170, y: 190 }, { x: 235, y: 190 }] },
  ] }], 400, 400);
  assert.deepEqual(result.faceBox, { x: .25, y: .125, width: .5, height: .5 });
  assert.deepEqual(result.nose, { x: .5125, y: .3625 });
  assert.equal(result.signalQuality, "FULL");
});

test("native bounding box without landmarks is framing-only", () => {
  const result = normalizeNativeFaces([{ boundingBox: { x: 10, y: 10, width: 50, height: 50 } }], 100, 100);
  assert.equal(result.signalQuality, "FRAMING_ONLY");
});

test("normalizes native multiple faces without metrics", () => {
  const value = { boundingBox: { x: 0, y: 0, width: 10, height: 10 } };
  assert.deepEqual(normalizeNativeFaces([value, value], 100, 100), { faceCount: 2, faceDetected: true, signalQuality: "INSUFFICIENT" });
});

test("selects MediaPipe first", async () => {
  const mediaPipe = new FakeEngine("mediapipe");
  const native = new FakeEngine("native_face_detector");
  const selected = await selectNonverbalVisionEngine({ mediaPipe: () => mediaPipe, native: () => native });
  assert.equal(selected.status, "MEDIAPIPE_READY");
  assert.equal(selected.backend, "mediapipe");
  assert.equal(mediaPipe.initialized, 1);
  assert.equal(native.initialized, 0);
});

test("falls back to native when MediaPipe initialization fails", async () => {
  const mediaPipe = new FakeEngine("mediapipe", true);
  const native = new FakeEngine("native_face_detector");
  const selected = await selectNonverbalVisionEngine({ mediaPipe: () => mediaPipe, native: () => native });
  assert.equal(selected.status, "NATIVE_READY");
  assert.equal(selected.backend, "native_face_detector");
  assert.equal(mediaPipe.disposed, 1);
});

test("fails closed when both engines fail initialization", async () => {
  const selected = await selectNonverbalVisionEngine({ mediaPipe: () => new FakeEngine("mediapipe", true), native: () => new FakeEngine("native_face_detector", true) });
  assert.deepEqual(selected, { engine: null, status: "INIT_FAILED", backend: "unsupported" });
});

test("falls back at runtime when MediaPipe detection throws", async () => {
  const mediaPipe = new FakeEngine("mediapipe", false, true);
  const native = new FakeEngine("native_face_detector");
  const selected = await selectNonverbalVisionEngine({ mediaPipe: () => mediaPipe, native: () => native });
  const frame = await selected.engine!.analyzeFrame({} as HTMLVideoElement, 100);
  assert.deepEqual(frame, { faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" });
  assert.equal(selected.engine!.backend, "native_face_detector");
  assert.equal(native.initialized, 1);
  assert.equal(native.analyzed, 1);
});

test("does not retry a failed runtime fallback loop", async () => {
  const mediaPipe = new FakeEngine("mediapipe", false, true);
  const native = new FakeEngine("native_face_detector", true);
  const selected = await selectNonverbalVisionEngine({ mediaPipe: () => mediaPipe, native: () => native });
  await assert.rejects(() => selected.engine!.analyzeFrame({} as HTMLVideoElement, 100));
  await assert.rejects(() => selected.engine!.analyzeFrame({} as HTMLVideoElement, 200));
  assert.equal(native.initialized, 1);
  assert.equal(selected.engine!.backend, "unsupported");
});

test("disposes the selected engine", async () => {
  const mediaPipe = new FakeEngine("mediapipe");
  const selected = await selectNonverbalVisionEngine({ mediaPipe: () => mediaPipe, native: () => new FakeEngine("native_face_detector") });
  selected.engine!.dispose();
  assert.equal(mediaPipe.disposed, 1);
});

test("frame analysis contract contains no identity or emotion fields", () => {
  const result: VisionFrameAnalysis = normalizeMediaPipeResult({ faceLandmarks: [face()] });
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /identity|emotion|personality|gender|age|race/i);
});
