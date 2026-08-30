import { getAirlineAIContext } from "@/lib/airline-knowledge-repository";
import type { SelfIntroductionChallengeAnalysis, SelfIntroductionChallengeSeconds, SelfIntroductionChallengeType } from "@/lib/self-introduction-challenge";
import type { InterviewAudioMetrics } from "@/lib/interview-audio/audio-analysis";
import type { InterviewSpeechMetrics } from "@/lib/interview-audio/speech-analysis";
import type { PronunciationAnalysisResult } from "@/lib/ai/pronunciation-provider";
import type { TranscriptIntegrity } from "@/lib/interview-practice-data";

export type TimingAssessment =
  | "too_brief_for_content"
  | "well_balanced"
  | "slightly_long"
  | "long_but_structured";

export type TimingAnalysis = {
  durationSeconds: number;
  firstKeyMessageAtSeconds: number | null;
  silenceSeconds: number;
  repeatedPhraseCount: number;
  assessment: TimingAssessment;
  feedback: string;
};

export type SelfIntroductionAnalysis = {
  transcriptIntegrity?: TranscriptIntegrity;
  timing: TimingAnalysis;
  overall: string;
  bestPoint: string;
  firstImprovement: string;
  details: { id: string; title: string; feedback: string }[];
  metrics: {
    wordsPerMinute: number;
    speakingPaceLabel: string;
    longSilenceCount: number;
    fillerCount: number;
    roleConnection: "connected" | "needs_improvement";
  };
  guide: { keep: string; reduce: string; add: string };
  retryRecommendation: "expand_experience" | "repeat_current" | "compress_core";
  airlineValueAlignment?: string;
  experienceConnection?: string;
  missingCompetencySuggestion?: string[];
  challenge?: SelfIntroductionChallengeAnalysis;
};

export type SelfIntroductionAirlineContext = {
  airlineId: string;
  publishedProfile: {
    name?: string;
    servicePhilosophy?: string;
    coreValues: string[];
  };
  publishedRecruitment: { languages: string[]; eligibility?: string[] };
  publishedCoachingInsight: {
    id: string;
    topic: string;
    coachMessage: string;
    goodDirections: string[];
    avoidPatterns: string[];
  }[];
  publishedInterviewQuestion: {
    id: string;
    questionType: string;
    competencyTags: string[];
  }[];
};

export type SelfIntroductionAttempt = {
  id: string;
  createdAt: string;
  audioUrl?: string;
  audioPath?: string;
  transcript: string;
  transcriptIntegrity?: TranscriptIntegrity;
  durationSeconds: number;
  analysis: SelfIntroductionAnalysis;
  targetAirlineId?: string;
  attemptNumber: number;
  previousAttemptId?: string;
  experienceId?: string;
  experienceSnapshot?: { title: string; shortSummary: string };
  completed: boolean;
  challengeType?: SelfIntroductionChallengeType;
  targetSeconds?: SelfIntroductionChallengeSeconds;
  audioMetrics?: InterviewAudioMetrics;
  speechMetrics?: InterviewSpeechMetrics;
  pronunciationAnalysis?: PronunciationAnalysisResult;
};

export type SelfIntroductionProgress = {
  routineCompleted: boolean;
  interviewScoreGain: number;
  scoreHistory: { attemptId: string; delta: number; createdAt: string }[];
};

export const SELF_INTRO_TASK_ID = "self-introduction-diagnosis";
const ATTEMPTS_KEY = "cabin-self-introduction-attempts-v1";
const PROGRESS_KEY = "cabin-self-introduction-progress-v1";
const DB_NAME = "cabin-training-audio";
const STORE_NAME = "attempt-audio";

export const mockTranscript =
  "저의 강점은 고객의 상황을 빠르게 이해하고 침착하게 해결하는 서비스 역량입니다. 카페에서 근무할 때 주문 지연으로 불편을 겪은 고객에게 먼저 상황을 설명하고 대안을 제안해 만족을 이끌어 낸 경험이 있습니다. 이 경험을 통해 정확한 안내와 공감의 중요성을 배웠고, 객실승무원으로서 승객이 안심할 수 있는 서비스를 제공하겠습니다.";

