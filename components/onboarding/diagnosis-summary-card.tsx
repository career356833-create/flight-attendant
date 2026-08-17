import type { DiagnosisResult } from '@/lib/onboarding-data'

export function DiagnosisSummaryCard({ result }: { result: DiagnosisResult }) {
  const rows = [['목표', result.targetLabel], ['우선 항공사', result.primaryAirline], ['현재 단계', result.currentStageLabel], ['지원 예상 시기', result.applyTimingLabel], ['하루 학습시간', result.dailyTimeLabel]]
  return <section className="rounded-3xl bg-navy p-6 text-ivory shadow-[0_22px_55px_-28px_rgba(11,31,51,.8)]">
    <span className="eyebrow text-gold">READINESS</span>
    <div className="mt-3 flex items-end justify-between border-b border-white/15 pb-5"><h2 className="text-lg font-bold">첫 준비 계획</h2><p className="text-4xl font-bold">{result.overallReadiness}<span className="ml-1 text-base text-ivory/60">%</span></p></div>
    <dl className="mt-4 space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><dt className="text-ivory/55">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl>
  </section>
}
