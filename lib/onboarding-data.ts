// Onboarding mock data, types, and a transparent diagnosis calculation.
// Everything here is intentionally simple so it can later connect to a real
// scoring engine without changing the UI.
import { onboardingKo } from '@/lib/onboarding-i18n'
import { airlineById, findAirlineByLegacyValue, type AirlineSelection } from '@/lib/airline-data'
import { safeLocalStorageWrite } from '@/lib/safe-local-storage'

/* ---------------------------------- Types --------------------------------- */

export type CareerTarget = 'full_service' | 'low_cost_or_hybrid' | 'regional_or_short_haul' | 'undecided'
export type PreparationStage = 'getting_started' | 'application_preparation' | 'assessment_preparation' | 'experienced_applicant'
export type PrepStage = PreparationStage
export type ApplyTiming = '1m' | '3m' | '6m' | 'undecided'
export type DailyStudyTime = 'fifteen_minutes' | 'thirty_minutes' | 'sixty_minutes' | 'ninety_plus_minutes'
export type DailyTime = DailyStudyTime
export type PreparedItem = 'customer_service_experience' | 'teamwork_experience' | 'application_profile' | 'introduction_and_motivation' | 'airline_and_role_research' | 'core_interview_answers' | 'recruitment_language_answers' | 'situational_and_safety_answers' | 'video_interview_preparation' | 'none_prepared'
export type ImprovementArea = 'application_and_profile' | 'introduction_and_motivation' | 'interview_communication' | 'recruitment_language' | 'customer_situation_handling' | 'safety_and_role_judgment' | 'teamwork_and_group_assessment' | 'presence_and_delivery' | 'airline_and_role_understanding'

export type OnboardingAnswers = {
  careerTarget: CareerTarget | null
  prepStage: PrepStage | null
  experiences: PreparedItem[]
  weakAreas: ImprovementArea[]
  primaryAirline: AirlineSelection | null
  interestAirlines: AirlineSelection[]
  applyTiming: ApplyTiming | null
  dailyTime: DailyTime | null
}

export const emptyAnswers: OnboardingAnswers = {
  careerTarget: null,
  prepStage: null,
  experiences: [],
  weakAreas: [],
  primaryAirline: null,
  interestAirlines: [],
  applyTiming: null,
  dailyTime: null,
}

export type PriorityArea = { id: string; title: string; description: string; firstAction?: string }

export type DiagnosisResult = {
  targetLabel: string
  primaryAirline: string
  currentStageLabel: string
  overallReadiness: number
  applyTimingLabel: string
  dailyTimeLabel: string
  priorityAreas: PriorityArea[]
  coachMessage: string
  starterPlan: { day: number; title: string; minutes: number }[]
  routineTaskCount: number
  routineMinutesPerTask: number
  skillScores: Record<string, number>
}

/* ------------------------------- Screen copy ------------------------------ */

export const onboardingIntro = {
  eyebrow: 'CAREER DIAGNOSIS',
  headline: '당신에게 맞는 준비 경로를\n함께 설계해 볼게요.',
  supporting:
    '몇 가지 질문을 바탕으로 현재 준비 상태와\n우선 훈련 영역을 분석합니다.',
  timeLabel: '약 2분',
  benefits: [
    { id: 'b1', title: '현재 준비도 진단' },
    { id: 'b2', title: '우선 훈련 영역 추천' },
    { id: 'b3', title: '맞춤형 일일 루틴 구성' },
  ],
  primaryCta: '진단 시작하기',
  secondaryCta: '나중에 할게요',
} as const

export type SelectOption<T extends string = string> = {
  value: T
  title: string
  description?: string
  icon?: string
}

export const careerTargetOptions: SelectOption<CareerTarget>[] = [
  {
    value: 'full_service',
    ...onboardingKo.careerTargets.full_service,
    icon: 'building',
  },
  {
    value: 'low_cost_or_hybrid',
    ...onboardingKo.careerTargets.low_cost_or_hybrid,
    icon: 'smile',
  },
  {
    value: 'regional_or_short_haul',
    ...onboardingKo.careerTargets.regional_or_short_haul,
    icon: 'globe',
  },
  {
    value: 'undecided',
    ...onboardingKo.careerTargets.undecided,
    icon: 'compass',
  },
]

export const prepStageOptions: SelectOption<PrepStage>[] = [
  {
    value: 'getting_started',
    ...onboardingKo.preparationStages.getting_started,
  },
  {
    value: 'application_preparation',
    ...onboardingKo.preparationStages.application_preparation,
  },
  {
    value: 'assessment_preparation',
    ...onboardingKo.preparationStages.assessment_preparation,
  },
  {
    value: 'experienced_applicant',
    ...onboardingKo.preparationStages.experienced_applicant,
  },
]