const countMatches = (text: string, pattern: RegExp) =>
  (text.match(pattern) ?? []).length;

export function getSelfIntroductionAirlineContext(
  airlineId?: string,
): SelfIntroductionAirlineContext | null {
  if (!airlineId) return null;
  const context = getAirlineAIContext(airlineId);
  if (!context) return null;
  return {
    airlineId,
    publishedProfile: {
      name: context.verifiedProfile.displayName,
      servicePhilosophy: context.verifiedProfile.servicePhilosophy,
      coreValues: context.verifiedProfile.coreValues ?? [],
    },
    publishedRecruitment: {
      languages: context.publishedRecruitment.recruitmentLanguages,
      eligibility: context.publishedRecruitment.eligibilityRequirements?.value,
    },
    publishedCoachingInsight: context.approvedCoachingInsights.map((item) => ({
      id: item.id,
      topic: item.topic,
      coachMessage: item.coachMessage,
      goodDirections: item.goodDirections,
      avoidPatterns: item.avoidPatterns,
    })),
    publishedInterviewQuestion: context.approvedResearchQuestions.map(
      (item) => ({
        id: item.id,
        questionType: item.questionType,
        competencyTags: item.competencyTags,
      }),
    ),
  };
}

export function analyzeSelfIntroductionWithAirlineContext(
  transcript: string,
  durationSeconds: number,
  airlineId?: string,
  experienceTags: string[] = [],
): SelfIntroductionAnalysis {
  const base = analyzeSelfIntroduction(transcript, durationSeconds);
  const context = getSelfIntroductionAirlineContext(airlineId);
  if (!context) return base;
  const competencyTags = [
    ...new Set(
      context.publishedInterviewQuestion.flatMap(
        (question) => question.competencyTags,
      ),
    ),
  ];
  const matched = experienceTags.filter((tag) => competencyTags.includes(tag));
  return {
    ...base,
    airlineValueAlignment:
      "게시된 항공사 가치와 자기소개 내용의 연결을 보완 추천으로 검토했어요.",
    experienceConnection: experienceTags.length
      ? matched.length
        ? "선택한 대표 경험의 역량이 게시된 준비 방향과 연결됩니다."
        : "대표 경험을 선택했지만, 항공사 준비 방향과의 연결을 더 구체화해 보세요."
      : "대표 경험 없이도 분석할 수 있으며, 경험을 연결하면 더 구체적인 보완 추천을 받을 수 있어요.",
    missingCompetencySuggestion: competencyTags
      .filter((tag) => !experienceTags.includes(tag))
      .slice(0, 3),
  };
}

