"use client";

import { useEffect } from "react";
import {
  Check,
  ChevronLeft,
  Clock3,
  Mic,
  Pause,
  Play,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  formatDurationWords,
  formatElapsed,
  type SelfIntroductionAnalysis,
  type SelfIntroductionAttempt,
} from "@/lib/self-introduction-data";
import { compareSelfIntroductionRetake, getSelfIntroductionChallengeGuide, SELF_INTRO_CHALLENGE_OPTIONS, type SelfIntroductionChallengeSeconds } from "@/lib/self-introduction-challenge";

const primary =
  "h-14 w-full rounded-2xl bg-navy px-5 font-semibold text-ivory transition active:scale-[.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
const secondary =
  "h-12 w-full rounded-2xl border border-border bg-card font-semibold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
const card = "rounded-2xl border border-border bg-card p-5";

export function DiagnosisFrame({
  title,
  subtitle,
  onBack,
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="mx-auto w-full max-w-[1440px] px-5 pt-[calc(env(safe-area-inset-top)+1rem)] lg:px-8">
        {onBack ? (
          <button
            type="button"
            aria-label="이전 화면"
            onClick={onBack}
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="block h-10" />
        )}
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 overflow-y-auto px-5 pb-8 pt-5 lg:px-8">
        {title && (
          <div className="mb-7">
            <span className="eyebrow text-gold">PRACTICE DIAGNOSIS</span>
            <h1 className="mt-3 text-2xl font-bold leading-snug text-navy">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </main>
      {footer && (
        <div className="border-t border-border bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur lg:px-8 [&>*]:mx-auto [&>*]:max-w-[960px]">
          {footer}
        </div>
      )}
    </div>
  );
}

export function SelfIntroductionIntro({
  onStart,
  onLater,
  airlineSection,
  experienceSection,
  challengeTarget,
  onChallengeTarget,
}: {
  onStart: () => void;
  onLater: () => void;
  airlineSection?: React.ReactNode;
  experienceSection?: React.ReactNode;
  challengeTarget?: SelfIntroductionChallengeSeconds;
  onChallengeTarget: (seconds?: SelfIntroductionChallengeSeconds) => void;
}) {
  const items = [
    "핵심 메시지",
    "경험의 구체성",
    "객실승무원 직무 연결",
    "답변 구성",
    "실제 답변 시간",
    "말하기 속도와 반복 표현",
  ];
  return (
    <DiagnosisFrame
      title="자기소개 실전 진단"
      onBack={onLater}
      footer={
        <div className="space-y-2">
          <button className={primary} onClick={onStart}>
            녹음 준비하기
          </button>
          <button
            className="h-11 w-full text-sm font-semibold text-muted-foreground"
            onClick={onLater}
          >
            나중에 하기
          </button>
        </div>
      }
    >
      <div className="self-intro-setup-grid">
      <section className="rounded-3xl bg-navy p-6 text-ivory">
        <Mic className="h-7 w-7 text-gold" />
        <p className="mt-5 whitespace-pre-line text-xl font-bold leading-relaxed">
          평소 면접에서 답하듯{`\n`}자연스럽게 자기소개해 주세요.
        </p>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ivory/70">
          {challengeTarget ? `${challengeTarget}초를 목표로 답변 내용과 실제 소요시간을 함께 분석합니다.` : <>정해진 제한시간은 없어요.{`\n`}답변 내용과 실제 소요시간을 함께 분석합니다.</>}
        </p>
      </section>
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 lg:mt-0">
        <span className="eyebrow text-gold">SELF INTRODUCTION CHALLENGE</span>
        <h2 className="mt-2 text-base font-bold text-navy">자기소개 챌린지</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">실제 면접처럼 시간 안에 자신을 소개해보세요.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {SELF_INTRO_CHALLENGE_OPTIONS.map(seconds => (
            <button key={seconds} type="button" aria-pressed={challengeTarget === seconds} onClick={() => onChallengeTarget(challengeTarget === seconds ? undefined : seconds)} className={`h-11 rounded-xl border text-sm font-bold ${challengeTarget === seconds ? 'border-navy bg-navy text-ivory' : 'border-border bg-background text-navy'}`}>
              {seconds}초
            </button>
          ))}
        </div>
      </section>
      </div>
      {airlineSection}
      {experienceSection}
      <section className="mt-6">
        <h2 className="text-sm font-bold text-navy">분석 예정 항목</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div
              key={item}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-medium text-navy"
            >
              <Check className="h-3.5 w-3.5 text-teal" />
              {item}
            </div>
          ))}
        </div>
      </section>
      <p className="mt-6 rounded-2xl bg-secondary/60 p-4 text-xs leading-relaxed text-midnight">
        {challengeTarget ? '목표 시간을 지나도 실패 처리되지 않으며, 사용자가 완료 버튼을 누를 때까지 녹음됩니다.' : '녹음은 사용자가 완료 버튼을 누를 때까지 계속됩니다.'}
      </p>
    </DiagnosisFrame>
  );
}