export const preparedItemGroups: { id: string; label: string; options: SelectOption<PreparedItem>[] }[] = [
  { id: 'experience_based', label: onboardingKo.preparedItemGroups.experience_based, options: [
    { value: 'customer_service_experience', ...onboardingKo.preparedItems.customer_service_experience },
    { value: 'teamwork_experience', ...onboardingKo.preparedItems.teamwork_experience },
  ] },
  { id: 'application_readiness', label: onboardingKo.preparedItemGroups.application_readiness, options: [
    { value: 'application_profile', ...onboardingKo.preparedItems.application_profile },
    { value: 'introduction_and_motivation', ...onboardingKo.preparedItems.introduction_and_motivation },
    { value: 'airline_and_role_research', ...onboardingKo.preparedItems.airline_and_role_research },
  ] },
  { id: 'assessment_readiness', label: onboardingKo.preparedItemGroups.assessment_readiness, options: [
    { value: 'core_interview_answers', ...onboardingKo.preparedItems.core_interview_answers },
    { value: 'recruitment_language_answers', ...onboardingKo.preparedItems.recruitment_language_answers },
    { value: 'situational_and_safety_answers', ...onboardingKo.preparedItems.situational_and_safety_answers },
    { value: 'video_interview_preparation', ...onboardingKo.preparedItems.video_interview_preparation },
  ] },
]
export const nonePreparedOption: SelectOption<PreparedItem> = { value: 'none_prepared', ...onboardingKo.preparedItems.none_prepared }
export const experienceOptions = [...preparedItemGroups.flatMap((group) => group.options), nonePreparedOption]

export const confidenceAreaOptions: SelectOption<ImprovementArea>[] = [
  { value: 'application_and_profile', ...onboardingKo.improvementAreas.application_and_profile },
  { value: 'introduction_and_motivation', ...onboardingKo.improvementAreas.introduction_and_motivation },
  { value: 'interview_communication', ...onboardingKo.improvementAreas.interview_communication },
  { value: 'recruitment_language', ...onboardingKo.improvementAreas.recruitment_language },
  { value: 'customer_situation_handling', ...onboardingKo.improvementAreas.customer_situation_handling },
  { value: 'safety_and_role_judgment', ...onboardingKo.improvementAreas.safety_and_role_judgment },
  { value: 'teamwork_and_group_assessment', ...onboardingKo.improvementAreas.teamwork_and_group_assessment },
  { value: 'presence_and_delivery', ...onboardingKo.improvementAreas.presence_and_delivery },
  { value: 'airline_and_role_understanding', ...onboardingKo.improvementAreas.airline_and_role_understanding },
]

export const applyTimingOptions: SelectOption<ApplyTiming>[] = [
  { value: '1m', title: '1개월 이내' },
  { value: '3m', title: '3개월 이내' },
  { value: '6m', title: '6개월 이내' },
  { value: 'undecided', title: '아직 정하지 않았어요' },
]

export const dailyTimeOptions: SelectOption<DailyTime>[] = [
  { value: 'fifteen_minutes', ...onboardingKo.dailyStudyTime.options.fifteen_minutes },
  { value: 'thirty_minutes', ...onboardingKo.dailyStudyTime.options.thirty_minutes },
  { value: 'sixty_minutes', ...onboardingKo.dailyStudyTime.options.sixty_minutes },
  { value: 'ninety_plus_minutes', ...onboardingKo.dailyStudyTime.options.ninety_plus_minutes },
]

export const analysisSteps = [
  { id: 's1', title: '현재 준비 상태 확인' },
  { id: 's2', title: '우선 훈련 영역 선정' },
  { id: 's3', title: '첫 주 루틴 구성' },
] as const

/* --------------------------- Label lookup helpers ------------------------- */

const careerTargetLabels: Record<CareerTarget, string> = {
  full_service: onboardingKo.careerTargets.full_service.title,
  low_cost_or_hybrid: onboardingKo.careerTargets.low_cost_or_hybrid.title,
  regional_or_short_haul: onboardingKo.careerTargets.regional_or_short_haul.title,
  undecided: '방향 탐색 중',
}

const prepStageLabels: Record<PrepStage, string> = {
  getting_started: onboardingKo.preparationStages.getting_started.title,
  application_preparation: onboardingKo.preparationStages.application_preparation.title,
  assessment_preparation: onboardingKo.preparationStages.assessment_preparation.title,
  experienced_applicant: onboardingKo.preparationStages.experienced_applicant.title,
}

