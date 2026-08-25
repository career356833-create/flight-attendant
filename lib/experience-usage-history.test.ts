import assert from 'node:assert/strict'
import test from 'node:test'
import { buildExperienceUsageSummary, describeExperienceUsageBalance, describeExperienceUsageConcentration, formatExperienceUsageRelativeDate, EXPERIENCE_USAGE_BALANCE_THRESHOLDS, type ExperienceUsageSummary } from './experience-usage-history'
import type { CareerExperience } from './experience-repository'
import type { InterviewAttempt } from './interview-practice-data'
import type { ApplicationAnswer, ApplicationWorkDraft } from './application-answer-repository'
import type { SelfIntroductionAttempt } from './self-introduction-data'

function experience(id: string): CareerExperience {
  const now = '2026-08-25T00:00:00.000Z'
  return {
    id,
    title: id,
    category: 'customer_service',
    organization: 'org',
    role: 'role',
    period: 'period',
    situation: '충분히 구체적인 상황 설명입니다.',
    task: '역할 설명',
    action: '충분히 구체적인 행동 설명입니다.',
    result: '결과 설명',
    learning: '배운 점 설명',
    roleConnection: '직무 연결 설명',
    shortSummary: '요약',
    competencyTags: ['customer_orientation'],
    questionTags: [],
    status: 'interview_ready',
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
    source: 'manual',
  }
}

function interviewAttempt(overrides: Partial<InterviewAttempt> = {}): InterviewAttempt {
  return {
    id: 'i1',
    questionId: 'cs1',
    category: 'customer_situation',
    createdAt: '2026-08-24T10:00:00.000Z',
    transcript: 'answer',
    durationSeconds: 30,
    attemptNumber: 1,
    completed: true,
    analysis: {} as never,
    contentAnalysis: { structure: { missingParts: [] }, competencies: [] } as never,
    speechMetrics: { fillers: { totalCount: 0 } } as never,
    audioMetrics: { pauses: { longCount: 0 } } as never,
    ...overrides,
  }
}

function applicationAnswer(overrides: Partial<ApplicationAnswer> = {}): ApplicationAnswer {
  return {
    id: 'a1',
    airlineId: 'air-1',
    promptId: 'p1',
    documentType: 'motivation_statement',
    title: '지원동기',
    status: 'ready',
    selectedExperienceIds: ['exp-1'],
    experienceSnapshots: [],
    currentVersionId: 'v1',
    versionIds: ['v1'],
    createdAt: '2026-08-24T11:00:00.000Z',
    updatedAt: '2026-08-24T11:00:00.000Z',
    ...overrides,
  }
}

function workDraft(overrides: Partial<ApplicationWorkDraft> = {}): ApplicationWorkDraft {
  return {
    id: 'd1',
    airlineId: 'air-1',
    documentType: 'motivation_statement',
    selectedExperienceIds: ['exp-1'],
    coachingAnswers: {},
    structure: [],
    coreMessage: '초안',
    updatedAt: '2026-08-24T12:00:00.000Z',
    ...overrides,
  }
}

function selfIntroAttempt(overrides: Partial<SelfIntroductionAttempt> = {}): SelfIntroductionAttempt {
  return {
    id: 's1',
    createdAt: '2026-08-24T09:30:00.000Z',
    transcript: 'self intro',
    durationSeconds: 55,
    analysis: {
      timing: { durationSeconds: 55, firstKeyMessageAtSeconds: 5, silenceSeconds: 2, repeatedPhraseCount: 0, assessment: 'well_balanced', feedback: 'good' },
      overall: 'good',
      bestPoint: 'best',
      firstImprovement: 'improve',
      details: [],
      metrics: { wordsPerMinute: 110, speakingPaceLabel: '적절', longSilenceCount: 0, fillerCount: 0, roleConnection: 'connected' },
      guide: { keep: 'keep', reduce: 'reduce', add: 'add' },
      retryRecommendation: 'repeat_current',
    },
    attemptNumber: 1,
    completed: true,
    experienceId: 'exp-1',
    experienceSnapshot: { title: '경험', shortSummary: '요약' },
    challengeType: 'self_intro_60',
    targetSeconds: 60,
    ...overrides,
  }
}

