'use client'

import { Bell } from 'lucide-react'
import { userProfile } from '@/lib/mock-data'

export function AppHeader() {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <div className="min-w-0">
        <p className="eyebrow text-muted-foreground">{userProfile.greetingEn}</p>
        <h1 className="mt-1.5 truncate text-[1.35rem] font-bold tracking-tight text-navy">
          {userProfile.greeting}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {userProfile.supportingText}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          aria-label={`알림 ${userProfile.notifications}개`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-navy transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Bell className="h-5 w-5" strokeWidth={1.75} />
          {userProfile.notifications > 0 && (
            <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-coral" />
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label="내 프로필"
          className="h-11 w-11 overflow-hidden rounded-full border border-border bg-secondary ring-2 ring-transparent transition-all hover:ring-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={userProfile.avatarUrl || '/placeholder.svg'}
            alt={`${userProfile.name}님의 프로필 사진`}
            className="h-full w-full object-cover"
          />
        </button>
      </div>
    </header>
  )
}