const applyTimingLabels: Record<ApplyTiming, string> = {
  '1m': '1개월 이내',
  '3m': '3개월 이내',
  '6m': '6개월 이내',
  undecided: '미정',
}

const dailyTimeLabels: Record<DailyTime, string> = {
  fifteen_minutes: onboardingKo.dailyStudyTime.options.fifteen_minutes.title,
  thirty_minutes: onboardingKo.dailyStudyTime.options.thirty_minutes.title,
  sixty_minutes: onboardingKo.dailyStudyTime.options.sixty_minutes.title,
  ninety_plus_minutes: onboardingKo.dailyStudyTime.options.ninety_plus_minutes.title,
}

const dailyStudyConfigs: Record<DailyStudyTime, { dailyMinutes: number; taskCount: number }> = {
  fifteen_minutes: { dailyMinutes: 15, taskCount: 1 },
  thirty_minutes: { dailyMinutes: 30, taskCount: 2 },
  sixty_minutes: { dailyMinutes: 60, taskCount: 3 },
  ninety_plus_minutes: { dailyMinutes: 90, taskCount: 4 },
}

const priorityLibrary: Record<string, PriorityArea> = {
  application_and_profile: { id: 'application_and_profile', title: onboardingKo.improvementAreas.application_and_profile.title, description: '경험과 강점을 지원 자료에 명확하게 연결해요.' },
  introduction_and_motivation: { id: 'introduction_and_motivation', title: onboardingKo.improvementAreas.introduction_and_motivation.title, description: '강점과 지원 이유를 하나의 설득력 있는 메시지로 만들어요.' },
  interview_communication: { id: 'interview_communication', title: onboardingKo.improvementAreas.interview_communication.title, description: '질문의 핵심에 맞춰 경험을 구조적으로 전달해요.' },
  recruitment_language: { id: 'recruitment_language', title: onboardingKo.improvementAreas.recruitment_language.title, description: '채용 과정에서 사용하는 언어로 자연스럽게 답변해요.' },
  customer_situation_handling: { id: 'customer_situation_handling', title: onboardingKo.improvementAreas.customer_situation_handling.title, description: '다양한 승객 요구와 갈등 상황에 침착하게 대응해요.' },
  safety_and_role_judgment: { id: 'safety_and_role_judgment', title: onboardingKo.improvementAreas.safety_and_role_judgment.title, description: '안전을 우선하며 판단하고 명확하게 보고해요.' },
  teamwork_and_group_assessment: { id: 'teamwork_and_group_assessment', title: onboardingKo.improvementAreas.teamwork_and_group_assessment.title, description: '협력하면서 균형 있게 의견을 표현하는 연습을 해요.' },
  presence_and_delivery: { id: 'presence_and_delivery', title: onboardingKo.improvementAreas.presence_and_delivery.title, description: '표정과 시선, 자세, 발음과 전달력을 안정적으로 관리해요.' },
  airline_and_role_understanding: { id: 'airline_and_role_understanding', title: onboardingKo.improvementAreas.airline_and_role_understanding.title, description: '항공사와 객실승무원 역할을 답변에 구체적으로 연결해요.' },
  application_readiness: {
    id: 'application_readiness',
    title: '지원 자료 기본 구조',
    description: '지원서·이력 정보와 자기소개 메시지를 일관되게 정리해요.',
  },
  interview: {
    id: 'interview',
    title: '기본 면접 답변 구조',
    description: '핵심 메시지를 30초 안에 전달하는 답변 틀을 만들어요.',
  },
  resume: {
    id: 'resume',
    title: '지원동기와 경험 정리',
    description: '경험을 면접에서 쓸 수 있는 소재로 구조화해요.',
  },
  company: {
    id: 'company',
    title: '항공사 핵심가치 분석',
    description: '지원 항공사의 인재상과 서비스 방향을 이해해요.',
  },
  english: {
    id: 'english',
    title: '영어 면접 기본기',
    description: '자주 나오는 질문의 답변 패턴을 익혀요.',
  },
  safety_judgement: {
    id: 'safety_judgement',
    title: '상황대처와 안전 판단',
    description: '고객 상황과 비정상 상황에서 안전을 우선하는 판단을 연습해요.',
  },
  situation: {
    id: 'situation',
    title: '상황대처 답변 훈련',
    description: '안전 우선 원칙과 공감 표현을 함께 연습해요.',
  },
  presence: {
    id: 'presence',
    title: '표정·자세·말하기',
    description: '첫인상을 좌우하는 비언어 표현을 다듬어요.',
  },
}

