import assert from 'node:assert/strict'
import test from 'node:test'
import { buildHomeRealState, calculateLearningStreak } from './home-real-state'
import type { LearningActivity } from './learning-analytics-service'
import { calculateApplicationDday } from './application-tracker'
import { readFileSync } from 'node:fs'

const activity = (occurredAt: string, sourceEntityType: LearningActivity['sourceEntityType'] = 'interview_attempt'): LearningActivity => ({ id: occurredAt, type: 'interview_attempt_completed', occurredAt, title: '면접 답변', sourceEntityType, relatedCapabilityKeys: ['interview_communication'] })
const today = new Date(2026, 8, 2, 12)

test('no learning data exposes no fake streak, readiness, capability, deadline, or coaching history', () => {
  const state = buildHomeRealState({ activities: [], weeklyPracticeCount: 0, today })
  assert.equal(state.streakDays, undefined)
  assert.equal(state.weeklyPracticeCount, 0)
  assert.equal(state.readiness, undefined)
  assert.equal(state.skills, undefined)
  assert.equal(state.upcoming, undefined)
  assert.equal(state.recentCoaching, undefined)
})

test('real consecutive activity dates produce the actual streak', () => {
  assert.equal(calculateLearningStreak([activity('2026-09-02T01:00:00Z'), activity('2026-09-01T01:00:00Z'), activity('2026-08-31T01:00:00Z')], today), 3)
})

test('a stale activity is not presented as an active streak', () => {
  assert.equal(calculateLearningStreak([activity('2026-08-30T01:00:00Z')], today), undefined)
})

test('weekly count is derived without inventing a target denominator', () => {
  const rows = [activity('2026-09-02T01:00:00Z'), activity('2026-09-01T01:00:00Z')]
  assert.equal(buildHomeRealState({ activities: rows, weeklyPracticeCount: rows.length, today }).weeklyPracticeCount, 2)
})

test('real tracker deadline uses the supplied shared D-day result', () => {
  const state = buildHomeRealState({ activities: [], weeklyPracticeCount: 0, today, upcoming: { application: { airlineNameSnapshot: 'Example Air' }, importantDate: { kind: 'interview', date: '2026-09-05', days: 3, dday: 'D-3' } } })
  assert.deepEqual(state.upcoming, { title: 'Example Air 면접', dueLabel: 'D-3' })
})

test('diagnosis is required before readiness and skills are exposed', () => {
  const state = buildHomeRealState({ activities: [], weeklyPracticeCount: 0, today, diagnosis: { overallReadiness: 61, skillScores: { resume: 62, interview: 63, english: 54, company: 58, situation: 67 } } as never })
  assert.equal(state.readiness, 61)
  assert.equal(state.skills?.find(item => item.id === 'english')?.value, 54)
})

test('coaching provenance uses the real activity date and source', () => {
  const rows = [activity('2026-09-01T01:00:00Z')]
  assert.deepEqual(buildHomeRealState({ activities: rows, weeklyPracticeCount: rows.length, today, coachMessage: '실제 분석 기반 피드백' }).recentCoaching, { message: '실제 분석 기반 피드백', timeLabel: '어제 · 면접 연습' })
})

test('home real state has no Azure dependency', () => {
  assert.equal(JSON.stringify(buildHomeRealState({ activities: [], weeklyPracticeCount: 0, today })).toLowerCase().includes('azure'), false)
})

test('multiple activities on one day count as one streak day', () => {
  assert.equal(calculateLearningStreak([activity('2026-09-02T01:00:00Z'), activity('2026-09-02T02:00:00Z')], today), 1)
})

test('a gap stops the consecutive streak', () => {
  assert.equal(calculateLearningStreak([activity('2026-09-02T01:00:00Z'), activity('2026-08-31T01:00:00Z')], today), 1)
})

test('actual zero weekly activities remains distinct from an invented target', () => {
  const state = buildHomeRealState({ activities: [activity('2026-08-20T01:00:00Z')], weeklyPracticeCount: 0, today })
  assert.equal(state.weeklyPracticeCount, 0)
  assert.equal('weeklyTarget' in state, false)
})

test('home weekly count can use the exact weekly report activity set', () => {
  const weekly = [activity('2026-09-01T01:00:00Z'), activity('2026-09-02T01:00:00Z')]
  const state = buildHomeRealState({ activities: weekly, weeklyPracticeCount: weekly.length, today })
  assert.equal(state.weeklyPracticeCount, weekly.length)
})

test('tracker and home share the same calculated D-day value', () => {
  const dday = calculateApplicationDday('2026-09-05', today)
  const state = buildHomeRealState({ activities: [], weeklyPracticeCount: 0, today, upcoming: { application: { airlineNameSnapshot: 'Example Air' }, importantDate: { kind: 'deadline', date: '2026-09-05', days: 3, dday } } })
  assert.equal(state.upcoming?.dueLabel, dday)
})

test('learning data alone does not fabricate readiness', () => {
  const state = buildHomeRealState({ activities: [activity('2026-09-02T01:00:00Z')], weeklyPracticeCount: 0, today })
  assert.equal(state.readiness, undefined)
  assert.equal(state.skills, undefined)
})

test('a real learning activity enables learning-data state', () => {
  assert.equal(buildHomeRealState({ activities: [activity('2026-09-02T01:00:00Z')], weeklyPracticeCount: 0, today }).hasLearningData, true)
})

test('no adaptive evidence does not fabricate weakness coaching', () => {
  const state = buildHomeRealState({ activities: [], weeklyPracticeCount: 0, today, coachMessage: 'should not appear without provenance' })
  assert.equal(state.recentCoaching, undefined)
})

test('today coaching provenance is labelled from the actual date', () => {
  const rows = [activity('2026-09-02T01:00:00Z', 'self_introduction')]
  assert.equal(buildHomeRealState({ activities: rows, weeklyPracticeCount: rows.length, today, coachMessage: '기록 반영' }).recentCoaching?.timeLabel, '오늘 · 자기소개 연습')
})

test('production Home components do not import mock-data', () => {
  const files = ['components/home-dashboard.tsx', 'components/secondary-stats.tsx', 'components/coach-feedback-card.tsx', 'components/app-header.tsx', 'components/journey-card.tsx', 'components/daily-routine-list.tsx', 'components/routine-task-card.tsx', 'components/skill-progress-list.tsx']
  for (const file of files) assert.equal(readFileSync(file, 'utf8').includes("@/lib/mock-data"), false, file)
})

test('production Home components contain none of the known fabricated values', () => {
  const source = ['components/home-dashboard.tsx', 'components/secondary-stats.tsx', 'components/coach-feedback-card.tsx'].map(file => readFileSync(file, 'utf8')).join('\n')
  for (const value of ['12일', '9/15', 'D-4', '어제 · 상황 대처 훈련']) assert.equal(source.includes(value), false, value)
})
