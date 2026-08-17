'use client'

import { cn } from '@/lib/utils'

type ScheduleOptionCardProps = {
  title: string
  selected: boolean
  onSelect: () => void
  name: string
  description?: string
}

// Compact selectable chip-card used for schedule questions in a grid.
export function ScheduleOptionCard({ title, selected, onSelect, name, description }: ScheduleOptionCardProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border bg-card px-4 py-4 text-center text-[0.95rem] font-semibold transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 focus-within:ring-offset-background',
        selected
          ? 'border-navy bg-navy text-ivory shadow-[0_14px_34px_-20px_rgba(11,31,51,0.8)]'
          : 'border-border text-navy hover:border-navy/40',
      )}
    >
      <input
        type="radio"
        name={name}
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />
      {title}
      {description && <span className={selected ? 'mt-1 text-xs font-normal text-ivory/65' : 'mt-1 text-xs font-normal text-muted-foreground'}>{description}</span>}
    </label>
  )
}