const baseStarterPlan = [
  { day: 1, title: '핵심 자기소개 점검' },
  { day: 2, title: '서비스 경험 정리' },
  { day: 3, title: '지원동기 초안' },
  { day: 4, title: '항공사 핵심가치 학습' },
  { day: 5, title: '기본 면접 3문항' },
  { day: 6, title: '상황대처 입문' },
  { day: 7, title: '첫 주 리포트' },
]

function buildStarterPlan(answers: OnboardingAnswers, dailyMinutes: number) {
  const stageTasks: Record<PrepStage, string[]> = {
    getting_started: ['객실승무원 직무와 기본 자격 확인', '나의 준비 방향 체크'],
    application_preparation: ['지원 자료 체크리스트 점검', '이력과 경험 소재 정리'],
    assessment_preparation: ['면접·평가 절차 진단', '그룹 활동과 역할 수행 연습'],
    experienced_applicant: ['이전 지원 과정 복기', '평가 피드백과 부족 영역 정리'],
  }
  const selected = answers.prepStage ? stageTasks[answers.prepStage] : stageTasks.getting_started
  const selectedAirline = answers.primaryAirline && !['custom_airline', 'undecided_airline'].includes(answers.primaryAirline.id) ? airlineById.get(answers.primaryAirline.id) : undefined
  const airlineTasks = selectedAirline ? [`${selectedAirline.name} 채용 기준 분석`, `${selectedAirline.recruitmentLanguages[0]} 채용 답변 점검`] : []
  const preparedTaskMap: Partial<Record<PreparedItem, string>> = {
    customer_service_experience: '고객 서비스 경험을 면접 사례로 구조화',
    teamwork_experience: '팀워크 경험과 나의 역할 정리',
    application_profile: '지원서·이력 정보 점검',
    introduction_and_motivation: '자기소개와 지원동기 연결',
    airline_and_role_research: '항공사와 객실승무원 역할 조사',
    core_interview_answers: '면접 기본 답변 3문항 준비',
    recruitment_language_answers: '채용 언어 자기소개 연습',
    situational_and_safety_answers: '상황대처와 안전 답변 연습',
    video_interview_preparation: '영상 평가 환경 점검',
  }
  const allPreparedItems = Object.keys(preparedTaskMap) as PreparedItem[]
  const nextPreparationTasks = allPreparedItems.filter((item) => !answers.experiences.includes(item)).map((item) => preparedTaskMap[item]!).slice(0, 3)
  const weakAreaTasks = answers.weakAreas.map((id) => priorityLibrary[id]?.title).filter((title): title is string => Boolean(title))
  const tasks = [...selected, ...airlineTasks, ...nextPreparationTasks, ...weakAreaTasks, ...baseStarterPlan.map((item) => item.title)]
    .filter((title, index, all) => all.indexOf(title) === index)
    .slice(0, 7)
  return tasks.map((title, index) => ({ day: index + 1, title, minutes: Math.max(5, dailyMinutes) }))
}

/* --------------------------- Diagnosis calculation ------------------------ */

