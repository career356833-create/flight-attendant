"use client";

import type { RefObject } from "react";
import { Camera, CameraOff, ShieldCheck } from "lucide-react";
import type { CameraCheckStatus, NonverbalSignalResult } from "@/lib/nonverbal-signal-coach";
import type { NonverbalPoseEngineStatus, NonverbalVisionBackend, NonverbalVisionEngineStatus } from "@/lib/nonverbal-vision-engine";

const statusCopy: Record<CameraCheckStatus, { title: string; description: string }> = {
  CAMERA_OFF: { title: "카메라 사용 안 함", description: "카메라는 선택 사항이며 음성 연습만 계속할 수 있습니다." },
  CHECKING: { title: "카메라 확인 중", description: "화면 안에서 얼굴 신호를 확인하고 있습니다." },
  PERMISSION_DENIED: { title: "카메라 권한 없음", description: "권한 없이도 음성 기반 자기소개 연습을 계속할 수 있습니다." },
  UNSUPPORTED: { title: "기기 내 분석 미지원", description: "이 브라우저에서는 로컬 얼굴 신호 분석을 제공하지 않습니다. 카메라 없이 계속할 수 있습니다." },
  NO_FACE: { title: "얼굴 신호 없음", description: "카메라 안에 얼굴이 보이도록 위치를 조정해 주세요." },
  MULTIPLE_FACES: { title: "여러 얼굴 감지", description: "한 사람만 화면에 보일 때 분석할 수 있습니다. 해당 프레임은 제외됩니다." },
  FACE_TOO_SMALL: { title: "얼굴이 작게 보임", description: "상체와 얼굴이 함께 보이도록 카메라와 거리를 조정해 주세요." },
  FACE_OFF_CENTER: { title: "얼굴이 중앙에서 벗어남", description: "얼굴이 화면 중앙 부근에 오도록 위치를 조정해 주세요." },
  CALIBRATING: { title: "개인 기준 자세 확인 중", description: "정면을 보고 편하게 자세를 3~5초 유지해 주세요." },
  BASELINE_INSUFFICIENT: { title: "자세 신호 관찰 제한", description: "얼굴 분석은 계속할 수 있지만 양쪽 어깨 신호가 부족해 자세 피드백이 제한될 수 있습니다." },
  READY: { title: "카메라 준비 완료", description: "기기 내 관찰 신호를 사용할 준비가 됐습니다." },
};

