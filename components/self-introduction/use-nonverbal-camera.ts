"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NONVERBAL_POSE_SAMPLE_INTERVAL_MS,
  NONVERBAL_SAMPLE_INTERVAL_MS,
  isFreshVisionVideoFrame,
  nextVisionAnalysisTimestamp,
  poseFrameToSampleFields,
  selectNonverbalPoseEngine,
  selectNonverbalVisionEngine,
  visionFrameToSample,
  type NonverbalPoseEngine,
  type NonverbalPoseEngineStatus,
  type NonverbalVisionBackend,
  type NonverbalVisionEngine,
  type NonverbalVisionEngineStatus,
} from "@/lib/nonverbal-vision-engine";
import {
  analyzeNonverbalSignals,
  buildPersonalVisionBaseline,
  deriveCameraCheckStatus,
  shouldResetPersonalBaseline,
  type NonverbalFrameSample,
  type NonverbalSignalResult,
  type PersonalVisionBaseline,
} from "@/lib/nonverbal-signal-coach";

type PermissionState = "idle" | "checking" | "granted" | "denied" | "unsupported";
type SamplingMode = "check" | "session";

export function useNonverbalCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const faceEngineRef = useRef<NonverbalVisionEngine | null>(null);
  const poseEngineRef = useRef<NonverbalPoseEngine | null>(null);
  const faceTimerRef = useRef<number | undefined>(undefined);
  const poseTimerRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef(0);
  const lastFaceTimestampRef = useRef(0);
  const lastPoseTimestampRef = useRef(0);
  const lastFaceVideoTimeRef = useRef(-1);
  const lastPoseVideoTimeRef = useRef(-1);
  const latestPoseRef = useRef<Partial<NonverbalFrameSample>>({});
  const sessionSamplesRef = useRef<NonverbalFrameSample[]>([]);
  const baselineRef = useRef<PersonalVisionBaseline | null>(null);
  const pausedRef = useRef(false);
  const enabledRef = useRef(false);
  const supportedRef = useRef(false);
  const permissionDeniedRef = useRef(false);
  const faceDetectingRef = useRef(false);
  const poseDetectingRef = useRef(false);
  const visionDetectingRef = useRef<"face" | "pose" | null>(null);
  const performanceRef = useRef({ faceInferenceMs: 0, faceRuns: 0, faceDropped: 0, poseInferenceMs: 0, poseRuns: 0, poseDropped: 0 });
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("idle");
  const [engineStatus, setEngineStatus] = useState<NonverbalVisionEngineStatus | null>(null);
  const [poseStatus, setPoseStatus] = useState<NonverbalPoseEngineStatus>("POSE_UNAVAILABLE");
  const [backend, setBackend] = useState<NonverbalVisionBackend>("unsupported");
  const [checkSamples, setCheckSamples] = useState<NonverbalFrameSample[]>([]);
  const [baselineQuality, setBaselineQuality] = useState<PersonalVisionBaseline["quality"] | null>(null);

  const clearTimers = useCallback(() => {
    if (faceTimerRef.current !== undefined) window.clearInterval(faceTimerRef.current);
    if (poseTimerRef.current !== undefined) window.clearInterval(poseTimerRef.current);
    faceTimerRef.current = undefined;
    poseTimerRef.current = undefined;
  }, []);

  const resetBaseline = useCallback(() => {
    baselineRef.current = null;
    setBaselineQuality(null);
    latestPoseRef.current = {};
    setCheckSamples([]);
  }, []);

  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;
    clearTimers();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    faceEngineRef.current?.dispose();
    poseEngineRef.current?.dispose();
    faceEngineRef.current = null;
    poseEngineRef.current = null;
    supportedRef.current = false;
    faceDetectingRef.current = false;
    poseDetectingRef.current = false;
    visionDetectingRef.current = null;
    baselineRef.current = null;
    latestPoseRef.current = {};
    sessionSamplesRef.current = [];
    lastFaceVideoTimeRef.current = -1;
    lastPoseVideoTimeRef.current = -1;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (analysisVideoRef.current) analysisVideoRef.current.srcObject = null;
    analysisVideoRef.current = null;
  }, [clearTimers]);

  const appendSample = useCallback((mode: SamplingMode, sample: NonverbalFrameSample) => {
    if (mode === "session") {
      sessionSamplesRef.current.push(sample);
      if (baselineRef.current && shouldResetPersonalBaseline(sessionSamplesRef.current, baselineRef.current)) baselineRef.current = null;
    } else {
      setCheckSamples(previous => [...previous.slice(-31), sample]);
    }
  }, []);

  const detectFace = useCallback(async (mode: SamplingMode) => {
    const video = analysisVideoRef.current ?? videoRef.current;
    const engine = faceEngineRef.current;
    if (!video || !engine || pausedRef.current || video.readyState < 2) return;
    if (faceDetectingRef.current || visionDetectingRef.current !== null) {
      performanceRef.current.faceDropped += 1;
      return;
    }
    if (!isFreshVisionVideoFrame(video.currentTime, lastFaceVideoTimeRef.current)) {
      performanceRef.current.faceDropped += 1;
      return;
    }
    lastFaceVideoTimeRef.current = video.currentTime;
    const requestId = cameraRequestRef.current;
    faceDetectingRef.current = true;
    visionDetectingRef.current = "face";
    const inferenceStarted = performance.now();
    try {
      const now = performance.now();
      const elapsedMs = Math.max(0, now - startedAtRef.current);
      const analysisTimestampMs = nextVisionAnalysisTimestamp(now, lastFaceTimestampRef.current);
      lastFaceTimestampRef.current = analysisTimestampMs;
      const sample = { ...visionFrameToSample(await engine.analyzeFrame(video, analysisTimestampMs), elapsedMs), ...latestPoseRef.current };
      if (requestId !== cameraRequestRef.current) return;
      performanceRef.current.faceInferenceMs += performance.now() - inferenceStarted;
      performanceRef.current.faceRuns += 1;
      if (engine.backend !== backend) {
        setBackend(engine.backend);
        setEngineStatus(engine.backend === "native_face_detector" ? "NATIVE_READY" : "MEDIAPIPE_READY");
      }
      appendSample(mode, sample);
    } catch {
      if (requestId !== cameraRequestRef.current) return;
      if (engine.backend === "unsupported") {
        faceEngineRef.current = null;
        setBackend("unsupported");
        setEngineStatus("INIT_FAILED");
        if (!poseEngineRef.current) setPermission("unsupported");
      } else if (mode === "check") {
        appendSample(mode, { timestampMs: Math.max(0, performance.now() - startedAtRef.current), faceCount: 0, faceDetected: false, ...latestPoseRef.current });
      }
    } finally {
      faceDetectingRef.current = false;
      if (visionDetectingRef.current === "face") visionDetectingRef.current = null;
    }
  }, [appendSample, backend]);

  const detectPose = useCallback(async (mode: SamplingMode) => {
    const video = analysisVideoRef.current ?? videoRef.current;
    const engine = poseEngineRef.current;
    if (!video || !engine || pausedRef.current || video.readyState < 2) return;
    if (poseDetectingRef.current || visionDetectingRef.current !== null) {
      performanceRef.current.poseDropped += 1;
      return;
    }
    if (!isFreshVisionVideoFrame(video.currentTime, lastPoseVideoTimeRef.current)) {
      performanceRef.current.poseDropped += 1;
      return;
    }
    lastPoseVideoTimeRef.current = video.currentTime;
    const requestId = cameraRequestRef.current;
    poseDetectingRef.current = true;
    visionDetectingRef.current = "pose";
    const inferenceStarted = performance.now();
    try {
      const now = performance.now();
      const elapsedMs = Math.max(0, now - startedAtRef.current);
      const analysisTimestampMs = nextVisionAnalysisTimestamp(now, lastPoseTimestampRef.current);
      lastPoseTimestampRef.current = analysisTimestampMs;
      const pose = poseFrameToSampleFields(await engine.analyzeFrame(video, analysisTimestampMs), elapsedMs);
      if (requestId !== cameraRequestRef.current) return;
      performanceRef.current.poseInferenceMs += performance.now() - inferenceStarted;
      performanceRef.current.poseRuns += 1;
      latestPoseRef.current = pose;
      if (!faceEngineRef.current) appendSample(mode, { timestampMs: elapsedMs, faceCount: 0, faceDetected: false, ...pose });
    } catch {
      if (requestId === cameraRequestRef.current) {
        poseEngineRef.current?.dispose();
        poseEngineRef.current = null;
        latestPoseRef.current = {};
        setPoseStatus("POSE_UNAVAILABLE");
      }
    } finally {
      poseDetectingRef.current = false;
      if (visionDetectingRef.current === "pose") visionDetectingRef.current = null;
    }
  }, [appendSample]);

  const startTimers = useCallback((mode: SamplingMode) => {
    clearTimers();
    if (faceEngineRef.current) {
      void detectFace(mode);
      faceTimerRef.current = window.setInterval(() => void detectFace(mode), NONVERBAL_SAMPLE_INTERVAL_MS);
    }
    if (poseEngineRef.current) {
      void detectPose(mode);
      poseTimerRef.current = window.setInterval(() => void detectPose(mode), NONVERBAL_POSE_SAMPLE_INTERVAL_MS);
    }
  }, [clearTimers, detectFace, detectPose]);

  const startCamera = useCallback(async () => {
    stopCamera();
    const requestId = cameraRequestRef.current;
    setEnabled(true);
    enabledRef.current = true;
    setPermission("checking");
    setEngineStatus(null);
    setPoseStatus("POSE_UNAVAILABLE");
    setBackend("unsupported");
    setBaselineQuality(null);
    permissionDeniedRef.current = false;
    resetBaseline();
    performanceRef.current = { faceInferenceMs: 0, faceRuns: 0, faceDropped: 0, poseInferenceMs: 0, poseRuns: 0, poseDropped: 0 };
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
      setEngineStatus("UNSUPPORTED");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      const analysisVideo = document.createElement("video");
      analysisVideo.muted = true;
      analysisVideo.playsInline = true;
      analysisVideo.srcObject = stream;
      analysisVideoRef.current = analysisVideo;
      await analysisVideo.play().catch(() => undefined);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const [faceSelection, poseSelection] = await Promise.all([selectNonverbalVisionEngine(), selectNonverbalPoseEngine()]);
      if (requestId !== cameraRequestRef.current) {
        faceSelection.engine?.dispose();
        poseSelection.engine?.dispose();
        return;
      }
      faceEngineRef.current = faceSelection.engine;
      poseEngineRef.current = poseSelection.engine;
      setEngineStatus(faceSelection.status);
      setBackend(faceSelection.backend);
      setPoseStatus(poseSelection.status);
      if (!faceSelection.engine && !poseSelection.engine) {
        stopCamera();
        setPermission("unsupported");
        return;
      }
      supportedRef.current = true;
      setPermission("granted");
      startedAtRef.current = performance.now();
      startTimers("check");
    } catch {
      if (requestId !== cameraRequestRef.current) return;
      stopCamera();
      permissionDeniedRef.current = true;
      setPermission("denied");
    }
  }, [resetBaseline, startTimers, stopCamera]);

  const disableCamera = useCallback(() => {
    stopCamera();
    enabledRef.current = false;
    setEnabled(false);
    setPermission("idle");
    setEngineStatus(null);
    setPoseStatus("POSE_UNAVAILABLE");
    setBackend("unsupported");
    permissionDeniedRef.current = false;
    setCheckSamples([]);
  }, [stopCamera]);

  const beginSampling = useCallback(() => {
    baselineRef.current = baselineRef.current ?? buildPersonalVisionBaseline(checkSamples);
    sessionSamplesRef.current = [];
    pausedRef.current = false;
    startedAtRef.current = performance.now();
    if (enabledRef.current && supportedRef.current) startTimers("session");
    else clearTimers();
  }, [checkSamples, clearTimers, startTimers]);

  const finishSampling = useCallback((durationMs: number): NonverbalSignalResult => {
    clearTimers();
    return analyzeNonverbalSignals({ enabled: enabledRef.current, supported: supportedRef.current, permissionDenied: permissionDeniedRef.current, analyzedDurationMs: durationMs, samples: sessionSamplesRef.current, baseline: baselineRef.current });
  }, [clearTimers]);

  const setPaused = useCallback((paused: boolean) => { pausedRef.current = paused; }, []);

  useEffect(() => {
    const baseline = buildPersonalVisionBaseline(checkSamples);
    if (baseline) {
      baselineRef.current = baseline;
      setBaselineQuality(baseline.quality);
    }
  }, [checkSamples]);

  useEffect(() => {
    const onDeviceChange = () => {
      if (enabledRef.current) resetBaseline();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
  }, [resetBaseline]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const calibration = useMemo(() => {
    if (baselineQuality) return "READY" as const;
    if (poseStatus !== "POSE_READY") return "BASELINE_INSUFFICIENT" as const;
    const span = checkSamples.length > 1 ? checkSamples.at(-1)!.timestampMs - checkSamples[0].timestampMs : 0;
    return span >= 5000 ? "BASELINE_INSUFFICIENT" as const : "CALIBRATING" as const;
  }, [baselineQuality, checkSamples, poseStatus]);
  const status = useMemo(() => deriveCameraCheckStatus({ enabled, permission, samples: checkSamples, calibration }), [calibration, checkSamples, enabled, permission]);
  const metrics = performanceRef.current;
  const performanceStats = {
    averageFaceInferenceMs: metrics.faceRuns ? metrics.faceInferenceMs / metrics.faceRuns : null,
    averagePoseInferenceMs: metrics.poseRuns ? metrics.poseInferenceMs / metrics.poseRuns : null,
    droppedFaceSamples: metrics.faceDropped,
    droppedPoseSamples: metrics.poseDropped,
    concurrentInferencePerTask: 0 as const,
  };
  return { videoRef, enabled, permission, status, backend, engineStatus, poseStatus, baselineQuality, performanceStats, startCamera, disableCamera, beginSampling, finishSampling, setPaused, stopCamera, resetBaseline };
}
