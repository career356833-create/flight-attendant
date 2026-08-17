'use client'

import { Home, Route, Mic, FileText, User, type LucideIcon } from 'lucide-react'
import { navItems } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const icons: Record<string, LucideIcon> = {
  home: Home,
  routine: Route,
  interview: Mic,
  resume: FileText,
  my: User,
}

type BottomNavigationProps = {
  active: string
  onChange: (id: string) => void
}

export function BottomNavigation({ active, onChange }: BottomNavigationProps) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="pointer-events-auto border-t border-border bg-card/90 pb-safe backdrop-blur-lg"
    >
      <ul className="flex items-stretch justify-around px-2 pt-2">
        {navItems.map((item) => {
          const Icon = icons[item.id] ?? Home
          const isActive = item.id === active
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex w-full flex-col items-center gap-1 rounded-xl py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'text-navy' : 'text-muted-foreground hover:text-midnight',
                )}
              >
                <span className="relative flex h-6 items-center justify-center">
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2.2 : 1.75}
                  />
                </span>
                <span className={cn('text-[0.7rem]', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
                <span
                  className={cn(
                    'h-0.5 w-5 rounded-full transition-all duration-300',
                    isActive ? 'bg-gold opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
