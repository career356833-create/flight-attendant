import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSelfIntroductionChallenge, analyzeSelfIntroductionDuration, analyzeSelfIntroductionStructure, challengeTypeFor, compareSelfIntroductionRetake, getSelfIntroductionChallengeGuide } from './self-introduction-challenge'

test('creates 30, 60 and 90 second challenge metadata', () => {
  assert.equal(challengeTypeFor(30), 'self_intro_30')
  assert.equal(challengeTypeFor(60), 'self_intro_60')
  assert.equal(challengeTypeFor(90), 'self_intro_90')
  assert.equal(getSelfIntroductionChallengeGuide(30).length, 3)
  assert.equal(getSelfIntroductionChallengeGuide(60).length, 3)
  assert.equal(getSelfIntroductionChallengeGuide(90).length, 4)
})

test('timing analysis distinguishes short, close and long answers', () => {
  assert.equal(analyzeSelfIntroductionDuration(60, 40).status, 'short')
  assert.equal(analyzeSelfIntroductionDuration(60, 58).status, 'close')
  assert.equal(analyzeSelfIntroductionDuration(60, 80).status, 'long')
})

test('structure analysis never treats a missing part as failure', () => {
  const result = analyzeSelfIntroductionStructure('저의 강점은 고객 문제를 해결한 경험입니다.')
  assert.notEqual(result.strength, 'missing')
  assert.notEqual(result.experience, 'missing')
  assert.equal(result.motivation, 'missing')
})

test('challenge coaching uses timing and structure without a total score', () => {
  const result = analyzeSelfIntroductionChallenge(30, 18, '저의 강점은 침착함입니다.')
  assert.equal(result.timing.status, 'short')
  assert.ok(result.improvements.length > 0)
  assert.equal('score' in result, false)
})

test('retake compares timing, fillers, pauses and structure', () => {
  const previousChallenge = analyzeSelfIntroductionChallenge(60, 48, '저의 강점은 친절입니다.')
  const currentChallenge = analyzeSelfIntroductionChallenge(60, 58, '저의 강점은 고객 문제를 해결한 경험이며 객실승무원으로 기여하겠습니다.')
  const result = compareSelfIntroductionRetake(
    { durationSeconds: 48, transcriptIntegrity: { mode: 'actual_audio', isActualTranscription: true }, analysis: { metrics: { fillerCount: 3, longSilenceCount: 2 }, challenge: previousChallenge } },
    { durationSeconds: 58, transcriptIntegrity: { mode: 'actual_audio', isActualTranscription: true }, analysis: { metrics: { fillerCount: 1, longSilenceCount: 0 }, challenge: currentChallenge } },
  )
  assert.equal(result.timing, '48초 → 58초')
  assert.equal(result.filler, '3회 → 1회')
  assert.equal(result.pause, '2회 → 0회')
})

test('legacy retake never reports transcript-derived improvement', () => {
  const challenge = analyzeSelfIntroductionChallenge(60, 50, '기존 기록')
  const result = compareSelfIntroductionRetake(
    { durationSeconds: 48, analysis: { metrics: { fillerCount: 5, longSilenceCount: 3 }, challenge } },
    { durationSeconds: 50, analysis: { metrics: { fillerCount: 0, longSilenceCount: 0 }, challenge } },
  )
  assert.equal(result.filler, '측정 불가')
  assert.equal(result.pause, '측정 불가')
  assert.equal(result.structure, '측정 불가')
})