// Transparent scoring: start from a stage baseline, add points per prepared
// item, subtract a little for self-declared weak areas, then clamp.
export function calculateDiagnosis(answers: OnboardingAnswers): DiagnosisResult {
  const stageBaseline: Record<PrepStage, number> = {
    getting_started: 20,
    application_preparation: 36,
    assessment_preparation: 48,
    experienced_applicant: 60,
  }

  const base = answers.prepStage ? stageBaseline[answers.prepStage] : 25
  const preparedCount = answers.experiences.filter((e) => e !== 'none_prepared').length
  const experiencePoints = Math.min(27, preparedCount * 3)
  const weakPenalty = Math.min(12, answers.weakAreas.length * 4)

  const overallReadiness = Math.max(15, Math.min(90, base + experiencePoints - weakPenalty))

  // Priority areas: weak areas first, then sensible defaults, capped at 3.
  const priorityIds: string[] = []
  for (const w of answers.weakAreas) {
    if (w === 'presence_and_delivery' && answers.experiences.includes('video_interview_preparation')) continue
    if (priorityLibrary[w] && !priorityIds.includes(w)) priorityIds.push(w)
  }
  const preparationGapPriorities: string[] = []
  if (!answers.experiences.includes('application_profile') || !answers.experiences.includes('introduction_and_motivation')) preparationGapPriorities.push('application_readiness')
  if (!answers.experiences.includes('airline_and_role_research')) preparationGapPriorities.push('company')
  if (!answers.experiences.includes('core_interview_answers')) preparationGapPriorities.push('interview')
  if (!answers.experiences.includes('recruitment_language_answers')) preparationGapPriorities.push('recruitment_language')
  if (!answers.experiences.includes('situational_and_safety_answers')) preparationGapPriorities.push('safety_judgement')
  for (const id of preparationGapPriorities) if (priorityLibrary[id] && !priorityIds.includes(id)) priorityIds.push(id)
  if (answers.weakAreas.includes('presence_and_delivery') && answers.experiences.includes('video_interview_preparation') && priorityIds.length < 3) priorityIds.push('presence_and_delivery')
  const targetPriority: Record<CareerTarget, string> = {
    full_service: 'company',
    low_cost_or_hybrid: 'situation',
    regional_or_short_haul: 'presence',
    undecided: 'interview',
  }
  if (answers.careerTarget && !priorityIds.includes(targetPriority[answers.careerTarget])) priorityIds.push(targetPriority[answers.careerTarget])
  const stagePriority: Record<PrepStage, string> = {
    getting_started: 'company',
    application_preparation: 'resume',
    assessment_preparation: 'interview',
    experienced_applicant: 'situation',
  }
  if (answers.prepStage && !priorityIds.includes(stagePriority[answers.prepStage])) priorityIds.push(stagePriority[answers.prepStage])
  const selectedAirline = answers.primaryAirline && !['custom_airline', 'undecided_airline'].includes(answers.primaryAirline.id) ? airlineById.get(answers.primaryAirline.id) : undefined
  if (selectedAirline && !priorityIds.includes('company')) priorityIds.push('company')
  if (selectedAirline && selectedAirline.recruitmentLanguages.some((language) => language !== 'Korean') && !priorityIds.includes('recruitment_language')) priorityIds.push('recruitment_language')
  if (selectedAirline?.region === 'middle_east' && !priorityIds.includes('interview_communication')) priorityIds.push('interview_communication')
  for (const fallback of ['interview', 'resume', 'company']) {
    if (priorityIds.length >= 3) break
    if (!priorityIds.includes(fallback)) priorityIds.push(fallback)
  }
  const priorityAreas = priorityIds.slice(0, 3).map((id) => priorityLibrary[id])

  const primaryAirline = answers.primaryAirline?.name || '미정'

  const targetLabel = answers.careerTarget
    ? careerTargetLabels[answers.careerTarget]
    : '방향 탐색 중'

  const coachMessage = buildCoachMessage(answers)

  const studyConfig = answers.dailyTime ? dailyStudyConfigs[answers.dailyTime] : dailyStudyConfigs.thirty_minutes
  const minutesPerTask = Math.round(studyConfig.dailyMinutes / studyConfig.taskCount)
  const skillScores = {
    resume: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('application_profile') ? 10 : -5) + (answers.experiences.includes('introduction_and_motivation') ? 8 : 0) + (answers.prepStage === 'application_preparation' ? 10 : 0) - (answers.weakAreas.includes('application_and_profile') ? 12 : 0) - (answers.weakAreas.includes('introduction_and_motivation') ? 8 : 0))),
    interview: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('customer_service_experience') ? 4 : 0) + (answers.experiences.includes('teamwork_experience') ? 9 : 0) + (answers.experiences.includes('introduction_and_motivation') ? 8 : 0) + (answers.experiences.includes('core_interview_answers') ? 12 : 0) + (answers.experiences.includes('video_interview_preparation') ? 7 : 0) + (answers.prepStage === 'assessment_preparation' ? 10 : 0) - (answers.weakAreas.includes('interview_communication') ? 12 : 0) - (answers.weakAreas.includes('introduction_and_motivation') ? 6 : 0) - (answers.weakAreas.includes('teamwork_and_group_assessment') ? 8 : 0))),
    english: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('recruitment_language_answers') ? 15 : -8) + (answers.prepStage === 'assessment_preparation' ? 6 : 0) - (answers.weakAreas.includes('recruitment_language') ? 12 : 0))),
    company: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('airline_and_role_research') ? 12 : -6) - (answers.weakAreas.includes('airline_and_role_understanding') ? 12 : 0))),
    situation: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('customer_service_experience') ? 10 : 0) + (answers.experiences.includes('teamwork_experience') ? 4 : 0) + (answers.experiences.includes('situational_and_safety_answers') ? 14 : -4) - (answers.weakAreas.includes('customer_situation_handling') ? 12 : 0) - (answers.weakAreas.includes('safety_and_role_judgment') ? 6 : 0))),
    safety_judgement: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('teamwork_experience') ? 4 : 0) + (answers.experiences.includes('situational_and_safety_answers') ? 15 : -5) - (answers.weakAreas.includes('safety_and_role_judgment') ? 12 : 0) - (answers.weakAreas.includes('teamwork_and_group_assessment') ? 5 : 0))),
    presence: Math.max(15, Math.min(90, overallReadiness + (answers.experiences.includes('video_interview_preparation') ? 12 : 0) - (answers.weakAreas.includes('presence_and_delivery') ? 12 : 0))),
  }

  return {
    targetLabel,
    primaryAirline,
    currentStageLabel: answers.prepStage ? prepStageLabels[answers.prepStage] : onboardingKo.preparationStages.getting_started.title,
    overallReadiness,
    applyTimingLabel: answers.applyTiming ? applyTimingLabels[answers.applyTiming] : '미정',
    dailyTimeLabel: answers.dailyTime ? dailyTimeLabels[answers.dailyTime] : onboardingKo.dailyStudyTime.options.thirty_minutes.title,
    priorityAreas,
    coachMessage,
    starterPlan: buildStarterPlan(answers, studyConfig.dailyMinutes),
    routineTaskCount: studyConfig.taskCount,
    routineMinutesPerTask: minutesPerTask,
    skillScores,
  }
}

