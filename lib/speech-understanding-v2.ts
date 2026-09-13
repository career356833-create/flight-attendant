import type { InterviewCategory } from './interview-practice-data'

export type SpeechUnderstandingError =
  | 'AUDIO_CAPTURE_FAILURE'
  | 'STT_EMPTY'
  | 'STT_POOR_TRANSCRIPT'
  | 'TRANSCRIPT_TOO_SHORT'
  | 'LANGUAGE_MISMATCH'
  | 'SEMANTIC_ANALYSIS_WEAK'
  | 'CONTENT_ANALYSIS_UNAVAILABLE'

export type TranscriptQuality = 'GOOD' | 'USABLE' | 'WEAK' | 'INSUFFICIENT'
export type PracticeLanguage = 'ko' | 'en'
export type TranscriptProvenance = 'actual_audio' | 'user_corrected_transcript'
export type InterviewQuestionType =
  | 'SELF_INTRODUCTION'
  | 'MOTIVATION'
  | 'EXPERIENCE'
  | 'SITUATIONAL'
  | 'SERVICE'
  | 'SAFETY'
  | 'TEAMWORK'
  | 'CONFLICT'
  | 'STRENGTH_WEAKNESS'
  | 'GENERAL'

export type EvidenceStatus = 'present' | 'missing' | 'not_applicable'
export type AnswerUnderstanding = {
  version: 2
  questionType: InterviewQuestionType
  questionAddressed: 'addressed' | 'partially_addressed' | 'not_addressed' | 'unclear'
  mainPoint: string | null
  situation: EvidenceStatus
  action: EvidenceStatus
  result: EvidenceStatus
  reflection: EvidenceStatus
  closing: EvidenceStatus
  cabinCrewEvidence: Array<{ competency: 'safety' | 'service' | 'teamwork' | 'communication' | 'problem_solving'; evidence: string[] }>
  specificity: 'specific' | 'partly_specific' | 'generic' | 'insufficient'
  repetition: string[]
  offTopic: boolean
  missingElements: string[]
  evidence: string[]
}

export type TranscriptAssessment = {
  rawTranscript: string
  normalizedTranscript: string
  language: PracticeLanguage
  quality: TranscriptQuality
  errors: SpeechUnderstandingError[]
}

export type TranscriptReview = Omit<TranscriptAssessment, 'errors'> & {
  provenance: TranscriptProvenance
}

export type ContentAnalysisState = {
  status: 'available' | 'unavailable' | 'weak'
  reason?: SpeechUnderstandingError
}

const sentences = (text: string) => text.split(/(?<=[.!?。！？])\s+|\n+/).map(value => value.trim()).filter(Boolean)
const has = (text: string, terms: string[]) => terms.some(term => text.toLocaleLowerCase().includes(term))
const clip = (text: string) => text.length <= 180 ? text : `${text.slice(0, 177)}...`

export function normalizeTranscriptForReview(rawTranscript: string) {
  return rawTranscript.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()
}

export function assessTranscript(rawTranscript: string, language: PracticeLanguage): TranscriptAssessment {
  const normalizedTranscript = normalizeTranscriptForReview(rawTranscript)
  if (!normalizedTranscript) return { rawTranscript, normalizedTranscript, language, quality: 'INSUFFICIENT', errors: ['STT_EMPTY'] }
  const letters = normalizedTranscript.match(/[A-Za-z가-힣]/g)?.length ?? 0
  const hangul = normalizedTranscript.match(/[가-힣]/g)?.length ?? 0
  const latin = normalizedTranscript.match(/[A-Za-z]/g)?.length ?? 0
  const units = language === 'en' ? normalizedTranscript.split(/\s+/).filter(Boolean).length : letters
  const errors: SpeechUnderstandingError[] = []
  if (letters > 8 && ((language === 'ko' && latin / letters > 0.82) || (language === 'en' && hangul / letters > 0.82))) errors.push('LANGUAGE_MISMATCH')
  if (letters / Math.max(1, normalizedTranscript.length) < 0.45 || /(?:\b(?:uh|um)\b[ ,.]*){4,}|(?:음[,. ]*){5,}/i.test(normalizedTranscript)) errors.push('STT_POOR_TRANSCRIPT')
  if (units < (language === 'en' ? 4 : 12)) errors.push('TRANSCRIPT_TOO_SHORT')
  if (errors.includes('LANGUAGE_MISMATCH') || errors.includes('STT_POOR_TRANSCRIPT') || errors.includes('TRANSCRIPT_TOO_SHORT')) return { rawTranscript, normalizedTranscript, language, quality: 'INSUFFICIENT', errors }
  const quality: TranscriptQuality = units >= (language === 'en' ? 22 : 75) ? 'GOOD' : units >= (language === 'en' ? 10 : 35) ? 'USABLE' : 'WEAK'
  return { rawTranscript, normalizedTranscript, language, quality, errors }
}

