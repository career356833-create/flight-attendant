'use client'

import { Plane, Target } from 'lucide-react'

type JourneyCardProps = {
  onStartTraining?: () => void
  target: string
  score: number
  nextGoal?: string
}

export function JourneyCard({ onStartTraining, target, score, nextGoal = '오늘의 훈련 완료' }: JourneyCardProps) {
  return (
    <article className="relative overflow-hidden rounded-3xl bg-navy p-6 text-ivory shadow-[0_24px_60px_-28px_rgba(11,31,51,0.7)]">
      {/* Subtle route-line background detail */}
      <svg
        aria-hidden="true"
        viewBox="0 0 340 200"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
        preserveAspectRatio="none"
      >
        <path
          d="M-10 170 C 90 150, 150 60, 350 30"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 8"
          className="text-gold"
        />
        <path
          d="M-10 190 C 120 175, 200 120, 360 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-ivory"
        />
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-2xl"
      />

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-gold">MY JOURNEY</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-ivory/60">
            START
            <Plane className="h-3.5 w-3.5 rotate-45 text-ivory/70" strokeWidth={2} />
            GOAL
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ivory/45">TARGET</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ivory">
              {target}
            </h2>
          </div>
          <div className="text-right">
            <p className="eyebrow text-ivory/45">SELF-CHECK</p>
            <p className="mt-0.5 text-3xl font-bold leading-none text-ivory">
              {score}
              <span className="ml-0.5 text-base font-semibold text-gold">/100</span>
            </p>
          </div>
        </div>

        {/* Thin readiness track */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ivory/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-coral transition-[width] duration-1000 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="-mt-3 text-xs leading-relaxed text-ivory/55">자가응답과 연습 기록 기반 참고 지표 · 합격 가능성이 아닙니다.</p>

        <div className="flex items-center gap-2 rounded-2xl bg-ivory/5 px-4 py-3 backdrop-blur-sm">
          <Target className="h-4 w-4 shrink-0 text-gold" strokeWidth={2} />
          <p className="text-sm text-ivory/85">
            <span className="text-ivory/50">NEXT · </span>
            {nextGoal}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartTraining}
          className="flex h-12 items-center justify-center rounded-2xl bg-coral text-[0.95rem] font-semibold text-white transition-all duration-200 hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
        >
          오늘 훈련 시작
        </button>
      </div>
    </article>
  )
}