function buildCoachMessage(answers: OnboardingAnswers): string {
  const isFullService = answers.careerTarget === 'full_service'
  const stageMessage: Partial<Record<PrepStage, string>> = {
    getting_started: '먼저 객실승무원 직무와 기본 자격을 확인하고 준비 순서를 세워 보세요.',
    application_preparation: '지원서와 이력, 경험 자료의 메시지를 하나로 연결하는 단계예요.',
    assessment_preparation: '그룹 활동, 역할 수행과 채용 언어 평가에서 일관된 소통 역량을 보여주는 연습이 필요해요.',
    experienced_applicant: '이전 과정에서 어려웠던 평가와 선택한 부족 영역을 중심으로 다음 전략을 다듬어 보세요.',
  }
  let preparedInsight = '첫 주에는 준비되지 않은 항목부터 하나씩 기본 자료를 만들어 보세요.'
  if (answers.experiences.includes('none_prepared')) preparedInsight = '아직 준비된 자료가 없어도 괜찮아요. 고객 서비스 경험과 지원 정보를 정리하는 것부터 시작해요.'
  else if (answers.experiences.includes('customer_service_experience') && answers.experiences.includes('teamwork_experience')) preparedInsight = '고객 서비스와 팀워크 경험이 좋은 기반이에요. 이를 면접과 평가에서 전달할 수 있는 답변으로 연결해 보세요.'
  else if (!answers.experiences.includes('recruitment_language_answers')) preparedInsight = '다음 단계에서는 채용 언어로 자기소개와 핵심 답변을 준비해 보세요.'
  else if (!answers.experiences.includes('situational_and_safety_answers')) preparedInsight = '다음 단계에서는 상황대처와 안전 중심 답변을 보완해 보세요.'
  const context = answers.prepStage ? stageMessage[answers.prepStage] : isFullService ? '정교한 서비스 표현과 브랜드 기준 이해가 중요해요.' : '기본기부터 차근히 쌓아가면 충분히 따라잡을 수 있어요.'
  const selectedAreaTitles = answers.weakAreas.map((area) => priorityLibrary[area]?.title).filter(Boolean)
  const improvementGuidance = selectedAreaTitles.length > 0 ? `첫 주에는 ${selectedAreaTitles.join('과 ')} 영역을 우선 훈련해 보세요.` : ''
  const selectedAirline = answers.primaryAirline && !['custom_airline', 'undecided_airline'].includes(answers.primaryAirline.id) ? airlineById.get(answers.primaryAirline.id) : undefined
  const airlineGuidance = selectedAirline ? `${selectedAirline.name}의 ${onboardingKo.airlineSelection.businessModels[selectedAirline.businessModel]} 운영 방식과 채용 언어(${selectedAirline.recruitmentLanguages.join(', ')})를 함께 분석해 보세요.` : ''
  return `${context} ${improvementGuidance} ${preparedInsight} ${airlineGuidance}`.trim()
}

/* ------------------------ localStorage persistence ------------------------ */

const STORAGE_KEY = 'cabin.onboarding.v1'

export type StoredOnboarding = {
  schemaVersion?: number
  savedAt: string
  completed: boolean
  answers: OnboardingAnswers
  diagnosis: DiagnosisResult | null
}

