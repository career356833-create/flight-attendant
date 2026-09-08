import { analysisProvenancePresentation, type AnalysisProvenanceKind } from '@/lib/analysis-provenance'

export function AnalysisProvenanceHint({
  kinds,
  locale = 'ko',
  note,
}: {
  kinds: AnalysisProvenanceKind[]
  locale?: 'ko' | 'en'
  note?: string
}) {
  const uniqueKinds = [...new Set(kinds)]
  return (
    <aside className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground" aria-label={locale === 'ko' ? '분석 출처' : 'Analysis source'}>
      <strong className="text-navy">
        {uniqueKinds.map(kind => analysisProvenancePresentation(kind, locale).label).join(' · ')}
      </strong>
      <span className="ml-1">
        {note ?? uniqueKinds.map(kind => analysisProvenancePresentation(kind, locale).description).join(' ')}
      </span>
    </aside>
  )
}
