import type { FaceLandmarkerResult, NormalizedLandmark, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import type { NonverbalFrameSample } from "@/lib/nonverbal-signal-coach";

export const MEDIAPIPE_VISION_VERSION = "1.0.1";
export const MEDIAPIPE_WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VISION_VERSION}/wasm`;
export const MEDIAPIPE_FACE_LANDMARKER_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
export const MEDIAPIPE_POSE_LANDMARKER_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
export const NONVERBAL_SAMPLE_INTERVAL_MS = 250;
export const NONVERBAL_POSE_SAMPLE_INTERVAL_MS = 500;

export function nextVisionAnalysisTimestamp(nowMs: number, previousMs: number) {
  return Math.max(nowMs, previousMs + .001);
}

export function isFreshVisionVideoFrame(currentTime: number, previousTime: number) {
  return Number.isFinite(currentTime) && currentTime >= 0 && currentTime > previousTime;
}

export type NonverbalVisionBackend = "mediapipe" | "native_face_detector" | "unsupported";
export type NonverbalVisionEngineStatus = "MEDIAPIPE_READY" | "NATIVE_READY" | "UNSUPPORTED" | "INIT_FAILED";
export type NonverbalVisionSignalQuality = "FULL" | "FRAMING_ONLY" | "INSUFFICIENT";
export type NonverbalPoseSignalQuality = "FULL" | "PARTIAL_POSE" | "INSUFFICIENT";
export type NonverbalPoseEngineStatus = "POSE_READY" | "POSE_UNAVAILABLE" | "POSE_INIT_FAILED";

export type VisionPoint = { x: number; y: number; z?: number };
export type VisionFrameAnalysis = {
  faceCount: number;
  faceDetected: boolean;
  signalQuality: NonverbalVisionSignalQuality;
  faceBox?: { x: number; y: number; width: number; height: number };
  leftEye?: VisionPoint;
  rightEye?: VisionPoint;
  nose?: VisionPoint;
  mouthLeft?: VisionPoint;
  mouthRight?: VisionPoint;
  mouthTop?: VisionPoint;
  mouthBottom?: VisionPoint;
};

export type PoseFrameAnalysis = {
  poseDetected: boolean;
  signalQuality: NonverbalPoseSignalQuality;
  leftShoulder?: VisionPoint;
  rightShoulder?: VisionPoint;
  leftHip?: VisionPoint;
  rightHip?: VisionPoint;
  nose?: VisionPoint;
  leftEar?: VisionPoint;
  rightEar?: VisionPoint;
};

export interface NonverbalVisionEngine {
  readonly backend: NonverbalVisionBackend;
  initialize(): Promise<void>;
  analyzeFrame(source: HTMLVideoElement, timestampMs: number): Promise<VisionFrameAnalysis>;
  dispose(): void;
}

type Point = { x: number; y: number };
type DetectedLandmark = { type?: string; locations?: Point[] };
type DetectedFace = { boundingBox: { x: number; y: number; width: number; height: number }; landmarks?: DetectedLandmark[] };
type NativeFaceDetector = { detect(source: CanvasImageSource): Promise<DetectedFace[]> };
type NativeFaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => NativeFaceDetector;

type MediaPipeLandmarker = {
  detectForVideo(source: HTMLVideoElement, timestampMs: number): FaceLandmarkerResult;
  close(): void;
};

type MediaPipePoseLandmarker = {
  detectForVideo(source: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult;
  close(): void;
};

export interface NonverbalPoseEngine {
  initialize(): Promise<void>;
  analyzeFrame(source: HTMLVideoElement, timestampMs: number): Promise<PoseFrameAnalysis>;
  dispose(): void;
}

function averagePoint(points: Point[]): Point | undefined {
  if (!points.length) return undefined;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function nativeLandmark(face: DetectedFace, type: string) {
  return (face.landmarks ?? []).filter(item => item.type === type).flatMap(item => item.locations ?? []);
}

export function normalizeNativeFaces(faces: DetectedFace[], width: number, height: number): VisionFrameAnalysis {
  if (faces.length !== 1) return { faceCount: faces.length, faceDetected: faces.length > 0, signalQuality: "INSUFFICIENT" };
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const face = faces[0];
  const box = face.boundingBox;
  const eyes = nativeLandmark(face, "eye").sort((a, b) => a.x - b.x);
  const nosePoint = averagePoint(nativeLandmark(face, "nose"));
  const mouth = nativeLandmark(face, "mouth").sort((a, b) => a.x - b.x);
  return {
    faceCount: 1,
    faceDetected: true,
    signalQuality: eyes.length >= 2 && nosePoint && mouth.length >= 2 ? "FULL" : "FRAMING_ONLY",
    faceBox: { x: box.x / safeWidth, y: box.y / safeHeight, width: box.width / safeWidth, height: box.height / safeHeight },
    leftEye: eyes[0] ? { x: eyes[0].x / safeWidth, y: eyes[0].y / safeHeight } : undefined,
    rightEye: eyes.at(-1) ? { x: eyes.at(-1)!.x / safeWidth, y: eyes.at(-1)!.y / safeHeight } : undefined,
    nose: nosePoint ? {
      x: nosePoint.x / safeWidth,
      y: nosePoint.y / safeHeight,
    } : undefined,
    mouthLeft: mouth[0] ? { x: mouth[0].x / safeWidth, y: mouth[0].y / safeHeight } : undefined,
    mouthRight: mouth.at(-1) ? { x: mouth.at(-1)!.x / safeWidth, y: mouth.at(-1)!.y / safeHeight } : undefined,
  };
}

const point = (landmarks: NormalizedLandmark[], index: number): VisionPoint | undefined => {
  const value = landmarks[index];
  return value && Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: value.x, y: value.y, z: value.z } : undefined;
};

export function normalizeMediaPipeResult(result: Pick<FaceLandmarkerResult, "faceLandmarks">): VisionFrameAnalysis {
  if (result.faceLandmarks.length !== 1) return { faceCount: result.faceLandmarks.length, faceDetected: result.faceLandmarks.length > 0, signalQuality: "INSUFFICIENT" };
  const landmarks = result.faceLandmarks[0];
  if (!landmarks.length) return { faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" };
  const xs = landmarks.map(value => value.x).filter(Number.isFinite);
  const ys = landmarks.map(value => value.y).filter(Number.isFinite);
  if (!xs.length || !ys.length) return { faceCount: 0, faceDetected: false, signalQuality: "INSUFFICIENT" };
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    faceCount: 1,
    faceDetected: true,
    signalQuality: "FULL",
    faceBox: { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) },
    leftEye: point(landmarks, 33),
    rightEye: point(landmarks, 263),
    nose: point(landmarks, 1),
    mouthLeft: point(landmarks, 61),
    mouthRight: point(landmarks, 291),
    mouthTop: point(landmarks, 13),
    mouthBottom: point(landmarks, 14),
  };
}

const visiblePoint = (landmarks: NormalizedLandmark[], index: number, minimumVisibility = .45) => {
  const value = point(landmarks, index);
  const source = landmarks[index];
  return value && (source.visibility == null || source.visibility >= minimumVisibility) ? value : undefined;
};

export function normalizeMediaPipePoseResult(result: Pick<PoseLandmarkerResult, "landmarks">): PoseFrameAnalysis {
  if (result.landmarks.length !== 1) return { poseDetected: result.landmarks.length > 0, signalQuality: "INSUFFICIENT" };
  const landmarks = result.landmarks[0];
  const leftShoulder = visiblePoint(landmarks, 11);
  const rightShoulder = visiblePoint(landmarks, 12);
  if (!leftShoulder || !rightShoulder) return { poseDetected: true, signalQuality: "INSUFFICIENT" };
  const leftHip = visiblePoint(landmarks, 23);
  const rightHip = visiblePoint(landmarks, 24);
  return {
    poseDetected: true,
    signalQuality: leftHip && rightHip ? "FULL" : "PARTIAL_POSE",
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    nose: visiblePoint(landmarks, 0),
    leftEar: visiblePoint(landmarks, 7),
    rightEar: visiblePoint(landmarks, 8),
  };
}

export function visionFrameToSample(frame: VisionFrameAnalysis, timestampMs: number): NonverbalFrameSample {
  if (frame.faceCount !== 1 || !frame.faceBox) return { timestampMs, faceCount: frame.faceCount, faceDetected: frame.faceDetected };
  const box = frame.faceBox;
  const boxCenterX = box.x + box.width / 2;
  const boxCenterY = box.y + box.height / 2;
  const eyeWidth = frame.leftEye && frame.rightEye ? Math.max(.001, Math.abs(frame.rightEye.x - frame.leftEye.x)) : null;
  const mouthWidth = frame.mouthLeft && frame.mouthRight ? Math.abs(frame.mouthRight.x - frame.mouthLeft.x) : null;
  return {
    timestampMs,
    faceCount: 1,
    faceDetected: true,
    faceCenterX: boxCenterX,
    faceCenterY: boxCenterY,
    faceAreaRatio: Math.max(0, box.width * box.height),
    headYawApprox: frame.nose ? (frame.nose.x - boxCenterX) / Math.max(.001, box.width / 2) : undefined,
    headPitchApprox: frame.nose ? (frame.nose.y - (box.y + box.height * .45)) / Math.max(.001, box.height) : undefined,
    headRollApprox: eyeWidth && frame.leftEye && frame.rightEye ? Math.atan2(frame.rightEye.y - frame.leftEye.y, frame.rightEye.x - frame.leftEye.x) : undefined,
    mouthShapeMetric: mouthWidth == null ? undefined : mouthWidth / Math.max(.001, box.width),
  };
}

export function poseFrameToSampleFields(frame: PoseFrameAnalysis, timestampMs: number): Partial<NonverbalFrameSample> {
  if (!frame.poseDetected || !frame.leftShoulder || !frame.rightShoulder) {
    return { poseDetected: frame.poseDetected, poseQuality: frame.signalQuality, poseTimestampMs: timestampMs };
  }
  const shoulderWidth = Math.max(.001, Math.hypot(frame.rightShoulder.x - frame.leftShoulder.x, frame.rightShoulder.y - frame.leftShoulder.y));
  const shoulderMidpointX = (frame.leftShoulder.x + frame.rightShoulder.x) / 2;
  const shoulderMidpointY = (frame.leftShoulder.y + frame.rightShoulder.y) / 2;
  const hipsAvailable = Boolean(frame.leftHip && frame.rightHip);
  const hipMidpointX = hipsAvailable ? (frame.leftHip!.x + frame.rightHip!.x) / 2 : undefined;
  const hipMidpointY = hipsAvailable ? (frame.leftHip!.y + frame.rightHip!.y) / 2 : undefined;
  return {
    poseDetected: true,
    poseQuality: frame.signalQuality,
    poseTimestampMs: timestampMs,
    shoulderSlope: (frame.rightShoulder.y - frame.leftShoulder.y) / shoulderWidth,
    shoulderMidpointX,
    shoulderMidpointY,
    torsoCenterX: hipMidpointX == null ? undefined : (shoulderMidpointX + hipMidpointX) / 2,
    torsoCenterY: hipMidpointY == null ? undefined : (shoulderMidpointY + hipMidpointY) / 2,
    landmarkScale: shoulderWidth,
  };
}

export class MediaPipeFaceLandmarkerEngine implements NonverbalVisionEngine {
  readonly backend = "mediapipe" as const;
  private landmarker: MediaPipeLandmarker | null = null;

  async initialize() {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const wasm = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    this.landmarker = await FaceLandmarker.createFromOptions(wasm, {
      baseOptions: { modelAssetPath: MEDIAPIPE_FACE_LANDMARKER_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 2,
      minFaceDetectionConfidence: .5,
      minFacePresenceConfidence: .5,
      minTrackingConfidence: .5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }

  async analyzeFrame(source: HTMLVideoElement, timestampMs: number) {
    if (!this.landmarker) throw new Error("vision_engine_not_initialized");
    return normalizeMediaPipeResult(this.landmarker.detectForVideo(source, timestampMs));
  }

  dispose() {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

export class MediaPipePoseLandmarkerEngine implements NonverbalPoseEngine {
  private landmarker: MediaPipePoseLandmarker | null = null;

  async initialize() {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const wasm = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    this.landmarker = await PoseLandmarker.createFromOptions(wasm, {
      baseOptions: { modelAssetPath: MEDIAPIPE_POSE_LANDMARKER_MODEL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: .5,
      minPosePresenceConfidence: .5,
      minTrackingConfidence: .5,
      outputSegmentationMasks: false,
    });
  }

  async analyzeFrame(source: HTMLVideoElement, timestampMs: number) {
    if (!this.landmarker) throw new Error("pose_engine_not_initialized");
    return normalizeMediaPipePoseResult(this.landmarker.detectForVideo(source, timestampMs));
  }

  dispose() {
    this.landmarker?.close();
    this.landmarker = null;
  }
}

export class NativeFaceDetectorEngine implements NonverbalVisionEngine {
  readonly backend = "native_face_detector" as const;
  private detector: NativeFaceDetector | null = null;

  async initialize() {
    const Constructor = (globalThis as typeof globalThis & { FaceDetector?: NativeFaceDetectorConstructor }).FaceDetector;
    if (!Constructor) throw new Error("native_face_detector_unavailable");
    const detector = new Constructor({ fastMode: true, maxDetectedFaces: 2 });
    if (typeof document === "undefined") throw new Error("native_face_detector_unavailable");
    await detector.detect(document.createElement("canvas"));
    this.detector = detector;
  }

  async analyzeFrame(source: HTMLVideoElement) {
    if (!this.detector) throw new Error("vision_engine_not_initialized");
    return normalizeNativeFaces(await this.detector.detect(source), source.videoWidth, source.videoHeight);
  }

  dispose() {
    this.detector = null;
  }
}

class UnsupportedVisionEngine implements NonverbalVisionEngine {
  readonly backend = "unsupported" as const;
  async initialize() { throw new Error("vision_engine_unsupported"); }
  async analyzeFrame(): Promise<VisionFrameAnalysis> { throw new Error("vision_engine_unsupported"); }
  dispose() {}
}

class RuntimeFallbackVisionEngine implements NonverbalVisionEngine {
  private active: NonverbalVisionEngine;
  private fallback: NonverbalVisionEngine | null = null;
  private fallbackAttempted = false;

  constructor(primary: NonverbalVisionEngine, private readonly createFallback: () => NonverbalVisionEngine) {
    this.active = primary;
  }

  get backend() {
    return this.active.backend;
  }

  async initialize() {
    // The selected primary is already initialized by the factory.
  }

  async analyzeFrame(source: HTMLVideoElement, timestampMs: number) {
    try {
      return await this.active.analyzeFrame(source, timestampMs);
    } catch (primaryError) {
      if (this.active.backend !== "mediapipe" || this.fallbackAttempted) throw primaryError;
      this.fallbackAttempted = true;
      this.active.dispose();
      const fallback = this.createFallback();
      try {
        await fallback.initialize();
        this.fallback = fallback;
        this.active = fallback;
        return await fallback.analyzeFrame(source, timestampMs);
      } catch {
        fallback.dispose();
        this.active = new UnsupportedVisionEngine();
        throw primaryError;
      }
    }
  }

  dispose() {
    this.active.dispose();
    if (this.fallback && this.fallback !== this.active) this.fallback.dispose();
    this.fallback = null;
  }
}

export type VisionEngineSelection = { engine: NonverbalVisionEngine | null; status: NonverbalVisionEngineStatus; backend: NonverbalVisionBackend };
export type VisionEngineFactories = {
  mediaPipe: () => NonverbalVisionEngine;
  native: () => NonverbalVisionEngine;
};

export async function selectNonverbalVisionEngine(factories: VisionEngineFactories = {
  mediaPipe: () => new MediaPipeFaceLandmarkerEngine(),
  native: () => new NativeFaceDetectorEngine(),
}): Promise<VisionEngineSelection> {
  let initializationFailed = false;
  for (const [status, create] of [["MEDIAPIPE_READY", factories.mediaPipe], ["NATIVE_READY", factories.native]] as const) {
    const engine = create();
    try {
      await engine.initialize();
      const selected = status === "MEDIAPIPE_READY" ? new RuntimeFallbackVisionEngine(engine, factories.native) : engine;
      return { engine: selected, status, backend: selected.backend };
    } catch {
      initializationFailed = true;
      engine.dispose();
    }
  }
  return { engine: null, status: initializationFailed ? "INIT_FAILED" : "UNSUPPORTED", backend: "unsupported" };
}

export async function selectNonverbalPoseEngine(create: () => NonverbalPoseEngine = () => new MediaPipePoseLandmarkerEngine()): Promise<{
  engine: NonverbalPoseEngine | null;
  status: NonverbalPoseEngineStatus;
}> {
  const engine = create();
  try {
    await engine.initialize();
    return { engine, status: "POSE_READY" };
  } catch {
    engine.dispose();
    return { engine: null, status: "POSE_INIT_FAILED" };
  }
}
