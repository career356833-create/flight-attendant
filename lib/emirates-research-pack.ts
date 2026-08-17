import type { AirlineKnowledgeProfile, AirlineFAQ } from './airline-knowledge-repository'
import type { AirlineResearchRecord } from './airline-research-repository'
import type { AirlineCoachingInsight, AirlineInterviewQuestion } from './airline-knowledge-transformer'

const careers = 'https://www.emiratesgroupcareers.com/cabin-crew/'
const opportunities = 'https://www.emiratesgroupcareers.com/search-and-apply/267'
const about = 'https://www.emirates.com/kr/korean/help/faq-topics/about-emirates/'
const service = 'https://www.emirates.com/us/english/experience/the-emirates-service/'
const people = 'https://www.emirates.com/kr/korean/about-us/our-people/'

const fact = (category: AirlineResearchRecord['extractedFacts'][number]['category'], key: string, value: string, sourceUrl: string, sourceGrade: 'A' | 'B' | 'C' | 'E' = 'A') => ({ category, key, value, sourceUrl, sourceGrade, verified: sourceGrade !== 'E' })

/** Transcribed only from the supplied Emirates research pack. E-grade entries remain unverified. */
export const emiratesResearchRecords: AirlineResearchRecord[] = [
  { id: 'emirates-company-profile-20260718', airlineId: 'emirates', sourceTitle: 'Emirates company and service pages', sourceUrl: about, sourceType: 'Company Profile', collectedBy: 'manual', collectedAt: '2026-07-27T00:00:00.000Z', sourceDate: '2023-07-04', sourceGrade: 'A', rawSummary: 'Supplied Company Profile source table.', confidence: 'high', status: 'approved', extractedFacts: [
    fact('profile', 'official_name', 'Emirates Airline / Emirates', careers), fact('profile', 'country', 'UAE', about), fact('profile', 'headquarters', 'Dubai, UAE', about), fact('profile', 'hub', 'Dubai International Airport', about), fact('brand', 'brand_value', 'High-quality, world-class service brand', about), fact('service', 'service_philosophy', 'Excellence, innovation, and safety are reflected in the service experience.', service), fact('service', 'customer_experience', 'Customer comfort, feedback, and satisfaction are emphasized.', service), fact('safety', 'safety_culture', 'Safety is named as a core service value.', service),
  ] },
  { id: 'emirates-recruitment-20260718', airlineId: 'emirates', sourceTitle: 'Emirates Cabin Crew Opportunities', sourceUrl: opportunities, sourceType: 'Recruitment Data', collectedBy: 'manual', collectedAt: '2026-07-27T00:00:00.000Z', sourceDate: '2026-07-18', sourceGrade: 'A', rawSummary: 'Supplied Recruitment Data source table.', confidence: 'high', status: 'approved', extractedFacts: [
    fact('recruitment', 'official_career_page', 'Cabin Crew | Emirates Group Careers', careers), fact('recruitment', 'education', 'Minimum qualification is high school graduate (Grade 12).', opportunities), fact('language', 'english', 'Written and spoken English fluent.', opportunities), fact('recruitment', 'service_experience', 'At least one year of hospitality or customer service experience.', opportunities), fact('recruitment', 'height_reach', 'Minimum 160 cm and able to reach 212 cm on tiptoes.', opportunities), fact('recruitment', 'visible_tattoo', 'Visible tattoos while in uniform are not permitted.', opportunities), fact('recruitment', 'candidate_attributes', 'Adapt to situations and make people feel at ease.', opportunities),
  ] },
  { id: 'emirates-recruitment-review-needed-20260727', airlineId: 'emirates', sourceTitle: 'Supplied recruitment items requiring confirmation', sourceUrl: careers, sourceType: 'Recruitment Data - needs review', collectedBy: 'manual', collectedAt: '2026-07-27T00:00:00.000Z', sourceDate: '2026-07-27', sourceGrade: 'E', rawSummary: 'Supplied list of items requiring live vacancy confirmation.', confidence: 'medium', status: 'reviewing', extractedFacts: [
    fact('recruitment', 'application_region', 'Current eligible regions require confirmation in each vacancy.', careers, 'E'), fact('recruitment', 'selection_steps', 'The complete selection-stage list requires official confirmation.', careers, 'E'), fact('recruitment', 'additional_requirements', 'Visa, health, fitness, and detailed appearance requirements require confirmation.', careers, 'E'),
  ] },
]

