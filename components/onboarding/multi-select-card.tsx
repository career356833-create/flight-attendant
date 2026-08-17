'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type MultiSelectCardProps = {
  title: string
  description?: string
  selected: boolean
  disabled?: boolean
  onToggle: () => void
}

// Checkbox-style selectable card for multi-select questions.
export function MultiSelectCard({
  title,
  description,
  selected,
  disabled,
  onToggle,
}: MultiSelectCardProps) {
  return (
    <label
      className={cn(
        'group relative flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-card p-4 transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 focus-within:ring-offset-background',
        selected ? 'border-navy' : 'border-border hover:border-navy/40',
        disabled && 'cursor-not-allowed opacity-45 hover:border-border',
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={selected}
        disabled={disabled}
        onChange={onToggle}
      />

      <span
        aria-hidden="true"
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-all',
          selected ? 'border-navy bg-navy text-ivory' : 'border-border bg-transparent',
        )}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] font-medium text-navy">{title}</p>
        {description && (
          <p className="mt-0.5 text-[0.8rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </label>
  )
}