export function analyzeSelfIntroduction(
  transcript: string,
  durationSeconds: number,
): SelfIntroductionAnalysis {
  const normalized = transcript.trim();
  const hasExperience = /(경험|근무|상황|고객|해결|프로젝트)/.test(normalized);
  const hasRoleConnection = /(객실승무원|승객|항공사|기내|안전)/.test(
    normalized,
  );
  const hasResult = /(결과|만족|개선|배웠|이끌|달성)/.test(normalized);
  const fillerCount = countMatches(normalized, /(어\b|음\b|그래서|그러니까)/g);
  const repeatedPhraseCount = Math.max(
    0,
    countMatches(normalized, /(그래서|저는|경험)/g) - 2,
  );
  const estimatedWords = Math.max(
    1,
    normalized.replace(/\s/g, "").length / 2.2,
  );
  const wordsPerMinute = Math.round(
    (estimatedWords / Math.max(durationSeconds, 1)) * 60,
  );
  const firstKeyMessageAtSeconds = normalized
    ? Math.min(12, Math.max(3, Math.round(durationSeconds * 0.13)))
    : null;
  const silenceSeconds = Math.max(
    0,
    Math.round(durationSeconds * (normalized.length < 80 ? 0.12 : 0.05)),
  );
  const longSilenceCount =
    silenceSeconds >= 8 ? 2 : silenceSeconds >= 4 ? 1 : 0;
  const structured = hasExperience && hasResult && hasRoleConnection;

  let assessment: TimingAssessment;
  let feedback: string;
  if (durationSeconds < 40 && (!hasExperience || !hasRoleConnection)) {
    assessment = "too_brief_for_content";
    feedback =
      "핵심 강점은 분명하지만, 이를 보여주는 경험과 직무 연결이 부족해 짧게 느껴집니다.";
  } else if (durationSeconds <= 75 && structured) {
    assessment = "well_balanced";
    feedback =
      "핵심 메시지와 경험, 직무 연결이 균형 있게 담겼습니다. 실제 면접에서 활용하기 적절한 길이입니다.";
  } else if (durationSeconds >= 90 && structured && repeatedPhraseCount < 2) {
    assessment = "long_but_structured";
    feedback =
      "답변은 길지만 내용이 구조적이고 질문에 맞게 이어집니다. 결론을 조금만 압축하면 전달력이 더 좋아집니다.";
  } else if (durationSeconds >= 90) {
    assessment = "slightly_long";
    feedback =
      "경험 설명이 길어 핵심 강점이 흐려집니다. 행동과 결과를 중심으로 답변을 압축해 보세요.";
  } else {
    assessment = structured ? "well_balanced" : "too_brief_for_content";
    feedback = structured
      ? "내용과 길이가 대체로 균형적입니다."
      : "답변 길이보다 경험과 직무 연결을 한 문장씩 보강하는 것이 우선입니다.";
  }

  const retryRecommendation =
    assessment === "too_brief_for_content"
      ? "expand_experience"
      : assessment === "well_balanced" || assessment === "long_but_structured"
        ? "repeat_current"
        : "compress_core";
  const durationLabel = formatDurationWords(durationSeconds);
  return {
    timing: {
      durationSeconds,
      firstKeyMessageAtSeconds,
      silenceSeconds,
      repeatedPhraseCount,
      assessment,
      feedback,
    },
    overall: structured
      ? "핵심 강점과 경험은 잘 드러났습니다. 결론의 직무 연결을 더 선명하게 다듬으면 좋아요."
      : "강점의 방향은 보이지만 경험의 행동·결과와 객실승무원 직무 연결을 보강하면 좋아요.",
    bestPoint: hasExperience
      ? "서비스 경험을 강점의 근거로 제시한 점"
      : "자신의 강점을 먼저 제시한 점",
    firstImprovement: hasRoleConnection
      ? "결론 문장을 더 간결하게 정리하기"
      : "객실승무원으로서의 활용 방식을 결론에 추가하기",
    details: [
      {
        id: "message",
        title: "핵심 메시지",
        feedback: "첫 문장에서 서비스 경험을 강점으로 제시해 방향이 분명해요.",
      },
      {
        id: "specificity",
        title: "경험의 구체성",
        feedback: hasExperience
          ? "고객 상황은 구체적입니다. 본인이 직접 한 행동을 한 문장 더 선명하게 표현해 보세요."
          : "강점을 보여주는 실제 상황과 행동, 결과를 추가해 보세요.",
      },
      {
        id: "role",
        title: "직무 연결",
        feedback: hasRoleConnection
          ? "경험의 의미를 객실승무원 업무와 연결했습니다."
          : "경험의 의미는 보이지만 객실승무원 업무와의 연결이 약합니다.",
      },
      {
        id: "structure",
        title: "답변 구성",
        feedback: hasResult
          ? "강점 → 경험 → 배운 점의 흐름이 좋습니다. 결론 문장을 더하면 완성도가 높아져요."
          : "경험 뒤에 배운 점과 결과를 붙여 흐름을 완성해 보세요.",
      },
      {
        id: "timing",
        title: "실제 답변 시간",
        feedback: `${durationLabel}로 ${feedback}`,
      },
      {
        id: "delivery",
        title: "말하기 전달",
        feedback:
          fillerCount <= 2
            ? "속도와 흐름이 안정적입니다. 핵심 문장 앞에서 짧게 호흡해 보세요."
            : "속도는 안정적이지만 추임새와 연결 표현이 반복되어 일부 문장이 끊깁니다.",
      },
    ],
    metrics: {
      wordsPerMinute,
      speakingPaceLabel:
        wordsPerMinute < 90
          ? "조금 느림"
          : wordsPerMinute > 145
            ? "조금 빠름"
            : "적절",
      longSilenceCount,
      fillerCount,
      roleConnection: hasRoleConnection ? "connected" : "needs_improvement",
    },
    guide: {
      keep: hasExperience
        ? "서비스 경험을 첫 강점으로 제시한 점"
        : "핵심 강점을 먼저 제시한 점",
      reduce: "상황 배경 설명과 반복되는 연결 표현",
      add: "객실승무원으로서 어떻게 활용할지 보여주는 결론",
    },
    retryRecommendation,
  };
}