export function createTranscriptReview(rawTranscript: string, reviewedTranscript: string, language: PracticeLanguage): TranscriptReview {
  const original = assessTranscript(rawTranscript, language)
  const reviewed = assessTranscript(reviewedTranscript, language)
  return {
    rawTranscript,
    normalizedTranscript: reviewed.normalizedTranscript,
    language,
    quality: reviewed.quality,
    provenance: reviewed.normalizedTranscript === original.normalizedTranscript ? 'actual_audio' : 'user_corrected_transcript',
  }
}

export function classifyInterviewQuestion(prompt: string, category?: InterviewCategory): InterviewQuestionType {
  const q = prompt.toLocaleLowerCase()
  if (has(q, ['자기소개', 'introduce yourself', 'tell me about yourself'])) return 'SELF_INTRODUCTION'
  if (has(q, ['지원 동기', '왜 지원', '지원했', 'why do you want', 'why this airline', 'motivation'])) return 'MOTIVATION'
  if (has(q, ['갈등', 'conflict', 'disagreement'])) return 'CONFLICT'
  if (has(q, ['팀워크', '팀으로', 'teamwork', 'team member'])) return 'TEAMWORK'
  if (has(q, ['강점', '약점', 'strength', 'weakness'])) return 'STRENGTH_WEAKNESS'
  if (category === 'safety_and_role_judgment' || has(q, ['안전', '비상', 'safety', 'emergency', 'evacuation'])) return 'SAFETY'
  if (category === 'behavioral_experience') return 'EXPERIENCE'
  if (category === 'customer_situation') return 'SITUATIONAL'
  if (has(q, ['경험', '사례', 'tell me about a time', 'describe a time'])) return 'EXPERIENCE'
  if (has(q, ['승객', '고객', 'service', 'passenger', 'complaint'])) return has(q, ['어떻게', '상황', 'would you', 'what would']) ? 'SITUATIONAL' : 'SERVICE'
  if (category === 'introduction_and_motivation') return 'MOTIVATION'
  return 'GENERAL'
}

const elementTerms = {
  situation: ['당시', '상황', '때', 'when', 'situation', 'while'],
  action: ['제가', '나는', '직접', '조치', '해결', '설명', '확인', 'i ', 'my ', 'handled', 'explained', 'checked', 'did'],
  result: ['결과', '덕분에', '이후', '해결되', 'result', 'as a result', 'resolved', 'improved'],
  reflection: ['배웠', '깨달', '앞으로', 'learned', 'realized', 'next time'],
} as const

const competencyTerms = {
  safety: ['안전', '위험', '비상', '보고', 'safety', 'risk', 'emergency', 'report'],
  service: ['고객', '승객', '서비스', '불편', 'customer', 'passenger', 'service', 'complaint'],
  teamwork: ['팀', '동료', '협업', 'team', 'colleague', 'collaborat'],
  communication: ['설명', '경청', '소통', '안내', 'listen', 'explain', 'communicat'],
  problem_solving: ['해결', '대안', '개선', '문제', 'solve', 'solution', 'resolve', 'improve'],
} as const

const selfIntroductionTerms = {
  core: ['저는', '제 강점', '제가 가진', 'i am', 'my strength', 'i bring'],
  experience: ['경험', '근무', '활동', '프로젝트', 'experience', 'worked', 'project'],
  roleConnection: ['객실승무원', '승무원', '기내', '승객', '항공사', 'cabin crew', 'flight attendant', 'passenger', 'airline'],
  closing: ['기여하겠습니다', '되고 싶습니다', '보여드리겠습니다', '감사합니다', 'contribute', 'look forward', 'thank you'],
} as const

function status(text: string, terms: readonly string[], applicable: boolean): EvidenceStatus {
  if (!applicable) return 'not_applicable'
  return has(text, [...terms]) ? 'present' : 'missing'
}

function repeated(sentencesList: string[]) {
  const seen = new Map<string, number>()
  for (const sentence of sentencesList) {
    const key = sentence.toLocaleLowerCase().replace(/[^a-z가-힣0-9\s]/g, '').replace(/\s+/g, ' ').trim()
    if (key.length >= 8) seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([value]) => clip(value)).slice(0, 3)
}

