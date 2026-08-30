import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateAnswerQuality, type AnswerQualityDimension } from './answer-quality-rubric'
import { analyzeInterviewContent } from './interview-content-analysis'
import { decideAiInterviewerFollowUp } from './ai-interviewer'
import type { InterviewAttempt, InterviewQuestion } from './interview-practice-data'

const status = (result: ReturnType<typeof evaluateAnswerQuality>, dimension: AnswerQualityDimension) => result.findings.find(item => item.dimension === dimension)?.status
const evaluate = (answer: string, category: InterviewQuestion['category'] = 'behavioral_experience') => evaluateAnswerQuality({ answer, provenance: 'typed_answer', context: 'interview', questionCategory: category, questionPrompt: 'Tell me about a time you handled a customer problem.' })

test('behavioral answer recognizes situation, personal action, result and evidence', () => {
  const result = evaluate('고객이 예약 문제로 화가 난 상황에서 제가 내용을 확인했습니다. 제가 대안을 설명하고 담당자와 조정했습니다. 결과적으로 문제가 해결되었고 고객의 감사 피드백을 받았습니다.')
  assert.equal(status(result, 'action'), 'strong')
  assert.equal(status(result, 'result'), 'adequate')
  assert.equal(status(result, 'evidence'), 'strong')
})

test('generic behavioral answer needs specificity and evidence', () => {
  const result = evaluate('저는 항상 열심히 하겠습니다. 최선을 다하겠습니다.')
  assert.equal(status(result, 'specificity'), 'needs_improvement')
  assert.equal(status(result, 'evidence'), 'needs_improvement')
})

test('behavioral answer without personal action emits missing_action', () => {
  const result = evaluate('당시 고객 불만이 있었고 팀 전체가 문제를 처리했습니다.')
  assert.equal(status(result, 'action'), 'needs_improvement')
  assert.ok(result.followUpCandidates.includes('missing_action'))
})

test('behavioral answer without result emits missing_result', () => {
  const result = evaluate('고객이 불편한 상황에서 제가 요청을 확인하고 대안을 설명했습니다.')
  assert.equal(status(result, 'result'), 'needs_improvement')
  assert.ok(result.followUpCandidates.includes('missing_result'))
})

test('safety answer focused only on service requests safety clarification', () => {
  const result = evaluateAnswerQuality({ answer: '저는 고객 만족을 위해 친절하게 설명하겠습니다.', provenance: 'typed_answer', context: 'interview', questionCategory: 'safety_and_role_judgment' })
  assert.equal(status(result, 'safetyJudgment'), 'needs_improvement')
  assert.ok(result.followUpCandidates.includes('safety_priority_unclear'))
})

test('safety-first escalation is recognized without inventing an SOP', () => {
  const result = evaluateAnswerQuality({ answer: '안전을 우선하고 위험을 차단한 뒤 상황을 확인했습니다. 제가 즉시 상급자와 승무원에게 보고하고 승객을 보호했습니다.', provenance: 'typed_answer', context: 'interview', questionCategory: 'safety_and_role_judgment' })
  assert.equal(status(result, 'safetyJudgment'), 'strong')
  assert.ok(result.findings.find(item => item.dimension === 'safetyJudgment')?.evidence[0].includes('안전'))
})

test('motivation does not require a STAR result', () => {
  const result = evaluateAnswerQuality({ answer: '저는 고객 경험과 안전을 함께 책임지는 객실승무원 역할에 지원하고 싶습니다.', provenance: 'typed_answer', context: 'interview', questionCategory: 'introduction_and_motivation' })
  assert.equal(status(result, 'result'), 'not_applicable')
  assert.ok(!result.followUpCandidates.includes('missing_result'))
})

test('airline fit is not applicable without published context', () => {
  const result = evaluateAnswerQuality({ answer: '고객 경험에 기여하고 싶습니다.', provenance: 'typed_answer', context: 'interview', questionCategory: 'introduction_and_motivation' })
  assert.equal(status(result, 'airlineFit'), 'not_applicable')
})