export function NonverbalCameraCheck({
  status,
  consent,
  enabled,
  videoRef,
  onConsent,
  onEnable,
  onContinue,
  onSkip,
  onBack,
  backend,
  engineStatus,
  poseStatus,
  baselineQuality,
}: {
  status: CameraCheckStatus;
  consent: boolean;
  enabled: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  onConsent: (value: boolean) => void;
  onEnable: () => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
  backend: NonverbalVisionBackend;
  engineStatus: NonverbalVisionEngineStatus | null;
  poseStatus: NonverbalPoseEngineStatus;
  baselineQuality: "HIGH" | "MEDIUM" | null;
}) {
  const copy = statusCopy[status];
  return (
    <main className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-5 pb-8 pt-6 lg:px-8">
      <button type="button" onClick={onBack} className="min-h-11 self-start text-sm font-bold text-navy">← 녹음 준비</button>
      <span className="eyebrow mt-5 text-gold">OPTIONAL CAMERA CHECK</span>
      <h1 className="mt-2 text-2xl font-bold text-navy">비언어 신호 코치</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">얼굴과 양쪽 어깨가 보이도록 카메라 위치를 맞춰 주세요. 영상은 기기 안에서만 관찰합니다.</p>

      <section data-vision-backend={backend} data-vision-status={engineStatus ?? "NOT_INITIALIZED"} data-pose-status={poseStatus} data-baseline-quality={baselineQuality ?? "NOT_CALIBRATED"} className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative aspect-video bg-navy">
          {enabled ? (
            <video ref={videoRef} muted playsInline aria-label="자기소개 카메라 미리보기" className="h-full w-full object-cover [transform:scaleX(-1)]" />
          ) : (
            <div className="flex h-full items-center justify-center text-center text-ivory/70"><CameraOff aria-hidden="true" className="mr-2 h-6 w-6" />카메라 미리보기 꺼짐</div>
          )}
        </div>
        <div role="status" aria-live="polite" className="p-5">
          <strong className="text-sm text-navy">{copy.title}</strong>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.description}</p>
        </div>
      </section>

      <label className="mt-5 flex min-h-11 items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-midnight">
        <input type="checkbox" checked={consent} onChange={event => onConsent(event.target.checked)} className="mt-0.5 h-5 w-5" />
        <span>기기 내 비언어 신호 분석에 동의합니다. 원본 영상·프레임·얼굴 이미지는 저장하거나 서버로 전송하지 않습니다.</span>
      </label>

      <div className="mt-4 flex gap-3 rounded-2xl bg-teal/10 p-4">
        <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-teal" />
        <p className="text-xs leading-relaxed text-midnight">숫자와 관찰 요약만 자기소개 기록에 저장됩니다. 얼굴 식별이나 감정·성격·민감 속성 추론은 하지 않습니다.</p>
      </div>

      <div className="mt-auto space-y-2 pt-7">
        {!enabled && <button type="button" disabled={!consent} onClick={onEnable} className="min-h-11 w-full rounded-xl bg-navy px-4 text-sm font-bold text-ivory disabled:cursor-not-allowed disabled:opacity-45"><Camera aria-hidden="true" className="mr-2 inline h-4 w-4" />카메라 확인하기</button>}
        {enabled && <button type="button" disabled={status === "CALIBRATING"} onClick={onContinue} className="min-h-11 w-full rounded-xl bg-navy px-4 text-sm font-bold text-ivory disabled:cursor-wait disabled:opacity-45">이 상태로 답변 시작</button>}
        <button type="button" onClick={onSkip} className="min-h-11 w-full rounded-xl border border-navy px-4 text-sm font-bold text-navy">카메라 없이 계속</button>
      </div>
    </main>
  );
}

const label = {
  FRAMING_STABLE: "화면 위치 안정적",
  FRAMING_VARIABLE: "화면 위치 변화 있음",
  OFF_CENTER_FREQUENT: "중앙 이탈이 자주 관찰됨",
  POSTURE_STABLE: "머리·화면 위치 안정적",
  LEANING_FREQUENT: "화면 내 기울기 변화 있음",
  BODY_MOVEMENT_HIGH: "화면 내 위치 변화 큼",
  LOW: "변화 적음",
  MODERATE: "보통",
  HIGH: "변화 큼",
  SMILE_SHAPE_PRESENT: "입꼬리 형태 관찰됨",
  NEUTRAL_MOUTH_SHAPE: "중립 입 모양",
  INSUFFICIENT_SIGNAL: "관찰 부족",
  STABLE: "안정적",
  VARIABLE: "변화 있음",
  HIGH_MOVEMENT: "변화 큼",
  INSUFFICIENT: "관찰 부족",
} as const;

