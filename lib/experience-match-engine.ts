import type { ApplicationPrompt } from '@/lib/application-answer-repository'
import { experienceRepository, type CareerExperience, type ExperienceCategory, type ExperienceCompetency } from '@/lib/experience-repository'
import type { InterviewCategory, InterviewQuestion } from '@/lib/interview-practice-data'

export type ExperienceUsageContext = 'interview' | 'application' | 'self_introduction'

export type ExperienceMatchRecommendation = {
  experienceId: string
  matchScore: number
  matchedCompetencies: ExperienceCompetency[]
  matchedTags: string[]
  recommendedFor: ExperienceUsageContext[]
  reasons: string[]
  experience: CareerExperience
}

export type ExperienceCoverageItem = {
  competency: ExperienceCompetency
  count: number
}

export type ExperienceCoverage = {
  totalCount: number
  strongAreas: ExperienceCoverageItem[]
  coveredAreas: ExperienceCoverageItem[]
  missingAreas: ExperienceCompetency[]
}

type ExperienceSource = CareerExperience[]
type AirlineCompetencyContext = {
  competencyTags?: string[]
  airlineName?: string
}

const competencyLabels: Record<ExperienceCompetency, string> = {
  customer_orientation: '고객지향',
  communication: '의사소통',
  teamwork: '팀워크',
  problem_solving: '문제 해결',
  conflict_management: '갈등 조정',
  safety_awareness: '안전 의식',
  responsibility: '책임감',
  adaptability: '적응력',
  leadership: '리더십',
  empathy: '공감',
  service_recovery: '서비스 회복',
  cross_cultural_communication: '다문화 소통',
}

const interviewCategoryExperienceCategoryBoost: Record<InterviewCategory, ExperienceCategory[]> = {
  introduction_and_motivation: ['customer_service', 'adaptability', 'leadership', 'responsibility', 'multicultural'],
  behavioral_experience: ['problem_solving', 'teamwork', 'conflict_resolution', 'failure_and_growth', 'leadership'],
  customer_situation: ['customer_service', 'conflict_resolution', 'problem_solving', 'responsibility'],
  safety_and_role_judgment: ['safety_judgment', 'responsibility', 'problem_solving'],
}

const applicationStructureTags: Record<string, ExperienceCompetency[]> = {
  motivation: ['customer_orientation', 'communication', 'adaptability', 'leadership', 'cross_cultural_communication'],
  experience_star: ['teamwork', 'problem_solving', 'responsibility', 'communication'],
  strength_role_connection: ['responsibility', 'leadership', 'customer_orientation', 'communication'],
  problem_solution: ['problem_solving', 'responsibility', 'communication'],
  career_goal: ['adaptability', 'leadership', 'responsibility'],
  short_profile: ['communication', 'customer_orientation'],
  custom: ['communication'],
}

const allCompetencies = Object.keys(competencyLabels) as ExperienceCompetency[]

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function recentPenalty(experience: CareerExperience): number {
  const usagePenalty = Math.min(18, experience.usageCount * 3)
  if (!experience.lastUsedAt) return usagePenalty
  const daysSinceUse = Math.max(
    0,
    Math.floor((Date.now() - new Date(experience.lastUsedAt).getTime()) / 86_400_000),
  )
  return usagePenalty + (daysSinceUse <= 7 ? 6 : daysSinceUse <= 30 ? 3 : 0)
}

function buildReasons({
  matchedCompetencies,
  categoryLabel,
  usagePenalty,
  hasAirlineContext,
  airlineName,
}: {
  matchedCompetencies: ExperienceCompetency[]
  categoryLabel: string
  usagePenalty: number
  hasAirlineContext: boolean
  airlineName?: string
}): string[] {
  const reasons = [
    matchedCompetencies.length
      ? `역량 ${matchedCompetencies
          .slice(0, 3)
          .map((tag) => competencyLabels[tag])
          .join(' · ')}이 잘 맞습니다.`
      : `${categoryLabel} 맥락과 연결해 볼 수 있습니다.`,
  ]
  if (hasAirlineContext) {
    reasons.push(`${airlineName ?? '선택한 항공사'}의 게시된 준비 방향과 함께 검토했습니다.`)
  }
  if (usagePenalty > 0) {
    reasons.push('최근 사용 빈도를 반영해 과사용을 조금 낮췄습니다.')
  }
  return reasons
}

function normaliseText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
}

function scoreExperienceForCompetencies(
  experience: CareerExperience,
  competencyTags: ExperienceCompetency[],
  weight: number,
): { score: number; matched: ExperienceCompetency[] } {
  const matched = experience.competencyTags.filter((tag) =>
    competencyTags.includes(tag),
  )
  return {
    matched,
    score: matched.length * weight,
  }
}

