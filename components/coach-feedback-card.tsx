'use client'

import { Sparkles } from 'lucide-react'

export function CoachFeedbackCard({ message, timeLabel }: { message?: string; timeLabel?: string }) {
  return (
    <article className="flex gap-3.5 rounded-2xl border border-border bg-card p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/12 text-teal">
        <Sparkles className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-teal">AI COACH</span>
          {timeLabel ? <><span className="h-1 w-1 rounded-full bg-border" /><span className="text-xs text-muted-foreground">{timeLabel}</span></> : null}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-navy">
          {message ?? '첫 연습을 완료하면 실제 분석을 바탕으로 맞춤 피드백이 표시됩니다.'}
        </p>
      </div>
    </article>
  )
}
