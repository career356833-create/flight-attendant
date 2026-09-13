import type { InterviewQuestion } from './interview-practice-data'
import { evaluateAnswerQuality, type AnswerContentProvenance, type AnswerQualityRubric } from './answer-quality-rubric'
import { understandInterviewAnswer, type AnswerUnderstanding, type PracticeLanguage, type TranscriptQuality } from './speech-understanding-v2'

export type InterviewContentAnalysis = {
  version: 1
  transcriptQuality?: TranscriptQuality
  understanding?: AnswerUnderstanding
  answerSummary: { oneLineSummary: string; keyPoints: string[] }
  structure: { detected: 'star' | 'prep' | 'mixed' | 'unstructured'; score?: number; missingParts: string[]; parts: Array<{ label: string; status: 'strong' | 'present' | 'weak' | 'missing' }> }
  relevance: { status: 'direct' | 'partially_direct' | 'drifting' | 'unclear'; questionFitScore?: number; missingPoints: string[] }
  competencies: Array<{ competency: string; evidence: string[]; strength: 'strong' | 'partial' | 'missing' }>
  answerQuality: { specificity?: number; conciseness?: number; evidenceUse?: number; genericClaims: string[]; evidenceStatements: string[] }
  rubric?: AnswerQualityRubric
  strongPoints: string[]
  improvementPoints: Array<{ priority: 1 | 2 | 3; message: string }>
  sentenceCoaching: Array<{ originalText: string; action: 'keep' | 'strengthen' | 'shorten' | 'clarify'; reason: string; suggestion?: string }>
  improvedAnswerPlan: { targetDurationSeconds: 30 | 60 | 90; opening: string; keyPointOrder: string[]; closing: string }
  followUpPractice: string[]
  suggestions: string[]
}

const sentenceParts = (text: string) => text.split(/(?<=[.!?。])\s+|\n/).map(value => value.trim()).filter(Boolean)
const contains = (text: string, terms: string[]) => terms.some(term => text.toLowerCase().includes(term))

export function detectInterviewStructure(question: InterviewQuestion, transcript: string): InterviewContentAnalysis['structure'] {
  const text = transcript.toLowerCase()
  const map: Array<[string, string[]]> = question.category === 'behavioral_experience'
    ? [['Situation', ['when', 'situation', '당시', '상황']], ['Task', ['task', 'role', '과제', '역할']], ['Action', ['i ', 'action', '해결', '조치', '했습니다']], ['Result', ['result', 'learned', '결과', '배웠']]]
    : question.category === 'introduction_and_motivation'
      ? [['Point', ['because', 'want', '지원', '이유']], ['Reason', ['because', '이유', '강점']], ['Example', ['for example', 'experience', '경험', '예를']], ['Closing', ['therefore', '그래서', '기여']]]
      : [['Situation', ['situation', '상황']], ['Judgment', ['priority', '판단', '안전']], ['Action', ['action', '조치', '했습니다']], ['Communication', ['report', '공유', '보고']]]
  if (!text.trim()) return { detected: 'unstructured', missingParts: map.map(item => item[0]), parts: map.map(item => ({ label: item[0], status: 'missing' })) }
  const parts = map.map(([label, terms]) => ({ label, status: contains(text, terms) ? 'present' as const : 'missing' as const }))
  const missingParts = parts.filter(item => item.status === 'missing').map(item => item.label)
  return { detected: missingParts.length <= 1 ? question.category === 'behavioral_experience' ? 'star' : 'prep' : missingParts.length <= 2 ? 'mixed' : 'unstructured', missingParts, parts }
}

function evidenceForCapability(capability: InterviewQuestion['targetCapabilities'][number], understanding: AnswerUnderstanding) {
  const byName = new Map(understanding.cabinCrewEvidence.map(item => [item.competency, item.evidence]))
  if (capability === 'safety_and_role_judgment') return byName.get('safety') ?? []
  if (capability === 'customer_situation_handling') return [...(byName.get('service') ?? []), ...(byName.get('communication') ?? [])].slice(0, 2)
  if (capability === 'interview_communication') return byName.get('communication') ?? []
  return []
}

