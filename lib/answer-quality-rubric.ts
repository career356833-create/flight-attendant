import type { FollowUpReason } from './ai-interviewer'
import type { InterviewCategory } from './interview-practice-data'

export type AnswerQualityDimension =
  | 'relevance'
  | 'specificity'
  | 'action'
  | 'result'
  | 'evidence'
  | 'structure'
  | 'safetyJudgment'
  | 'airlineFit'

export type AnswerQualityStatus =
  | 'strong'
  | 'adequate'
  | 'needs_improvement'
  | 'not_applicable'
  | 'insufficient_evidence'

export type AnswerQualityConfidence = 'low' | 'medium' | 'high'
export type AnswerContentProvenance = 'actual_audio' | 'typed_answer' | 'mock' | 'fallback'
export type AnswerQualityContext = 'interview' | 'self_introduction' | 'application'

export type AnswerQualityFinding = {
  dimension: AnswerQualityDimension
  status: AnswerQualityStatus
  evidence: string[]
  feedback: string
  confidence: AnswerQualityConfidence
}

export type AnswerQualityRubric = {
  version: 1
  evaluated: boolean
  blockedReason?: 'untrusted_transcript' | 'empty_answer'
  context: AnswerQualityContext
  findings: AnswerQualityFinding[]
  strengths: string[]
  improvements: string[]
  followUpCandidates: FollowUpReason[]
}

export type AnswerQualityInput = {
  answer: string
  provenance: AnswerContentProvenance
  context: AnswerQualityContext
  questionCategory?: InterviewCategory
  questionPrompt?: string
  publishedAirlineContext?: { values: string[] }
}

const sentences = (value: string) => value.split(/(?<=[.!?。]|다\.|요\.)\s+|\n+/).map(item => item.trim()).filter(Boolean)
const includesAny = (value: string, patterns: RegExp[]) => patterns.some(pattern => pattern.test(value))
const fragment = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 180)
const firstMatching = (rows: string[], patterns: RegExp[]) => rows.find(row => includesAny(row, patterns))
const finding = (dimension: AnswerQualityDimension, status: AnswerQualityStatus, feedback: string, evidence: string[] = [], confidence: AnswerQualityConfidence = 'medium'): AnswerQualityFinding => ({ dimension, status, feedback, evidence: evidence.map(fragment).slice(0, 2), confidence })

const genericPatterns = [/열심히 하겠습니다/i, /최선을 다하겠습니다/i, /친절하게 하겠습니다/i, /소통을 잘/i, /work hard/i, /do my best/i, /good service/i, /communicate well/i]
const situationPatterns = [/당시|상황|때였|근무 중|프로젝트|고객이|승객이/i, /when |while |situation|customer|passenger|project/i]
const actionPatterns = [/직접|확인했|설명했|조정했|제안했|보고했|해결했|도왔|대응했|조치했|협력했/i, /\bi\s+(checked|explained|coordinated|suggested|reported|resolved|helped|handled|acted|asked|worked)/i]
const resultPatterns = [/결과|그 후|개선|해결되|달성|감사|피드백|배웠|깨달|줄었|높아졌/i, /result|afterward|improved|resolved|achieved|feedback|learned|reduced|increased/i]
const safetyPriorityPatterns = [/안전.*우선|우선.*안전|절차|규정|보고|상급자|승무원.*공유|위험.*차단|승객.*보호/i, /safety first|prioriti[sz]e safety|procedure|regulation|report|escalat|crew coordination|protect.*passenger/i]
const airlineRolePatterns = [/항공사|객실승무원|승객|고객 경험|서비스|안전/i, /airline|cabin crew|flight attendant|passenger|customer experience|service|safety/i]

function applicability(input: AnswerQualityInput): Set<AnswerQualityDimension> {
  if (input.context === 'self_introduction') return new Set(['relevance', 'specificity', 'evidence', 'structure'])
  if (input.context === 'application') return new Set(['relevance', 'specificity', 'evidence', 'structure', 'airlineFit'])
  if (input.questionCategory === 'introduction_and_motivation') return new Set(['relevance', 'specificity', 'evidence', 'structure', 'airlineFit'])
  if (input.questionCategory === 'safety_and_role_judgment') return new Set(['relevance', 'action', 'evidence', 'structure', 'safetyJudgment'])
  return new Set(['relevance', 'specificity', 'action', 'result', 'evidence', 'structure'])
}