export function formatElapsed(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatDurationWords(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}분 ${rest}초` : `${rest}초`;
}

export function loadSelfIntroductionAttempts(): SelfIntroductionAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    const attempts = JSON.parse(
      localStorage.getItem(ATTEMPTS_KEY) ?? "[]",
    ) as SelfIntroductionAttempt[];
    return attempts.map((attempt) => ({...attempt, transcriptIntegrity: attempt.transcriptIntegrity ?? attempt.analysis?.transcriptIntegrity ?? {mode:"unknown", isActualTranscription:false}}));
  } catch {
    return [];
  }
}

export function saveSelfIntroductionAttempt(attempt: SelfIntroductionAttempt) {
  const attempts = loadSelfIntroductionAttempts();
  localStorage.setItem(
    ATTEMPTS_KEY,
    JSON.stringify(
      [attempt, ...attempts.filter((item) => item.id !== attempt.id)].slice(
        0,
        20,
      ),
    ),
  );
}

export function loadSelfIntroductionProgress(): SelfIntroductionProgress {
  const fallback = {
    routineCompleted: false,
    interviewScoreGain: 0,
    scoreHistory: [],
  };
  if (typeof window === "undefined") return fallback;
  try {
    return {
      ...fallback,
      ...JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}"),
    };
  } catch {
    return fallback;
  }
}

export function recordAttemptProgress(attempt: SelfIntroductionAttempt) {
  const progress = loadSelfIntroductionProgress();
  const alreadyRecorded = progress.scoreHistory.some(
    (item) => item.attemptId === attempt.id,
  );
  if (alreadyRecorded) return progress;
  const previous = attempt.previousAttemptId
    ? loadSelfIntroductionAttempts().find(
        (item) => item.id === attempt.previousAttemptId,
      )
    : undefined;
  const improved =
    previous &&
    previous.analysis.timing.assessment !== "well_balanced" &&
    attempt.analysis.timing.assessment === "well_balanced";
  const delta = progress.scoreHistory.length === 0 || improved ? 1 : 0;
  const next = {
    routineCompleted: true,
    interviewScoreGain: Math.min(2, progress.interviewScoreGain + delta),
    scoreHistory: [
      ...progress.scoreHistory,
      { attemptId: attempt.id, delta, createdAt: attempt.createdAt },
    ],
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  return next;
}

export async function saveAttemptAudio(attemptId: string, blob: Blob) {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE_NAME);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(blob, attemptId);
      transaction.oncomplete = () => {
        request.result.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

export async function loadAttemptAudio(
  attemptId: string,
): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readonly");
      const get = transaction.objectStore(STORE_NAME).get(attemptId);
      get.onsuccess = () => {
        db.close();
        resolve(get.result instanceof Blob ? get.result : null);
      };
      get.onerror = () => {
        db.close();
        resolve(null);
      };
    };
  });
}
export async function deleteAttemptAudio(attemptId: string) {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(attemptId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
}
