'use client'

import { useEffect, useState } from 'react'

type ReadinessGaugeProps = {
  value: number
  label?: string
}

// Semicircular gauge rendered with a stroked SVG arc.
export function ReadinessGauge({ value, label = 'SELF-CHECK READINESS' }: ReadinessGaugeProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const radius = 72
  const cx = 90
  const cy = 90
  const circumference = Math.PI * radius // half circle length
  const clamped = Math.max(0, Math.min(100, value))
  const offset = mounted ? circumference * (1 - clamped / 100) : circumference

  // Semicircle path from left to right across the top.
  const arc = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 104" className="w-full max-w-[240px]" role="img" aria-label={`자가진단 준비 지표 ${clamped}/100`}>
        <path
          d={arc}
          fill="none"
          stroke="var(--sky)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--teal)" />
            <stop offset="60%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--coral)" />
          </linearGradient>
        </defs>
        <path
          d={arc}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>

      <div className="-mt-9 flex flex-col items-center">
        <p className="text-4xl font-bold leading-none text-navy">
          {clamped}
          <span className="ml-0.5 text-lg font-semibold text-gold">/100</span>
        </p>
        <p className="eyebrow mt-2 text-muted-foreground">{label}</p>
        <p className="mt-2 max-w-[260px] text-center text-xs leading-relaxed text-muted-foreground">자가응답과 완료한 연습 기록을 규칙으로 요약한 참고 지표이며 합격 가능성이 아닙니다.</p>
      </div>
    </div>
  )
}
