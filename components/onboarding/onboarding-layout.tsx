'use client'

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress'

type OnboardingLayoutProps = {
  step?: number
  totalSteps?: number
  eyebrow?: string
  title?: ReactNode
  subtitle?: ReactNode
  onBack?: () => void
  footer?: ReactNode
  children: ReactNode
}

// Shared scaffold for onboarding screens: clean ivory background, optional
// progress + back control, a scrollable question area, and a pinned footer.
export function OnboardingLayout({
  step,
  totalSteps,
  eyebrow,
  title,
  subtitle,
  onBack,
  footer,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex flex-col gap-4 px-5 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex h-9 items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="이전 단계로"
              className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}
        </div>

        {typeof step === 'number' && typeof totalSteps === 'number' && (
          <OnboardingProgress current={step} total={totalSteps} />
        )}
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-6 pt-6">
        {(eyebrow || title || subtitle) && (
          <div className="mb-7 flex flex-col gap-3">
            {eyebrow && <span className="eyebrow text-gold">{eyebrow}</span>}
            {title && (
              <h1 className="text-pretty text-2xl font-bold leading-snug tracking-tight text-navy">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {children}
      </div>

      {footer && (
        <div className="border-t border-border bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  )
}
