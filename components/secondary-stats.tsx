'use client'

import { CalendarCheck, Flame, Flag } from 'lucide-react'
import { weeklyStats } from '@/lib/mock-data'

export function SecondaryStats() {
  const { streakDays, completedThisWeek, weeklyGoal, upcomingGoal } = weeklyStats

  return (
    <div className="grid grid-cols-2 gap-3">
      <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-muted-foreground">STREAK</span>
          <Flame className="h-4 w-4 text-coral" strokeWidth={2} />
        </div>
        <p className="mt-4 text-2xl font-bold text-navy">
          {streakDays}
          <span className="ml-1 text-sm font-medium text-muted-foreground">일 연속</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">꾸준함이 합격을 만듭니다</p>
      </article>

      <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-muted-foreground">THIS WEEK</span>
          <CalendarCheck className="h-4 w-4 text-teal" strokeWidth={2} />
        </div>
        <p className="mt-4 text-2xl font-bold text-navy">
          {completedThisWeek}
          <span className="ml-1 text-sm font-medium text-muted-foreground">/ {weeklyGoal}</span>
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-teal transition-[width] duration-1000 ease-out"
            style={{ width: `${Math.min(100, (completedThisWeek / weeklyGoal) * 100)}%` }}
          />
        </div>
      </article>

      <article className="col-span-2 flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Flag className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-muted-foreground">UPCOMING GOAL</span>
          <p className="mt-1 truncate text-sm font-semibold text-navy">
            {upcomingGoal.title}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-ivory">
          {upcomingGoal.dueLabel}
        </span>
      </article>
    </div>
  )
}
