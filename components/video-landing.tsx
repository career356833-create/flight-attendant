'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { landingContent } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type VideoLandingProps = {
  onStart: () => void
  onLogin?: () => void
  /** Overrides the mock video URL so the source can be swapped easily. */
  videoUrl?: string
}

export function VideoLanding({ onStart, onLogin, videoUrl }: VideoLandingProps) {
  const src = videoUrl ?? landingContent.videoUrl
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const showVideo = Boolean(src) && !reducedMotion

  function handleStart() {
    if (leaving) return
    setLeaving(true)
    // Keep the transition tasteful and fast.
    window.setTimeout(onStart, 620)
  }

  return (
    <section
      aria-label="CABIN 소개"
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden bg-navy',
        'transition-[transform,filter,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
        leaving ? 'scale-[1.06] opacity-0 blur-[2px]' : 'scale-100 opacity-100',
      )}
    >
      {/* Media layer */}
      <div className="absolute inset-0">
        {/* Poster / fallback image */}
        <img
          src={landingContent.posterUrl || '/placeholder.svg'}
          alt=""
          aria-hidden="true"
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            showVideo && videoReady ? 'opacity-0' : 'opacity-100',
          )}
        />

        {showVideo && (
          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
              videoReady ? 'opacity-100' : 'opacity-0',
            )}
            autoPlay
            muted
            loop
            playsInline
            poster={landingContent.posterUrl}
            onCanPlay={() => setVideoReady(true)}
          >
            <source src={src} type="video/mp4" />
          </video>
        )}

        {/* Loading shimmer while media resolves */}
        {showVideo && !videoReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="sr-only">불러오는 중</span>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ivory/30 border-t-ivory/90" />
          </div>
        )}

        {/* Navy gradient overlays: subtle top, stronger bottom for legibility */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/25 to-navy/95"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy via-navy/60 to-transparent"
        />
      </div>

      {/* Top brand */}
      <header className="relative z-10 flex items-center gap-2.5 px-6 pt-[calc(env(safe-area-inset-top)+1.75rem)] md:px-12 md:pt-10 lg:px-16">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-ivory/30 bg-ivory/5 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-[0.14em] text-ivory">
            {landingContent.brand}
          </p>
          <p className="eyebrow text-ivory/55">{landingContent.brandTagline}</p>
        </div>
      </header>

      <div aria-hidden="true" className="absolute right-[7%] top-1/2 z-10 hidden h-[52%] w-[34%] -translate-y-1/2 rounded-[45%] border border-ivory/20 bg-gradient-to-br from-sky/25 via-white/5 to-transparent shadow-[inset_0_0_80px_rgba(220,230,236,0.14),0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-[2px] md:block" />

      {/* Lower-third content */}
      <div className="relative z-10 mt-auto flex flex-col gap-6 px-6 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] md:max-w-[58%] md:px-12 md:pb-14 lg:max-w-[52%] lg:px-16 lg:pb-16">
        <div className="flex flex-col gap-4">
          <span className="eyebrow w-fit rounded-full border border-ivory/20 bg-ivory/5 px-3 py-1.5 text-gold backdrop-blur-sm">
            AI CAREER PREPARATION
          </span>
          <h1 className="whitespace-pre-line text-pretty text-[2rem] font-bold leading-[1.25] tracking-tight text-ivory md:text-[2.8rem] lg:text-[3.25rem]">
            {landingContent.headline}
          </h1>
          <p className="whitespace-pre-line text-pretty text-[0.95rem] leading-relaxed text-ivory/70">
            {landingContent.supporting}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-4 md:max-w-[520px] md:flex-row md:items-center">
          <button
            type="button"
            onClick={handleStart}
            className={cn(
              'group flex h-14 items-center justify-center gap-2 rounded-2xl bg-ivory px-8 text-base font-semibold text-navy md:min-w-[240px]',
              'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] transition-all duration-300',
              'hover:bg-white active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy',
            )}
          >
            {landingContent.primaryCta}
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={onLogin}
            className="mx-auto rounded text-sm text-ivory/65 underline-offset-4 transition-colors hover:text-ivory hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy md:mx-0 md:px-3"
          >
            {landingContent.loginLink}
          </button>
        </div>
      </div>
    </section>
  )
}
