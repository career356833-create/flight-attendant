'use client'

import { Building2, Compass, Globe, Smile, Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  building: Building2,
  smile: Smile,
  globe: Globe,
  compass: Compass,
}

type SingleSelectCardProps = {
  title: string
  description?: string
  icon?: string
  selected: boolean
  onSelect: () => void
}

// Large radio-style selectable card. Rendered as a real radio for a11y.
export function SingleSelectCard({
  title,
  description,
  icon,
  selected,
  onSelect,
}: SingleSelectCardProps) {
  const Icon = icon ? iconMap[icon] : undefined

  return (
    <label
      className={cn(
        'group relative flex cursor-pointer items-start gap-4 rounded-2xl border bg-card p-4 transition-all duration-200',
        'focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 focus-within:ring-offset-background',
        selected
          ? 'border-navy shadow-[0_14px_34px_-20px_rgba(11,31,51,0.8)]'
          : 'border-border hover:border-navy/40',
      )}
    >
      <input
        type="radio"
        className="sr-only"
        checked={selected}
        onChange={onSelect}
      />

      {Icon && (
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors',
            selected ? 'bg-navy text-ivory' : 'bg-secondary text-midnight',
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      )}

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[0.95rem] font-semibold text-navy">{title}</p>
        {description && (
          <p className="mt-1 text-[0.8rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
          selected ? 'border-navy bg-navy text-ivory' : 'border-border bg-transparent',
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </label>
  )
}
