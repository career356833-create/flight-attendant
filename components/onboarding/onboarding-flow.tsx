'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock3, Compass, Route, Gauge } from 'lucide-react'
import { OnboardingLayout } from './onboarding-layout'
import { SingleSelectCard } from './single-select-card'
import { MultiSelectCard } from './multi-select-card'
import { ScheduleOptionCard } from './schedule-option-card'
import { AirlineSelectList } from './airline-select-list'
import { DiagnosisSummaryCard } from './diagnosis-summary-card'
import { PriorityAreaList } from './priority-area-list'
import { StarterPlanPreview } from './starter-plan-preview'
import { AnalysisLoading } from './analysis-loading'
import { onboardingKo } from '@/lib/onboarding-i18n'
import type { DiagnosisResult, OnboardingAnswers } from '@/lib/onboarding-data'
import { applyTimingOptions, calculateDiagnosis, careerTargetOptions, confidenceAreaOptions, dailyTimeOptions, nonePreparedOption, onboardingIntro, preparedItemGroups, prepStageOptions, saveOnboarding } from '@/lib/onboarding-data'

type Props = { initialAnswers: OnboardingAnswers; onSkip: () => void; onComplete: (result: DiagnosisResult, answers: OnboardingAnswers) => void }
const total = 7
const primary = 'h-14 w-full rounded-2xl bg-navy px-5 font-semibold text-ivory transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

