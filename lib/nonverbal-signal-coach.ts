export type CameraCheckStatus =
  | "CAMERA_OFF" | "CHECKING" | "PERMISSION_DENIED" | "UNSUPPORTED"
  | "NO_FACE" | "MULTIPLE_FACES" | "FACE_TOO_SMALL" | "FACE_OFF_CENTER"
  | "CALIBRATING" | "BASELINE_INSUFFICIENT" | "READY";

export type NonverbalLevel = "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_SIGNAL";
export type MetricQuality = "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
export type FramingStability = "FRAMING_STABLE" | "FRAMING_VARIABLE" | "OFF_CENTER_FREQUENT" | "INSUFFICIENT_SIGNAL";
export type PostureStability = "POSTURE_STABLE" | "LEANING_FREQUENT" | "BODY_MOVEMENT_HIGH" | "INSUFFICIENT_SIGNAL";
export type PoseStability = "STABLE" | "VARIABLE" | "HIGH_MOVEMENT" | "INSUFFICIENT";
export type SmileShape = "SMILE_SHAPE_PRESENT" | "NEUTRAL_MOUTH_SHAPE" | "INSUFFICIENT_SIGNAL";
export type VisionFusion = "FACE_ONLY" | "POSE_ONLY" | "FACE_AND_POSE" | "INSUFFICIENT";

export type NonverbalFrameSample = {
  timestampMs: number;
  faceCount: number;
  faceDetected: boolean;
  faceCenterX?: number;
  faceCenterY?: number;
  faceAreaRatio?: number;
  headYawApprox?: number;
  headPitchApprox?: number;
  headRollApprox?: number;
  mouthShapeMetric?: number;
  poseDetected?: boolean;
  poseQuality?: "FULL" | "PARTIAL_POSE" | "INSUFFICIENT";
  poseTimestampMs?: number;
  shoulderSlope?: number;
  shoulderMidpointX?: number;
  shoulderMidpointY?: number;
  torsoCenterX?: number;
  torsoCenterY?: number;
  landmarkScale?: number;
};

export type PersonalVisionBaseline = {
  quality: "HIGH" | "MEDIUM";
  sampleCount: number;
  poseSampleCount: number;
  faceCenterX: number;
  faceCenterY: number;
  faceAreaRatio: number;
  headYawApprox: number;
  headPitchApprox: number;
  shoulderSlope: number;
  shoulderMidpointX: number;
  shoulderMidpointY: number;
  torsoCenterX?: number;
  torsoCenterY?: number;
  neutralMouthGeometry: number;
  landmarkScale: number;
};

export type NonverbalTimelineSegment = {
  phase: "start" | "middle" | "finish";
  fromMs: number;
  toMs: number;
  faceVisibilityRatio: number | null;
  movementLevel: NonverbalLevel;
  poseMovement: PoseStability;
  cameraFacing: "STABLE" | "VARIABLE" | "INSUFFICIENT_SIGNAL";
};

export type NonverbalSignalResult = {
  enabled: boolean;
  provenance: "vision_metrics";
  fusion: VisionFusion;
  baselineStatus: "CALIBRATED" | "INSUFFICIENT" | "NOT_USED";
  analyzedDurationMs: number;
  sampledFrameCount: number;
  poseSampledFrameCount: number;
  faceVisibilityRatio: number | null;
  cameraFacingRatio: number | null;
  framingStability: FramingStability;
  headMovementLevel: NonverbalLevel;
  expressionVariation: NonverbalLevel;
  smileShapeStart: SmileShape;
  smileShapeEnd: SmileShape;
  postureStability: PostureStability;
  movementLevel: NonverbalLevel;
  shoulderAlignment: PoseStability;
  torsoStability: PoseStability;
  shoulderSlopeDelta: number | null;
  torsoCenterDelta: number | null;
  signalQuality: { cameraDirection: MetricQuality; framing: MetricQuality; headMovement: MetricQuality; pose: MetricQuality; expression: MetricQuality };
  multipleFacesObserved: boolean;
  insufficientReason?: "CAMERA_DISABLED" | "CAMERA_PERMISSION_DENIED" | "CAMERA_UNSUPPORTED" | "NO_FACE" | "MULTIPLE_FACES" | "TOO_FEW_FRAMES";
  positiveObservations: string[];
  practiceObservations: string[];
  timeline: NonverbalTimelineSegment[];
};

