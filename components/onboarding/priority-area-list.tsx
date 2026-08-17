import type { PriorityArea } from '@/lib/onboarding-data'

export function PriorityAreaList({ areas }: { areas: PriorityArea[] }) {
  return <section><span className="eyebrow text-muted-foreground">TOP PRIORITIES</span><h2 className="mt-2 text-lg font-bold text-navy">먼저 집중할 세 가지</h2><ol className="mt-4 space-y-3">{areas.slice(0, 3).map((area, index) => <li key={area.id} className="flex gap-4 rounded-2xl border border-border bg-card p-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-ivory">{index + 1}</span><div><h3 className="font-semibold text-navy">{area.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{area.description}</p><p className="mt-2 text-xs font-semibold text-teal">첫 행동 · {area.firstAction ?? '10분 동안 답변 초안을 작성해 보세요.'}</p></div></li>)}</ol></section>
}