const CURRENT_SCHEMA_VERSION = 7
const legacyDailyStudyTimeMap: Record<string, DailyStudyTime> = {
  ten_minutes: 'fifteen_minutes',
  twenty_minutes: 'thirty_minutes',
  thirty_minutes: 'thirty_minutes',
  sixty_plus_minutes: 'sixty_minutes',
  '10': 'fifteen_minutes',
  '20': 'thirty_minutes',
  '30': 'thirty_minutes',
  '60': 'sixty_minutes',
}
const legacyCareerTargetMap: Record<string, CareerTarget> = {
  major: 'full_service',
  domestic_major: 'full_service',
  lcc: 'low_cost_or_hybrid',
  domestic_low_cost: 'low_cost_or_hybrid',
  foreign: 'full_service',
  foreign_airline: 'full_service',
}
const legacyPreparationStageMap: Record<string, PrepStage> = {
  start: 'getting_started',
  starting: 'getting_started',
  resume: 'application_preparation',
  cover_letter: 'application_preparation',
  interview: 'assessment_preparation',
  experienced: 'experienced_applicant',
}
const legacyPreparedItemMap: Record<string, PreparedItem> = {
  service_experience: 'customer_service_experience',
  service: 'customer_service_experience',
  cover_letter_material: 'introduction_and_motivation',
  'resume-material': 'introduction_and_motivation',
  self_introduction: 'core_interview_answers',
  'self-intro': 'core_interview_answers',
  motivation_answer: 'introduction_and_motivation',
  motivation: 'introduction_and_motivation',
  english_interview: 'recruitment_language_answers',
  english: 'recruitment_language_answers',
  company_research: 'airline_and_role_research',
  company: 'airline_and_role_research',
  situational_answer: 'situational_and_safety_answers',
  situation: 'situational_and_safety_answers',
  none: 'none_prepared',
}
const legacyImprovementAreaMap: Record<string, ImprovementArea> = {
  cover_letter: 'application_and_profile',
  resume: 'application_and_profile',
  basic_interview: 'interview_communication',
  interview: 'interview_communication',
  english_interview: 'recruitment_language',
  english: 'recruitment_language',
  company_analysis: 'airline_and_role_understanding',
  company: 'airline_and_role_understanding',
  situational_interview: 'customer_situation_handling',
  situation: 'customer_situation_handling',
  presence: 'presence_and_delivery',
}

function migrateAirlineSelection(value: unknown): AirlineSelection | null {
  if (!value) return null
  if (typeof value === 'string') {
    if (value === '아직 정하지 않음' || value === onboardingKo.airlineSelection.undecided) return { id: 'undecided_airline', name: onboardingKo.airlineSelection.undecided }
    const matched = findAirlineByLegacyValue(value)
    return matched ? { id: matched.id, name: matched.name } : { id: 'custom_airline', name: value, customAirline: value }
  }
  if (typeof value !== 'object') return null
  const candidate = value as { id?: string; name?: string; customAirline?: string }
  if (candidate.id === 'undecided_airline') return { id: 'undecided_airline', name: onboardingKo.airlineSelection.undecided }
  if (candidate.id === 'custom_airline' || candidate.customAirline) {
    const customAirline = candidate.customAirline || candidate.name
    return customAirline ? { id: 'custom_airline', name: customAirline, customAirline } : null
  }
  const byId = candidate.id ? airlineById.get(candidate.id) : undefined
  const byName = candidate.name ? findAirlineByLegacyValue(candidate.name) : undefined
  const matched = byId || byName
  if (matched) return { id: matched.id, name: matched.name }
  return candidate.name ? { id: 'custom_airline', name: candidate.name, customAirline: candidate.name } : null
}