const clampRatio = (value: number) => Math.max(0, Math.min(1, value));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const deviation = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
};
const finite = (value: number | undefined): value is number => Number.isFinite(value);
const values = (samples: NonverbalFrameSample[], select: (sample: NonverbalFrameSample) => number | undefined) => samples.map(select).filter(finite);
const ratio = (count: number, total: number) => total ? clampRatio(count / total) : null;
const centerDistance = (sample: NonverbalFrameSample) => Math.hypot((sample.faceCenterX ?? .5) - .5, (sample.faceCenterY ?? .45) - .45);
const deltaAverage = (samples: NonverbalFrameSample[], select: (sample: NonverbalFrameSample) => number | undefined) => {
  const selected = values(samples, select);
  return selected.length < 2 ? null : average(selected.slice(1).map((value, index) => Math.abs(value - selected[index])));
};
const level = (value: number | null, moderate: number, high: number): NonverbalLevel => value == null ? "INSUFFICIENT_SIGNAL" : value >= high ? "HIGH" : value >= moderate ? "MODERATE" : "LOW";
const poseLevel = (value: number | null, variable: number, high: number): PoseStability => value == null ? "INSUFFICIENT" : value >= high ? "HIGH_MOVEMENT" : value >= variable ? "VARIABLE" : "STABLE";
const quality = (count: number, high: number, medium: number): MetricQuality => count >= high ? "HIGH" : count >= medium ? "MEDIUM" : count > 0 ? "LOW" : "INSUFFICIENT";
const mouthShape = (samples: NonverbalFrameSample[]): SmileShape => {
  const selected = values(samples, sample => sample.mouthShapeMetric);
  return !selected.length ? "INSUFFICIENT_SIGNAL" : average(selected) >= .28 ? "SMILE_SHAPE_PRESENT" : "NEUTRAL_MOUTH_SHAPE";
};

