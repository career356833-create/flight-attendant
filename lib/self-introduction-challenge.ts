export type SelfIntroductionChallengeSeconds = 30 | 60 | 90
export type SelfIntroductionChallengeType = `self_intro_${SelfIntroductionChallengeSeconds}`
export type SelfIntroductionTimingStatus = 'short' | 'close' | 'long'
export type SelfIntroductionStructureStatus = 'strong' | 'present' | 'missing'

export type SelfIntroDurationAnalysis = {
  targetSeconds: SelfIntroductionChallengeSeconds
  actualSeconds: number
  differenceSeconds: number
  status: SelfIntroductionTimingStatus
  feedback: string
}

export type SelfIntroductionStructureAnalysis = {
  opening: SelfIntroductionStructureStatus
  strength: SelfIntroductionStructureStatus
  experience: SelfIntroductionStructureStatus
  motivation: SelfIntroductionStructureStatus
}

export type SelfIntroductionChallengeAnalysis = {
  summary: string
  strengths: string[]
  improvements: string[]
  structure: SelfIntroductionStructureAnalysis
  timing: SelfIntroDurationAnalysis
  nextPractice: string[]
}

export type SelfIntroductionRetakeComparison = {
  timing: string
  filler: string
  pause: string
  structure: string
}

export const SELF_INTRO_CHALLENGE_OPTIONS = [30, 60, 90] as const

export function getSelfIntroductionChallengeGuide(targetSeconds: SelfIntroductionChallengeSeconds): string[] {
  if (targetSeconds === 30) return ['0~10초 · 소개/강점', '10~25초 · 핵심 경험', '25~30초 · 지원 연결']
  if (targetSeconds === 60) return ['0~15초 · 소개', '15~45초 · 경험', '45~60초 · 지원동기']
  return ['소개', '경험 상세', '성과/배움', '지원 연결']
}

export function analyzeSelfIntroductionDuration(
  targetSeconds: SelfIntroductionChallengeSeconds,
  actualSeconds: number,
): SelfIntroDurationAnalysis {
  const differenceSeconds = actualSeconds - targetSeconds
  const tolerance = Math.max(3, Math.round(targetSeconds * 0.1))
  const status: SelfIntroductionTimingStatus =
    differenceSeconds < -tolerance ? 'short' : differenceSeconds > tolerance ? 'long' : 'close'
  const feedback = status === 'short'
    ? `${targetSeconds}초 목표 대비 짧은 편입니다. 경험 설명 한 문장을 추가해보세요.`
    : status === 'long'
      ? `${targetSeconds}초 목표보다 긴 편입니다. 핵심 행동과 배움을 중심으로 압축해보세요.`
      : `${targetSeconds}초 목표에 가까운 안정적인 길이입니다.`
  return { targetSeconds, actualSeconds, differenceSeconds, status, feedback }
}

const strengthPattern = /(강점|장점|역량|잘하|능력)/
const experiencePattern = /(경험|근무|프로젝트|고객|상황|행동|해결)/
const resultPattern = /(결과|성과|배웠|깨달|개선|달성)/
const motivationPattern = /(지원|객실승무원|항공사|승객|기여|활용)/

export function analyzeSelfIntroductionStructure(
  transcript: string,
): SelfIntroductionStructureAnalysis {
  const text = transcript.trim()
  const status = (matched: boolean, reinforced = false): SelfIntroductionStructureStatus =>
    matched ? (reinforced ? 'strong' : 'present') : 'missing'
  return {
    opening: status(text.length > 0, /저는|안녕|소개/.test(text)),
    strength: status(strengthPattern.test(text), strengthPattern.test(text) && experiencePattern.test(text)),
    experience: status(experiencePattern.test(text), experiencePattern.test(text) && resultPattern.test(text)),
    motivation: status(motivationPattern.test(text), motivationPattern.test(text) && resultPattern.test(text)),
  }
}

export function analyzeSelfIntroductionChallenge(
  targetSeconds: SelfIntroductionChallengeSeconds,
  actualSeconds: number,
  transcript: string,
): SelfIntroductionChallengeAnalysis {
  const timing = analyzeSelfIntroductionDuration(targetSeconds, actualSeconds)
  const structure = analyzeSelfIntroductionStructure(transcript)
  const labels: Record<keyof SelfIntroductionStructureAnalysis, string> = {
    opening: '소개', strength: '강점', experience: '경험', motivation: '지원 연결',
  }
  const strengths = (Object.keys(structure) as (keyof SelfIntroductionStructureAnalysis)[])
    .filter(key => structure[key] === 'strong')
    .map(key => `${labels[key]}이 구체적으로 드러납니다.`)
  const improvements = (Object.keys(structure) as (keyof SelfIntroductionStructureAnalysis)[])
    .filter(key => structure[key] === 'missing')
    .map(key => `${labels[key]}을 한 문장으로 보완해보세요.`)
  return {
    summary: improvements.length
      ? `${timing.feedback} ${improvements[0]}`
      : `강점과 경험 연결이 드러납니다. ${timing.feedback}`,
    strengths: strengths.length ? strengths : ['핵심 메시지를 시간 안에 전달하려는 흐름이 보입니다.'],
    improvements,
    structure,
    timing,
    nextPractice: improvements.slice(0, 2).concat(
      timing.status === 'close' ? [] : [timing.feedback],
    ),
  }
}

export function compareSelfIntroductionRetake(
  previous: { durationSeconds: number; transcriptIntegrity?: { mode: string; isActualTranscription: boolean }; analysis: { metrics: { fillerCount: number; longSilenceCount: number }; challenge?: SelfIntroductionChallengeAnalysis } },
  current: { durationSeconds: number; transcriptIntegrity?: { mode: string; isActualTranscription: boolean }; analysis: { metrics: { fillerCount: number; longSilenceCount: number }; challenge?: SelfIntroductionChallengeAnalysis } },
): SelfIntroductionRetakeComparison {
  const label = (before: number, after: number, unit: string) => `${before}${unit} → ${after}${unit}`
  const previousPresent = previous.analysis.challenge
    ? Object.values(previous.analysis.challenge.structure).filter(value => value !== 'missing').length
    : 0
  const currentPresent = current.analysis.challenge
    ? Object.values(current.analysis.challenge.structure).filter(value => value !== 'missing').length
    : 0
  const transcriptComparable = previous.transcriptIntegrity?.mode === "actual_audio"
    && previous.transcriptIntegrity.isActualTranscription
    && current.transcriptIntegrity?.mode === "actual_audio"
    && current.transcriptIntegrity.isActualTranscription
  return {
    timing: label(previous.durationSeconds, current.durationSeconds, '초'),
    filler: transcriptComparable ? label(previous.analysis.metrics.fillerCount, current.analysis.metrics.fillerCount, '회') : '측정 불가',
    pause: transcriptComparable ? label(previous.analysis.metrics.longSilenceCount, current.analysis.metrics.longSilenceCount, '회') : '측정 불가',
    structure: transcriptComparable ? label(previousPresent, currentPresent, '개 요소') : '측정 불가',
  }
}

export function challengeTypeFor(targetSeconds: SelfIntroductionChallengeSeconds): SelfIntroductionChallengeType {
  return `self_intro_${targetSeconds}`
}