export function NonverbalSignalCard({ result, locale = "ko" }: { result?: NonverbalSignalResult; locale?: "ko" | "en" }) {
  if (!result) return null;
  const english = locale === "en";
  const positiveObservation = english
    ? result.shoulderAlignment === "STABLE" ? "Shoulder alignment stayed stable relative to your starting posture." : result.faceVisibilityRatio != null ? "Your face remained visible for most of the response." : undefined
    : result.positiveObservations[0];
  const practiceObservation = english
    ? result.shoulderAlignment === "HIGH_MOVEMENT" ? "Shoulder alignment varied more than your starting posture." : result.torsoStability === "HIGH_MOVEMENT" ? "Upper-body position shifted more than at the start." : result.shoulderAlignment === "INSUFFICIENT" ? "Upper-body visibility was limited, so posture feedback is restricted." : undefined
    : result.practiceObservations[0];
  if (!result.enabled || result.insufficientReason) return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow text-gold">VISION METRICS</span>
      <h2 className="mt-2 text-base font-bold text-navy">{english ? "Nonverbal signal coach" : "비언어 신호 코치"}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{practiceObservation ?? (english ? "There was not enough camera signal to provide an observation." : "카메라를 사용하지 않아 비언어 신호 분석을 제공하지 않습니다.")}</p>
      <NonverbalSafetyNotice locale={locale} />
    </section>
  );
  const facing = result.cameraFacingRatio == null ? (english ? "Insufficient observation" : "관찰 부족") : result.cameraFacingRatio >= .72 ? (english ? "Stable" : "카메라 방향 유지 안정적") : (english ? "Varied" : "방향 전환이 관찰됨");
  const metricLabel = (key: keyof typeof label) => english ? ({ LOW: "Stable", MODERATE: "Varied", HIGH: "High variation", INSUFFICIENT_SIGNAL: "Insufficient observation", STABLE: "Stable", VARIABLE: "Varied", HIGH_MOVEMENT: "High variation", INSUFFICIENT: "Insufficient observation", FRAMING_STABLE: "Stable", FRAMING_VARIABLE: "Varied", OFF_CENTER_FREQUENT: "Frequently off-center" } as Partial<Record<keyof typeof label, string>>)[key] ?? label[key] : label[key];
  const metrics = [
    [english ? "Camera direction" : "카메라 방향", facing],
    [english ? "Framing" : "화면 위치", metricLabel(result.framingStability)],
    [english ? "Head movement" : "머리 움직임", metricLabel(result.headMovementLevel)],
    [english ? "Shoulder and upper-body stability" : "어깨·상체 안정성", `${metricLabel(result.shoulderAlignment)} · ${metricLabel(result.torsoStability)}`],
    [english ? "Expression and mouth-shape variation" : "표정·입 모양 변화", metricLabel(result.expressionVariation)],
  ];
  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-5">
      <span className="eyebrow text-gold">VISION METRICS</span>
      <h2 className="mt-2 text-base font-bold text-navy">{english ? "Nonverbal signal coach" : "비언어 신호 코치"}</h2>
      <p className="mt-2 text-xs text-muted-foreground">{english ? `Summarized ${result.sampledFrameCount} face and ${result.poseSampledFrameCount} pose observations on this device. Personal baseline: ${result.baselineStatus === "CALIBRATED" ? "applied" : "limited"}.` : `기기 내에서 얼굴 ${result.sampledFrameCount}개·자세 ${result.poseSampledFrameCount}개 신호를 요약했습니다. 개인 기준 ${result.baselineStatus === "CALIBRATED" ? "적용" : "관찰 제한"} · ${result.fusion.replaceAll("_", " + ")}`}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{metrics.map(([name, value]) => <div key={name} className="rounded-xl bg-secondary/60 p-3"><span className="text-[11px] text-muted-foreground">{name}</span><strong className="mt-1 block text-xs text-navy">{value}</strong></div>)}</div>
      {positiveObservation && <div className="mt-4 rounded-xl bg-teal/10 p-3"><strong className="text-xs text-teal">{english ? "Observed stability" : "관찰된 안정 요소"}</strong><p className="mt-1 text-xs leading-relaxed text-midnight">{positiveObservation}</p></div>}
      {practiceObservation && <div className="mt-2 rounded-xl bg-gold/10 p-3"><strong className="text-xs text-navy">{english ? "Next practice point" : "다음 연습 포인트"}</strong><p className="mt-1 text-xs leading-relaxed text-midnight">{practiceObservation}</p></div>}
      <div className="mt-4 grid grid-cols-3 gap-2">{result.timeline.map(segment => <div key={segment.phase} className="rounded-xl border border-border p-2 text-center"><span className="text-[10px] text-muted-foreground">{english ? {start:"Start",middle:"Middle",finish:"Finish"}[segment.phase] : {start:"시작",middle:"중간",finish:"마무리"}[segment.phase]}</span><strong className="mt-1 block text-[11px] text-navy">{english ? `Face ${metricLabel(segment.movementLevel)} · Upper body ${metricLabel(segment.poseMovement)}` : `얼굴 ${label[segment.movementLevel]} · 상체 ${label[segment.poseMovement]}`}</strong></div>)}</div>
      <NonverbalSafetyNotice locale={locale} />
    </section>
  );
}

function NonverbalSafetyNotice({ locale = "ko" }: { locale?: "ko" | "en" }) {
  return <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">{locale === "en" ? "Practice-only observations. They do not represent an airline hiring standard or hiring outcome." : "연습용 관찰 정보이며 실제 항공사의 채용 평가 기준이나 합격 가능성을 의미하지 않습니다."}</p>;
}