export function analyzeInterviewContent(question: InterviewQuestion, transcript: string, durationSeconds = 60, options?: { provenance?: AnswerContentProvenance; publishedAirlineValues?: string[]; language?: PracticeLanguage; transcriptQuality?: TranscriptQuality }): InterviewContentAnalysis {
  const lines = sentenceParts(transcript)
  const structure = detectInterviewStructure(question, transcript)
  const understanding = understandInterviewAnswer({ questionPrompt: question.prompt, questionCategory: question.category, transcript, language: options?.language ?? 'ko', practiceType: 'single_interview' })
  const genericClaims = lines.filter(line => contains(line, ['work hard', 'good service', 'communicate well', '열심히', '친절하게', '소통을 잘']))
  const evidenceStatements = understanding.evidence
  const competencies = question.targetCapabilities.map(competency => {
    const evidence = evidenceForCapability(competency, understanding)
    return { competency, evidence, strength: evidence.length >= 2 ? 'strong' as const : evidence.length ? 'partial' as const : 'missing' as const }
  })
  const target = durationSeconds < 45 ? 30 : durationSeconds > 75 ? 90 : 60
  const rubric = evaluateAnswerQuality({ answer: transcript, provenance: options?.provenance ?? 'typed_answer', context: 'interview', questionCategory: question.category, questionPrompt: question.prompt, publishedAirlineContext: options?.publishedAirlineValues ? { values: options.publishedAirlineValues } : undefined })
  const fallback: string[] = []
  if (understanding.offTopic) fallback.push('질문에 직접 답하는 핵심 문장을 먼저 말해 보세요.')
  if (structure.missingParts.length) fallback.push(`${structure.missingParts[0]}을 한 문장으로 보완해 보세요.`)
  if (genericClaims.length) fallback.push('추상적인 표현 대신 본인이 한 행동을 붙여 설명해 보세요.')
  if (competencies.some(item => item.strength === 'missing')) fallback.push('질문과 연결되는 역량의 직접 근거를 한 가지 더 제시해 보세요.')
  const messages = [...(understanding.offTopic ? fallback : rubric.evaluated ? rubric.improvements : fallback)].filter((message, index, list) => list.indexOf(message) === index).slice(0, 3)
  const improvementPoints = messages.map((message, index) => ({ priority: (index + 1) as 1 | 2 | 3, message }))
  const strongPoints = rubric.evaluated && rubric.strengths.length ? rubric.strengths : evidenceStatements.length ? ['답변에서 직접 확인되는 근거 문장이 있습니다.'] : []
  const relevance = understanding.questionAddressed === 'addressed' ? 'direct' : understanding.questionAddressed === 'partially_addressed' ? 'partially_direct' : understanding.questionAddressed === 'not_addressed' ? 'drifting' : 'unclear'
  return {
    version: 1,
    transcriptQuality: options?.transcriptQuality,
    understanding,
    answerSummary: { oneLineSummary: understanding.mainPoint ?? '답변 내용이 아직 충분하지 않습니다.', keyPoints: lines.slice(0, 4) },
    structure,
    relevance: { status: relevance, missingPoints: understanding.missingElements },
    competencies,
    answerQuality: { genericClaims, evidenceStatements },
    rubric,
    strongPoints,
    improvementPoints,
    sentenceCoaching: lines.slice(0, 4).map(line => genericClaims.includes(line) ? { originalText: line, action: 'clarify' as const, reason: '추상적인 표현이라 실제 행동이 잘 보이지 않습니다.', suggestion: '내가 한 행동을 한 문장으로 덧붙여 보세요.' } : { originalText: line, action: 'keep' as const, reason: '사용자가 말한 내용을 바꾸지 않고 유지합니다.' }),
    improvedAnswerPlan: { targetDurationSeconds: target, opening: '질문에 대한 결론을 먼저 한 문장으로 말하세요.', keyPointOrder: structure.parts.map(item => item.label), closing: '확인 가능한 결과 또는 배운 점으로 마무리하세요.' },
    followUpPractice: improvementPoints.map(item => item.message),
    suggestions: improvementPoints.map(item => item.message),
  }
}
