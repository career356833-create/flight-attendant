"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeSelfIntroductionWithAirlineContext,
  getSelfIntroductionAirlineContext,
  loadSelfIntroductionAttempts,
  mockTranscript,
  recordAttemptProgress,
  saveAttemptAudio,
  saveSelfIntroductionAttempt,
  type SelfIntroductionAttempt,
} from "@/lib/self-introduction-data";
import { queueTrainingAttempt } from "@/lib/supabase/training-attempt-repositories";
import {
  FreeResponseRecorder,
  MicrophoneCheck,
  RecordingReview,
  SelfIntroductionAnalyzing,
  SelfIntroductionIntro,
  SelfIntroductionResult,
} from "./self-introduction-components";
import { ExperiencePicker } from "@/components/experience-library";
import { experienceRepository } from "@/lib/experience-repository";
import { interviewQuestionById } from "@/lib/interview-practice-data";
import { aiService } from "@/lib/ai/ai-service";
import { airlines, airlineById } from "@/lib/airline-data";
import { analyzeSelfIntroductionChallenge, challengeTypeFor, type SelfIntroductionChallengeSeconds } from "@/lib/self-introduction-challenge";
import { createInterviewAudioMonitor, type InterviewAudioMetrics } from "@/lib/interview-audio/audio-analysis";
import { buildInterviewSpeechMetrics } from "@/lib/interview-audio/speech-analysis";

export type SelfIntroductionStep =
  | "intro"
  | "microphone_check"
  | "recording"
  | "review"
  | "analyzing"
  | "result"
  | "retry";