function rankExperiences(
  experiences: ExperienceSource,
  input: {
    competencyTags: ExperienceCompetency[]
    usageContext: ExperienceUsageContext
    questionLabel: string
    questionCategory?: InterviewCategory
    airlineContext?: AirlineCompetencyContext
    targetText?: string
  },
): ExperienceMatchRecommendation[] {
  const airlineCompetencyTags = input.airlineContext?.competencyTags ?? []
  return experiences
    .map((experience) => {
      const competencyMatch = scoreExperienceForCompetencies(
        experience,
        unique([...input.competencyTags, ...airlineCompetencyTags]) as ExperienceCompetency[],
        14,
      )
      const structuralMatch = scoreExperienceForCompetencies(
        experience,
        [...input.competencyTags],
        10,
      )
      const categoryHint = normaliseText(
        [experience.title, experience.organization, experience.role, experience.category]
          .filter(Boolean)
          .join(' '),
      )
      const usagePenalty = recentPenalty(experience)
      const hasAirlineContext = Boolean(airlineCompetencyTags.length)
      const categoryBonus = input.questionCategory && interviewCategoryExperienceCategoryBoost[input.questionCategory].includes(experience.category as ExperienceCategory)
        ? 10
        : 0
      const statusBonus =
        (competencyMatch.matched.length || structuralMatch.matched.length || categoryBonus)
          ? experience.status === 'interview_ready'
            ? 6
            : experience.status === 'structured'
              ? 4
              : 0
          : 0
      const score =
        competencyMatch.score +
        structuralMatch.score +
        categoryBonus +
        statusBonus -
        usagePenalty
      const matchedCompetencies = unique([
        ...competencyMatch.matched,
        ...structuralMatch.matched,
      ]) as ExperienceCompetency[]
      return {
        experienceId: experience.id,
        matchScore: score,
        matchedCompetencies,
        matchedTags: unique([
          ...matchedCompetencies,
          experience.category,
          input.usageContext,
        ]),
        recommendedFor: [input.usageContext],
        reasons: buildReasons({
          matchedCompetencies,
          categoryLabel: input.questionLabel,
          usagePenalty,
          hasAirlineContext,
          airlineName: input.airlineContext?.airlineName,
        }),
        experience,
      } satisfies ExperienceMatchRecommendation
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.experience.updatedAt.localeCompare(b.experience.updatedAt))
}

export function recommendExperiencesForQuestion(
  question: InterviewQuestion,
  items = experienceRepository.load().experiences,
  airlineContext?: AirlineCompetencyContext,
) {
  const contextCompetencies = unique([
    ...question.targetCapabilities.flatMap((capability) => mapCapabilityToCompetencies(capability)),
    ...(airlineContext?.competencyTags ?? []),
  ]) as ExperienceCompetency[]
  return rankExperiences(items, {
    competencyTags: contextCompetencies,
    usageContext: 'interview',
    questionLabel: question.shortTitle || question.prompt,
    airlineContext,
    targetText: question.prompt,
    questionCategory: question.category,
  }).slice(0, 3)
}

export function recommendExperiencesForApplication(
  prompt: ApplicationPrompt,
  items = experienceRepository.load().experiences,
  airlineContext?: AirlineCompetencyContext,
) {
  const structureCompetencies =
    (applicationStructureTags[prompt.recommendedStructure] ?? ['communication']) as ExperienceCompetency[]
  const contextCompetencies = unique([
    ...prompt.targetCapabilities.flatMap((capability) => mapCapabilityToCompetencies(capability)),
    ...structureCompetencies,
    ...(airlineContext?.competencyTags ?? []),
  ]) as ExperienceCompetency[]
  return rankExperiences(items, {
    competencyTags: contextCompetencies,
    usageContext: 'application',
    questionLabel: prompt.prompt,
    airlineContext,
    targetText: prompt.prompt,
  }).slice(0, 5)
}

export function recommendExperiencesForSelfIntroduction(
  items = experienceRepository.load().experiences,
  airlineContext?: AirlineCompetencyContext,
) {
  const contextCompetencies = unique([
    'customer_orientation',
    'communication',
    'adaptability',
    'responsibility',
    'leadership',
    'cross_cultural_communication',
    ...(airlineContext?.competencyTags ?? []),
  ]) as ExperienceCompetency[]
  return rankExperiences(items, {
    competencyTags: contextCompetencies,
    usageContext: 'self_introduction',
    questionLabel: '자기소개',
    airlineContext,
    targetText: '자기소개 강점 경험 지원 동기',
  }).slice(0, 3)
}

export function getExperienceCoverage(items = experienceRepository.load().experiences): ExperienceCoverage {
  const counts = new Map<ExperienceCompetency, number>()
  items.forEach((experience) => {
    experience.competencyTags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    })
  })
  const coveredAreas = allCompetencies
    .filter((competency) => (counts.get(competency) ?? 0) > 0)
    .map((competency) => ({ competency, count: counts.get(competency) ?? 0 }))
  const strongAreas = coveredAreas.filter((item) => item.count >= 2)
  const missingAreas = allCompetencies.filter((competency) => !(counts.get(competency) ?? 0))
  return {
    totalCount: items.length,
    strongAreas,
    coveredAreas,
    missingAreas,
  }
}

function mapCapabilityToCompetencies(capability: string): ExperienceCompetency[] {
  const mapping: Record<string, ExperienceCompetency[]> = {
    application_readiness: ['communication', 'responsibility'],
    interview_communication: ['communication', 'adaptability'],
    customer_situation_handling: ['customer_orientation', 'empathy', 'service_recovery', 'problem_solving'],
    safety_and_role_judgment: ['safety_awareness', 'responsibility', 'problem_solving'],
    recruitment_language: ['cross_cultural_communication', 'communication'],
    airline_and_role_understanding: ['responsibility', 'customer_orientation'],
  }
  return (mapping[capability] ?? []) as ExperienceCompetency[]
}
