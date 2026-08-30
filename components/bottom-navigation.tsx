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
      className="pointer-events-auto border-t border-border bg-card/90 pb-safe backdrop-blur-lg min-[900px]:hidden"
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

export function DesktopNavigation({active,onChange}:BottomNavigationProps){
  return <aside className="cabin-sidebar hidden h-full w-[232px] shrink-0 flex-col border-r border-white/10 bg-navy px-4 py-6 text-ivory min-[900px]:flex xl:w-[248px]" aria-label="주요 메뉴">
    <div className="cabin-sidebar-brand px-3"><span className="text-xs font-bold tracking-[0.2em] text-gold">CABIN</span><p className="mt-2 text-lg font-bold">AI Career Coach</p></div>
    <nav className="mt-8 flex-1"><ul className="space-y-2">{navItems.map(item=>{const Icon=icons[item.id]??Home,isActive=item.id===active;return <li key={item.id}><button type="button" onClick={()=>onChange(item.id)} aria-current={isActive?'page':undefined} className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',isActive?'bg-white/12 text-white':'text-ivory/70 hover:bg-white/7 hover:text-white')}><Icon className="h-5 w-5"/><span>{item.label}</span></button></li>})}</ul></nav>
    <div className="cabin-sidebar-status rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-ivory/60">오늘의 준비</p><p className="mt-2 text-sm font-semibold">한 번의 연습을 기록해보세요.</p></div>
  </aside>
}
