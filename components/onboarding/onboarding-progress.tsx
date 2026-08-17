'use client'

type OnboardingProgressProps = {
  current: number
  total: number
}

// Subtle segmented progress indicator with a screen-reader label.
export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  const clampedCurrent = Math.max(1, Math.min(total, current))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={
              'h-1 flex-1 rounded-full transition-colors duration-300 ' +
              (i < clampedCurrent ? 'bg-navy' : 'bg-border')
            }
          />
        ))}
      </div>
      <p className="eyebrow text-muted-foreground">
        <span className="sr-only">진행 단계 </span>
        STEP {clampedCurrent} / {total}
      </p>
    </div>
  )
}