export const emiratesKnowledgeProfileCandidate: Partial<AirlineKnowledgeProfile> = {
  id: 'profile-emirates', airlineId: 'emirates', reviewStatus: 'reviewed', publishStatus: 'published',
  overview: {
    officialName: 'Emirates Airline / Emirates', displayName: 'Emirates', countryCode: 'AE', region: 'middle_east', businessModel: 'full_service', headquarters: 'Dubai, UAE', primaryHubs: ['Dubai International Airport'], website: careers,
    brandIdentity: { value: 'High-quality, world-class service brand', status: 'verified', sourceIds: ['emirates-company-profile-20260718'], reviewedAt: '2026-07-27' },
    servicePhilosophy: 'Excellence, innovation, and safety are reflected in the service experience.', customerFocus: { value: 'Customer comfort, feedback, and satisfaction are emphasized.', status: 'verified', sourceIds: ['emirates-company-profile-20260718'], reviewedAt: '2026-07-27' }, safetyCulture: { value: 'Safety is named as a core service value.', status: 'verified', sourceIds: ['emirates-company-profile-20260718'], reviewedAt: '2026-07-27' }, desiredCompetencies: { value: ['customer_situation_handling', 'interview_communication', 'recruitment_language', 'safety_and_role_judgment'], status: 'verified', sourceIds: ['emirates-recruitment-20260718'], reviewedAt: '2026-07-27' },
  } as AirlineKnowledgeProfile['overview'],
  recruitmentProfile: { recruitmentLanguages: ['English'], applicationLanguages: ['English'], commonRecruitmentStages: ['application'], officialCareerPageUrl: careers, currentStatus: 'unknown', checkedAt: '2026-07-27', eligibilityRequirements: { value: ['High school graduate (Grade 12).', 'At least one year of hospitality or customer service experience.', 'Minimum 160 cm and able to reach 212 cm on tiptoes.', 'Visible tattoos while in uniform are not permitted.'], status: 'verified', sourceIds: ['emirates-recruitment-20260718'], reviewedAt: '2026-07-27' }, languageRequirements: { value: ['Written and spoken English fluent.'], status: 'verified', sourceIds: ['emirates-recruitment-20260718'], reviewedAt: '2026-07-27' }, selectionSteps: { status: 'needs_review', sourceIds: ['emirates-recruitment-review-needed-20260727'] }, physicalRequirements: { status: 'needs_review', sourceIds: ['emirates-recruitment-review-needed-20260727'] }, status: 'reviewing' },
}

export const emiratesFaqDrafts: AirlineFAQ[] = [
  { id: 'emirates-faq-eligibility', airlineId: 'emirates', category: 'eligibility', question: '지원 준비 참고 FAQ: Emirates 객실승무원 지원 조건은 어디서 확인하나요?', answer: '공식 Emirates Group Careers Cabin Crew 채용 페이지에서 최신 조건을 확인해야 합니다.', sourceGrade: 'A', sourceReference: careers, status: 'published', publishStatus: 'published', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' },
  { id: 'emirates-faq-language', airlineId: 'emirates', category: 'language', question: '지원 준비 참고 FAQ: 영어 조건은 어디서 확인하나요?', answer: '공식 Cabin Crew Opportunities 채용 공고에서 현재 조건을 확인해야 합니다.', sourceGrade: 'A', sourceReference: opportunities, status: 'published', publishStatus: 'published', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' },
  { id: 'emirates-faq-process', airlineId: 'emirates', category: 'process', question: '지원 준비 참고 FAQ: Emirates 전형 단계는 어떻게 확인하나요?', answer: '전체 전형 단계는 최신 공식 채용 공고에서 확인이 필요합니다.', sourceGrade: 'E', sourceReference: careers, status: 'draft', publishStatus: 'unpublished', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' },
]

const draftQuestion = (id: string, prompt: string, questionType: AirlineInterviewQuestion['questionType'], tags: string[], experiences: string[], sourceReference: string): AirlineInterviewQuestion => ({ id, airlineId: 'emirates', prompt: `지원 준비용 예상 질문: ${prompt}`, questionType, competencyTags: tags, recommendedExperienceTags: experiences, followUpQuestions: [], sourceReferences: [sourceReference], status: 'approved', publishStatus: 'published' })
export const emiratesInterviewQuestionDrafts: AirlineInterviewQuestion[] = [
  draftQuestion('emirates-question-motivation', 'Why do you want to join Emirates cabin crew?', 'motivation', ['brand_understanding', 'service_orientation', 'global_mindset'], ['customer_service', 'multicultural_experience'], service),
  draftQuestion('emirates-question-service', 'How would you respond to a customer complaint?', 'service', ['customer_service', 'problem_solving'], ['customer_service'], service),
  draftQuestion('emirates-question-teamwork', 'Describe resolving a teamwork issue in a busy situation.', 'experience', ['teamwork', 'communication'], ['teamwork'], opportunities),
  draftQuestion('emirates-question-safety', 'What would you do after noticing a safety concern?', 'safety', ['safety_awareness', 'reporting'], ['safety_awareness'], service),
  draftQuestion('emirates-question-language', 'Please introduce yourself in English.', 'language', ['english_communication'], ['english_self_introduction'], opportunities),
  draftQuestion('emirates-question-multicultural', 'Why is adapting to customers from different cultures important?', 'experience', ['multicultural_adaptability', 'customer_service'], ['multicultural_experience'], people),
]

export const emiratesCoachingInsightDrafts: AirlineCoachingInsight[] = [{ id: 'emirates-insight-motivation', airlineId: 'emirates', topic: 'motivation', coachMessage: 'Emirates 지원동기는 단순 해외 근무 희망보다 글로벌 고객 경험, 서비스 가치, 다문화 환경 적응 경험을 연결하도록 안내합니다.', goodDirections: ['customer service experience', 'multicultural experience', 'teamwork', 'safety awareness'], avoidPatterns: ['여행이 좋아서 지원', '외국 생활 희망만 강조', '브랜드 이해 없는 지원동기'], recommendedExperienceTags: ['customer_service', 'teamwork', 'multicultural_experience', 'safety_awareness'], sourceReferences: [about, service, opportunities], status: 'approved', publishStatus: 'published' }]
