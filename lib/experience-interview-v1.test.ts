import assert from 'node:assert/strict'
import test from 'node:test'
import { recommendExperiencesForQuestion } from '@/lib/experience-match-engine'
import { buildExperienceUsageSummary } from '@/lib/experience-usage-history'
import { interviewQuestions, type InterviewAttempt } from '@/lib/interview-practice-data'
import type { CareerExperience } from '@/lib/experience-repository'

function experience(id: string, usageCount = 0): CareerExperience {
  return {
    id,
    title: `경험 ${id}`,
    organization: '카페',
    role: '고객 응대',
    period: '2026',
    category: 'customer_service',
    status: 'interview_ready',
    shortSummary: '고객 응대 경험',
    situation: '고객 응대 경험',
    task: '고객 문제 해결',
    action: '설명',
    result: '만족',
    learning: '배움',
    roleConnection: '직무 연결',
    competencyTags: ['customer_orientation', 'communication'],
    questionTags: [],
    usageCount,
    source: 'manual',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
}

test('experience recommendations stay advisory until a completed interview attempt is saved', () => {
  const items = [experience('exp-1'), experience('exp-2')]
  const question = interviewQuestions.find((item) => item.category === 'customer_situation')!

  const recommendations = recommendExperiencesForQuestion(question, items, {
    competencyTags: ['customer_orientation'],
    airlineName: 'Test Airline',
  })

  assert.equal(recommendations[0]?.experienceId, 'exp-1')
  assert.equal(items[0].usageCount, 0)

  const usageBefore = buildExperienceUsageSummary({ experiences: items })
  assert.equal(usageBefore['exp-1'].totalUsageCount, 0)

  const attempt: InterviewAttempt = {
    id: 'attempt-1',
    questionId: question.id,
    category: question.category,
    createdAt: '2026-08-01T00:00:00.000Z',
    transcript: '고객의 불편을 먼저 듣고 해결했습니다.',
    durationSeconds: 45,
    analysis: {
      overallScore: 82,
      summary: 'ok',
      strengths: ['customer_orientation'],
      improvements: [],
      evaluationScores: [],
      timingAnalysis: {
        durationSeconds: 45,
        firstKeyMessageAtSeconds: 5,
        silenceSeconds: 0,
        repeatedPhraseCount: 0,
        assessment: 'well_balanced',
        feedback: '적절합니다.',
      },
      speakingMetrics: {
        wordsPerMinute: 120,
        speakingPaceLabel: '적절',
        longSilenceCount: 0,
        fillerCount: 0,
        repeatedPhraseCount: 0,
      },
      recommendedRetryMode: 'repeat_current_structure',
      nextQuestionIds: [],
    },
    completed: true,
    experienceId: 'exp-1',
    experienceSnapshot: {
      title: '경험 exp-1',
      category: 'customer_service',
      shortSummary: '고객 응대 경험',
    },
    attemptNumber: 1,
  }

  const usageAfter = buildExperienceUsageSummary({ experiences: items, interviewAttempts: [attempt] })
  assert.equal(usageAfter['exp-1'].totalUsageCount, 1)
  assert.equal(usageAfter['exp-1'].interview.count, 1)
})