function uniquePoseSamples(samples: NonverbalFrameSample[]) {
  const seen = new Set<number>();
  return samples.filter(sample => {
    if (!sample.poseDetected || sample.shoulderSlope == null) return false;
    const key = sample.poseTimestampMs ?? sample.timestampMs;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPersonalVisionBaseline(samples: NonverbalFrameSample[], minimumDurationMs = 3000): PersonalVisionBaseline | null {
  const validFaces = samples.filter(sample => sample.faceCount === 1 && sample.faceDetected && finite(sample.faceCenterX) && finite(sample.faceAreaRatio));
  const poses = uniquePoseSamples(samples);
  const span = samples.length > 1 ? samples.at(-1)!.timestampMs - samples[0].timestampMs : 0;
  if (span < minimumDurationMs || validFaces.length < 8 || poses.length < 4 || samples.some(sample => sample.faceCount > 1)) return null;
  const faceX = values(validFaces, sample => sample.faceCenterX);
  const faceY = values(validFaces, sample => sample.faceCenterY);
  const area = values(validFaces, sample => sample.faceAreaRatio);
  const slopes = values(poses, sample => sample.shoulderSlope);
  const shoulderX = values(poses, sample => sample.shoulderMidpointX);
  const shoulderY = values(poses, sample => sample.shoulderMidpointY);
  if (deviation(faceX) > .055 || deviation(faceY) > .055 || deviation(slopes) > .08) return null;
  const yaw = values(validFaces, sample => sample.headYawApprox);
  const pitch = values(validFaces, sample => sample.headPitchApprox);
  const mouth = values(validFaces, sample => sample.mouthShapeMetric);
  const scale = values(poses, sample => sample.landmarkScale);
  const torsoX = values(poses, sample => sample.torsoCenterX);
  const torsoY = values(poses, sample => sample.torsoCenterY);
  return {
    quality: poses.length >= 8 && validFaces.length >= 12 ? "HIGH" : "MEDIUM",
    sampleCount: validFaces.length, poseSampleCount: poses.length,
    faceCenterX: average(faceX), faceCenterY: average(faceY), faceAreaRatio: average(area),
    headYawApprox: average(yaw), headPitchApprox: average(pitch),
    shoulderSlope: average(slopes), shoulderMidpointX: average(shoulderX), shoulderMidpointY: average(shoulderY),
    torsoCenterX: torsoX.length ? average(torsoX) : undefined, torsoCenterY: torsoY.length ? average(torsoY) : undefined,
    neutralMouthGeometry: average(mouth), landmarkScale: average(scale),
  };
}

export function shouldResetPersonalBaseline(samples: NonverbalFrameSample[], baseline: PersonalVisionBaseline) {
  const recent = samples.slice(-12);
  if (recent.length >= 8 && recent.filter(sample => !sample.faceDetected).length >= 8) return true;
  const faces = recent.filter(sample => sample.faceCount === 1 && sample.faceDetected && finite(sample.faceCenterX));
  if (faces.length < 4) return false;
  return Math.abs(average(values(faces, sample => sample.faceCenterX)) - baseline.faceCenterX) > .25
    || Math.abs(average(values(faces, sample => sample.faceCenterY)) - baseline.faceCenterY) > .22
    || Math.abs(average(values(faces, sample => sample.faceAreaRatio)) - baseline.faceAreaRatio) > .18;
}

export function deriveCameraCheckStatus(input: {
  enabled: boolean;
  permission: "idle" | "checking" | "granted" | "denied" | "unsupported";
  samples: NonverbalFrameSample[];
  calibration?: "CALIBRATING" | "READY" | "BASELINE_INSUFFICIENT";
}): CameraCheckStatus {
  if (!input.enabled || input.permission === "idle") return "CAMERA_OFF";
  if (input.permission === "checking") return "CHECKING";
  if (input.permission === "denied") return "PERMISSION_DENIED";
  if (input.permission === "unsupported") return "UNSUPPORTED";
  const recent = input.samples.slice(-8);
  if (!recent.length) return "CHECKING";
  if (recent.filter(sample => sample.faceCount > 1).length >= 2) return "MULTIPLE_FACES";
  const faces = recent.filter(sample => sample.faceCount === 1 && sample.faceDetected);
  if (!faces.length) return "NO_FACE";
  if (average(faces.map(sample => sample.faceAreaRatio ?? 0)) < .055) return "FACE_TOO_SMALL";
  if (average(faces.map(centerDistance)) > .23) return "FACE_OFF_CENTER";
  return input.calibration ?? "READY";
}

function faceMovement(samples: NonverbalFrameSample[]) {
  const x = deltaAverage(samples, sample => sample.faceCenterX);
  const y = deltaAverage(samples, sample => sample.faceCenterY);
  const area = deltaAverage(samples, sample => sample.faceAreaRatio);
  return x == null || y == null ? null : x + y + (area ?? 0) * .5;
}

function poseMovement(samples: NonverbalFrameSample[], baseline?: PersonalVisionBaseline) {
  const poses = uniquePoseSamples(samples);
  if (poses.length < 2) return null;
  const shoulderValues = values(poses, sample => sample.shoulderMidpointX);
  const shoulderOrigin = baseline?.shoulderMidpointX ?? average(shoulderValues);
  const shoulder = shoulderValues.map(value => Math.abs(value - shoulderOrigin));
  const torsoX = values(poses, sample => sample.torsoCenterX);
  const torsoY = values(poses, sample => sample.torsoCenterY);
  const torso = torsoX.length === poses.length && torsoY.length === poses.length
    ? poses.map(sample => Math.hypot((sample.torsoCenterX ?? 0) - (baseline?.torsoCenterX ?? average(torsoX)), (sample.torsoCenterY ?? 0) - (baseline?.torsoCenterY ?? average(torsoY))))
    : [];
  return average(shoulder) + (torso.length ? average(torso) : 0);
}

function buildTimeline(samples: NonverbalFrameSample[], durationMs: number, baseline?: PersonalVisionBaseline): NonverbalTimelineSegment[] {
  if (!samples.length || durationMs <= 0) return [];
  return (["start", "middle", "finish"] as const).map((phase, index) => {
    const fromMs = Math.round(durationMs * index / 3);
    const toMs = index === 2 ? durationMs : Math.round(durationMs * (index + 1) / 3);
    const segment = samples.filter(sample => sample.timestampMs >= fromMs && sample.timestampMs <= toMs);
    const faces = segment.filter(sample => sample.faceCount === 1 && sample.faceDetected);
    const oriented = faces.filter(sample => finite(sample.headYawApprox) && finite(sample.headPitchApprox));
    const facing = oriented.filter(sample => Math.abs((sample.headYawApprox ?? 0) - (baseline?.headYawApprox ?? 0)) <= .22 && Math.abs((sample.headPitchApprox ?? 0) - (baseline?.headPitchApprox ?? 0)) <= .28);
    return { phase, fromMs, toMs, faceVisibilityRatio: ratio(faces.length, segment.length), movementLevel: level(faceMovement(faces), .035, .075), poseMovement: poseLevel(poseMovement(segment, baseline), .035, .085), cameraFacing: oriented.length ? (facing.length / oriented.length >= .72 ? "STABLE" : "VARIABLE") : "INSUFFICIENT_SIGNAL" };
  });
}

export function analyzeNonverbalSignals(input: {
  enabled: boolean; supported?: boolean; permissionDenied?: boolean; analyzedDurationMs: number;
  samples: NonverbalFrameSample[]; baseline?: PersonalVisionBaseline | null;
}): NonverbalSignalResult {
  const faces = input.samples.filter(sample => sample.faceCount === 1 && sample.faceDetected);
  const poses = uniquePoseSamples(input.samples);
  const base = { enabled: input.enabled, provenance: "vision_metrics" as const, analyzedDurationMs: Math.max(0, Math.round(input.analyzedDurationMs)), sampledFrameCount: input.samples.length, poseSampledFrameCount: poses.length };
  const fusion: VisionFusion = faces.length && poses.length ? "FACE_AND_POSE" : faces.length ? "FACE_ONLY" : poses.length ? "POSE_ONLY" : "INSUFFICIENT";
  const insufficient = (reason: NonverbalSignalResult["insufficientReason"]): NonverbalSignalResult => ({
    ...base, fusion, baselineStatus: input.baseline ? "CALIBRATED" : input.enabled ? "INSUFFICIENT" : "NOT_USED", faceVisibilityRatio: null, cameraFacingRatio: null,
    framingStability: "INSUFFICIENT_SIGNAL", headMovementLevel: "INSUFFICIENT_SIGNAL", expressionVariation: "INSUFFICIENT_SIGNAL", smileShapeStart: "INSUFFICIENT_SIGNAL", smileShapeEnd: "INSUFFICIENT_SIGNAL", postureStability: "INSUFFICIENT_SIGNAL", movementLevel: "INSUFFICIENT_SIGNAL",
    shoulderAlignment: "INSUFFICIENT", torsoStability: "INSUFFICIENT", shoulderSlopeDelta: null, torsoCenterDelta: null,
    signalQuality: { cameraDirection: "INSUFFICIENT", framing: "INSUFFICIENT", headMovement: "INSUFFICIENT", pose: "INSUFFICIENT", expression: "INSUFFICIENT" },
    multipleFacesObserved: input.samples.some(sample => sample.faceCount > 1), insufficientReason: reason, positiveObservations: [], practiceObservations: ["분석 가능한 영상 신호가 충분하지 않았습니다."], timeline: [],
  });
  if (!input.enabled) return insufficient("CAMERA_DISABLED");
  if (input.permissionDenied) return insufficient("CAMERA_PERMISSION_DENIED");
  if (input.supported === false) return insufficient("CAMERA_UNSUPPORTED");
  const multipleRatio = input.samples.length ? input.samples.filter(sample => sample.faceCount > 1).length / input.samples.length : 0;
  if (multipleRatio > .25) return insufficient("MULTIPLE_FACES");
  if (!faces.length && !poses.length) return insufficient("NO_FACE");
  if (input.samples.length < 8 || input.analyzedDurationMs < 1500 || (faces.length < 5 && poses.length < 4)) return insufficient("TOO_FEW_FRAMES");

  const baseline = input.baseline ?? undefined;
  const faceVisibilityRatio = faces.length ? ratio(faces.length, input.samples.length) : null;
  const oriented = faces.filter(sample => finite(sample.headYawApprox) && finite(sample.headPitchApprox));
  const facing = oriented.filter(sample => Math.abs((sample.headYawApprox ?? 0) - (baseline?.headYawApprox ?? 0)) <= .22 && Math.abs((sample.headPitchApprox ?? 0) - (baseline?.headPitchApprox ?? 0)) <= .28);
  const cameraFacingRatio = ratio(facing.length, oriented.length);
  const distances = faces.map(sample => baseline ? Math.hypot((sample.faceCenterX ?? baseline.faceCenterX) - baseline.faceCenterX, (sample.faceCenterY ?? baseline.faceCenterY) - baseline.faceCenterY) : centerDistance(sample));
  const framingStability: FramingStability = !faces.length ? "INSUFFICIENT_SIGNAL" : average(distances) > .24 ? "OFF_CENTER_FREQUENT" : deviation(distances) > .075 ? "FRAMING_VARIABLE" : "FRAMING_STABLE";
  const headMetric = [deltaAverage(faces, sample => sample.headYawApprox), deltaAverage(faces, sample => sample.headPitchApprox), deltaAverage(faces, sample => sample.headRollApprox)];
  const headMovementLevel = level(headMetric.every(value => value == null) ? null : headMetric.reduce<number>((sum, value) => sum + (value ?? 0), 0), .12, .25);
  const mouth = values(faces, sample => sample.mouthShapeMetric);
  const expressionVariation = level(mouth.length >= 3 ? deviation(mouth.map(value => value - (baseline?.neutralMouthGeometry ?? average(mouth)))) : null, .025, .07);
  const span = Math.max(1, Math.round(faces.length * .2));
  const motion = faceMovement(faces);
  const movementLevel = level(motion, .035, .075);
  const shoulderDeltas = baseline ? values(poses, sample => sample.shoulderSlope).map(value => Math.abs(value - baseline.shoulderSlope)) : [];
  const shoulderSlopeDelta = shoulderDeltas.length ? average(shoulderDeltas) : null;
  const torsoDeltas = baseline?.torsoCenterX != null && baseline.torsoCenterY != null ? poses.filter(sample => finite(sample.torsoCenterX) && finite(sample.torsoCenterY)).map(sample => Math.hypot(sample.torsoCenterX! - baseline.torsoCenterX!, sample.torsoCenterY! - baseline.torsoCenterY!)) : [];
  const torsoCenterDelta = torsoDeltas.length ? average(torsoDeltas) : null;
  const shoulderAlignment = poseLevel(shoulderSlopeDelta, .07, .16);
  const torsoStability = poseLevel(torsoCenterDelta ?? (baseline ? poseMovement(poses, baseline) : null), .035, .085);
  const faceLeanRatio = faces.length ? faces.filter(sample => centerDistance(sample) > .24 || Math.abs(sample.headRollApprox ?? 0) > .18).length / faces.length : 0;
  const postureStability: PostureStability = shoulderAlignment === "INSUFFICIENT"
    ? (movementLevel === "HIGH" ? "BODY_MOVEMENT_HIGH" : faces.length ? (faceLeanRatio > .35 ? "LEANING_FREQUENT" : "POSTURE_STABLE") : "INSUFFICIENT_SIGNAL")
    : torsoStability === "HIGH_MOVEMENT" || shoulderAlignment === "HIGH_MOVEMENT" ? "BODY_MOVEMENT_HIGH"
      : torsoStability === "VARIABLE" || shoulderAlignment === "VARIABLE" ? "LEANING_FREQUENT" : "POSTURE_STABLE";
  const positiveObservations: string[] = [];
  const practiceObservations: string[] = [];
  if ((faceVisibilityRatio ?? 0) >= .8) positiveObservations.push("답변 대부분에서 얼굴이 화면에 보였습니다.");
  else if (faces.length) practiceObservations.push("화면 밖으로 벗어나는 구간이 관찰되었습니다.");
  if (shoulderAlignment === "STABLE" && torsoStability === "STABLE") positiveObservations.push("처음 자세와 비교해 어깨선과 상체 위치가 안정적이었습니다.");
  else if (shoulderAlignment === "HIGH_MOVEMENT") practiceObservations.push("처음 자세와 비교해 후반부에 어깨선 변화가 커졌습니다.");
  else if (torsoStability === "HIGH_MOVEMENT") practiceObservations.push("처음 자세와 비교해 상체 위치 변화가 커졌습니다.");
  if (!poses.length) practiceObservations.push("상체가 충분히 보이지 않아 자세 분석을 제한했습니다.");
  if (!baseline && poses.length) practiceObservations.push("개인 기준 신호가 충분하지 않아 자세 피드백을 제한했습니다.");
  return {
    ...base, fusion, baselineStatus: baseline ? "CALIBRATED" : "INSUFFICIENT", faceVisibilityRatio, cameraFacingRatio, framingStability, headMovementLevel, expressionVariation,
    smileShapeStart: mouthShape(faces.slice(0, span)), smileShapeEnd: mouthShape(faces.slice(-span)), postureStability, movementLevel,
    shoulderAlignment, torsoStability, shoulderSlopeDelta, torsoCenterDelta,
    signalQuality: { cameraDirection: quality(oriented.length, 12, 5), framing: quality(faces.length, 12, 5), headMovement: quality(oriented.length, 12, 5), pose: quality(poses.length, 8, 4), expression: quality(mouth.length, 12, 3) },
    multipleFacesObserved: input.samples.some(sample => sample.faceCount > 1), positiveObservations: positiveObservations.slice(0, 2), practiceObservations: practiceObservations.slice(0, 2), timeline: buildTimeline(input.samples, base.analyzedDurationMs, baseline),
  };
}
