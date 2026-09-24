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
import { buildSelfIntroTrainingLoopModel, type TrainingLoopAction } from "@/lib/training-loop";
import { loadInterviewSessions } from "@/lib/mock-interview-session";
import { listApplicationAnswers } from "@/lib/application-answer-repository";
import { resolveSelfIntroductionResultNavigation } from "@/lib/self-introduction-navigation";
import { useMicrophoneCheck } from "@/components/interview-practice/use-microphone-check";
import { saveSelfIntroductionAudioSafely } from "@/lib/self-introduction-audio-recovery";
import { useNonverbalCamera } from "./use-nonverbal-camera";
import { NonverbalCameraCheck, NonverbalSignalCard } from "./nonverbal-signal-components";
import type { NonverbalSignalResult } from "@/lib/nonverbal-signal-coach";
import { assessTranscript, contentAnalysisGate, createTranscriptReview, understandInterviewAnswer, type TranscriptAssessment } from "@/lib/speech-understanding-v2";
import type { AiResponse, TranscriptionResult } from "@/lib/ai/types";
import { SpeechTranscriptReview, SpeechUnderstandingResult } from "@/components/speech-understanding/speech-understanding-components";

export type SelfIntroductionStep =
  | "intro"
  | "microphone_check"
  | "camera_check"
  | "recording"
  | "review"
  | "analyzing"
  | "transcript_review"
  | "content_analyzing"
  | "result"
  | "retry";