export function understandInterviewAnswer(input: {
  questionPrompt: string
  questionCategory?: InterviewCategory
  transcript: string
  language: PracticeLanguage
  practiceType?: 'single_interview' | 'mock_interview' | 'self_introduction'
}): AnswerUnderstanding {
  const text = normalizeTranscriptForReview(input.transcript)
  const parts = sentences(text)
  const questionType = input.practiceType === 'self_introduction' ? 'SELF_INTRODUCTION' : classifyInterviewQuestion(input.questionPrompt, input.questionCategory)
  const selfIntroduction = input.practiceType === 'self_introduction'
  const experience = ['EXPERIENCE', 'TEAMWORK', 'CONFLICT'].includes(questionType)
  const situational = ['SITUATIONAL', 'SAFETY'].includes(questionType)
  const evidenceTerms = selfIntroduction
    ? [...selfIntroductionTerms.core, ...selfIntroductionTerms.experience, ...selfIntroductionTerms.roleConnection, ...elementTerms.reflection]
    : [...elementTerms.action, ...elementTerms.result, ...elementTerms.reflection]
  const evidence = parts.filter(sentence => has(sentence, evidenceTerms)).slice(0, 5).map(clip)
  const cabinCrewEvidence = (Object.keys(competencyTerms) as Array<keyof typeof competencyTerms>).map(competency => ({
    competency,
    evidence: parts.filter(sentence => has(sentence, [...competencyTerms[competency]])).slice(0, 2).map(clip),
  }))
  const expectedTerms: Record<InterviewQuestionType, string[]> = {
    SELF_INTRODUCTION: ['저는', '경험', '강점', 'i am', 'experience', 'strength'],
    MOTIVATION: ['지원', '이유', '기여', '승무원', 'airline', 'apply', 'motivat', 'cabin crew'],
    EXPERIENCE: [...elementTerms.situation, ...elementTerms.action],
    SITUATIONAL: ['상황', '판단', '조치', '승객', 'customer', 'passenger', 'would', 'handle'],
    SERVICE: [...competencyTerms.service, ...competencyTerms.communication],
    SAFETY: [...competencyTerms.safety],
    TEAMWORK: [...competencyTerms.teamwork],
    CONFLICT: ['갈등', '의견', '조율', 'conflict', 'disagree', 'resolve'],
    STRENGTH_WEAKNESS: ['강점', '약점', '개선', 'strength', 'weakness', 'improve'],
    GENERAL: [],
  }
  const matchesExpected = questionType === 'GENERAL' || has(text, expectedTerms[questionType])
  const answerSignals = Object.entries(expectedTerms).filter(([type, terms]) => type !== questionType && type !== 'GENERAL' && has(text, terms)).length
  const offTopic = Boolean(text) && !matchesExpected && (answerSignals > 0 || selfIntroduction)
  const questionAddressed = !text ? 'unclear' : offTopic ? 'not_addressed' : matchesExpected && evidence.length ? 'addressed' : matchesExpected ? 'partially_addressed' : 'unclear'
  const specificity = !text ? 'insufficient' : evidence.length >= 2 ? 'specific' : evidence.length ? 'partly_specific' : 'generic'
  const result: AnswerUnderstanding = {
    version: 2,
    questionType,
    questionAddressed,
    mainPoint: parts[0] ? clip(parts[0]) : null,
    situation: status(text, elementTerms.situation, experience),
    action: status(text, elementTerms.action, experience || situational),
    result: status(text, elementTerms.result, experience),
    reflection: status(text, elementTerms.reflection, experience || questionType === 'SELF_INTRODUCTION'),
    closing: status(text, selfIntroductionTerms.closing, selfIntroduction),
    cabinCrewEvidence,
    specificity,
    repetition: repeated(parts),
    offTopic,
    missingElements: [],
    evidence,
  }
  if (questionAddressed === 'not_addressed') result.missingElements.push('질문에 직접 답하는 핵심 문장')
  if (result.situation === 'missing') result.missingElements.push('상황')
  if (result.action === 'missing') result.missingElements.push('본인이 취한 행동')
  if (result.result === 'missing') result.missingElements.push('결과')
  if (result.reflection === 'missing') result.missingElements.push('배운 점 또는 적용')
  if (specificity === 'generic') result.missingElements.push('답변에서 확인 가능한 구체적 근거')
  if (selfIntroduction && !has(text, [...selfIntroductionTerms.core])) result.missingElements.push('나를 설명하는 핵심 문장')
  if (selfIntroduction && !has(text, [...selfIntroductionTerms.experience])) result.missingElements.push('강점을 뒷받침하는 경험')
  if (selfIntroduction && !has(text, [...selfIntroductionTerms.roleConnection])) result.missingElements.push('객실승무원 역할과의 연결')
  if (result.closing === 'missing') result.missingElements.push('지원 역할로 연결하는 마무리')
  return result
}

export function contentAnalysisGate(assessment: TranscriptAssessment) {
  if (assessment.quality === 'INSUFFICIENT') return { allowed: false as const, error: assessment.errors[0] ?? 'CONTENT_ANALYSIS_UNAVAILABLE' }
  return { allowed: true as const, warning: assessment.quality === 'WEAK' ? 'SEMANTIC_ANALYSIS_WEAK' as const : undefined }
}
