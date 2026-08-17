'use client'

import { Sparkles } from 'lucide-react'
import { coachFeedback } from '@/lib/mock-data'

export function CoachFeedbackCard({ message = coachFeedback.message }: { message?: string }) {
  return (
    <article className="flex gap-3.5 rounded-2xl border border-border bg-card p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal/12 text-teal">
        <Sparkles className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-teal">{coachFeedback.author}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span className="text-xs text-muted-foreground">{coachFeedback.timeLabel}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-navy">
          {message}
        </p>
      </div>
    </article>
  )
}