export function MicrophoneCheck({
  status,
  level,
  onCheck,
  onStart,
  onTextPractice,
  onBack,
}: {
  status: "checking" | "ready" | "denied" | "mock";
  level: number;
  onCheck: () => void;
  onStart: () => void;
  onTextPractice: () => void;
  onBack: () => void;
}) {
  const ready = status === "ready" || status === "mock";
  return (
    <DiagnosisFrame
      title="녹음 준비"
      subtitle="마이크와 주변 환경을 확인해 주세요."
      onBack={onBack}
      footer={
        <div className="space-y-2">
          {ready ? (
            <button className={primary} onClick={onStart}>
              답변 시작
            </button>
          ) : (
            <button className={primary} onClick={onCheck}>
              다시 확인
            </button>
          )}
          {status === "denied" && (
            <button className={secondary} onClick={onTextPractice}>
              텍스트로 연습하기
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3">
        {[
          [
            "마이크",
            status === "ready"
              ? "사용 가능"
              : status === "denied"
                ? "권한 필요"
                : status === "mock"
                  ? "목업 모드"
                  : "확인 중",
          ],
          ["주변 소음", "양호"],
          ["입력 상태", ready ? "정상" : "확인 중"],
        ].map(([label, value]) => (
          <div
            key={label}
            className={`${card} flex items-center justify-between`}
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <strong className="text-sm text-navy">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>입력 레벨</span>
          <span>{ready ? "정상" : "대기"}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-teal transition-all"
            style={{ width: `${Math.max(8, level)}%` }}
          />
        </div>
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl bg-secondary/60 p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-teal" />
        <p className="whitespace-pre-line text-sm leading-relaxed text-midnight">
          외운 문장을 완벽하게 말하려 하기보다,{`\n`}본인의 강점과 경험을
          자연스럽게 전달해 보세요.
        </p>
      </div>
      {status === "denied" && (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          브라우저의 마이크 권한을 허용한 뒤 다시 확인하거나 텍스트 연습으로
          진행할 수 있어요.
        </p>
      )}
    </DiagnosisFrame>
  );
}

export function FreeResponseRecorder({
  elapsed,
  paused,
  level,
  question = "본인을 가장 잘 보여주는 강점과 경험을 중심으로\n자기소개해 주세요.",
  tip,
  onFinish,
  onPause,
  onRestart,
  onBack,
  targetSeconds,
}: {
  elapsed: number;
  paused: boolean;
  level: number;
  question?: string;
  tip?: string;
  onFinish: () => void;
  onPause: () => void;
  onRestart: () => void;
  onBack: () => void;
  targetSeconds?: SelfIntroductionChallengeSeconds;
}) {
  return (
    <DiagnosisFrame
      title="자유 답변 녹음"
      onBack={onBack}
      footer={
        <button className={primary} onClick={onFinish}>
          답변 완료
        </button>
      }
    >
      <div className="self-intro-recording-grid">
      <div aria-live="polite" className="self-intro-recording-status text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-coral/10 px-4 py-2 text-xs font-bold text-coral">
          <span
            className={`h-2 w-2 rounded-full bg-coral ${paused ? "" : "animate-pulse"}`}
          />
          {paused ? "일시정지됨" : "녹음 중"}
        </span>
        <p
          className="mt-5 font-mono text-3xl font-semibold tracking-wider text-navy"
          aria-label={`경과 시간 ${formatDurationWords(elapsed)}`}
        >
          {formatElapsed(elapsed)}{targetSeconds ? ` / ${formatElapsed(targetSeconds)}` : ''}
        </p>
      </div>
      <div className={`${card} self-intro-recording-question mt-7`}>
        <span className="eyebrow text-gold">QUESTION</span>
        <p className="mt-3 whitespace-pre-line text-lg font-bold leading-relaxed text-navy">
          {question}
        </p>
        {tip && (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {tip}
          </p>
        )}
      </div>
      <div
        className="self-intro-waveform mt-6 flex h-20 items-center justify-center gap-1 rounded-2xl bg-secondary/50"
        aria-label="오디오 입력 레벨"
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-teal transition-all"
            style={{ height: `${12 + ((i * 13 + level) % 45)}%` }}
          />
        ))}
      </div>
      {elapsed >= 120 && (
        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          답변이 길어지고 있어요. 핵심 메시지를 중심으로 마무리해 보세요.
        </p>
      )}
      {targetSeconds && elapsed >= targetSeconds && (
        <p className="mt-4 rounded-xl bg-gold/10 px-3 py-2 text-center text-xs font-semibold text-navy">목표 시간에 도달했어요. 답변은 실패 처리되지 않으며 준비되면 완료해 주세요.</p>
      )}
      {targetSeconds && <div className="mt-4 flex flex-wrap justify-center gap-2">{getSelfIntroductionChallengeGuide(targetSeconds).map(item=><span key={item} className="rounded-full bg-secondary px-3 py-1.5 text-[11px] text-midnight">{item}</span>)}</div>}
      <div className="self-intro-recording-actions mt-7 grid grid-cols-2 gap-3">
        <button className={secondary} onClick={onPause}>
          {paused ? (
            <Play className="mr-2 inline h-4 w-4" />
          ) : (
            <Pause className="mr-2 inline h-4 w-4" />
          )}
          {paused ? "재개" : "일시정지"}
        </button>
        <button className={secondary} onClick={onRestart}>
          <RefreshCcw className="mr-2 inline h-4 w-4" />
          다시 시작
        </button>
      </div>
      </div>
    </DiagnosisFrame>
  );
}

export function RecordingReview({
  duration,
  audioUrl,
  transcript,
  onTranscript,
  onAnalyze,
  onRetry,
  onBack,
}: {
  duration: number;
  audioUrl?: string;
  transcript: string;
  onTranscript: (value: string) => void;
  onAnalyze: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <DiagnosisFrame
      title="녹음 확인"
      subtitle="답변을 확인한 뒤 분석을 시작해 주세요."
      onBack={onBack}
      footer={
        <div className="space-y-2">
          <button className={primary} onClick={onAnalyze}>
            이 답변 분석하기
          </button>
          <button className={secondary} onClick={onRetry}>
            다시 녹음
          </button>
        </div>
      }
    >
      <div className={`${card} text-center`}>
        <Clock3 className="mx-auto h-6 w-6 text-gold" />
        <p className="mt-3 text-xs text-muted-foreground">답변 시간</p>
        <strong className="mt-1 block text-2xl text-navy">
          {formatDurationWords(duration)}
        </strong>
        {audioUrl ? (
          <audio className="mt-5 w-full" controls src={audioUrl}>
            녹음 재생
          </audio>
        ) : (
          <div className="mt-5 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-midnight">
            <Volume2 className="mr-2 inline h-4 w-4" />
            텍스트 연습 모드
          </div>
        )}
      </div>
      <label
        className="mt-6 block text-sm font-bold text-navy"
        htmlFor="self-intro-transcript"
      >
        답변 내용
      </label>
      <textarea
        id="self-intro-transcript"
        value={transcript}
        onChange={(e) => onTranscript(e.target.value)}
        className="mt-3 min-h-44 w-full resize-y rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
    </DiagnosisFrame>
  );
}

export function SelfIntroductionAnalyzing({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);
  const steps = [
    "핵심 메시지 확인",
    "경험과 직무 연결 분석",
    "답변 시간과 구성 분석",
    "맞춤 개선안 생성",
  ];
  return (
    <DiagnosisFrame>
      <div className="flex min-h-full flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-navy text-gold motion-safe:animate-pulse">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-7 text-xl font-bold text-navy">
          답변의 내용과 전달 방식을
          <br />
          분석하고 있어요.
        </h1>
        <div className="mt-8 w-full space-y-2">
          {steps.map((step, i) => (
            <div
              key={step}
              className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 text-left text-sm text-midnight"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>
      </div>
    </DiagnosisFrame>
  );
}

export function TimingAnalysisCard({
  analysis,
}: {
  analysis: SelfIntroductionAnalysis;
}) {
  return (
    <section className={card}>
      <span className="eyebrow text-gold">TIMING</span>
      <h2 className="mt-2 text-base font-bold text-navy">
        시간과 내용을 함께 본 분석
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-midnight">
        {analysis.timing.feedback}
      </p>
    </section>
  );
}

export function SpeakingMetrics({
  analysis,
}: {
  analysis: SelfIntroductionAnalysis;
}) {
  const m = analysis.metrics;
  const t = analysis.timing;
  const metrics = [
    ["답변 시간", formatDurationWords(t.durationSeconds)],
    [
      "첫 핵심 메시지",
      t.firstKeyMessageAtSeconds
        ? `${t.firstKeyMessageAtSeconds}초`
        : "확인 필요",
    ],
    ["말하기 속도", `분당 ${m.wordsPerMinute}단어 · ${m.speakingPaceLabel}`],
    ["긴 침묵", `${m.longSilenceCount}회`],
    ["반복 표현", `${t.repeatedPhraseCount}회`],
    ["추임새", `${m.fillerCount}회`],
    ["직무 연결", m.roleConnection === "connected" ? "연결됨" : "보완 필요"],
  ];
  return (
    <section>
      <h2 className="text-base font-bold text-navy">답변 지표</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-3"
          >
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-bold text-navy">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ImprovementGuide({
  analysis,
}: {
  analysis: SelfIntroductionAnalysis;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-navy">AI 개선 제안</h2>
      <div className="mt-3 space-y-2">
        {[
          ["유지할 점", analysis.guide.keep],
          ["줄일 점", analysis.guide.reduce],
          ["추가할 점", analysis.guide.add],
        ].map(([title, text], i) => (
          <div key={title} className={card}>
            <span
              className={`text-xs font-bold ${i === 0 ? "text-teal" : i === 1 ? "text-coral" : "text-gold"}`}
            >
              {title}
            </span>
            <p className="mt-2 text-sm leading-relaxed text-midnight">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AirlineAlignmentGuide({ analysis }: { analysis: SelfIntroductionAnalysis }) {
  if (!analysis.airlineValueAlignment && !analysis.experienceConnection && !analysis.missingCompetencySuggestion?.length) return null
  return <section><h2 className="text-base font-bold text-navy">항공사 기준 보완 추천</h2><div className="mt-3 rounded-2xl border border-border bg-card p-4"><p className="text-sm leading-relaxed text-midnight">{analysis.airlineValueAlignment}</p><p className="mt-2 text-sm leading-relaxed text-midnight">{analysis.experienceConnection}</p>{analysis.missingCompetencySuggestion?.length ? <p className="mt-2 text-xs text-muted-foreground">추가로 연결해 볼 역량: {analysis.missingCompetencySuggestion.join(' · ')}</p> : null}</div></section>
}

export function RetryRecommendation({
  recommendation,
  onRetry,
}: {
  recommendation: SelfIntroductionAnalysis["retryRecommendation"];
  onRetry: (mode: string) => void;
}) {
  const labels = {
    expand_experience: "경험을 보강해 다시 답하기",
    repeat_current: "현재 구조로 다시 연습하기",
    compress_core: "핵심 중심으로 압축해 다시 답하기",
  };
  return (
    <section className="rounded-3xl bg-navy p-5 text-ivory">
      <span className="eyebrow text-gold">NEXT PRACTICE</span>
      <h2 className="mt-3 text-lg font-bold">맞춤 재도전</h2>
      <button
        className="mt-4 h-12 w-full rounded-xl bg-coral font-bold text-white focus-visible:ring-2 focus-visible:ring-gold"
        onClick={() => onRetry(recommendation)}
      >
        {labels[recommendation]}
      </button>
      <p className="mt-5 text-xs text-ivory/60">추가 연습</p>
      <div className="mt-2 flex gap-2">
        {["30초 핵심 버전", "60초 기본 버전", "90초 확장 버전"].map((label) => (
          <button
            key={label}
            onClick={() => onRetry(label)}
            className="min-h-10 flex-1 rounded-xl border border-white/15 px-2 text-[11px] font-medium"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function AttemptHistory({
  attempts,
}: {
  attempts: SelfIntroductionAttempt[];
}) {
  if (!attempts.length) return null;
  return (
    <section>
      <h2 className="text-base font-bold text-navy">시도 기록</h2>
      <div className="mt-3 space-y-2">
        {attempts.map((a) => (
          <div
            key={a.id}
            className={`${card} flex items-center justify-between`}
          >
            <div>
              <p className="text-sm font-bold text-navy">
                {a.attemptNumber}번째 시도
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString("ko-KR")}
              </p>
              {a.targetSeconds && <p className="mt-1 text-xs text-gold">목표 {a.targetSeconds}초</p>}
            </div>
            <span className="text-sm font-semibold text-teal">
              {formatDurationWords(a.durationSeconds)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SelfIntroductionResult({
  attempt,
  history,
  onHome,
  onRetry,
}: {
  attempt: SelfIntroductionAttempt;
  history: SelfIntroductionAttempt[];
  onHome: () => void;
  onRetry: (mode: string) => void;
}) {
  const a = attempt.analysis;
  const previous = attempt.previousAttemptId ? history.find(item => item.id === attempt.previousAttemptId) : undefined;
  const comparison = previous && attempt.challengeType ? compareSelfIntroductionRetake(previous, attempt) : undefined;
  return (
    <DiagnosisFrame
      title="자기소개 진단 결과"
      onBack={onHome}
      footer={
        <button className={primary} onClick={onHome}>
          홈으로 돌아가기
        </button>
      }
    >
      <div className="self-intro-result-grid">
      <div className="self-intro-result-main">
      <section className="rounded-3xl bg-navy p-5 text-ivory">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-ivory/60">실제 답변시간</p>
            <strong className="mt-1 block text-lg">
              {formatDurationWords(attempt.durationSeconds)}
            </strong>
          </div>
          <div>
            <p className="text-xs text-ivory/60">가장 잘한 점</p>
            <strong className="mt-1 block text-sm leading-snug">
              {a.bestPoint}
            </strong>
          </div>
        </div>
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-xs text-ivory/60">종합 평가</p>
          <p className="mt-2 text-sm leading-relaxed">{a.overall}</p>
          <p className="mt-3 text-xs text-gold">
            먼저 보완 · {a.firstImprovement}
          </p>
        </div>
      </section>
      <div className="mt-5">
        <TimingAnalysisCard analysis={a} />
      </div>
      {a.challenge && <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <span className="eyebrow text-gold">CHALLENGE</span>
        <h2 className="mt-2 text-base font-bold text-navy">목표 {a.challenge.timing.targetSeconds}초 · 실제 {a.challenge.timing.actualSeconds}초</h2>
        <p className="mt-3 text-sm leading-relaxed text-midnight">{a.challenge.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">{Object.entries(a.challenge.structure).map(([key, value]) => <div key={key} className="rounded-xl bg-secondary/60 p-3"><span className="text-muted-foreground">{{opening:'소개',strength:'강점',experience:'경험',motivation:'지원 연결'}[key as keyof typeof a.challenge.structure]}</span><strong className="mt-1 block text-navy">{{strong:'충분',present:'포함',missing:'보완 추천'}[value]}</strong></div>)}</div>
      </section>}
      {comparison && <section className="mt-5 rounded-2xl border border-border bg-card p-5"><h2 className="text-base font-bold text-navy">재도전 비교</h2><dl className="mt-3 grid grid-cols-2 gap-2">{Object.entries(comparison).map(([key,value])=><div key={key} className="rounded-xl bg-secondary/60 p-3"><dt className="text-[11px] text-muted-foreground">{{timing:'시간',filler:'추임새',pause:'긴 침묵',structure:'구조'}[key as keyof typeof comparison]}</dt><dd className="mt-1 text-xs font-bold text-navy">{value}</dd></div>)}</dl></section>}
      <div className="mt-7 space-y-3">
        <h2 className="text-base font-bold text-navy">상세 분석</h2>
        {a.details.map((item) => (
          <article key={item.id} className={card}>
            <h3 className="text-sm font-bold text-navy">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-midnight">
              {item.feedback}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-7">
        <SpeakingMetrics analysis={a} />
      </div>
      </div>
      <aside className="self-intro-result-side">
      {(attempt.audioMetrics || attempt.speechMetrics) && <section className="mt-7 rounded-2xl border border-border bg-card p-5"><h2 className="text-base font-bold text-navy">말하기 분석</h2><p className="mt-1 text-xs text-muted-foreground">녹음 입력과 음성 인식 기반 참고 지표</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm text-midnight"><p>평균 음량 <strong>{attempt.audioMetrics?.volume.averageDbfs == null ? '측정 불가' : `${attempt.audioMetrics.volume.averageDbfs.toFixed(1)} dBFS`}</strong></p><p>긴 쉼 <strong>{attempt.audioMetrics?.pauses.longCount ?? 0}회</strong></p><p>필러 <strong>{attempt.speechMetrics?.fillers.totalCount ?? a.metrics.fillerCount}회</strong></p><p>발화 속도 <strong>{attempt.speechMetrics?.speechRate.estimatedWpm == null ? '측정 불가' : `${attempt.speechMetrics.speechRate.estimatedWpm} WPM`}</strong></p></div>{attempt.pronunciationAnalysis?.status === 'success' && <p className="mt-3 text-xs text-teal">정밀 발음 분석 결과가 연결되었습니다.</p>}</section>}
      <div className="mt-7">
        <ImprovementGuide analysis={a} />
      </div>
      <div className="mt-7">
        <AirlineAlignmentGuide analysis={a} />
      </div>
      <div className="mt-7">
        <RetryRecommendation
          recommendation={a.retryRecommendation}
          onRetry={onRetry}
        />
      </div>
      </aside>
      </div>
      <div className="mt-7">
        <AttemptHistory attempts={history} />
      </div>
    </DiagnosisFrame>
  );
}
