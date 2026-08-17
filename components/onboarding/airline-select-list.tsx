'use client'

import { useMemo, useState } from 'react'
import { Search, Star, Check, PenLine } from 'lucide-react'
import { airlines, type Airline, type AirlineSelection } from '@/lib/airline-data'
import { onboardingMessages, onboardingKo } from '@/lib/onboarding-i18n'
import { cn } from '@/lib/utils'

const MAX_INTERESTS = 2
const UNDECIDED: AirlineSelection = { id: 'undecided_airline', name: onboardingKo.airlineSelection.undecided }

type Props = {
  primary: AirlineSelection | null
  interests: AirlineSelection[]
  preferredGroup?: string | null
  onChange: (next: { primary: AirlineSelection | null; interests: AirlineSelection[] }) => void
}

const groupDefinitions = [
  { id: 'full_service', labelEn: 'FULL SERVICE', models: ['full_service'] },
  { id: 'low_cost_or_hybrid', labelEn: 'LOW COST · HYBRID', models: ['low_cost', 'hybrid'] },
  { id: 'regional', labelEn: 'REGIONAL · SPECIAL', models: ['regional'] },
] as const

const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

function searchableText(item: Airline) {
  const ko = onboardingMessages.ko.airlineSelection
  const en = onboardingMessages.en.airlineSelection
  return normalize([
    item.name, ...item.aliases, item.countryCode,
    ko.countries[item.countryCode as keyof typeof ko.countries],
    en.countries[item.countryCode as keyof typeof en.countries],
    ko.regions[item.region], en.regions[item.region],
    ko.businessModels[item.businessModel], en.businessModels[item.businessModel],
  ].filter(Boolean).join(' '))
}

export function AirlineSelectList({ primary, interests, preferredGroup, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState(primary?.id === 'custom_airline' ? primary.customAirline : '')

  const groups = useMemo(() => {
    const preferred = preferredGroup === 'regional_or_short_haul' ? 'regional' : preferredGroup
    const ordered = [...groupDefinitions].sort((a, b) => a.id === preferred ? -1 : b.id === preferred ? 1 : 0)
    const q = normalize(query)
    return ordered.map((group) => ({
      ...group,
      label: onboardingKo.airlineSelection.groups[group.id],
      airlines: airlines.filter((item) => group.models.some((model) => model === item.businessModel) && (!q || searchableText(item).includes(q))),
    })).filter((group) => group.airlines.length > 0)
  }, [preferredGroup, query])

  function selectPrimary(item: AirlineSelection) {
    onChange({ primary: item, interests: interests.filter((interest) => interest.id !== item.id) })
  }

  function toggleInterest(item: Airline) {
    if (item.id === primary?.id) return
    if (interests.some((interest) => interest.id === item.id)) onChange({ primary, interests: interests.filter((interest) => interest.id !== item.id) })
    else if (interests.length < MAX_INTERESTS) onChange({ primary, interests: [...interests, { id: item.id, name: item.name }] })
  }

  return <div className="flex flex-col gap-5">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={onboardingKo.airlineSelection.searchPlaceholder} aria-label={onboardingKo.airlineSelection.searchPlaceholder} className="h-12 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-[0.95rem] text-navy placeholder:text-muted-foreground focus:border-navy/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold" />
    </div>

    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-xs">
      <span className="font-semibold text-navy">{onboardingKo.airlineSelection.primaryLabel}: <span className="font-bold">{primary?.name ?? onboardingKo.airlineSelection.unselected}</span></span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{onboardingKo.airlineSelection.interestLabel} {interests.length}/{MAX_INTERESTS}{interests.length > 0 && `: ${interests.map((item) => item.name).join(', ')}`}</span>
    </div>

    <div className="flex flex-col gap-5">
      {groups.map((group) => <fieldset key={group.id} className="flex flex-col gap-2.5">
        <legend className="mb-1 flex items-baseline gap-2"><span className="text-sm font-bold text-navy">{group.label}</span><span className="eyebrow text-muted-foreground">{group.labelEn}</span></legend>
        {group.airlines.map((item) => {
          const isPrimary = primary?.id === item.id
          const isInterest = interests.some((interest) => interest.id === item.id)
          const interestDisabled = !isInterest && (interests.length >= MAX_INTERESTS || isPrimary)
          return <div key={item.id} className={cn('flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-all duration-200', isPrimary ? 'border-navy' : 'border-border')}>
            <button type="button" onClick={() => selectPrimary({ id: item.id, name: item.name })} aria-pressed={isPrimary} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-card">
              <span aria-hidden="true" className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all', isPrimary ? 'border-navy bg-navy text-ivory' : 'border-border')}>{isPrimary && <Check className="h-3 w-3" strokeWidth={3} />}</span>
              <span className="min-w-0"><span className="block truncate text-[0.95rem] font-medium text-navy">{item.name}</span><span className="mt-0.5 block truncate text-[0.72rem] text-muted-foreground">{onboardingKo.airlineSelection.countries[item.countryCode as keyof typeof onboardingKo.airlineSelection.countries]} · {onboardingKo.airlineSelection.businessModels[item.businessModel]}</span></span>
            </button>
            <button type="button" onClick={() => toggleInterest(item)} disabled={interestDisabled} aria-pressed={isInterest} aria-label={`${item.name} 관심 항공사 ${isInterest ? '해제' : '추가'}`} className={cn('flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold', isInterest ? 'bg-gold/15 text-gold' : 'text-muted-foreground hover:bg-secondary', interestDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent')}><Star className="h-3.5 w-3.5" strokeWidth={2} fill={isInterest ? 'currentColor' : 'none'} />관심</button>
          </div>
        })}
      </fieldset>)}
      {groups.length === 0 && <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{onboardingKo.airlineSelection.noResults}</p>}
    </div>

    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={() => { setCustomOpen(false); onChange({ primary: UNDECIDED, interests: [] }) }} aria-pressed={primary?.id === 'undecided_airline'} className={cn('flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold', primary?.id === 'undecided_airline' ? 'border-navy' : 'border-border hover:border-navy/40')}><span aria-hidden="true" className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', primary?.id === 'undecided_airline' ? 'border-navy bg-navy text-ivory' : 'border-border')}>{primary?.id === 'undecided_airline' && <Check className="h-3 w-3" strokeWidth={3} />}</span><span className="text-[0.95rem] font-medium text-navy">{onboardingKo.airlineSelection.undecided}</span></button>
      <div className={cn('rounded-2xl border bg-card transition-all duration-200', customOpen ? 'border-navy' : 'border-border')}>
        <button type="button" onClick={() => setCustomOpen((value) => !value)} className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"><PenLine className="h-3 w-3" strokeWidth={2} /></span><span className="text-[0.95rem] font-medium text-navy">{onboardingKo.airlineSelection.customInput}</span></button>
        {customOpen && <div className="px-3.5 pb-3.5"><input type="text" value={customValue} onChange={(event) => { const value = event.target.value; setCustomValue(value); onChange({ primary: value.trim() ? { id: 'custom_airline', name: value.trim(), customAirline: value.trim() } : null, interests }) }} placeholder={onboardingKo.airlineSelection.customPlaceholder} aria-label={onboardingKo.airlineSelection.customPlaceholder} autoFocus className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[0.95rem] text-navy placeholder:text-muted-foreground focus:border-navy/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold" /></div>}
      </div>
    </div>
  </div>
}