export function SelfIntroductionFlow({
  targetAirlineId,
  onExit,
  onComplete,
  initialChallengeTarget,
}: {
  targetAirlineId?: string;
  onExit: () => void;
  onComplete: (attempt: SelfIntroductionAttempt) => void;
  initialChallengeTarget?: SelfIntroductionChallengeSeconds;
}) {
  const [step, setStep] = useState<SelfIntroductionStep>("intro");
  const [micStatus, setMicStatus] = useState<
    "checking" | "ready" | "denied" | "mock"
  >("checking");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transcript, setTranscript] = useState(mockTranscript);
  const [attempt, setAttempt] = useState<SelfIntroductionAttempt | null>(null);
  const [previousAttemptId, setPreviousAttemptId] = useState<string>();
  const [challengeTarget, setChallengeTarget] = useState<SelfIntroductionChallengeSeconds | undefined>(initialChallengeTarget);
  const chunks = useRef<Blob[]>([]);
  const aiRequest = useRef<AbortController | null>(null);
  const audioMonitor = useRef<ReturnType<typeof createInterviewAudioMonitor> | null>(null);
  const completedAudioMetrics = useRef<InterviewAudioMetrics | undefined>(undefined);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>();
  const [selectedAirlineId, setSelectedAirlineId] = useState<
    string | undefined
  >(targetAirlineId);
  const experiences = experienceRepository.load().experiences;
  const selectedExperience = experiences.find(
    (e) => e.id === selectedExperienceId,
  );

  useEffect(
    () => () => {
      aiRequest.current?.abort();
      audioMonitor.current?.finish();
      stream?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [stream, audioUrl],
  );
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  useEffect(() => {
    if (step !== "recording" || paused) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [step, paused]);

  async function checkMicrophone() {
    setMicStatus("checking");
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicStatus("mock");
      return;
    }
    try {
      const nextStream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Microphone permission timeout")),
            1500,
          ),
        ),
      ]);
      stream?.getTracks().forEach((track) => track.stop());
      setStream(nextStream);
      setMicStatus("ready");
    } catch {
      setMicStatus("denied");
    }
  }

  function beginRecording(forceMock = false) {
    setElapsed(0);
    setPaused(false);
    setBlob(null);
    setAudioUrl(undefined);
    chunks.current = [];
    completedAudioMetrics.current = undefined;
    if (!forceMock && stream && typeof MediaRecorder !== "undefined") {
      try {
        audioMonitor.current = createInterviewAudioMonitor(stream);
        const next = new MediaRecorder(stream);
        next.ondataavailable = (event) => {
          if (event.data.size) chunks.current.push(event.data);
        };
        next.onstop = () => {
          if (chunks.current.length)
            setBlob(
              new Blob(chunks.current, { type: next.mimeType || "audio/webm" }),
            );
        };
        next.start();
        setRecorder(next);
      } catch {
        setMicStatus("mock");
        setRecorder(null);
      }
    } else setRecorder(null);
    setStep("recording");
  }

  function finishRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    completedAudioMetrics.current = audioMonitor.current?.finish();
    audioMonitor.current = null;
    setRecorder(null);
    setElapsed((value) => Math.max(1, value));
    setStep("review");
  }
  function togglePause() {
    if (recorder) {
      if (recorder.state === "recording") recorder.pause();
      else if (recorder.state === "paused") recorder.resume();
    }
    setPaused((value) => !value);
  }
  function restartRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    audioMonitor.current?.finish();
    audioMonitor.current = null;
    beginRecording(micStatus !== "ready");
  }
  function leaveRecording() {
    if (window.confirm("녹음을 종료하고 이전 화면으로 이동할까요?")) {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      audioMonitor.current?.finish();
      audioMonitor.current = null;
      setStep("microphone_check");
    }
  }

  function startAnalysis() {
    setStep("analyzing");
  }
  const finishAnalysis = useCallback(async () => {
    aiRequest.current?.abort();
    const controller = new AbortController();
    aiRequest.current = controller;
    const attempts = loadSelfIntroductionAttempts();
    const duration = Math.max(1, elapsed);
    const stt = await aiService.transcribeAudio(
      {
        audioBlob: blob ?? undefined,
        mimeType: blob?.type,
        durationSeconds: duration,
        languageHint: "ko",
        fallbackTranscript: transcript,
      },
      { signal: controller.signal },
    );
    const reviewedTranscript =
      stt.ok && stt.data.transcript ? stt.data.transcript : transcript;
    const audioMetrics = completedAudioMetrics.current ? {
      ...completedAudioMetrics.current,
      speech: {
        ...completedAudioMetrics.current.speech,
        wordsPerMinute: reviewedTranscript.trim()
          ? Math.round(reviewedTranscript.trim().split(/\s+/).length / (Math.max(1, completedAudioMetrics.current.durationMs) / 60000))
          : null,
      },
    } : undefined;
    const speechMetrics = buildInterviewSpeechMetrics({
      transcript: reviewedTranscript,
      transcription: stt.ok ? stt.data : undefined,
      audioMetrics,
      providerId: stt.providerId as "mock" | "browser_speech" | "server",
    });
    const response = await aiService.analyzeSelfIntroduction(
      { transcript: reviewedTranscript, durationSeconds: duration },
      { signal: controller.signal },
    );
    if (!response.ok) {
      if (response.error.code === "cancelled") return;
      throw new Error(response.error.code);
    }
    const airlineAnalysis = analyzeSelfIntroductionWithAirlineContext(
      reviewedTranscript,
      duration,
      selectedAirlineId,
      selectedExperience?.competencyTags as string[] | undefined,
    );
    const next: SelfIntroductionAttempt = {
      id: `self-intro-${Date.now()}`,
      createdAt: new Date().toISOString(),
      transcript: reviewedTranscript,
      durationSeconds: duration,
      analysis: {
        ...response.data,
        metrics: {
          ...response.data.metrics,
          fillerCount: speechMetrics.fillers.totalCount,
          longSilenceCount: audioMetrics?.pauses.longCount ?? response.data.metrics.longSilenceCount,
        },
        airlineValueAlignment: airlineAnalysis.airlineValueAlignment,
        experienceConnection: airlineAnalysis.experienceConnection,
        missingCompetencySuggestion:
          airlineAnalysis.missingCompetencySuggestion,
        challenge: challengeTarget ? analyzeSelfIntroductionChallenge(challengeTarget, duration, reviewedTranscript) : undefined,
      },
      targetAirlineId: selectedAirlineId,
      experienceId: selectedExperience?.id,
      experienceSnapshot: selectedExperience
        ? {
            title: selectedExperience.title,
            shortSummary: selectedExperience.shortSummary,
          }
        : undefined,
      attemptNumber: attempts.length + 1,
      previousAttemptId,
      completed: true,
      challengeType: challengeTarget ? challengeTypeFor(challengeTarget) : undefined,
      targetSeconds: challengeTarget,
      audioMetrics,
      speechMetrics,
    };
    saveSelfIntroductionAttempt(next);
    if (blob) await saveAttemptAudio(next.id, blob);
    queueTrainingAttempt("self_introduction", next, Boolean(blob));
    recordAttemptProgress(next);
    setAttempt(next);
    setStep("result");
    onComplete(next);
  }, [
    blob,
    elapsed,
    onComplete,
    previousAttemptId,
    selectedExperience,
    selectedAirlineId,
    transcript,
    challengeTarget,
  ]);

  function retry(mode?: string) {
    aiRequest.current?.abort();
    if (attempt) setPreviousAttemptId(attempt.id);
    const selectedSeconds = mode?.match(/^(30|60|90)초/)?.[1];
    if (selectedSeconds) setChallengeTarget(Number(selectedSeconds) as SelfIntroductionChallengeSeconds);
    setStep("retry");
    setTranscript(mockTranscript);
    setElapsed(0);
    setBlob(null);
    setAudioUrl(undefined);
    setStep("microphone_check");
  }

  if (step === "intro")
    return (
      <SelfIntroductionIntro
        challengeTarget={challengeTarget}
        onChallengeTarget={setChallengeTarget}
        airlineSection={
          <div className="mt-5">
            <label
              htmlFor="self-introduction-airline"
              className="mb-2 block text-sm font-bold text-navy"
            >
              지원 항공사 기준으로 분석하기
            </label>
            <select
              id="self-introduction-airline"
              value={selectedAirlineId ?? ""}
              onChange={(event) =>
                setSelectedAirlineId(event.target.value || undefined)
              }
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            >
              <option value="">범용 자기소개 분석</option>
              {airlines.map((airline) => (
                <option key={airline.id} value={airline.id}>
                  {airline.name}
                </option>
              ))}
            </select>
            {getSelfIntroductionAirlineContext(selectedAirlineId) && (
              <p className="mt-2 text-xs leading-relaxed text-teal">
                {airlineById.get(selectedAirlineId!)?.name}의 게시된 준비 방향을
                분석 보조로만 사용합니다.
              </p>
            )}
          </div>
        }
        experienceSection={
          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-navy">
              자기소개에 활용할 대표 경험
            </p>
            <ExperiencePicker
              question={interviewQuestionById.get("im1")!}
              items={experiences}
              selected={selectedExperienceId}
              onSelect={setSelectedExperienceId}
              onAdd={() => {}}
            />
          </div>
        }
        onStart={() => {
          setStep("microphone_check");
          void checkMicrophone();
        }}
        onLater={onExit}
      />
    );
  if (step === "microphone_check" || step === "retry")
    return (
      <MicrophoneCheck
        status={micStatus}
        level={micStatus === "ready" ? 68 : 12}
        onCheck={() => void checkMicrophone()}
        onStart={() => beginRecording(micStatus !== "ready")}
        onTextPractice={() => beginRecording(true)}
        onBack={() => setStep("intro")}
      />
    );
  if (step === "recording")
    return (
      <FreeResponseRecorder
        elapsed={elapsed}
        paused={paused}
        level={45 + (elapsed % 35)}
        onFinish={finishRecording}
        onPause={togglePause}
        onRestart={restartRecording}
        onBack={leaveRecording}
        targetSeconds={challengeTarget}
      />
    );
  if (step === "review")
    return (
      <RecordingReview
        duration={elapsed}
        audioUrl={audioUrl}
        transcript={transcript}
        onTranscript={setTranscript}
        onAnalyze={startAnalysis}
        onRetry={() => beginRecording(micStatus !== "ready")}
        onBack={() => {
          if (window.confirm("저장하지 않은 답변을 닫을까요?"))
            setStep("microphone_check");
        }}
      />
    );
  if (step === "analyzing")
    return <SelfIntroductionAnalyzing onDone={finishAnalysis} />;
  if (step === "result" && attempt)
    return (
      <SelfIntroductionResult
        attempt={attempt}
        history={loadSelfIntroductionAttempts()}
        onHome={onExit}
        onRetry={retry}
      />
    );
  return null;
}