export function OnboardingFlow({ initialAnswers, onSkip, onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers)
  const [result, setResult] = useState<DiagnosisResult | null>(null)
  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => { topRef.current?.scrollIntoView({ block: 'start' }) }, [step])
  useEffect(() => { if (step > 0 && step < 8) saveOnboarding({ completed: false, answers, diagnosis: null }) }, [answers, step])
  const update = (patch: Partial<OnboardingAnswers>) => setAnswers((value) => ({ ...value, ...patch }))
  const valid = step === 1 ? !!answers.careerTarget : step === 2 ? !!answers.prepStage : step === 3 ? answers.experiences.length > 0 : step === 4 ? answers.weakAreas.length > 0 : step === 5 ? !!answers.primaryAirline : step === 6 ? !!answers.applyTiming : step === 7 ? !!answers.dailyTime : true
  const next = () => { if (step === 7) { saveOnboarding({ completed: false, answers, diagnosis: null }); setStep(8) } else setStep((v) => v + 1) }
  const footer = step > 0 && step <= 7 ? <div className="flex gap-3"><button type="button" onClick={() => setStep((v) => v - 1)} className="h-14 w-24 rounded-2xl border border-border bg-card font-semibold text-navy focus-visible:ring-2 focus-visible:ring-gold">이전</button><button type="button" disabled={!valid} onClick={next} className={primary}>{step === 7 ? '준비 경로 분석하기' : '다음'}</button></div> : undefined

  if (step === 8) return <AnalysisStage answers={answers} onDone={(value) => { setResult(value); setStep(9) }} />
  if (step === 9 && result) return <OnboardingLayout onBack={() => setStep(7)}><div ref={topRef} className="space-y-8 pb-4"><div><span className="eyebrow text-gold">YOUR FIRST PLAN</span><h1 className="mt-3 text-2xl font-bold leading-snug text-navy">지원자님의 첫 준비 계획이<br />완성되었어요</h1></div><DiagnosisSummaryCard result={result} /><PriorityAreaList areas={result.priorityAreas} /><section className="rounded-2xl bg-secondary/60 p-5"><span className="eyebrow text-teal">PRACTICE COACH</span><p className="mt-3 text-sm leading-relaxed text-navy">{result.coachMessage}</p><p className="mt-2 text-xs text-muted-foreground">자가응답을 정해진 기준으로 정리한 연습 추천입니다.</p></section><StarterPlanPreview plan={result.starterPlan} /><div className="space-y-3"><button type="button" className={primary} onClick={() => onComplete(result, answers)}>나의 준비실로 이동</button><button type="button" className="h-12 w-full text-sm font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold" onClick={() => setStep(1)}>진단 내용 수정</button></div></div></OnboardingLayout>

  if (step === 0) return <OnboardingLayout><div ref={topRef} className="flex min-h-full flex-col"><span className="eyebrow text-gold">{onboardingIntro.eyebrow}</span><h1 className="mt-4 whitespace-pre-line text-3xl font-bold leading-tight text-navy">{onboardingIntro.headline}</h1><p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{onboardingIntro.supporting}</p><div className="mt-8 flex items-center gap-2 text-sm font-semibold text-navy"><Clock3 className="h-4 w-4 text-gold" />{onboardingIntro.timeLabel}</div><div className="mt-6 space-y-3">{onboardingIntro.benefits.map((item, i) => { const Icon = [Gauge, Compass, Route][i]; return <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"><Icon className="h-5 w-5 text-gold" /><span className="text-sm font-semibold text-navy">{item.title}</span></div> })}</div><div className="mt-auto space-y-3 pt-10"><button type="button" className={primary} onClick={() => setStep(1)}>{onboardingIntro.primaryCta}</button><button type="button" className="h-12 w-full text-sm text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold" onClick={onSkip}>{onboardingIntro.secondaryCta}</button></div></div></OnboardingLayout>

  let title = ''; let content: React.ReactNode
  if (step === 1) { title = onboardingKo.careerTargetQuestion; content = <div className="space-y-3">{careerTargetOptions.map((o) => <SingleSelectCard key={o.value} {...o} selected={answers.careerTarget === o.value} onSelect={() => update({ careerTarget: o.value })} />)}</div> }
  else if (step === 2) { title = onboardingKo.preparationStageQuestion; content = <div className="space-y-3">{prepStageOptions.map((o) => <SingleSelectCard key={o.value} {...o} selected={answers.prepStage === o.value} onSelect={() => update({ prepStage: o.value })} />)}</div> }
  else if (step === 3) { title = onboardingKo.preparedItemsQuestion; content = <div className="space-y-7 pb-8">{preparedItemGroups.map((group) => <fieldset key={group.id} className="space-y-3"><legend className="eyebrow mb-3 text-muted-foreground">{group.label}</legend>{group.options.map((o) => <MultiSelectCard key={o.value} title={o.title} description={o.description} selected={answers.experiences.includes(o.value)} onToggle={() => update({ experiences: answers.experiences.includes(o.value) ? answers.experiences.filter((x) => x !== o.value) : [...answers.experiences.filter((x) => x !== 'none_prepared'), o.value] })} />)}</fieldset>)}<div className="border-t border-border pt-5"><MultiSelectCard title={nonePreparedOption.title} selected={answers.experiences.includes('none_prepared')} onToggle={() => update({ experiences: answers.experiences.includes('none_prepared') ? [] : ['none_prepared'] })} /></div></div> }
  else if (step === 4) { title = onboardingKo.improvementAreasQuestion; content = <div className="space-y-3 pb-6">{confidenceAreaOptions.map((o) => { const selected = answers.weakAreas.includes(o.value); return <MultiSelectCard key={o.value} title={o.title} description={o.description} selected={selected} disabled={!selected && answers.weakAreas.length >= 2} onToggle={() => update({ weakAreas: selected ? answers.weakAreas.filter((x) => x !== o.value) : [...answers.weakAreas, o.value] })} /> })}</div> }
  else if (step === 5) { title = '우선 준비할 항공사를 선택해 주세요.'; content = <AirlineSelectList primary={answers.primaryAirline} interests={answers.interestAirlines} preferredGroup={answers.careerTarget} onChange={({ primary, interests }) => update({ primaryAirline: primary, interestAirlines: interests })} /> }
  else if (step === 6) { title = '언제쯤 지원할 계획인가요?'; content = <div className="grid grid-cols-2 gap-3">{applyTimingOptions.map((o) => <ScheduleOptionCard key={o.value} name="timing" title={o.title} selected={answers.applyTiming === o.value} onSelect={() => update({ applyTiming: o.value })} />)}</div> }
  else { title = onboardingKo.dailyStudyTime.question; content = <div className="grid grid-cols-2 gap-3">{dailyTimeOptions.map((o) => <ScheduleOptionCard key={o.value} name="daily" title={o.title} description={o.description} selected={answers.dailyTime === o.value} onSelect={() => update({ dailyTime: o.value })} />)}</div> }
  return <OnboardingLayout step={step} totalSteps={total} title={title} subtitle={step === 3 ? onboardingKo.preparedItemsSupporting : step === 4 ? onboardingKo.improvementAreasSupporting : step === 5 ? onboardingKo.airlineSelection.supporting : step === 7 ? onboardingKo.dailyStudyTime.supporting : undefined} onBack={() => setStep((v) => v - 1)} footer={footer}><div ref={topRef}>{content}</div></OnboardingLayout>
}

function AnalysisStage({ answers, onDone }: { answers: OnboardingAnswers; onDone: (result: DiagnosisResult) => void }) {
  const [active, setActive] = useState(0)
  useEffect(() => { const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; if (reduced) { setActive(3); const id = setTimeout(() => onDone(calculateDiagnosis(answers)), 100); return () => clearTimeout(id) } const timers = [450, 900, 1400].map((delay, i) => setTimeout(() => { setActive(i + 1); if (i === 2) onDone(calculateDiagnosis(answers)) }, delay)); return () => timers.forEach(clearTimeout) }, [answers, onDone])
  return <AnalysisLoading activeStep={active} />
}
