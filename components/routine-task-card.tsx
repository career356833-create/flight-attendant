'use client'

import { Check, Clock, Play } from 'lucide-react'
import type { HomeRoutineTask as RoutineTask } from '@/lib/home-real-state'
import { cn } from '@/lib/utils'

type RoutineTaskCardProps = {
  task: RoutineTask
  onToggle?: (id: string) => void
  onStart?: (id: string) => void
}

export function RoutineTaskCard({ task, onToggle, onStart }: RoutineTaskCardProps) {
  const isDone = task.status === 'done'
  const isActive = task.status === 'in-progress'

  return (
    <li
      className={cn(
        'group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all duration-200',
        isDone ? 'border-border/60 bg-secondary/40' : 'border-border hover:border-gold/50',
        isActive && 'border-gold/60 shadow-[0_10px_30px_-18px_rgba(198,165,106,0.9)]',
      )}
    >
      {/* Step / completion indicator */}
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
          isDone
            ? 'bg-teal text-white'
            : isActive
              ? 'bg-navy text-ivory'
              : 'border border-border bg-secondary text-muted-foreground',
        )}
      >
        {isDone ? <Check className="h-[18px] w-[18px]" strokeWidth={2.5} /> : task.step}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-[0.95rem] font-medium',
            isDone ? 'text-muted-foreground line-through' : 'text-navy',
          )}
        >
          {task.name}
        </p>
        {task.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{task.description}</p>}
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" strokeWidth={2} />
          {task.minutes}분
          {isActive && <span className="ml-1 font-medium text-gold">· 진행 중</span>}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onStart ? onStart(task.id) : onToggle?.(task.id)}
        aria-label={isDone ? `${task.name} 완료 취소` : `${task.name} 시작`}
        className={cn(
          'flex h-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
          isDone
            ? 'w-9 border border-border text-muted-foreground hover:text-navy'
            : isActive
              ? 'gap-1 bg-coral px-4 text-sm font-semibold text-white hover:brightness-105'
              : 'gap-1 bg-navy px-4 text-sm font-semibold text-ivory hover:brightness-110',
        )}
      >
        {isDone ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : (
          <>
            <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
            {isActive ? '이어서' : '시작'}
          </>
        )}
      </button>
    </li>
  )
}
