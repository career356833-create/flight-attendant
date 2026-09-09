"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeSelfIntroductionWithAirlineContext,
  getSelfIntroductionAirlineContext,
  loadSelfIntroductionAttempts,
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
import { onboardingKo } from "@/lib/onboarding-i18n";
import { airlines, airlineById } from "@/lib/airline-data";
import { analyzeSelfIntroductionChallenge, challengeTypeFor, type SelfIntroductionChallengeSeconds } from "@/lib/self-introduction-challenge";
import { recommendExperiencesForSelfIntroduction } from "@/lib/experience-match-engine";
import { createInterviewAudioMonitor, type InterviewAudioMetrics } from "@/lib/interview-audio/audio-analysis";
import { buildInterviewSpeechMetrics } from "@/lib/interview-audio/speech-analysis";
import { actualTranscript, transcriptionIntegrity, unavailableSelfIntroductionAnalysis } from "@/lib/ai/transcription-integrity";
import { runPronunciationAnalysis } from "@/lib/ai/pronunciation-flow";
import { DEFAULT_SELF_INTRODUCTION_LANGUAGE, selfIntroductionLanguageHint, selfIntroductionPrompt, type SelfIntroductionLanguage } from "@/lib/self-introduction-language";
import { sameConditionRetake, sortSelfIntroductionHistory } from "@/lib/self-introduction-history";
import { resolveSelfIntroductionResultNavigation } from "@/lib/self-introduction-navigation";
import { useMicrophoneCheck } from "@/components/interview-practice/use-microphone-check";
import { saveSelfIntroductionAudioSafely } from "@/lib/self-introduction-audio-recovery";

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
  weeklyReturnAttemptId,
  onWeeklyReturn,
}: {
  targetAirlineId?: string;
  onExit: () => void;
  onComplete: (attempt: SelfIntroductionAttempt) => void;
  initialChallengeTarget?: SelfIntroductionChallengeSeconds;
  weeklyReturnAttemptId?: string;
  onWeeklyReturn?: () => void;
}) {
  const [step, setStep] = useState<SelfIntroductionStep>("intro");
  const mic = useMicrophoneCheck();
  const { status: micStatus, stream } = mic;
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [attempt, setAttempt] = useState<SelfIntroductionAttempt | null>(null);
  const [audioSaveWarning, setAudioSaveWarning] = useState<string>();
  const [selectedHistoryAttemptId, setSelectedHistoryAttemptId] = useState<string>();
  const [previousAttemptId, setPreviousAttemptId] = useState<string>();
  const [challengeTarget, setChallengeTarget] = useState<SelfIntroductionChallengeSeconds | undefined>(initialChallengeTarget);
  const [practiceLanguage, setPracticeLanguage] = useState<SelfIntroductionLanguage>(DEFAULT_SELF_INTRODUCTION_LANGUAGE);
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
  const airlineContextTags = getSelfIntroductionAirlineContext(selectedAirlineId)?.publishedInterviewQuestion.flatMap((question) => question.competencyTags);
  const selfIntroRecommendations = recommendExperiencesForSelfIntroduction(experiences, airlineContextTags?.length ? { competencyTags: airlineContextTags, airlineName: airlineById.get(selectedAirlineId!)?.name } : undefined);

  useEffect(() => () => {
    aiRequest.current?.abort();
    audioMonitor.current?.finish();
  }, []);
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

  function beginRecording(forceMock = false) {
    setElapsed(0);
    setPaused(false);
    setBlob(null);
    setAudioUrl(undefined);
    chunks.current = [];
    completedAudioMetrics.current = undefined;
    if (!forceMock && stream && typeof MediaRecorder !== "undefined") {
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState === "ended" || track.muted) {
        void mic.check(mic.selectedDeviceId, true);
        setStep("microphone_check");
        return;
      }
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
      } catch { setRecorder(null); }
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
        languageHint: selfIntroductionLanguageHint(practiceLanguage),
        fallbackTranscript: transcript,
      },
      { signal: controller.signal },
    );
    const integrity = transcriptionIntegrity(stt);
    const reviewedTranscript = actualTranscript(stt);
    const audioMetrics = completedAudioMetrics.current ? {
      ...completedAudioMetrics.current,
      speech: {
        ...completedAudioMetrics.current.speech,
        wordsPerMinute: integrity.isActualTranscription && reviewedTranscript
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
    const pronunciationAnalysis = integrity.isActualTranscription ? await runPronunciationAnalysis({
      blob,
      transcript: reviewedTranscript,
      language: speechMetrics.language === "en" ? "en-US" : speechMetrics.language,
      audioMetrics,
      signal: controller.signal,
      confirm: () => window.confirm("정밀 발음 분석을 사용하면 이 영어 답변의 녹음 음성이 외부 음성 처리 서비스로 일시 전송됩니다. 영구 원격 저장과는 별도입니다. 계속할까요?"),
    }).catch(() => ({provider:"none" as const,status:"failed" as const,language:speechMetrics.language})) : undefined;
    const response = integrity.isActualTranscription ? await aiService.analyzeSelfIntroduction(
      { transcript: reviewedTranscript, durationSeconds: duration },
      { signal: controller.signal },
    ) : null;
    if (response && !response.ok) {
      if (response.error.code === "cancelled") return;
      throw new Error(response.error.code);
    }
    const airlineAnalysis = integrity.isActualTranscription ? analyzeSelfIntroductionWithAirlineContext(
      reviewedTranscript,
      duration,
      selectedAirlineId,
      selectedExperience?.competencyTags as string[] | undefined,
    ) : {airlineValueAlignment:undefined,experienceConnection:undefined,missingCompetencySuggestion:undefined};
    const baseAnalysis = response?.ok ? response.data : unavailableSelfIntroductionAnalysis(duration);
    const next: SelfIntroductionAttempt = {
      id: `self-intro-${Date.now()}`,
      createdAt: new Date().toISOString(),
      transcript: reviewedTranscript,
      transcriptIntegrity: integrity,
      durationSeconds: duration,
      analysis: {
        ...baseAnalysis,
        metrics: {
          ...baseAnalysis.metrics,
          fillerCount: speechMetrics.fillers.totalCount,
          longSilenceCount: audioMetrics?.pauses.longCount ?? baseAnalysis.metrics.longSilenceCount,
        },
        airlineValueAlignment: airlineAnalysis.airlineValueAlignment,
        experienceConnection: airlineAnalysis.experienceConnection,
        missingCompetencySuggestion:
          airlineAnalysis.missingCompetencySuggestion,
        challenge: challengeTarget && integrity.isActualTranscription ? analyzeSelfIntroductionChallenge(challengeTarget, duration, reviewedTranscript) : undefined,
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
      pronunciationAnalysis,
      practiceLanguage,
    };
    saveSelfIntroductionAttempt(next);
    const audioSave = await saveSelfIntroductionAudioSafely(next.id, blob, saveAttemptAudio);
    setAudioSaveWarning(audioSave.warning);
    queueTrainingAttempt("self_introduction", next, audioSave.audioSaved);
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
    practiceLanguage,
  ]);

  function retry(mode?: string) {
    aiRequest.current?.abort();
    if (attempt) setPreviousAttemptId(attempt.id);
    const selectedSeconds = mode?.match(/^(30|60|90)초/)?.[1];
    if (selectedSeconds) setChallengeTarget(Number(selectedSeconds) as SelfIntroductionChallengeSeconds);
    setStep("retry");
    setTranscript('');
    setElapsed(0);
    setBlob(null);
    setAudioUrl(undefined);
    setStep("microphone_check");
  }

  function revisitHistory(selected: SelfIntroductionAttempt) {
    setAudioSaveWarning(undefined);
    setSelectedHistoryAttemptId(selected.id);
    setAttempt(selected);
    setStep("result");
  }

  function retakeHistory(selected: SelfIntroductionAttempt) {
    setAudioSaveWarning(undefined);
    const conditions = sameConditionRetake(selected);
    setPreviousAttemptId(conditions.previousAttemptId);
    setChallengeTarget(conditions.targetSeconds);
    if (conditions.practiceLanguage) setPracticeLanguage(conditions.practiceLanguage);
    setSelectedHistoryAttemptId(undefined);
    setAttempt(null);
    setTranscript('');
    setElapsed(0);
    setBlob(null);
    setAudioUrl(undefined);
    setStep("microphone_check");
    void mic.check();
  }

  function navigateFromResult(action: "back" | "home") {
    if (resolveSelfIntroductionResultNavigation(action, Boolean(selectedHistoryAttemptId)) === "exit") {
      onExit();
      return;
    }
    setSelectedHistoryAttemptId(undefined);
    setAttempt(null);
    setStep("intro");
  }

  if (step === "intro")
    return (
      <SelfIntroductionIntro
        challengeTarget={challengeTarget}
        onChallengeTarget={setChallengeTarget}
        practiceLanguage={practiceLanguage}
        onPracticeLanguage={setPracticeLanguage}
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
            {selfIntroRecommendations.length ? <div className="mb-3 space-y-2 rounded-2xl border border-border bg-card p-3">{selfIntroRecommendations.slice(0, 2).map(({ experience, reasons }) => <button key={experience.id} type="button" onClick={() => setSelectedExperienceId(experience.id)} className={`w-full rounded-xl border p-3 text-left ${selectedExperienceId===experience.id?'border-navy bg-secondary/50':'border-border bg-background'}`}><strong className="block text-sm text-navy">{experience.title}</strong><p className="mt-1 text-xs text-muted-foreground">{experience.competencyTags.slice(0,2).map((tag) => onboardingKo.experienceLibrary.competencies[tag]).join(' · ')}</p><p className="mt-2 text-[11px] leading-relaxed text-gold">{reasons[0]}</p></button>)}</div> : null}
            <ExperiencePicker
              question={interviewQuestionById.get("im1")!}
              items={experiences}
              selected={selectedExperienceId}
              onSelect={setSelectedExperienceId}
              airlineCompetencyTags={airlineContextTags}
              airlineLabel={selectedAirlineId ? airlineById.get(selectedAirlineId)?.name : undefined}
              onAdd={() => {}}
            />
          </div>
        }
        onStart={() => {
          setStep("microphone_check");
          void mic.check();
        }}
        onLater={onExit}
        history={sortSelfIntroductionHistory(loadSelfIntroductionAttempts())}
        onSelectHistory={revisitHistory}
      />
    );
  if (step === "microphone_check" || step === "retry")
    return (
      <MicrophoneCheck
        status={micStatus}
        level={mic.level}
        deviceLabel={mic.deviceLabel}
        devices={mic.devices}
        selectedDeviceId={mic.selectedDeviceId}
        signalState={mic.signalState}
        sampling={mic.sampling}
        canStart={mic.canStart}
        onCheck={mic.retest}
        onDeviceChange={mic.selectDevice}
        onContinueLowSignal={mic.continueWithLowSignal}
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
        question={selfIntroductionPrompt(practiceLanguage)}
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
        audioSaveWarning={audioSaveWarning}
        history={sortSelfIntroductionHistory(loadSelfIntroductionAttempts())}
        onBack={selectedHistoryAttemptId ? () => navigateFromResult("back") : undefined}
        onHome={weeklyReturnAttemptId === attempt.id && !selectedHistoryAttemptId && onWeeklyReturn ? onWeeklyReturn : () => navigateFromResult("home")}
        returnLabel={weeklyReturnAttemptId === attempt.id && !selectedHistoryAttemptId ? "주간 계획으로 돌아가기" : undefined}
        onRetry={retry}
        onSelectHistory={revisitHistory}
        onRetakeSameConditions={() => retakeHistory(attempt)}
        isHistoryRevisit={Boolean(selectedHistoryAttemptId)}
      />
    );
  return null;
}
