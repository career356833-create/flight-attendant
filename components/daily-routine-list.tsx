'use client'

import { Route } from 'lucide-react'
import type { RoutineTask } from '@/lib/mock-data'
import { RoutineTaskCard } from '@/components/routine-task-card'

type DailyRoutineListProps = {
  label: string
  title: string
  totalTimeLabel: string
  tasks: RoutineTask[]
  onToggle?: (id: string) => void
  onTaskStart?: (id: string) => void
}

export function DailyRoutineList({
  label,
  title,
  totalTimeLabel,
  tasks,
  onToggle,
  onTaskStart,
}: DailyRoutineListProps) {
  const completed = tasks.filter((t) => t.status === 'done').length

  return (
    <section aria-labelledby="route-heading" className="flex flex-col gap-4">
      <div className="flex items-end justify-between px-1">
        <div>
          <span className="eyebrow text-muted-foreground">{label}</span>
          <h2 id="route-heading" className="mt-1.5 text-lg font-bold tracking-tight text-navy">
            {title}
          </h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-midnight">
          <Route className="h-3.5 w-3.5" strokeWidth={2} />
          {totalTimeLabel}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
          <p className="text-sm font-medium text-navy">오늘의 루틴이 아직 없어요</p>
          <p className="mt-1 text-xs text-muted-foreground">
            준비를 시작하면 맞춤 루틴이 배정됩니다.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {tasks.map((task) => (
              <RoutineTaskCard key={task.id} task={task} onToggle={onToggle} onStart={onTaskStart ? (id) => onTaskStart(id) : undefined} />
            ))}
          </ul>
          <p className="px-1 text-center text-xs text-muted-foreground">
            {completed} / {tasks.length} 완료 · 오늘도 순항 중이에요
          </p>
        </>
      )}
    </section>
  )
}