export function canEvaluateAnswerQuality(input: Pick<AnswerQualityInput, 'answer' | 'provenance'>): boolean {
  return Boolean(input.answer.trim()) && (input.provenance === 'actual_audio' || input.provenance === 'typed_answer')
}

export function evaluateAnswerQuality(input: AnswerQualityInput): AnswerQualityRubric {
  const trusted = input.provenance === 'actual_audio' || input.provenance === 'typed_answer'
  if (!trusted || !input.answer.trim()) return { version: 1, evaluated: false, blockedReason: trusted ? 'empty_answer' : 'untrusted_transcript', context: input.context, findings: [], strengths: [], improvements: [], followUpCandidates: [] }

  const answer = input.answer.trim()
  const rows = sentences(answer)
  const applicable = applicability(input)
  const found: AnswerQualityFinding[] = []
  const action = firstMatching(rows, actionPatterns)
  const result = firstMatching(rows, resultPatterns)
  const situation = firstMatching(rows, situationPatterns)
  const generic = firstMatching(rows, genericPatterns)
  const safety = firstMatching(rows, safetyPriorityPatterns)
  const role = firstMatching(rows, airlineRolePatterns)
  const concreteCount = [situation, action, result].filter(Boolean).length
  const add = (dimension: AnswerQualityDimension, value: AnswerQualityFinding) => found.push(applicable.has(dimension) ? value : finding(dimension, 'not_applicable', '현재 답변 유형에는 필수 평가 차원이 아닙니다.', [], 'high'))

  const promptTerms = (input.questionPrompt?.toLowerCase().match(/[a-z]{4,}|[가-힣]{2,}/g) ?? []).filter(term => !['tell', 'about', 'time', 'what', 'when', '어떻게', '대해', '말씀'].includes(term))
  const overlap = promptTerms.some(term => answer.toLowerCase().includes(term))
  add('relevance', answer.length < 15
    ? finding('relevance', 'insufficient_evidence', '질문의 핵심에 답했는지 판단할 내용이 부족합니다.', rows.slice(0, 1), 'high')
    : finding('relevance', overlap || role || situation ? 'adequate' : 'needs_improvement', overlap || role || situation ? '답변이 질문 또는 역할 맥락과 연결됩니다.' : '질문의 핵심 주제를 첫 문장에서 더 직접적으로 밝혀 보세요.', rows.slice(0, 1), overlap ? 'high' : 'low'))

  add('specificity', generic && concreteCount === 0
    ? finding('specificity', 'needs_improvement', '추상적인 다짐 대신 실제 상황·대상·과정을 한 가지 제시해 보세요.', [generic], 'high')
    : concreteCount >= 2
      ? finding('specificity', 'strong', '실제 상황과 행동을 확인할 수 있습니다.', [situation, action].filter((value): value is string => Boolean(value)), 'high')
      : finding('specificity', concreteCount === 1 ? 'adequate' : 'insufficient_evidence', concreteCount === 1 ? '구체적인 신호가 있으나 과정이 더 필요합니다.' : '구체성을 판단할 실제 상황이나 과정이 부족합니다.', [situation ?? action ?? ''].filter(Boolean), 'medium'))

  add('action', action
    ? finding('action', 'strong', '본인이 직접 수행한 행동이 드러납니다.', [action], 'high')
    : finding('action', 'needs_improvement', '본인이 직접 한 행동을 동사 중심으로 한 문장 추가해 보세요.', [], 'high'))

  add('result', result
    ? finding('result', 'adequate', '행동 이후의 결과·변화·배움을 확인할 수 있습니다.', [result], 'high')
    : finding('result', 'needs_improvement', '가능하다면 실제 결과나 배운 점을 한 문장 추가해 보세요.', [], 'high'))

  add('evidence', action || situation || result
    ? finding('evidence', concreteCount >= 2 ? 'strong' : 'adequate', '주장을 뒷받침하는 실제 답변 근거가 있습니다.', [action, situation, result].filter((value): value is string => Boolean(value)), 'high')
    : finding('evidence', generic ? 'needs_improvement' : 'insufficient_evidence', generic ? '일반적인 주장만 있어 이를 뒷받침할 사례가 필요합니다.' : '판단을 뒷받침할 구체적인 근거가 부족합니다.', generic ? [generic] : [], 'high'))

  const structureSignals = input.questionCategory === 'introduction_and_motivation' || input.context !== 'interview'
    ? [firstMatching(rows, [/왜냐하면|이유|예를 들어|따라서|기여/i, /because|for example|therefore|contribute/i]), role]
    : input.questionCategory === 'safety_and_role_judgment' ? [safety, action] : [situation, action, result]
  const structureCount = structureSignals.filter(Boolean).length
  add('structure', finding('structure', structureCount >= 2 ? 'adequate' : rows.length >= 2 ? 'adequate' : 'needs_improvement', structureCount >= 2 || rows.length >= 2 ? '답변 흐름을 따라가기 위한 구조 신호가 있습니다.' : '결론과 근거를 구분해 전달하면 이해하기 쉬워집니다.', rows.slice(0, 2), 'medium'))

  add('safetyJudgment', safety
    ? finding('safetyJudgment', includesAny(answer, [/보고|상급자|공유|협력|절차/i, /report|escalat|crew|procedure/i]) ? 'strong' : 'adequate', '안전 우선 또는 절차·보고 판단이 드러납니다.', [safety], 'high')
    : finding('safetyJudgment', 'needs_improvement', '서비스보다 안전을 우선하고 필요한 보고·협업 절차를 설명해 보세요.', [], 'high'))

  const publishedValues = input.publishedAirlineContext?.values.filter(Boolean) ?? []
  const matchedValue = publishedValues.find(value => answer.toLowerCase().includes(value.toLowerCase()))
  add('airlineFit', !publishedValues.length
    ? finding('airlineFit', 'not_applicable', '검수·게시된 항공사 문맥이 없어 평가하지 않습니다.', [], 'high')
    : matchedValue
      ? finding('airlineFit', 'adequate', '게시된 항공사 문맥과 답변의 연결이 확인됩니다.', [firstMatching(rows, [new RegExp(matchedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')]) ?? matchedValue], 'medium')
      : finding('airlineFit', 'insufficient_evidence', '게시된 항공사 문맥과의 직접 연결을 답변에서 확인하기 어렵습니다.', [], 'medium'))

  const active = found.filter(item => item.status !== 'not_applicable')
  const strengths = active.filter(item => item.status === 'strong' || item.status === 'adequate').filter(item => item.evidence.length).slice(0, 3).map(item => item.feedback)
  const order: AnswerQualityDimension[] = ['relevance', 'safetyJudgment', 'action', 'result', 'evidence', 'structure', 'specificity', 'airlineFit']
  const improvements = [...active].filter(item => item.status === 'needs_improvement' || item.status === 'insufficient_evidence').sort((a, b) => order.indexOf(a.dimension) - order.indexOf(b.dimension)).slice(0, 3).map(item => item.feedback)
  const followUpCandidates: FollowUpReason[] = []
  const status = (dimension: AnswerQualityDimension) => found.find(item => item.dimension === dimension)?.status
  if (status('safetyJudgment') === 'needs_improvement') followUpCandidates.push('safety_priority_unclear')
  if (status('action') === 'needs_improvement') followUpCandidates.push('missing_action')
  if (status('result') === 'needs_improvement') followUpCandidates.push('missing_result')
  if (status('evidence') === 'needs_improvement' || status('evidence') === 'insufficient_evidence') followUpCandidates.push(generic ? 'generic_claim' : 'weak_evidence')
  if (status('relevance') === 'needs_improvement' || status('relevance') === 'insufficient_evidence') followUpCandidates.push('answer_too_vague')
  if (status('airlineFit') === 'insufficient_evidence') followUpCandidates.push('weak_airline_connection')

  return { version: 1, evaluated: true, context: input.context, findings: found, strengths, improvements, followUpCandidates: [...new Set(followUpCandidates)] }
}
