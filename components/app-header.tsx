'use client'

import { userProfile } from '@/lib/mock-data'

export function AppHeader() {
  return (
    <header className="cabin-header mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] md:px-8 min-[900px]:pt-7 xl:px-10">
      <div className="min-w-0">
        <p className="eyebrow text-muted-foreground">{userProfile.greetingEn}</p>
        <h1 className="mt-1.5 truncate text-[1.35rem] font-bold tracking-tight text-navy min-[900px]:text-[1.7rem]">
          {userProfile.greeting}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {userProfile.supportingText}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
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
