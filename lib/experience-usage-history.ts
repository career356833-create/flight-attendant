import type { ApplicationAnswer, ApplicationWorkDraft } from '@/lib/application-answer-repository'
import type { CareerExperience } from '@/lib/experience-repository'
import type { InterviewAttempt } from '@/lib/interview-practice-data'
import type { SelfIntroductionAttempt } from '@/lib/self-introduction-data'
import { interviewQuestionById } from '@/lib/interview-practice-data'

export type ExperienceUsageSourceType = 'interview' | 'application' | 'self_introduction'

export type ExperienceUsageRecord = {
  sourceType: ExperienceUsageSourceType
  sourceId?: string
  usedAt: string
  label?: string
  questionText?: string
  airlineId?: string
}

export type ExperienceUsageSummary = {
  experienceId: string
  totalUsageCount: number
  interview: {
    count: number
    lastUsedAt?: string
  }
  application: {
    count: number
    lastUsedAt?: string
  }
  selfIntroduction: {
    count: number
    lastUsedAt?: string
  }
  recentUsages: ExperienceUsageRecord[]
  usageBalance: 'unused' | 'light' | 'balanced' | 'overused'
}

export type ExperienceUsageSummaryMap = Record<string, ExperienceUsageSummary>

export const EXPERIENCE_USAGE_BALANCE_THRESHOLDS = {
  light: 2,
  balanced: 5,
  overused: 6,
} as const

function makeSummary(experienceId: string): ExperienceUsageSummary {
  return {
    experienceId,
    totalUsageCount: 0,
    interview: { count: 0 },
    application: { count: 0 },
    selfIntroduction: { count: 0 },
    recentUsages: [],
    usageBalance: 'unused',
  }
}

function addUsage(
  summary: ExperienceUsageSummary,
  record: ExperienceUsageRecord,
  seen: Set<string>,
) {
  const key = `${record.sourceType}:${record.sourceId ?? record.usedAt}`
  if (seen.has(key)) return
  seen.add(key)
  summary.recentUsages.push(record)
  summary.totalUsageCount += 1
  const bucket =
    record.sourceType === 'interview'
      ? summary.interview
      : record.sourceType === 'application'
        ? summary.application
        : summary.selfIntroduction
  bucket.count += 1
  if (!bucket.lastUsedAt || bucket.lastUsedAt < record.usedAt) bucket.lastUsedAt = record.usedAt
}

function finaliseSummary(summary: ExperienceUsageSummary) {
  const usedBuckets = [
    summary.interview.count,
    summary.application.count,
    summary.selfIntroduction.count,
  ].filter((count) => count > 0).length
  summary.usageBalance =
    summary.totalUsageCount === 0
      ? 'unused'
      : summary.totalUsageCount <= EXPERIENCE_USAGE_BALANCE_THRESHOLDS.light
        ? 'light'
        : summary.totalUsageCount <= EXPERIENCE_USAGE_BALANCE_THRESHOLDS.balanced
          ? 'balanced'
          : 'overused'
  summary.recentUsages.sort((a, b) => b.usedAt.localeCompare(a.usedAt))
  if (usedBuckets === 0 && summary.totalUsageCount > 0) summary.usageBalance = 'light'
}

function recordUsage(
  summaries: ExperienceUsageSummaryMap,
  experienceId: string,
  record: ExperienceUsageRecord,
  seen: Map<string, Set<string>>,
) {
  if (!summaries[experienceId]) summaries[experienceId] = makeSummary(experienceId)
  if (!seen.has(experienceId)) seen.set(experienceId, new Set<string>())
  addUsage(summaries[experienceId], record, seen.get(experienceId)!)
}

function uniqueExperienceIds(ids: (string | undefined | null)[]) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))]
}

