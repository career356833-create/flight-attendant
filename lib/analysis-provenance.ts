import type { AiWarning } from '@/lib/ai/types'

export type AnalysisProvenanceKind =
  | 'actual_ai'
  | 'deterministic'
  | 'audio_metrics'
  | 'stt_derived'
  | 'mock'
  | 'unknown'

export type AnalysisProvenance = {
  kind: AnalysisProvenanceKind
  provider?: string
  isActual: boolean
}

type Locale = 'ko' | 'en'

const presentation: Record<Locale, Record<AnalysisProvenanceKind, { label: string; description: string }>> = {
  ko: {
    actual_ai: { label: '실제 AI 서비스 분석', description: '외부 AI 서비스가 반환한 결과입니다.' },
    deterministic: { label: '규칙 기반 분석', description: '답변에 나타난 구조와 표현 패턴을 정해진 기준으로 확인했습니다.' },
    audio_metrics: { label: '오디오 지표 기반', description: '기기에서 측정한 음량과 쉼 등 오디오 신호만 사용했습니다.' },
    stt_derived: { label: '실제 음성 전사 기반', description: '실제 녹음에서 전사된 답변을 바탕으로 분석했습니다.' },
    mock: { label: '기본 예시 분석', description: '실제 AI 서비스 결과가 아닙니다.' },
    unknown: { label: '분석 출처 확인 필요', description: '출처가 확인되지 않아 실제 AI 결과로 표시하지 않습니다.' },
  },
  en: {
    actual_ai: { label: 'Actual AI service analysis', description: 'This result was returned by an external AI service.' },
    deterministic: { label: 'Rule-based analysis', description: 'Fixed criteria were used to review answer structure and expression patterns.' },
    audio_metrics: { label: 'Audio metrics', description: 'Only on-device audio signals such as volume and pauses were used.' },
    stt_derived: { label: 'Actual speech transcript', description: 'The analysis uses a transcript produced from the recorded answer.' },
    mock: { label: 'Basic example analysis', description: 'This is not a result from an actual AI service.' },
    unknown: { label: 'Analysis source unavailable', description: 'The source is unknown, so this is not presented as an actual AI result.' },
  },
}

export function analysisProvenanceFromProvider(input: {
  ok: boolean
  providerId?: string
  warnings?: Pick<AiWarning, 'code'>[]
}): AnalysisProvenance {
  const fallback = input.warnings?.some(warning => warning.code === 'mock_result' || warning.code === 'fallback_used')
  if (input.providerId === 'mock' || fallback) return { kind: 'mock', provider: input.providerId, isActual: false }
  if (input.ok && input.providerId === 'server') return { kind: 'actual_ai', provider: 'server', isActual: true }
  return { kind: 'unknown', provider: input.providerId, isActual: false }
}

export function transcriptAnalysisProvenance(input: {
  isActualTranscription: boolean
  hasTranscript: boolean
}): AnalysisProvenance {
  return input.isActualTranscription && input.hasTranscript
    ? { kind: 'stt_derived', isActual: true }
    : { kind: 'audio_metrics', isActual: true }
}

export function deterministicAnalysisProvenance(): AnalysisProvenance {
  return { kind: 'deterministic', isActual: false }
}

export function canUseActualAiLabel(value: AnalysisProvenance): boolean {
  return value.kind === 'actual_ai' && value.isActual
}

export function analysisProvenancePresentation(kind: AnalysisProvenanceKind, locale: Locale = 'ko') {
  return presentation[locale][kind]
}

export function readinessPresentation(locale: Locale = 'ko') {
  return locale === 'ko'
    ? { label: '자가진단 준비 지표', suffix: '/100', description: '자가응답과 완료한 연습 기록을 정해진 기준으로 요약한 참고 지표이며 합격 가능성이 아닙니다.' }
    : { label: 'Self-check readiness indicator', suffix: '/100', description: 'A rule-based summary of self-reported answers and completed practice, not a hiring probability.' }
}
