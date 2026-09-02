'use client'

import { useEffect, useState } from 'react'
import type { HomeSkillMetric } from '@/lib/home-real-state'
import { cn } from '@/lib/utils'

type SkillProgressListProps = {
  skills: HomeSkillMetric[]
}

function toneFor(value: number) {
  if (value < 50) return 'bg-coral'
  if (value < 70) return 'bg-gold'
  return 'bg-teal'
}

export function SkillProgressList({ skills }: SkillProgressListProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <ul className="flex flex-col gap-4">
      {skills.map((skill, i) => (
        <li key={skill.id} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-navy">{skill.name}</span>
              <span className="eyebrow text-muted-foreground/70">{skill.labelEn}</span>
            </div>
            <span className="text-sm font-semibold tabular-nums text-navy">
              {skill.value}
              <span className="text-xs text-muted-foreground">%</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-1000 ease-out',
                toneFor(skill.value),
              )}
              style={{
                width: mounted ? `${skill.value}%` : '0%',
                transitionDelay: `${i * 90}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