export function buildExperienceUsageSummary(input: {
  experiences: CareerExperience[]
  interviewAttempts?: InterviewAttempt[]
  applicationAnswers?: ApplicationAnswer[]
  applicationWorkDrafts?: ApplicationWorkDraft[]
  selfIntroductionAttempts?: SelfIntroductionAttempt[]
}): ExperienceUsageSummaryMap {
  const summaries: ExperienceUsageSummaryMap = Object.fromEntries(
    input.experiences.map((experience) => [experience.id, makeSummary(experience.id)]),
  )
  const seenByExperience = new Map<string, Set<string>>()

  for (const attempt of input.interviewAttempts ?? []) {
    for (const experienceId of uniqueExperienceIds([
      attempt.experienceId,
      attempt.experienceSnapshot?.title ? attempt.experienceId : undefined,
    ])) {
      const question = interviewQuestionById.get(attempt.questionId)
      recordUsage(
        summaries,
        experienceId,
        {
          sourceType: 'interview',
          sourceId: attempt.id,
          usedAt: attempt.createdAt,
          label: question?.shortTitle ?? question?.prompt ?? attempt.questionId,
          questionText: question?.prompt ?? attempt.questionId,
          airlineId: attempt.targetAirlineId,
        },
        seenByExperience,
      )
    }
  }

  for (const answer of input.applicationAnswers ?? []) {
    for (const experienceId of uniqueExperienceIds(answer.selectedExperienceIds)) {
      recordUsage(
        summaries,
        experienceId,
        {
          sourceType: 'application',
          sourceId: answer.id,
          usedAt: answer.updatedAt,
          label: answer.customPrompt ?? answer.title,
          questionText: answer.customPrompt ?? answer.title,
          airlineId: answer.airlineId,
        },
        seenByExperience,
      )
    }
  }

  for (const draft of input.applicationWorkDrafts ?? []) {
    for (const experienceId of uniqueExperienceIds(draft.selectedExperienceIds)) {
      recordUsage(
        summaries,
        experienceId,
        {
          sourceType: 'application',
          sourceId: draft.id,
          usedAt: draft.updatedAt,
          label: draft.prompt?.prompt ?? draft.coreMessage ?? '지원서 초안',
          questionText: draft.prompt?.prompt ?? draft.coreMessage ?? '지원서 초안',
          airlineId: draft.airlineId,
        },
        seenByExperience,
      )
    }
  }

  for (const attempt of input.selfIntroductionAttempts ?? []) {
    if (!attempt.experienceId) continue
    recordUsage(
      summaries,
      attempt.experienceId,
      {
        sourceType: 'self_introduction',
        sourceId: attempt.id,
        usedAt: attempt.createdAt,
        label: attempt.challengeType ? `${attempt.targetSeconds ?? ''}초 자기소개`.trim() : '자기소개',
        questionText: attempt.challengeType ? `${attempt.targetSeconds ?? ''}초 자기소개`.trim() : '자기소개',
        airlineId: attempt.targetAirlineId,
      },
      seenByExperience,
    )
  }

  Object.values(summaries).forEach(finaliseSummary)
  return summaries
}

export function describeExperienceUsageBalance(summary: ExperienceUsageSummary) {
  if (summary.usageBalance === 'unused') return '아직 활용하지 않은 경험'
  if (summary.usageBalance === 'light') return '활용하기 시작한 경험'
  if (summary.usageBalance === 'balanced') return '여러 준비 영역에서 활용 중'
  return '이 경험에 의존하는 편'
}

export function describeExperienceUsageConcentration(summary: ExperienceUsageSummary) {
  if (!summary.totalUsageCount) return '아직 사용 기록이 없어요.'
  const buckets = [
    ['면접', summary.interview.count],
    ['지원서', summary.application.count],
    ['자기소개', summary.selfIntroduction.count],
  ] as const
  const used = buckets.filter(([, count]) => count > 0)
  if (used.length === 1) return `${used[0][0]}에서 자주 쓰는 경험`
  if (used.length === 3) return '여러 준비 영역에서 활용 중'
  const [top] = [...buckets].sort((a, b) => b[1] - a[1])
  return top[1] > 0 ? `${top[0]} 중심으로 활용 중` : '활용 영역이 고르게 분포되어 있어요'
}

export function formatExperienceUsageRelativeDate(usedAt: string, referenceTime = Date.now()) {
  const diffMs = referenceTime - new Date(usedAt).getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMinutes < 60) return diffMinutes <= 1 ? '방금 전' : `${diffMinutes}분 전`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}시간 전`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}일 전`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks}주 전`
  return new Date(usedAt).toLocaleDateString('ko-KR')
}