test('builds usage summaries across interview, application, and self introduction sources', () => {
  const summaries = buildExperienceUsageSummary({
    experiences: [experience('exp-1'), experience('exp-2')],
    interviewAttempts: [
      interviewAttempt({ id: 'i1', createdAt: '2026-08-24T10:00:00.000Z', experienceId: 'exp-1' }),
      interviewAttempt({ id: 'i2', createdAt: '2026-08-24T13:00:00.000Z', experienceId: 'exp-1' }),
    ],
    applicationAnswers: [applicationAnswer()],
    applicationWorkDrafts: [workDraft()],
    selfIntroductionAttempts: [selfIntroAttempt()],
  })

  assert.equal(summaries['exp-1'].interview.count, 2)
  assert.equal(summaries['exp-1'].application.count, 2)
  assert.equal(summaries['exp-1'].selfIntroduction.count, 1)
  assert.equal(summaries['exp-1'].totalUsageCount, 5)
  assert.equal(summaries['exp-2'].totalUsageCount, 0)
  assert.equal(summaries['exp-2'].usageBalance, 'unused')
})

test('duplicate usage records from the same source item are counted once', () => {
  const summaries = buildExperienceUsageSummary({
    experiences: [experience('exp-1')],
    interviewAttempts: [
      interviewAttempt({ id: 'i1', createdAt: '2026-08-24T10:00:00.000Z', experienceId: 'exp-1' }),
      interviewAttempt({ id: 'i1', createdAt: '2026-08-24T10:00:00.000Z', experienceId: 'exp-1' }),
    ],
  })

  assert.equal(summaries['exp-1'].interview.count, 1)
  assert.equal(summaries['exp-1'].totalUsageCount, 1)
})

test('deleted experience references are handled safely without crashing', () => {
  const summaries = buildExperienceUsageSummary({
    experiences: [experience('exp-1')],
    interviewAttempts: [interviewAttempt({ id: 'deleted-ref', experienceId: 'deleted-exp' })],
  })

  assert.equal(summaries['deleted-exp'].interview.count, 1)
  assert.equal(summaries['deleted-exp'].totalUsageCount, 1)
  assert.equal(summaries['exp-1'].totalUsageCount, 0)
})

test('usage balance thresholds describe light, balanced, and overused histories', () => {
  const base = (count: number): ExperienceUsageSummary => ({
    experienceId: 'exp-1',
    totalUsageCount: count,
    interview: { count: count >= 1 ? 1 : 0 },
    application: { count: count >= 2 ? 1 : 0 },
    selfIntroduction: { count: count >= 3 ? 1 : 0 },
    recentUsages: [],
    usageBalance: count === 0 ? 'unused' : count <= EXPERIENCE_USAGE_BALANCE_THRESHOLDS.light ? 'light' : count <= EXPERIENCE_USAGE_BALANCE_THRESHOLDS.balanced ? 'balanced' : 'overused',
  })

  assert.equal(describeExperienceUsageBalance(base(0)), '아직 활용하지 않은 경험')
  assert.equal(describeExperienceUsageBalance(base(1)), '활용하기 시작한 경험')
  assert.equal(describeExperienceUsageBalance(base(5)), '여러 준비 영역에서 활용 중')
  assert.equal(describeExperienceUsageBalance(base(6)), '이 경험에 의존하는 편')
})

test('usage concentration highlights the strongest source area', () => {
  const summary: ExperienceUsageSummary = {
    experienceId: 'exp-1',
    totalUsageCount: 3,
    interview: { count: 3, lastUsedAt: '2026-08-25T00:00:00.000Z' },
    application: { count: 0 },
    selfIntroduction: { count: 0 },
    recentUsages: [
      { sourceType: 'interview', sourceId: 'i3', usedAt: '2026-08-25T00:00:00.000Z', label: '질문' },
      { sourceType: 'interview', sourceId: 'i2', usedAt: '2026-08-24T00:00:00.000Z', label: '질문' },
      { sourceType: 'interview', sourceId: 'i1', usedAt: '2026-08-23T00:00:00.000Z', label: '질문' },
    ],
    usageBalance: 'overused',
  }

  assert.equal(describeExperienceUsageConcentration(summary), '면접에서 자주 쓰는 경험')
})

test('recent usage relative date uses intuitive labels', () => {
  assert.equal(formatExperienceUsageRelativeDate('2026-08-25T00:00:00.000Z', new Date('2026-08-25T00:00:30.000Z').getTime()), '방금 전')
  assert.equal(formatExperienceUsageRelativeDate('2026-08-25T00:00:00.000Z', new Date('2026-08-25T02:00:00.000Z').getTime()), '2시간 전')
  assert.equal(formatExperienceUsageRelativeDate('2026-08-20T00:00:00.000Z', new Date('2026-08-25T00:00:00.000Z').getTime()), '5일 전')
})
