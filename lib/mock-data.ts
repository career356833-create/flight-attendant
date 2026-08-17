// Central mock data. Replace these values with real backend data later.

export const landingContent = {
  brand: 'CABIN',
  brandTagline: 'CABIN CREW ACADEMY',
  // Replace this with a generated airport / aircraft video later.
  videoUrl: '',
  posterUrl: '/landing-poster.png',
  headline: '당신의 비행은\n준비하는 순간부터 시작됩니다.',
  supporting: '객실승무원 취업 준비를\n매일의 합격 루틴으로 완성하세요.',
  primaryCta: '준비 시작하기',
  loginLink: '이미 시작했나요? 로그인',
} as const

export const userProfile = {
  name: '지원',
  greetingEn: 'GOOD EVENING',
  greeting: 'Good evening, 지원님',
  supportingText: '오늘도 출발을 준비해 볼까요?',
  avatarUrl: '/avatar.png',
  notifications: 2,
} as const

export const journey = {
  label: 'MY JOURNEY',
  target: '대한항공 객실승무원',
  route: { from: 'ICN', to: 'GOAL' },
  score: 68,
  nextGoal: '기본 면접 답변 10개 완성',
  cta: '오늘 훈련 시작',
} as const

export type SkillCategory = {
  id: string
  name: string
  labelEn: string
  value: number
}

export const readiness = {
  overall: 68,
  coachingMessage:
    '영어면접은 답변 경험이 아직 부족해요. 이번 주 3회 연습을 권장합니다.',
  skills: [
    { id: 'resume', name: '자기소개서', labelEn: 'RESUME', value: 80 },
    { id: 'interview', name: '기본 면접', labelEn: 'INTERVIEW', value: 65 },
    { id: 'english', name: '영어 면접', labelEn: 'ENGLISH', value: 42 },
    { id: 'company', name: '기업 분석', labelEn: 'COMPANY', value: 70 },
    { id: 'situation', name: '상황 대처', labelEn: 'SITUATION', value: 76 },
  ] satisfies SkillCategory[],
} as const

export type TaskStatus = 'done' | 'in-progress' | 'todo'

export type RoutineTask = {
  id: string
  step: number
  name: string
  description?: string
  minutes: number
  status: TaskStatus
}

export const dailyRoute = {
  label: 'TODAY’S ROUTE',
  title: '오늘의 합격 루틴',
  totalTimeLabel: '약 32분',
  tasks: [
    { id: 't1', step: 1, name: '30초 자기소개 연습', minutes: 5, status: 'done' },
    { id: 't2', step: 2, name: '지원동기 답변 녹음', minutes: 8, status: 'in-progress' },
    { id: 't3', step: 3, name: '항공사 핵심가치 학습', minutes: 7, status: 'todo' },
    { id: 't4', step: 4, name: '기내 상황대처 훈련', minutes: 12, status: 'todo' },
  ] satisfies RoutineTask[],
} as const

export const weeklyStats = {
  streakDays: 12,
  completedThisWeek: 9,
  weeklyGoal: 15,
  upcomingGoal: {
    title: '기본 면접 답변 10개 완성',
    dueLabel: 'D-4',
  },
} as const

export const coachFeedback = {
  author: 'AI COACH',
  timeLabel: '어제 · 상황 대처 훈련',
  message:
    '상황대처 답변에서 공감 표현과 안전 우선 원칙이 좋아졌어요.',
} as const

export type NavItem = {
  id: string
  label: string
  labelEn: string
}

export const navItems: NavItem[] = [
  { id: 'home', label: '홈', labelEn: 'HOME' },
  { id: 'routine', label: '루틴', labelEn: 'ROUTINE' },
  { id: 'interview', label: '면접', labelEn: 'INTERVIEW' },
  { id: 'resume', label: '지원서 코치', labelEn: 'APPLICATION' },
  { id: 'my', label: '마이', labelEn: 'MY' },
]