function migrateStoredOnboarding(value: StoredOnboarding): StoredOnboarding {
  const rawTarget = value.answers.careerTarget as string | null
  const careerTarget = rawTarget && legacyCareerTargetMap[rawTarget]
    ? legacyCareerTargetMap[rawTarget]
    : rawTarget as CareerTarget | null
  const validTargets: CareerTarget[] = ['full_service', 'low_cost_or_hybrid', 'regional_or_short_haul', 'undecided']
  const rawStage = value.answers.prepStage as string | null
  const prepStage = rawStage && legacyPreparationStageMap[rawStage] ? legacyPreparationStageMap[rawStage] : rawStage as PrepStage | null
  const validStages: PrepStage[] = ['getting_started', 'application_preparation', 'assessment_preparation', 'experienced_applicant']
  const validPreparedItems: PreparedItem[] = ['customer_service_experience', 'teamwork_experience', 'application_profile', 'introduction_and_motivation', 'airline_and_role_research', 'core_interview_answers', 'recruitment_language_answers', 'situational_and_safety_answers', 'video_interview_preparation', 'none_prepared']
  const migratedPreparedItems = Array.from(new Set((value.answers.experiences as string[]).map((item) => legacyPreparedItemMap[item] ?? item as PreparedItem).filter((item): item is PreparedItem => validPreparedItems.includes(item as PreparedItem))))
  const experiences = migratedPreparedItems.includes('none_prepared') ? ['none_prepared'] as PreparedItem[] : migratedPreparedItems
  const validImprovementAreas: ImprovementArea[] = ['application_and_profile', 'introduction_and_motivation', 'interview_communication', 'recruitment_language', 'customer_situation_handling', 'safety_and_role_judgment', 'teamwork_and_group_assessment', 'presence_and_delivery', 'airline_and_role_understanding']
  const weakAreas = Array.from(new Set((value.answers.weakAreas as string[]).map((area) => legacyImprovementAreaMap[area] ?? area as ImprovementArea).filter((area): area is ImprovementArea => validImprovementAreas.includes(area as ImprovementArea)))).slice(0, 2)
  const primaryAirline = migrateAirlineSelection(value.answers.primaryAirline)
  const migratedInterests = (Array.isArray(value.answers.interestAirlines) ? value.answers.interestAirlines : []).map(migrateAirlineSelection).filter((item): item is AirlineSelection => Boolean(item))
  const interestAirlines = Array.from(new Map(migratedInterests.filter((item) => item.id !== primaryAirline?.id).map((item) => [`${item.id}:${item.name}`, item])).values()).slice(0, 2)
  const rawDailyTime = value.answers.dailyTime as string | null
  const validDailyTimes: DailyStudyTime[] = ['fifteen_minutes', 'thirty_minutes', 'sixty_minutes', 'ninety_plus_minutes']
  const mappedDailyTime = rawDailyTime ? legacyDailyStudyTimeMap[rawDailyTime] ?? rawDailyTime as DailyStudyTime : null
  const dailyTime = mappedDailyTime && validDailyTimes.includes(mappedDailyTime) ? mappedDailyTime : null
  const answers = {
    ...value.answers,
    careerTarget: careerTarget && validTargets.includes(careerTarget) ? careerTarget : null,
    prepStage: prepStage && validStages.includes(prepStage) ? prepStage : null,
    experiences,
    weakAreas,
    primaryAirline,
    interestAirlines,
    dailyTime,
  }
  const migrated = value.schemaVersion !== CURRENT_SCHEMA_VERSION || answers.careerTarget !== value.answers.careerTarget || answers.prepStage !== value.answers.prepStage || answers.dailyTime !== value.answers.dailyTime || JSON.stringify(answers.experiences) !== JSON.stringify(value.answers.experiences) || JSON.stringify(answers.weakAreas) !== JSON.stringify(value.answers.weakAreas) || JSON.stringify(answers.primaryAirline) !== JSON.stringify(value.answers.primaryAirline) || JSON.stringify(answers.interestAirlines) !== JSON.stringify(value.answers.interestAirlines)
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: value.savedAt ?? new Date().toISOString(),
    completed: value.completed,
    answers,
    diagnosis: migrated && value.completed ? calculateDiagnosis(answers) : value.diagnosis,
  }
}

export function loadOnboarding(): StoredOnboarding | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = migrateStoredOnboarding(JSON.parse(raw) as StoredOnboarding)
    if (!parsed || typeof parsed.completed !== 'boolean' || !parsed.answers) throw new Error('Invalid onboarding data')
    if (parsed.completed && (!parsed.diagnosis || !parsed.diagnosis.skillScores || !Array.isArray(parsed.diagnosis.starterPlan))) throw new Error('Outdated onboarding schema')
    safeLocalStorageWrite(STORAGE_KEY, parsed, { category: 'profile' })
    return parsed
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export function saveOnboarding(data: Omit<StoredOnboarding, 'savedAt'> & { savedAt?: string }) {
  if (typeof window === 'undefined') return { ok: false as const, reason: 'storage_unavailable' as const }
  const result = safeLocalStorageWrite(STORAGE_KEY, { ...data, savedAt: data.savedAt ?? new Date().toISOString(), schemaVersion: CURRENT_SCHEMA_VERSION }, { category: 'profile' })
  if (result.ok) window.dispatchEvent(new Event('cabin:learning-local-changed'))
  return result
}

export function clearOnboarding(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // no-op
  }
}
