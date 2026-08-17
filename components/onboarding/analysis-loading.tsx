'use client'

import { Check, LoaderCircle } from 'lucide-react'
import { analysisSteps } from '@/lib/onboarding-data'
import { cn } from '@/lib/utils'

export function AnalysisLoading({ activeStep }: { activeStep: number }) {
  return <div className="flex h-full flex-col items-center justify-center bg-background px-8 text-center" role="status" aria-live="polite">
    <span className="eyebrow text-gold">PERSONAL ANALYSIS</span>
    <h1 className="mt-4 text-2xl font-bold leading-snug text-navy">지원자님의 준비 경로를<br />분석하고 있어요</h1>
    <div className="mt-10 w-full space-y-3 text-left">
      {analysisSteps.map((step, index) => {
        const done = index < activeStep
        const active = index === activeStep
        return <div key={step.id} className={cn('flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all', active ? 'border-gold shadow-sm' : 'border-border', index > activeStep && 'opacity-45')}>
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-navy', done && 'bg-teal text-white')}>
            {done ? <Check className="h-4 w-4" /> : active ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : index + 1}
          </span>
          <span className="text-sm font-semibold text-navy">{step.title}</span>
        </div>
      })}
    </div>
  </div>
}
