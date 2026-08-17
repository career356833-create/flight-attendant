import type { DiagnosisResult } from '@/lib/onboarding-data'

export function StarterPlanPreview({ plan }: { plan: DiagnosisResult['starterPlan'] }) {
  return <section><span className="eyebrow text-muted-foreground">7-DAY STARTER PLAN</span><h2 className="mt-2 text-lg font-bold text-navy">첫 주 루틴 미리보기</h2><div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">{plan.map((item) => <div key={item.day} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0"><span className="w-12 text-xs font-bold text-gold">DAY {item.day}</span><span className="flex-1 text-sm font-medium text-navy">{item.title}</span><span className="text-xs text-muted-foreground">{item.minutes}분</span></div>)}</div></section>
}
