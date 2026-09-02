import type { DiagnosisResult } from '@/lib/onboarding-data'
import type { LearningActivity } from '@/lib/learning-analytics-service'
import type { ApplicationImportantDate } from '@/lib/application-tracker'

export type HomeSkillMetric = {
  id: 'resume' | 'interview' | 'english' | 'company' | 'situation'
  name: string
  labelEn: string
  value: number
}

export type HomeRoutineTaskStatus = 'done' | 'in-progress' | 'todo'
export type HomeRoutineTask = { id: string; step: number; name: string; description?: string; minutes: number; status: HomeRoutineTaskStatus }

export type HomeRealState = {
  streakDays?: number
  weeklyPracticeCount: number
  readiness?: number
  skills?: HomeSkillMetric[]
  upcoming?: { title: string; dueLabel: string }
  recentCoaching?: { message: string; timeLabel: string }
  hasLearningData: boolean
}

const skillDefinitions: Array<Omit<HomeSkillMetric, 'value'>> = [
  { id: 'resume', name: '자기소개서', labelEn: 'RESUME' },
  { id: 'interview', name: '기본 면접', labelEn: 'INTERVIEW' },
  { id: 'english', name: '영어 면접', labelEn: 'ENGLISH' },
  { id: 'company', name: '기업 분석', labelEn: 'COMPANY' },
  { id: 'situation', name: '상황 대처', labelEn: 'SITUATION' },
]

const localDay = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function calculateLearningStreak(activities: Pick<LearningActivity, 'occurredAt'>[], today = new Date()): number | undefined {
  const uniqueDays = [...new Set(activities.map(item => localDay(item.occurredAt)?.getTime()).filter((value): value is number => value !== undefined && value !== null))].sort((a, b) => b - a)
  if (!uniqueDays.length) return undefined
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const day = 86_400_000
  if (todayStart - uniqueDays[0] > day) return undefined
  let streak = 1
  for (let index = 1; index < uniqueDays.length; index += 1) {
    if (uniqueDays[index - 1] - uniqueDays[index] !== day) break
    streak += 1
  }
  return streak
}

const activityLabel = (activity: Pick<LearningActivity, 'sourceEntityType' | 'title'>) => {
  if (activity.sourceEntityType === 'interview_attempt') return '면접 연습'
  if (activity.sourceEntityType === 'self_introduction') return '자기소개 연습'
  if (activity.sourceEntityType === 'application_answer') return '지원서 연습'
  return activity.title
}

const formatActivityDate = (occurredAt: string, today: Date) => {
  const occurred = localDay(occurredAt)
  if (!occurred) return null
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const difference = Math.round((todayStart.getTime() - occurred.getTime()) / 86_400_000)
  if (difference === 0) return '오늘'
  if (difference === 1) return '어제'
  return occurred.toLocaleDateString('ko-KR')
}

export function buildHomeRealState(input: {
  diagnosis?: DiagnosisResult | null
  activities: LearningActivity[]
  weeklyPracticeCount: number
  upcoming?: { application: { airlineNameSnapshot: string }; importantDate: ApplicationImportantDate }
  coachMessage?: string
  coachOccurredAt?: string
  coachSource?: string
  today?: Date
}): HomeRealState {
  const today = input.today ?? new Date()
  const readiness = input.diagnosis?.overallReadiness
  const skills = input.diagnosis
    ? skillDefinitions.map(skill => ({ ...skill, value: input.diagnosis!.skillScores[skill.id] ?? readiness ?? 0 }))
    : undefined
  const latest = input.activities[0]
  const coachingDate = input.coachOccurredAt ?? latest?.occurredAt
  const coachingSource = input.coachSource ?? (latest ? activityLabel(latest) : undefined)
  const dateLabel = coachingDate ? formatActivityDate(coachingDate, today) : null

  return {
    streakDays: calculateLearningStreak(input.activities, today),
    weeklyPracticeCount: input.weeklyPracticeCount,
    readiness,
    skills,
    upcoming: input.upcoming ? { title: `${input.upcoming.application.airlineNameSnapshot} ${input.upcoming.importantDate.kind === 'interview' ? '면접' : '지원 마감'}`, dueLabel: input.upcoming.importantDate.dday } : undefined,
    recentCoaching: input.coachMessage && dateLabel && coachingSource ? { message: input.coachMessage, timeLabel: `${dateLabel} · ${coachingSource}` } : undefined,
    hasLearningData: input.activities.length > 0,
  }
}