export function SelfIntroductionFlow({
  targetAirlineId,
  onExit,
  onComplete,
  initialChallengeTarget,
  weeklyReturnAttemptId,
  onWeeklyReturn,
  assessmentVideo,
  onAssessmentVideoComplete,
  onTrainingLoopNext,
}: {
  targetAirlineId?: string;
  onExit: () => void;
  onComplete: (attempt: SelfIntroductionAttempt) => void;
  initialChallengeTarget?: SelfIntroductionChallengeSeconds;
  weeklyReturnAttemptId?: string;
  onWeeklyReturn?: () => void;
  assessmentVideo?: { id: string; prompt: string; recommendedSeconds: 30 | 60 | 90 };
  onAssessmentVideoComplete?: (attempt: SelfIntroductionAttempt) => void;
  onTrainingLoopNext?: (action: TrainingLoopAction) => void;
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
  const [transcriptAssessment, setTranscriptAssessment] = useState<TranscriptAssessment | null>(null);
  const [attempt, setAttempt] = useState<SelfIntroductionAttempt | null>(null);
  const [audioSaveWarning, setAudioSaveWarning] = useState<string>();
  const [selectedHistoryAttemptId, setSelectedHistoryAttemptId] = useState<string>();
  const [previousAttemptId, setPreviousAttemptId] = useState<string>();
  const [challengeTarget, setChallengeTarget] = useState<SelfIntroductionChallengeSeconds | undefined>(initialChallengeTarget);
  const [practiceLanguage, setPracticeLanguage] = useState<SelfIntroductionLanguage>(DEFAULT_SELF_INTRODUCTION_LANGUAGE);
  const chunks = useRef<Blob[]>([]);
  const aiRequest = useRef<AbortController | null>(null);
  const preparedTranscription = useRef<AiResponse<TranscriptionResult> | null>(null);
  const audioMonitor = useRef<ReturnType<typeof createInterviewAudioMonitor> | null>(null);
  const completedAudioMetrics = useRef<InterviewAudioMetrics | undefined>(undefined);
  const completedNonverbalSignal = useRef<NonverbalSignalResult | undefined>(undefined);
  const [cameraConsent, setCameraConsent] = useState(false);
  const vision = useNonverbalCamera();
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
    setTranscript('');
    setTranscriptAssessment(null);
    preparedTranscription.current = null;
    chunks.current = [];
    completedAudioMetrics.current = undefined;
    completedNonverbalSignal.current = undefined;
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
    vision.beginSampling();
    setStep("recording");
  }

  function finishRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    completedAudioMetrics.current = audioMonitor.current?.finish();
    completedNonverbalSignal.current = vision.finishSampling(Math.max(1000, elapsed * 1000));
    vision.disableCamera();
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
    setPaused((value) => {
      vision.setPaused(!value);
      return !value;
    });
  }
  function restartRecording() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    audioMonitor.current?.finish();
    audioMonitor.current = null;
    vision.finishSampling(Math.max(0, elapsed * 1000));
    beginRecording(micStatus !== "ready");
  }
  function leaveRecording() {
    if (window.confirm("녹음을 종료하고 이전 화면으로 이동할까요?")) {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      audioMonitor.current?.finish();
      audioMonitor.current = null;
      vision.finishSampling(Math.max(0, elapsed * 1000));
      vision.disableCamera();
      setStep("microphone_check");
    }
  }

  function startAnalysis() {
    setStep("analyzing");
  }
  const prepareTranscript = useCallback(async () => {
    aiRequest.current?.abort();
    const controller = new AbortController();
    aiRequest.current = controller;
    const duration = Math.max(1, elapsed);
    const stt = await aiService.transcribeAudio({
      audioBlob: blob ?? undefined,
      mimeType: blob?.type,
      durationSeconds: duration,
      languageHint: selfIntroductionLanguageHint(practiceLanguage),
    }, { signal: controller.signal });
    if (!stt.ok && stt.error.code === "cancelled") return;
    preparedTranscription.current = stt;
    const recognized = actualTranscript(stt);
    const assessment = assessTranscript(recognized, practiceLanguage);
    setTranscriptAssessment(assessment);
    setTranscript(assessment.normalizedTranscript);
    setStep(recognized ? "transcript_review" : "content_analyzing");
  }, [blob, elapsed, practiceLanguage]);

  const finishAnalysis = useCallback(async () => {
    const stt = preparedTranscription.current;
    if (!stt) return;
    const controller = new AbortController();
    aiRequest.current = controller;
    const attempts = assessmentVideo ? [] : loadSelfIntroductionAttempts();
    const duration = Math.max(1, elapsed);
    const sourceTranscript = actualTranscript(stt);
    const reviewedTranscript = transcript.trim();
    const transcriptReview = createTranscriptReview(sourceTranscript, reviewedTranscript, practiceLanguage);
    const integrity = {
      ...transcriptionIntegrity(stt),
      transcriptProvenance: transcriptReview.provenance,
    };
    const gate = contentAnalysisGate(assessTranscript(reviewedTranscript, practiceLanguage));
    const contentAnalysisState = gate.allowed
      ? { status: gate.warning ? "weak" as const : "available" as const, reason: gate.warning }
      : { status: "unavailable" as const, reason: gate.error };
    const speechUnderstanding = gate.allowed ? understandInterviewAnswer({
      questionPrompt: assessmentVideo?.prompt ?? (challengeTarget
        ? `${challengeTarget}초 자기소개 · ${selfIntroductionPrompt(practiceLanguage)}`
        : selfIntroductionPrompt(practiceLanguage)),
      transcript: reviewedTranscript,
      language: practiceLanguage,
      practiceType: assessmentVideo ? "single_interview" : "self_introduction",
    }) : undefined;
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
    const response = !assessmentVideo && integrity.isActualTranscription && gate.allowed ? await aiService.analyzeSelfIntroduction(
      { transcript: reviewedTranscript, durationSeconds: duration },
      { signal: controller.signal },
    ) : null;
    if (response && !response.ok) {
      if (response.error.code === "cancelled") return;
    }
    const airlineAnalysis = !assessmentVideo && integrity.isActualTranscription && gate.allowed ? analyzeSelfIntroductionWithAirlineContext(
      reviewedTranscript,
      duration,
      selectedAirlineId,
      selectedExperience?.competencyTags as string[] | undefined,
    ) : {airlineValueAlignment:undefined,experienceConnection:undefined,missingCompetencySuggestion:undefined};
    const baseAnalysis = response?.ok ? response.data : unavailableSelfIntroductionAnalysis(duration);
    const next: SelfIntroductionAttempt = {
      id: `${assessmentVideo ? "competency-video" : "self-intro"}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      transcript: reviewedTranscript,
      transcriptIntegrity: integrity,
      transcriptReview,
      contentAnalysisState,
      speechUnderstanding,
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
        challenge: challengeTarget && integrity.isActualTranscription && gate.allowed ? analyzeSelfIntroductionChallenge(challengeTarget, duration, reviewedTranscript) : undefined,
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
      challengeType: !assessmentVideo && challengeTarget ? challengeTypeFor(challengeTarget) : undefined,
      targetSeconds: assessmentVideo?.recommendedSeconds ?? challengeTarget,
      audioMetrics,
      speechMetrics,
      pronunciationAnalysis,
      practiceLanguage,
      nonverbalSignal: completedNonverbalSignal.current,
    };
    if (assessmentVideo) {
      onAssessmentVideoComplete?.(next);
    } else {
      const localSave = saveSelfIntroductionAttempt(next);
      const audioSave = await saveSelfIntroductionAudioSafely(next.id, localSave.ok ? blob : null, saveAttemptAudio);
      setAudioSaveWarning(audioSave.warning);
      if (localSave.ok) {
        queueTrainingAttempt("self_introduction", next, audioSave.audioSaved);
        recordAttemptProgress(next);
        onComplete(next);
      }
    }
    setAttempt(next);
    setStep("result");
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
    assessmentVideo,
    onAssessmentVideoComplete,
  ]);

  function retry(mode?: string) {
    aiRequest.current?.abort();
    if (attempt) setPreviousAttemptId(attempt.id);
    const selectedSeconds = mode?.match(/^(30|60|90)초/)?.[1];
    if (selectedSeconds) setChallengeTarget(Number(selectedSeconds) as SelfIntroductionChallengeSeconds);
    setStep("retry");
    setTranscript('');
    setTranscriptAssessment(null);
    preparedTranscription.current = null;
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
    setTranscriptAssessment(null);
    preparedTranscription.current = null;
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

  if (step === "intro" && assessmentVideo)
    return <main className="mx-auto w-full max-w-2xl px-5 py-6"><button type="button" onClick={onExit} className="min-h-11 text-sm font-bold text-navy">← 역량검사로</button><section className="mt-3 rounded-3xl bg-navy p-6 text-ivory"><span className="text-xs font-bold text-gold">VIDEO RESPONSE · {assessmentVideo.id}</span><h1 className="mt-3 text-xl font-bold leading-relaxed">{assessmentVideo.prompt}</h1><p className="mt-3 text-sm text-ivory/75">권장 {assessmentVideo.recommendedSeconds}초 · 실제 음성 전사가 있을 때만 답변 내용이 역량 근거로 연결됩니다.</p></section><section className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">카메라는 선택 사항입니다. 프레이밍·움직임 등 비언어 신호는 별도 코칭에만 사용되며 역량 profile 점수에는 합산되지 않습니다.</section><button type="button" onClick={()=>{setStep("microphone_check");void mic.check()}} className="mt-5 min-h-12 w-full rounded-xl bg-coral text-sm font-bold text-white">영상답변 준비</button></main>;
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
        onStart={() => setStep("camera_check")}
        onTextPractice={() => {
          vision.disableCamera();
          beginRecording(true);
        }}
        onBack={() => setStep("intro")}
      />
    );
  if (step === "camera_check")
    return (
      <NonverbalCameraCheck
        status={vision.status}
        consent={cameraConsent}
        enabled={vision.enabled}
        backend={vision.backend}
        engineStatus={vision.engineStatus}
        poseStatus={vision.poseStatus}
        baselineQuality={vision.baselineQuality}
        videoRef={vision.videoRef}
        onConsent={setCameraConsent}
        onEnable={() => void vision.startCamera()}
        onContinue={() => beginRecording(micStatus !== "ready")}
        onSkip={() => {
          vision.disableCamera();
          beginRecording(micStatus !== "ready");
        }}
        onBack={() => {
          vision.disableCamera();
          setStep("microphone_check");
        }}
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
        targetSeconds={assessmentVideo?.recommendedSeconds ?? challengeTarget}
        question={assessmentVideo?.prompt ?? selfIntroductionPrompt(practiceLanguage)}
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
        onRetry={() => setStep("camera_check")}
        onBack={() => {
          if (window.confirm("저장하지 않은 답변을 닫을까요?"))
            setStep("microphone_check");
        }}
      />
    );
  if (step === "analyzing")
    return <SelfIntroductionAnalyzing onDone={prepareTranscript} />;
  if (step === "transcript_review" && transcriptAssessment)
    return (
      <SpeechTranscriptReview
        id="self-introduction-transcript-review"
        rawTranscript={transcriptAssessment.normalizedTranscript}
        value={transcript}
        quality={transcriptAssessment.quality}
        language={transcriptAssessment.language}
        onChange={setTranscript}
        onConfirm={() => setStep("content_analyzing")}
        onRetry={() => setStep("camera_check")}
      />
    );
  if (step === "content_analyzing")
    return <SelfIntroductionAnalyzing onDone={finishAnalysis} />;
  if (step === "result" && attempt && assessmentVideo)
    return <main className="mx-auto w-full max-w-3xl space-y-4 px-5 py-6"><section className="rounded-3xl bg-navy p-6 text-ivory"><span className="text-xs font-bold text-gold">VIDEO RESPONSE SAVED</span><h1 className="mt-2 text-xl font-bold">영상답변 모듈에 반영했습니다.</h1><p className="mt-3 text-sm text-ivory/75">{attempt.transcriptIntegrity?.isActualTranscription ? "실제 전사 답변을 내용 근거로 연결했습니다." : "음성 답변은 제출됐지만 실제 전사 근거가 없어 역량 판단에는 반영하지 않았습니다."}</p></section><SpeechUnderstandingResult review={attempt.transcriptReview} understanding={attempt.speechUnderstanding} state={attempt.contentAnalysisState}/><NonverbalSignalCard result={attempt.nonverbalSignal} locale={attempt.practiceLanguage}/><button type="button" onClick={onExit} className="min-h-12 w-full rounded-xl bg-navy text-sm font-bold text-ivory">역량검사로 돌아가기</button></main>;
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
        trainingLoop={buildSelfIntroTrainingLoopModel({
          attempt,
          attempts: loadSelfIntroductionAttempts().filter(item => item.id !== attempt.id),
          sessions: loadInterviewSessions(),
          applicationAnswerCount: listApplicationAnswers().length,
        })}
        onTrainingLoopAction={action => {
          // A retake restarts the very same exercise through the existing same-condition path, so the
          // 30/60/90 target, the practice language and the attempt lineage are all preserved.
          if (action.kind === "retake" || action.kind === "focused_retake") { retakeHistory(attempt); return; }
          onTrainingLoopNext?.(action);
        }}
      />
    );
  return null;
}