test('airline fit uses only supplied published values', () => {
  const result = evaluateAnswerQuality({ answer: '저의 고객 서비스 경험을 service excellence에 연결하겠습니다.', provenance: 'typed_answer', context: 'application', publishedAirlineContext: { values: ['service excellence'] } })
  assert.equal(status(result, 'airlineFit'), 'adequate')
  assert.deepEqual(result.findings.find(item => item.dimension === 'airlineFit')?.evidence, ['저의 고객 서비스 경험을 service excellence에 연결하겠습니다.'])
})

test('mock transcript is blocked', () => assert.equal(evaluateAnswerQuality({ answer: '제가 해결했습니다.', provenance: 'mock', context: 'interview' }).blockedReason, 'untrusted_transcript'))
test('fallback transcript is blocked', () => assert.equal(evaluateAnswerQuality({ answer: '제가 해결했습니다.', provenance: 'fallback', context: 'interview' }).evaluated, false))
test('actual audio transcript is evaluated', () => assert.equal(evaluateAnswerQuality({ answer: '제가 고객 요청을 확인했습니다.', provenance: 'actual_audio', context: 'interview' }).evaluated, true))
test('direct typed answer is evaluated', () => assert.equal(evaluateAnswerQuality({ answer: '제가 고객 요청을 확인했습니다.', provenance: 'typed_answer', context: 'application' }).evaluated, true))

test('generic claim remains evidence weak', () => assert.equal(status(evaluate('저는 책임감이 있고 최선을 다하겠습니다.'), 'evidence'), 'needs_improvement'))
test('concrete experience improves evidence', () => assert.equal(status(evaluate('고객이 불편한 상황에서 제가 주문을 확인하고 대안을 설명했습니다.'), 'evidence'), 'strong'))

test('AI interviewer consumes rubric missing_action reason', () => {
  const question: InterviewQuestion = { id: 'q', category: 'behavioral_experience', prompt: 'Tell me about a time.', shortTitle: 'q', difficulty: 'beginner', targetCapabilities: ['interview_communication'], evaluationRubric: { keys: [], guidance: '' }, localeKey: 'q' }
  const contentAnalysis = analyzeInterviewContent(question, '당시 고객 불만이 있었고 팀 전체가 처리했습니다.')
  const attempt = { id: 'a', questionId: 'q', category: question.category, transcript: '당시 고객 불만이 있었고 팀 전체가 처리했습니다.', durationSeconds: 30, createdAt: '', attemptNumber: 1, completed: true, analysis: {} as never, contentAnalysis } as InterviewAttempt
  const decision = decideAiInterviewerFollowUp({ question, attempt, session: { id: 's', mode: 'ai_interviewer', questionIds: ['q', '2', '3', '4', '5'], attemptIds: [], currentQuestionIndex: 0, status: 'in_progress', startedAt: '' }, priorFollowUps: [] })
  assert.equal(decision.reason, 'missing_action')
})

test('self introduction does not require action or result', () => {
  const result = evaluateAnswerQuality({ answer: '저의 강점은 침착한 고객 응대이며 객실승무원으로 기여하고 싶습니다.', provenance: 'typed_answer', context: 'self_introduction' })
  assert.equal(status(result, 'action'), 'not_applicable')
  assert.equal(status(result, 'result'), 'not_applicable')
})

test('application answer does not apply safety by default', () => {
  const result = evaluateAnswerQuality({ answer: '고객 요청을 확인하고 경험을 연결했습니다.', provenance: 'typed_answer', context: 'application' })
  assert.equal(status(result, 'safetyJudgment'), 'not_applicable')
})

test('feedback never invents numeric results or companies', () => {
  const result = evaluate('제가 고객 요청을 확인했습니다.')
  const output = JSON.stringify(result)
  assert.doesNotMatch(output, /20%|매출|Emirates|Qatar/)
  assert.ok(result.improvements.some(item => item.includes('실제 결과')))
})

test('rubric exposes no overall score or hiring outcome', () => {
  const result = evaluate('제가 고객 요청을 확인했고 결과적으로 문제가 해결되었습니다.') as ReturnType<typeof evaluateAnswerQuality> & Record<string, unknown>
  assert.equal('score' in result, false)
  assert.equal('overallScore' in result, false)
  assert.doesNotMatch(JSON.stringify(result), /합격|채용 확률|native-likeness|accent score/i)
})
