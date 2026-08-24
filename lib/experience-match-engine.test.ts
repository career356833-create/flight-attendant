import assert from 'node:assert/strict'
import test from 'node:test'
import { recommendExperiencesForApplication, recommendExperiencesForQuestion, recommendExperiencesForSelfIntroduction, getExperienceCoverage } from './experience-match-engine'
import type { ApplicationPrompt } from './application-answer-repository'
import { interviewQuestionById, type InterviewQuestion } from './interview-practice-data'
import type { CareerExperience } from './experience-repository'

function experience(
  id: string,
  category: CareerExperience['category'],
  competencyTags: CareerExperience['competencyTags'],
  overrides: Partial<CareerExperience> = {},
): CareerExperience {
  const now = '2026-08-24T00:00:00.000Z'
  return {
    id,
    title: overrides.title ?? id,
    category,
    organization: overrides.organization,
    role: overrides.role,
    period: overrides.period,
    situation: overrides.situation ?? `${id} 상황`,
    task: overrides.task ?? `${id} 과제`,
    action: overrides.action ?? `${id} 행동`,
    result: overrides.result ?? `${id} 결과`,
    learning: overrides.learning ?? `${id} 배움`,
    roleConnection: overrides.roleConnection ?? `${id} 직무 연결`,
    shortSummary: overrides.shortSummary ?? `${id} 요약`,
    competencyTags,
    questionTags: overrides.questionTags ?? [],
    status: overrides.status ?? 'interview_ready',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    usageCount: overrides.usageCount ?? 0,
    lastUsedAt: overrides.lastUsedAt,
    source: overrides.source ?? 'manual',
    originalTranscript: overrides.originalTranscript,
    sourceExperienceId: overrides.sourceExperienceId,
  }
}

function question(id: string): InterviewQuestion {
  const base = interviewQuestionById.get(id)
  if (!base) throw new Error(`missing question ${id}`)
  return base
}

test('customer service question recommends matching experience', () => {
  const recommendations = recommendExperiencesForQuestion(
    question('cs1'),
    [
      experience('service-1', 'customer_service', ['customer_orientation', 'empathy']),
      experience('team-1', 'teamwork', ['teamwork', 'communication']),
    ],
  )
  assert.equal(recommendations[0]?.experienceId, 'service-1')
  assert.ok(recommendations[0]?.matchedCompetencies.includes('customer_orientation'))
})

test('teamwork question prefers teamwork experience', () => {
  const recommendations = recommendExperiencesForQuestion(
    question('be2'),
    [
      experience('team-1', 'teamwork', ['teamwork', 'communication']),
      experience('service-1', 'customer_service', ['customer_orientation', 'empathy']),
    ],
  )
  assert.equal(recommendations[0]?.experienceId, 'team-1')
})

test('no matching experience returns an empty recommendation list', () => {
  const recommendations = recommendExperiencesForQuestion(
    question('sj1'),
    [experience('service-1', 'customer_service', ['customer_orientation'])],
  )
  assert.equal(recommendations.length, 0)
})

test('overused experience is ranked below a fresh fit', () => {
  const recent = experience('recent', 'customer_service', ['customer_orientation'], {
    usageCount: 8,
    lastUsedAt: '2026-08-20T00:00:00.000Z',
  })
  const fresh = experience('fresh', 'customer_service', ['customer_orientation'], {
    usageCount: 0,
  })
  const recommendations = recommendExperiencesForQuestion(question('cs2'), [recent, fresh])
  assert.equal(recommendations[0]?.experienceId, 'fresh')
})

test('application recommendations use prompt structure and published airline context', () => {
  const prompt: ApplicationPrompt = {
    id: 'app-1',
    airlineId: 'published_airline',
    documentType: 'motivation_statement',
    prompt: '고객 서비스 경험을 작성하세요.',
    locale: 'ko-KR',
    sourceType: 'custom_user_input',
    sourceIds: [],
    recommendedStructure: 'motivation',
    targetCapabilities: ['customer_situation_handling', 'interview_communication'],
    status: 'practice',
  }
  const recommendations = recommendExperiencesForApplication(
    prompt,
    [
      experience('service-1', 'customer_service', ['customer_orientation', 'empathy']),
      experience('safety-1', 'safety_judgment', ['safety_awareness', 'responsibility']),
    ],
    { competencyTags: ['customer_orientation'], airlineName: 'Published Airline' },
  )
  assert.equal(recommendations[0]?.experienceId, 'service-1')
  assert.ok(recommendations[0]?.reasons[0]?.includes('고객지향'))
})

test('self introduction recommendations surface strengths and avoid scores', () => {
  const recommendations = recommendExperiencesForSelfIntroduction(
    [
      experience('service-1', 'customer_service', ['customer_orientation', 'communication']),
      experience('team-1', 'teamwork', ['teamwork', 'communication']),
    ],
  )
  assert.equal(recommendations[0]?.recommendedFor.includes('self_introduction'), true)
  assert.equal('score' in recommendations[0]!, false)
})

test('coverage analysis reports covered and missing competencies', () => {
  const coverage = getExperienceCoverage([
    experience('service-1', 'customer_service', ['customer_orientation', 'communication']),
    experience('team-1', 'teamwork', ['teamwork', 'communication']),
    experience('safety-1', 'safety_judgment', ['safety_awareness']),
  ])
  assert.ok(coverage.coveredAreas.some((item) => item.competency === 'communication'))
  assert.ok(coverage.strongAreas.some((item) => item.competency === 'communication'))
  assert.ok(coverage.missingAreas.includes('leadership'))
})
