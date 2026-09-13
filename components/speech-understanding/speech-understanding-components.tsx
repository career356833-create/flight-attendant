import type {
  AnswerUnderstanding,
  ContentAnalysisState,
  TranscriptAssessment,
  TranscriptReview,
} from '@/lib/speech-understanding-v2'

export function SpeechTranscriptReview({ id, rawTranscript, value, quality, language, onChange, onConfirm, onRetry }: {
  id: string
  rawTranscript: string
  value: string
  quality: TranscriptAssessment['quality']
  language: 'ko' | 'en'
  onChange: (value: string) => void
  onConfirm: () => void
  onRetry: () => void
}) {
  const corrected = value !== rawTranscript.trim()
  return (
    <section className="mx-auto max-w-[390px] px-4 py-6">
      <div className="rounded-3xl border border-border bg-card p-5">
        <p className="text-xs font-bold text-gold">음성 인식 내용</p>
        <h1 className="mt-2 text-lg font-bold text-navy">분석 전에 전사 내용을 확인해 주세요</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">인식 오류만 고쳐 주세요. 수정한 내용은 원본 STT와 구분해 저장됩니다.</p>
        <label className="mt-5 block text-sm font-bold text-navy" htmlFor={id}>인식된 답변 · {language.toUpperCase()} · {quality}</label>
        <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={8} className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed text-midnight" />
        <p className="mt-2 text-xs text-muted-foreground">출처: {corrected ? '사용자 수정 전사' : '실제 음성 STT'}</p>
        <button type="button" onClick={onConfirm} disabled={!value.trim()} className="mt-5 h-12 w-full rounded-xl bg-coral text-sm font-bold text-white disabled:opacity-50">이 내용으로 분석하기</button>
        <button type="button" onClick={onRetry} className="mt-2 min-h-11 w-full rounded-xl border border-border text-sm font-bold text-navy">다시 녹음</button>
      </div>
    </section>
  )
}

export function SpeechUnderstandingResult({ review, understanding, state, className = 'mx-auto max-w-[390px] px-4 pb-4' }: {
  review?: TranscriptReview
  understanding?: AnswerUnderstanding
  state?: ContentAnalysisState
  className?: string
}) {
  if (!review && !state) return null
  if (!understanding) return <section className={className}><div className="rounded-2xl border border-border bg-card p-4"><h2 className="font-bold text-navy">음성 인식 내용</h2><p className="mt-2 whitespace-pre-wrap text-sm text-midnight">{review?.normalizedTranscript || '전사 내용을 확인하지 못했습니다.'}</p><p className="mt-3 rounded-xl bg-secondary p-3 text-xs text-midnight">내용 분석 보류 · {state?.reason ?? 'CONTENT_ANALYSIS_UNAVAILABLE'}</p></div></section>
  const relevance = { addressed: '질문에 직접 답함', partially_addressed: '부분적으로 답함', not_addressed: '질문에서 벗어남', unclear: '판단할 근거 부족' }[understanding.questionAddressed]
  const competencies = understanding.cabinCrewEvidence.filter((item) => item.evidence.length > 0)
  return <section className={`${className} space-y-3`}>
    <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-navy">음성 인식 내용</h2><span className="text-xs font-semibold text-muted-foreground">{review?.quality}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-midnight">{review?.normalizedTranscript}</p><p className="mt-2 text-xs text-muted-foreground">{review?.provenance === 'user_corrected_transcript' ? '사용자가 전사 오류를 수정함' : '실제 음성 STT 원문'}</p></div>
    <div className="rounded-2xl border border-border bg-card p-4"><h2 className="font-bold text-navy">답변 이해</h2><p className="mt-2 text-sm text-midnight">질문 관련성: <strong>{relevance}</strong></p><p className="mt-2 text-sm text-midnight">핵심: {understanding.mainPoint ?? '확인할 수 없음'}</p>{understanding.evidence.length > 0 && <div className="mt-3"><p className="text-xs font-bold text-muted-foreground">답변에서 확인한 근거</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-midnight">{understanding.evidence.slice(0, 3).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}{competencies.length > 0 && <p className="mt-3 text-xs text-muted-foreground">근거가 확인된 역량: {competencies.map((item) => item.competency).join(', ')}</p>}{understanding.missingElements.length > 0 && <p className="mt-3 rounded-xl bg-secondary p-3 text-xs text-midnight">다음 개선: {understanding.missingElements.slice(0, 3).join(' · ')}</p>}</div>
  </section>
}
