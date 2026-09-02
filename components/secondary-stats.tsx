'use client'

import { CalendarCheck, Flame, Flag } from 'lucide-react'

export function SecondaryStats({ streakDays, weeklyPracticeCount, upcoming }: { streakDays?: number; weeklyPracticeCount: number; upcoming?: { title: string; dueLabel: string } }) {

  return (
    <div className="grid grid-cols-2 gap-3">
      <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-muted-foreground">STREAK</span>
          <Flame className="h-4 w-4 text-coral" strokeWidth={2} />
        </div>
        <p className="mt-4 text-2xl font-bold text-navy">
          {streakDays === undefined ? <span className="text-sm font-semibold">기록 없음</span> : <>{streakDays}<span className="ml-1 text-sm font-medium text-muted-foreground">일 연속</span></>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{streakDays === undefined ? '첫 연습을 완료하면 기록됩니다.' : '실제 완료 기록 기준'}</p>
      </article>

      <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-muted-foreground">THIS WEEK</span>
          <CalendarCheck className="h-4 w-4 text-teal" strokeWidth={2} />
        </div>
        <p className="mt-4 text-2xl font-bold text-navy">
          {weeklyPracticeCount ? <>{weeklyPracticeCount}<span className="ml-1 text-sm font-medium text-muted-foreground">회 연습</span></> : <span className="text-sm font-semibold">기록 없음</span>}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{weeklyPracticeCount ? '최근 7일 실제 활동 기준' : '아직 이번 주 연습 기록이 없습니다.'}</p>
      </article>

      <article className="col-span-2 flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Flag className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="eyebrow text-muted-foreground">UPCOMING GOAL</span>
          <p className="mt-1 truncate text-sm font-semibold text-navy">{upcoming?.title ?? '예정된 지원·면접 일정 없음'}</p>
        </div>
        <span className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-xs font-bold text-ivory">
          {upcoming?.dueLabel ?? '없음'}
        </span>
      </article>
    </div>
  )
}
