'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AppHeader } from '@/components/app-header'
import { JourneyCard } from '@/components/journey-card'
import { ReadinessGauge } from '@/components/readiness-gauge'
import { SkillProgressList } from '@/components/skill-progress-list'
import { DailyRoutineList } from '@/components/daily-routine-list'
import { CoachFeedbackCard } from '@/components/coach-feedback-card'
import { BottomNavigation, DesktopNavigation } from '@/components/bottom-navigation'
import { Lightbulb } from 'lucide-react'
import { onboardingKo } from '@/lib/onboarding-i18n'
import type { DiagnosisResult, OnboardingAnswers } from '@/lib/onboarding-data'
import { SelfIntroductionFlow } from '@/components/self-introduction'
import { loadSelfIntroductionProgress, SELF_INTRO_TASK_ID, type SelfIntroductionAttempt, type SelfIntroductionProgress } from '@/lib/self-introduction-data'
import { InterviewPracticeEngine, InterviewPracticeHome, InterviewPracticeQueuePanel, AirlineInterviewQuestionList, SingleInterviewResultRevisit } from '@/components/interview-practice'
import { MockInterviewFollowUp, MockInterviewLauncher, MockInterviewProgress, MockInterviewReport, MockInterviewSessionHistory } from '@/components/interview-practice/mock-interview-session'
import { analyzeInterviewSession, completeInterviewSessionAttempt, createInterviewSession, followUpForAttempt, loadInterviewSessions, saveInterviewSession, type InterviewSession } from '@/lib/mock-interview-session'
import { buildFollowUpQuestion, decideAiInterviewerFollowUp } from '@/lib/ai-interviewer'
import { interviewQuestionById, loadInterviewAttempts, saveInterviewAttempt, type InterviewAttempt, type InterviewCategory, type InterviewPracticeConfig, type InterviewQuestion } from '@/lib/interview-practice-data'
import { ExperienceLibrary } from '@/components/experience-library'
import { experienceRepository, type CareerExperience } from '@/lib/experience-repository'
import { ApplicationCoach } from '@/components/application-coach'
import { listApplicationAnswers } from '@/lib/application-answer-repository'
import { WeeklyReportHome } from '@/components/weekly-report'
import { buildLearningActivities, getCurrentReadinessSnapshot, getWeeklyLearningSummary, type WeeklyRoutineTask } from '@/lib/learning-analytics-service'
import { learningAnalyticsRepository } from '@/lib/learning-analytics-repository'
import { AccountSummary } from '@/components/account/account-summary'
import { queueTrainingAttempt } from '@/lib/supabase/training-attempt-repositories'
import { airlineKnowledgeRepository, getAirlineAIContext } from '@/lib/airline-knowledge-repository'
import { buildHomeDrillPlan, buildHomeInterviewRecommendation, canUseAirlineContext, findResumableSession, loadHomeInterviewHistory } from '@/lib/home-dashboard-v2'
import { getExperienceCoverage } from '@/lib/experience-match-engine'
import { listWorkDrafts } from '@/lib/application-answer-repository'
import { interviewPracticeQueueRepository, resolveInterviewQuestion } from '@/lib/interview-practice-queue'
import { buildExperienceUsageSummary, describeExperienceUsageBalance, describeExperienceUsageConcentration } from '@/lib/experience-usage-history'
import { loadSelfIntroductionAttempts } from '@/lib/self-introduction-data'
import type { SelfIntroductionChallengeSeconds } from '@/lib/self-introduction-challenge'
import { ApplicationTracker } from '@/components/application-tracker'
import { authService } from '@/lib/supabase/auth-service'
import { getAirlineApplicationRepository,type AirlineApplication } from '@/lib/supabase/application-sync-repository'
import { sortUpcomingApplications } from '@/lib/application-tracker'
import { applicationDrillSourceContext, type ApplicationInterviewDrillCandidate } from '@/lib/application-interview-drill'
import type { InterviewPracticeSourceContext } from '@/lib/interview-practice-data'
import { detectAdaptiveWeaknesses, recommendQuestionForWeakness } from '@/lib/learning-analytics-adaptive'
import { localDateKey } from '@/lib/local-date-utils'
import { buildDailyActionPlan, weeklyTaskToDailyAction, type DailyActionCandidate, type DailyCompletionEvent } from '@/lib/daily-action-plan'
import { buildHomeRealState, type HomeRoutineTask as RoutineTask, type HomeRoutineTaskStatus as TaskStatus } from '@/lib/home-real-state'
import { completeWeeklyInterviewAttempt, completeWeeklyTaskContext, createWeeklyTaskContext, incompleteWeeklyTasks, weeklyCompletionIds, type WeeklyTaskContext } from '@/lib/weekly-task-completion'
import type { MockReportAction } from '@/lib/mock-report-actions'
import { interviewReturnTargetForSource, restoreSingleInterviewConfig, resumeFromConfig, singleInterviewResumeRepository, sortSingleInterviewHistory, type InterviewPracticeReturnTarget, type SingleInterviewResume, type SingleInterviewResumeSource } from '@/lib/single-interview-resume'
import { deriveHomePresentationModel } from '@/lib/home-presentation'
import { exitSelfIntroductionForNavigation, type PrimaryNavigationTarget } from '@/lib/self-introduction-navigation'

function DailyActionCard({action,primary=false,onStart}:{action:DailyActionCandidate;primary?:boolean;onStart:()=>void}){
  return <article className={primary?'rounded-3xl bg-navy p-6 text-ivory shadow-sm':'rounded-2xl border border-border bg-card p-4'}>
    <span className={`text-xs font-bold ${primary?'text-gold':'text-muted-foreground'}`}>{primary?'지금 할 일':'다음 할 일'}{action.resume?' · 이어하기':''}</span>
    <h2 className={`mt-2 font-bold ${primary?'text-2xl':'text-base text-navy'}`}>{action.title}</h2>
    <p className={`mt-2 text-sm leading-relaxed ${primary?'text-ivory/75':'text-muted-foreground'}`}>{action.description}</p>
    <p className={`mt-3 text-xs leading-relaxed ${primary?'text-gold':'text-midnight'}`}>{action.reason}</p>
    <button type="button" onClick={onStart} className={`mt-4 h-11 w-full rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${primary?'bg-gold text-navy':'bg-navy text-ivory'}`}>{action.resume?'이어하기':'시작하기'}</button>
  </article>
}

export function HomeDashboard({ diagnosis, onboardingAnswers, onEditDiagnosis, onLogin, initialAccountOpen=false }: { diagnosis?: DiagnosisResult | null; onboardingAnswers?: OnboardingAnswers; onEditDiagnosis?: () => void; onLogin:()=>void; initialAccountOpen?:boolean }) {
  const [activeNav, setActiveNav] = useState(initialAccountOpen?'my':'home')
  const [trainingView,setTrainingView]=useState<'dashboard'|'self-introduction'|'experience-library'|'application-coach'|'application-tracker'|'weekly-report'>('dashboard')
  const [applicationAirlineId,setApplicationAirlineId]=useState<string>()
  const [trackedApplications,setTrackedApplications]=useState<AirlineApplication[]>([])
  const [selfIntroductionChallengeTarget,setSelfIntroductionChallengeTarget]=useState<SelfIntroductionChallengeSeconds>()
  const [interviewCategory,setInterviewCategory]=useState<InterviewCategory|null>(null)
  const [practiceConfig,setPracticeConfig]=useState<InterviewPracticeConfig|null>(null)
  const [mockInterviewOpen,setMockInterviewOpen]=useState(false)
  const [mockSession,setMockSession]=useState<InterviewSession|null>(null)
  const [mockReport,setMockReport]=useState<InterviewSession|null>(null)
  const [pendingSessionAttempt,setPendingSessionAttempt]=useState<InterviewAttempt|null>(null)
  const [pendingFollowUp,setPendingFollowUp]=useState<{attempt:InterviewAttempt;message:string;adaptive?:boolean;question?:InterviewQuestion;reason?:string;templateId?:string}|null>(null)
  const [interviewAttempts,setInterviewAttempts]=useState<InterviewAttempt[]>([])
  const [interviewSessions,setInterviewSessions]=useState<InterviewSession[]>([])
  const [sessionHistoryAvailable,setSessionHistoryAvailable]=useState(true)
  const [trainingProgress,setTrainingProgress]=useState<SelfIntroductionProgress>({routineCompleted:false,interviewScoreGain:0,scoreHistory:[]})
  const [usageRevision,setUsageRevision]=useState(0)
  const [experienceRevision,setExperienceRevision]=useState(0)
  const [learningRevision,setLearningRevision]=useState(0)
  const [activeWeeklyTask,setActiveWeeklyTask]=useState<WeeklyTaskContext|null>(null)
  const [singleInterviewResume,setSingleInterviewResume]=useState<SingleInterviewResume|null>(null)
  const [interviewReturnTarget,setInterviewReturnTarget]=useState<InterviewPracticeReturnTarget>('interview')
  const [selectedInterviewResult,setSelectedInterviewResult]=useState<InterviewAttempt|null>(null)
  const [invalidResume,setInvalidResume]=useState(false)
  useEffect(()=>{setTrainingProgress(loadSelfIntroductionProgress());const history=loadHomeInterviewHistory({loadSessions:loadInterviewSessions,loadAttempts:loadInterviewAttempts});setInterviewAttempts(history.attempts);setInterviewSessions(history.sessions);setSessionHistoryAvailable(history.available);const usageChanged=()=>setUsageRevision(v=>v+1);const experienceChanged=()=>setExperienceRevision(v=>v+1);const learningChanged=()=>setLearningRevision(v=>v+1);window.addEventListener('cabin:training-sync-changed',usageChanged);window.addEventListener('cabin:application-local-changed',usageChanged);window.addEventListener('cabin:application-sync-changed',usageChanged);window.addEventListener('cabin:experience-sync-changed',experienceChanged);window.addEventListener('cabin:learning-local-changed',learningChanged);window.addEventListener(interviewPracticeQueueRepository.eventName,usageChanged);return()=>{window.removeEventListener('cabin:training-sync-changed',usageChanged);window.removeEventListener('cabin:application-local-changed',usageChanged);window.removeEventListener('cabin:application-sync-changed',usageChanged);window.removeEventListener('cabin:experience-sync-changed',experienceChanged);window.removeEventListener('cabin:learning-local-changed',learningChanged);window.removeEventListener(interviewPracticeQueueRepository.eventName,usageChanged)}},[])
  useEffect(()=>{let active=true;const load=()=>void authService.currentUser().then(user=>getAirlineApplicationRepository(user).list()).then(items=>{if(active)setTrackedApplications(items)}).catch(()=>{});load();window.addEventListener('cabin:application-local-changed',load);window.addEventListener('cabin:application-sync-changed',load);return()=>{active=false;window.removeEventListener('cabin:application-local-changed',load);window.removeEventListener('cabin:application-sync-changed',load)}},[])
  useEffect(()=>{const applicationSaved=(event:Event)=>{const id=(event as CustomEvent<{answerId?:string}>).detail?.answerId;if(id)completeWeeklyTask({type:'application_answer',entityId:id,completed:true})};const experienceSaved=(event:Event)=>{const id=(event as CustomEvent<{experienceId?:string}>).detail?.experienceId;if(id)completeWeeklyTask({type:'experience_saved',entityId:id,completed:true})};window.addEventListener('cabin:application-answer-saved',applicationSaved);window.addEventListener('cabin:experience-saved',experienceSaved);return()=>{window.removeEventListener('cabin:application-answer-saved',applicationSaved);window.removeEventListener('cabin:experience-saved',experienceSaved)}},[activeWeeklyTask])
  useEffect(()=>{const load=()=>setSingleInterviewResume(singleInterviewResumeRepository.load());load();window.addEventListener('cabin:single-interview-resume-changed',load);return()=>window.removeEventListener('cabin:single-interview-resume-changed',load)},[])
  const baseTasks: RoutineTask[] = diagnosis ? diagnosis.starterPlan.slice(0, diagnosis.routineTaskCount).map((item, index) => ({ id: `personal-${item.day}`, step: index + 2, name: item.title, minutes: diagnosis.routineMinutesPerTask, status: 'todo' })) : []
  const interviewRoutineDone=interviewAttempts.some(a=>a.questionId==='im2')
  const applicationRoutineDone=listApplicationAnswers().some(a=>a.status==='reviewed'||a.status==='ready')
  const personalizedTasks: RoutineTask[] = [{id:SELF_INTRO_TASK_ID,step:1,name:'자기소개 실전 진단',description:'평소 면접처럼 자유롭게 답변하고, 내용과 전달 방식을 분석해 보세요.',minutes:10,status:trainingProgress.routineCompleted?'done':'todo'},{id:'application-coach-motivation',step:2,name:'지원동기 초안 작성',description:'실제 경험과 검수된 항공사 문맥으로 지원 답변을 정리해 보세요.',minutes:15,status:applicationRoutineDone?'done':'todo'},{id:'interview-question-im2',step:3,name:'지원동기 답변 훈련',description:'지원 이유를 직접 답하고 내용과 전달 방식을 함께 분석해 보세요.',minutes:10,status:interviewRoutineDone?'done':'todo'},...baseTasks.map(task=>({...task,step:task.step+2}))]
  const [tasks, setTasks] = useState<RoutineTask[]>(personalizedTasks)
  useEffect(()=>setTasks(current=>current.map(task=>task.id===SELF_INTRO_TASK_ID?{...task,status:trainingProgress.routineCompleted?'done':'todo'}:task.id==='interview-question-im2'?{...task,status:interviewRoutineDone?'done':'todo'}:task)),[trainingProgress.routineCompleted,interviewRoutineDone])
  const readinessSnapshot=getCurrentReadinessSnapshot(),weeklySummary=getWeeklyLearningSummary()
  const targetAirlineId=diagnosis?.primaryAirline
  const airlineProfile=targetAirlineId?airlineKnowledgeRepository.getProfile(targetAirlineId):undefined
  const airlineContext=targetAirlineId?getAirlineAIContext(targetAirlineId):null
  const hasPublishedAirlineContext=sessionHistoryAvailable&&canUseAirlineContext({contextAvailable:Boolean(airlineContext),verified:Boolean(airlineContext?.sourceGrade.some(grade=>['A','B','C'].includes(grade))),reviewStatus:airlineProfile?.reviewStatus,publishStatus:airlineProfile?.publishStatus,aiContextEnabled:Boolean(airlineContext?.publishedRecruitmentRequirements.length)})
  const interviewRecommendation=buildHomeInterviewRecommendation({attempts:interviewAttempts,targetAirlineId,hasPublishedAirlineContext})
  const drillPlan=buildHomeDrillPlan(interviewRecommendation.topic)
  const resumableSession=findResumableSession(interviewSessions)
  const recentCompletedSessions=interviewSessions.filter(item=>item.status==='completed').sort((a,b)=>(b.completedAt??b.startedAt).localeCompare(a.completedAt??a.startedAt)).slice(0,3)
  const mockAttemptIds=new Set(interviewSessions.flatMap(session=>session.attemptIds))
  const singleInterviewHistory=sortSingleInterviewHistory(interviewAttempts.filter(attempt=>!mockAttemptIds.has(attempt.id)))
  const experienceCoverage=getExperienceCoverage()
  const experienceUsageById=useMemo(()=>buildExperienceUsageSummary({experiences:experienceRepository.load().experiences,interviewAttempts:loadInterviewAttempts(),applicationAnswers:listApplicationAnswers(),applicationWorkDrafts:listWorkDrafts(),selfIntroductionAttempts:loadSelfIntroductionAttempts()}),[usageRevision,experienceRevision,interviewAttempts.length,interviewSessions.length,trainingProgress.routineCompleted])
  const homeExperienceUsage=Object.values(experienceUsageById).sort((a,b)=>b.totalUsageCount-a.totalUsageCount)[0]
  const upcomingApplications=sortUpcomingApplications(trackedApplications)
  const allQueueItems=interviewPracticeQueueRepository.listQueue()
  const openQueueItems=interviewPracticeQueueRepository.listOpen()
  const adaptiveWeaknesses=detectAdaptiveWeaknesses()
  const adaptiveActions=adaptiveWeaknesses.map(weakness=>({weakness,questionId:recommendQuestionForWeakness(weakness,{recentQuestionIds:interviewAttempts.filter(item=>item.completed).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5).map(item=>item.questionId),openQuestionIds:openQueueItems.map(item=>item.questionId)})?.question.id}))
  const todayKey=localDateKey(new Date())
  const learningStore=useMemo(()=>learningAnalyticsRepository.load(),[learningRevision])
  const completedWeeklyTaskIds=weeklyCompletionIds(learningStore.routineCompletions)
  const allConfirmedTodayTasks=learningStore.confirmedWeeklyPlans.flatMap(plan=>plan.days).find(day=>day.date===todayKey)?.tasks??[]
  const confirmedTodayTasks=incompleteWeeklyTasks(allConfirmedTodayTasks,completedWeeklyTaskIds)
  const applicationAnswers=listApplicationAnswers()
  const currentApplicationDraft=applicationAnswers.filter(answer=>answer.status==='draft'||answer.status==='structured').sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]
  const selfIntroductionAttempts=loadSelfIntroductionAttempts()
  const dailyCompletions:DailyCompletionEvent[]=[
    ...interviewAttempts.filter(item=>item.completed).map(item=>({id:item.id,type:'interview_attempt' as const,completedAt:item.createdAt})),
    ...interviewSessions.filter(item=>item.status==='completed'&&item.completedAt).map(item=>({id:item.id,type:'mock_session' as const,completedAt:item.completedAt!})),
    ...selfIntroductionAttempts.filter(item=>item.completed).map(item=>({id:item.id,type:'self_introduction' as const,completedAt:item.createdAt})),
    ...applicationAnswers.filter(item=>item.status==='reviewed'||item.status==='ready').map(item=>({id:item.id,type:'application_answer' as const,completedAt:item.updatedAt})),
    ...allQueueItems.filter(item=>item.status==='practiced').map(item=>({id:item.id,type:'queue_practiced' as const,completedAt:item.updatedAt})),
  ]
  const queueQuestionTitles=Object.fromEntries(openQueueItems.map(item=>[item.questionId,resolveInterviewQuestion(item.questionId,item.airlineId)?.shortTitle??'재연습 질문']))
  const dailyPlan=buildDailyActionPlan({sessions:interviewSessions,singleInterviewResume,applications:trackedApplications,queue:allQueueItems,queueQuestionTitles,weaknesses:adaptiveActions,weeklyTasks:confirmedTodayTasks,validQuestionIds:[...interviewQuestionById.keys()],balancedQuestionId:drillPlan.selectedQuestionIds[0]??'im2',currentApplicationDraft:currentApplicationDraft?{id:currentApplicationDraft.id,airlineId:currentApplicationDraft.airlineId,updatedAt:currentApplicationDraft.updatedAt}:undefined,recentSelfIntroductionAt:selfIntroductionAttempts[0]?.createdAt,completions:dailyCompletions})
  const learningActivities=buildLearningActivities().filter(activity=>!activity.id.startsWith('weekly:'))
  const latestWeakness=adaptiveWeaknesses.find(item=>item.state!=='resolved')
  const homeRealState=buildHomeRealState({diagnosis,activities:learningActivities,weeklyPracticeCount:weeklySummary.activityCount,upcoming:upcomingApplications[0],coachMessage:latestWeakness?.explanation??(learningActivities.length?'최근 완료한 연습이 학습 기록에 반영됐습니다. 다음 추천 훈련을 이어가 보세요.':undefined),coachOccurredAt:latestWeakness?.latestObservedAt,coachSource:latestWeakness?'연습 분석':undefined})
  const homePresentation=deriveHomePresentationModel({plan:dailyPlan,weeklyCompleted:allConfirmedTodayTasks.filter(task=>completedWeeklyTaskIds.has(task.id)).length,weeklyTotal:allConfirmedTodayTasks.length,activityCount:weeklySummary.activityCount,streakDays:homeRealState.streakDays})

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const next: TaskStatus = t.status === 'done' ? 'todo' : 'done'
        if(next==='done')learningAnalyticsRepository.recordRoutine(t,t.id.includes('interview')?'interview_communication':'application_readiness');else learningAnalyticsRepository.removeRoutine(t.id)
        return { ...t, status: next }
      }),
    )
  }

  function airlineContextAllowed(id:string){const profile=airlineKnowledgeRepository.getProfile(id),context=getAirlineAIContext(id);return Boolean(profile?.reviewStatus==='approved'&&profile.publishStatus==='published'&&context&&context.sourceGrade.some(grade=>['A','B','C'].includes(grade))&&context.publishedRecruitmentRequirements.length)}
  function startInterviewQuestion(question:InterviewQuestion,previousAttemptId?:string,selectedExperienceId?:string,targetAirlineOverride?:string,sourceQueueItemId?:string,sourceContext?:InterviewPracticeSourceContext,weeklyTaskContext?:WeeklyTaskContext,source?:SingleInterviewResumeSource,returnTarget?:InterviewPracticeReturnTarget){const latest=interviewAttempts.find(attempt=>attempt.questionId===question.id);const linkedId=previousAttemptId??latest?.id,resumeSource=source??(sourceContext?.source??(sourceQueueItemId?'queue':weeklyTaskContext?'weekly_task':'direct'));const config:InterviewPracticeConfig={question,attemptType:linkedId?'retry':'first',previousAttemptId:linkedId,targetAirlineId:targetAirlineOverride??diagnosis?.primaryAirline,selectedExperienceId,sourceQueueItemId,sourceContext,weeklyTaskContext};setInterviewReturnTarget(returnTarget??interviewReturnTargetForSource(resumeSource));setPracticeConfig(config);singleInterviewResumeRepository.save(resumeFromConfig(config,resumeSource))}
  function retakeSingleInterview(attempt:InterviewAttempt){const question=interviewQuestionById.get(attempt.questionId);if(!question)return;const language=attempt.speechMetrics?.language==='en'?'en':attempt.speechMetrics?.language==='ko'?'ko':undefined;const safeAirlineId=attempt.targetAirlineId&&airlineContextAllowed(attempt.targetAirlineId)?attempt.targetAirlineId:undefined;const safeExperienceId=attempt.experienceId&&experienceRepository.load().experiences.some(item=>item.id===attempt.experienceId)?attempt.experienceId:undefined,source:SingleInterviewResumeSource=attempt.weeklyTaskContext?'weekly_task':attempt.sourceContext?.source??'direct';const config:InterviewPracticeConfig={question,attemptType:'retry',previousAttemptId:attempt.id,targetAirlineId:safeAirlineId,selectedExperienceId:safeExperienceId,sourceContext:attempt.sourceContext,weeklyTaskContext:attempt.weeklyTaskContext,languageHint:language};setInterviewReturnTarget(interviewReturnTargetForSource(source));setPracticeConfig(config);singleInterviewResumeRepository.save(resumeFromConfig(config,source))}
  function resumeSingleInterview(){const stored=singleInterviewResumeRepository.load();if(!stored)return;const restored=restoreSingleInterviewConfig(stored,{questionExists:id=>interviewQuestionById.has(id),airlineContextAllowed,experienceExists:id=>experienceRepository.load().experiences.some(item=>item.id===id)});const question=interviewQuestionById.get(stored.questionId);if(!restored||!question){setInvalidResume(true);return}setInvalidResume(false);setMockSession(null);setActiveWeeklyTask(restored.weeklyTaskContext??null);setInterviewReturnTarget(interviewReturnTargetForSource(stored.source));setActiveNav('interview');setPracticeConfig({question,...restored})}
  function startApplicationDrill(candidate:ApplicationInterviewDrillCandidate){setTrainingView('dashboard');setActiveNav('interview');startInterviewQuestion(candidate.question,undefined,candidate.selectedExperienceId,candidate.targetAirlineId,undefined,applicationDrillSourceContext(candidate))}
  function openSession(session:InterviewSession){const question=interviewQuestionById.get(session.questionIds[session.currentQuestionIndex]);if(!question)return;setActiveWeeklyTask(session.weeklyTaskContext??null);setMockSession(session);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId,languageHint:session.mode==='english'?'en':'ko'})}
  function weeklyContextForAction(action:DailyActionCandidate){if(!action.weeklyTaskId)return null;const plan=learningStore.confirmedWeeklyPlans.find(item=>item.days.some(day=>day.tasks.some(task=>task.id===action.weeklyTaskId))),task=plan?.days.flatMap(day=>day.tasks).find(item=>item.id===action.weeklyTaskId);if(!task)return null;const kind=action.target.kind==='mock_start'||action.target.kind==='mock_resume'?'mock':action.target.kind==='interview_question'?(action.target.queueItemId?'queue':'interview'):action.target.kind==='self_introduction'?'self_introduction':action.target.kind==='application_coach'?'application':action.target.kind==='experience_library'?'experience':undefined;return createWeeklyTaskContext(task,plan?.weekStart,kind)}
  function completeWeeklyTask(event:Parameters<typeof completeWeeklyTaskContext>[1],override?:WeeklyTaskContext){const context=override??activeWeeklyTask;if(!completeWeeklyTaskContext(context??undefined,event))return false;setLearningRevision(value=>value+1);setActiveWeeklyTask(null);return true}
  function startDailyAction(action:DailyActionCandidate,explicitWeeklyContext?:WeeklyTaskContext|null,interviewSource:SingleInterviewResumeSource='daily_plan',returnTarget?:InterviewPracticeReturnTarget){
    setTrainingView('dashboard')
    const weeklyContext=explicitWeeklyContext??weeklyContextForAction(action)
    setActiveWeeklyTask(weeklyContext??null)
    const target=action.target
    if(target.kind==='mock_resume'){const session=interviewSessions.find(item=>item.id===target.sessionId&&item.status==='in_progress');if(session){setActiveWeeklyTask(session.weeklyTaskContext??weeklyContext);openSession(session)}return}
    if(target.kind==='single_interview_resume'){resumeSingleInterview();return}
    if(target.kind==='mock_start'){if(target.airlineId){const session={...createInterviewSession({mode:'airline_specific',airlineId:target.airlineId,count:5}),weeklyTaskContext:weeklyContext??undefined};saveInterviewSession(session);setInterviewSessions(loadInterviewSessions());openSession(session)}else setMockInterviewOpen(true);return}
    if(target.kind==='interview_question'){const question=resolveInterviewQuestion(target.questionId,target.airlineId);if(question){setMockSession(null);setPendingSessionAttempt(null);setActiveNav('interview');startInterviewQuestion(question,undefined,undefined,target.airlineId,target.queueItemId,undefined,weeklyContext??undefined,interviewSource,returnTarget)}return}
    if(target.kind==='application_coach'){setApplicationAirlineId(target.airlineId);setActiveNav('resume');setTrainingView('application-coach');return}
    if(target.kind==='self_introduction'){setSelfIntroductionChallengeTarget(target.targetSeconds);setTrainingView('self-introduction');return}
    setTrainingView('experience-library')
  }
  function startWeeklyTask(task:WeeklyRoutineTask){const action=weeklyTaskToDailyAction(task,{validQuestionIds:[...interviewQuestionById.keys()],balancedQuestionId:drillPlan.selectedQuestionIds[0]??'im2',queueItem:openQueueItems[0]});if(!action)return;const kind=action.target.kind==='mock_start'||action.target.kind==='mock_resume'?'mock':action.target.kind==='interview_question'?(action.target.queueItemId?'queue':'interview'):action.target.kind==='self_introduction'?'self_introduction':action.target.kind==='application_coach'?'application':action.target.kind==='experience_library'?'experience':undefined,plan=learningStore.confirmedWeeklyPlans.find(item=>item.days.some(day=>day.tasks.some(candidate=>candidate.id===task.id)));startDailyAction(action,createWeeklyTaskContext(task,plan?.weekStart,kind),'weekly_task','weekly-report')}
  function handleTaskStart(id:string){ if(id===SELF_INTRO_TASK_ID){setSelfIntroductionChallengeTarget(undefined);setTrainingView('self-introduction');return} if(id==='application-coach-motivation'){setActiveNav('resume');setTrainingView('application-coach');return} if(id.startsWith('interview-question-')){const q=interviewQuestionById.get(id.replace('interview-question-',''));if(q){setActiveNav('interview');startInterviewQuestion(q)}return} toggleTask(id) }
  function handleTrainingComplete(attempt:SelfIntroductionAttempt){setTrainingProgress(loadSelfIntroductionProgress());completeWeeklyTask({type:'self_introduction',entityId:attempt.id,completed:attempt.completed})}
  function exitInterviewPractice(){const target=interviewReturnTarget;setActiveWeeklyTask(null);setPracticeConfig(null);setInterviewReturnTarget('interview');if(target==='weekly-report'){setTrainingView('weekly-report');setActiveNav('home')}}
  function exitSelfIntroductionAndNavigate(target:string){const transition=exitSelfIntroductionForNavigation(target as PrimaryNavigationTarget);if(transition.clearActiveWeeklyTask)setActiveWeeklyTask(null);if(transition.clearChallengeTarget)setSelfIntroductionChallengeTarget(undefined);setTrainingView(transition.trainingView);setActiveNav(transition.activeNav)}
  function advanceMockSession(session:InterviewSession,attempt:InterviewAttempt){const next=completeInterviewSessionAttempt(session,attempt.id);if(next.status==='completed'){const completed={...next,sessionAnalysis:analyzeInterviewSession(next,loadInterviewAttempts())};saveInterviewSession(completed);completeWeeklyTask({type:'mock_session',entityId:completed.id,completed:true},completed.weeklyTaskContext);setMockSession(completed);setMockReport(completed);setPracticeConfig(null);return}saveInterviewSession(next);setMockSession(next);const question=interviewQuestionById.get(next.questionIds[next.currentQuestionIndex]);if(question)setPracticeConfig({question,attemptType:'first',targetAirlineId:next.airlineId})}
  function handleInterviewComplete(attempt:InterviewAttempt){if(!mockSession)singleInterviewResumeRepository.clear();if(practiceConfig?.sourceQueueItemId){interviewPracticeQueueRepository.markPracticed(practiceConfig.sourceQueueItemId);completeWeeklyTask({type:'queue_practiced',entityId:practiceConfig.sourceQueueItemId,completed:true},attempt.weeklyTaskContext)}else if(!mockSession&&completeWeeklyInterviewAttempt(attempt)){setLearningRevision(value=>value+1);setActiveWeeklyTask(null)}setInterviewAttempts(loadInterviewAttempts());if(!mockSession)return;if(pendingFollowUp){const enriched=pendingFollowUp.adaptive?{...attempt,isFollowUp:true,parentAttemptId:pendingFollowUp.attempt.id,followUpReason:pendingFollowUp.reason,followUpTemplateId:pendingFollowUp.templateId}:attempt;if(pendingFollowUp.adaptive){saveInterviewAttempt(enriched);queueTrainingAttempt('interview',enriched,Boolean(enriched.audioId));setInterviewAttempts(loadInterviewAttempts())}setPendingFollowUp(null);advanceMockSession(mockSession,enriched);return}setPendingSessionAttempt(attempt)}
  function startMockReportAction(action:MockReportAction){const question=resolveInterviewQuestion(action.questionId,action.airlineId);if(!question)return;setMockSession(null);setActiveWeeklyTask(null);startInterviewQuestion(question,action.sourceAttemptId,undefined,action.airlineId,action.queueItemId,{source:'mock_report',mockSessionId:action.mockSessionId,sourceAttemptId:action.sourceAttemptId,questionId:action.questionId})}
  function continueMockSession(){if(!mockSession||!pendingSessionAttempt)return;if(mockSession.mode==='ai_interviewer'){const question=interviewQuestionById.get(mockSession.questionIds[mockSession.currentQuestionIndex]);const prior=loadInterviewAttempts().filter(item=>mockSession.attemptIds.includes(item.id)&&item.isFollowUp);const decision=question?decideAiInterviewerFollowUp({question,attempt:pendingSessionAttempt,session:mockSession,priorFollowUps:prior,language:'ko',hasPublishedAirlineContext:Boolean(mockSession.airlineId&&getAirlineAIContext(mockSession.airlineId))}):{shouldAsk:false as const,source:'deterministic' as const};if(decision.shouldAsk&&question){const held=completeInterviewSessionAttempt(mockSession,pendingSessionAttempt.id,false);saveInterviewSession(held);setMockSession(held);setPendingSessionAttempt(null);setPracticeConfig(null);setPendingFollowUp({attempt:pendingSessionAttempt,message:decision.questionText??'',adaptive:true,question:buildFollowUpQuestion(question,decision),reason:decision.reason,templateId:decision.templateId});return}}const message=followUpForAttempt(pendingSessionAttempt);if(message&&mockSession.mode!=='ai_interviewer'){const held=completeInterviewSessionAttempt(mockSession,pendingSessionAttempt.id,false);saveInterviewSession(held);setMockSession(held);setPendingSessionAttempt(null);setPracticeConfig(null);setPendingFollowUp({attempt:pendingSessionAttempt,message});return}const attempt=pendingSessionAttempt;setPendingSessionAttempt(null);advanceMockSession(mockSession,attempt)}

  const featureShell=(content:ReactNode,onNavigate:(target:string)=>void=setActiveNav)=><div className="responsive-app flex h-full bg-background"><DesktopNavigation active={activeNav} onChange={onNavigate}/><div className="min-w-0 flex-1 overflow-y-auto">{content}</div></div>
  if(selectedInterviewResult){return featureShell(<SingleInterviewResultRevisit attempt={selectedInterviewResult} onBack={()=>setSelectedInterviewResult(null)} onRetake={()=>{setSelectedInterviewResult(null);setActiveNav('interview');retakeSingleInterview(selectedInterviewResult)}}/>)}
  if(trainingView==='self-introduction')return featureShell(<SelfIntroductionFlow targetAirlineId={diagnosis?.primaryAirline} initialChallengeTarget={selfIntroductionChallengeTarget} onExit={()=>{setActiveWeeklyTask(null);setSelfIntroductionChallengeTarget(undefined);setTrainingView('dashboard')}} onComplete={handleTrainingComplete}/>,exitSelfIntroductionAndNavigate)
  if(trainingView==='experience-library')return featureShell(<ExperienceLibrary onExit={()=>{if(!practiceConfig)setActiveWeeklyTask(null);setTrainingView('dashboard')}} onPractice={(question,experience)=>{setActiveWeeklyTask(null);setTrainingView('dashboard');setActiveNav('interview');startInterviewQuestion(question,undefined,experience.id)}}/>)
  if(trainingView==='application-tracker')return featureShell(<ApplicationTracker onExit={()=>setTrainingView('dashboard')} onOpenCoach={airlineId=>{setApplicationAirlineId(airlineId);setTrainingView('application-coach')}} onPractice={airlineId=>{const question=interviewQuestionById.get('im2');setTrainingView('dashboard');setActiveNav('interview');if(question)startInterviewQuestion(question,undefined,undefined,airlineId)}} onOpenExperience={()=>setTrainingView('experience-library')}/>)
  if(trainingView==='application-coach'||activeNav==='resume')return featureShell(<ApplicationCoach initialAirlineId={applicationAirlineId??(onboardingAnswers?.primaryAirline&&!['custom_airline','undecided_airline'].includes(onboardingAnswers.primaryAirline.id)?onboardingAnswers.primaryAirline.id:undefined)} onExit={()=>{setActiveWeeklyTask(null);setApplicationAirlineId(undefined);setTrainingView('dashboard');setActiveNav('home')}} onOpenExperience={()=>setTrainingView('experience-library')} onPractice={startApplicationDrill}/>)
  if(trainingView==='weekly-report')return featureShell(<WeeklyReportHome onBack={()=>setTrainingView('dashboard')} onStartTask={startWeeklyTask}/>)
  if(practiceConfig)return <>{mockSession&&<MockInterviewProgress session={mockSession} onExit={exitInterviewPractice}/>}<InterviewPracticeEngine key={`${mockSession?.id??'single'}:${practiceConfig.question.id}:${practiceConfig.followUp?.parentAttemptId??'base'}`} config={practiceConfig} onExit={exitInterviewPractice} onComplete={handleInterviewComplete} onNextQuestion={(question)=>startInterviewQuestion(question)} onOpenExperience={selectedExperienceId=>{setPracticeConfig(current=>current?{...current,selectedExperienceId}:current);setTrainingView('experience-library')}} sessionAction={mockSession&&pendingSessionAttempt?{label:mockSession.currentQuestionIndex>=mockSession.questionIds.length-1?'모의면접 결과 보기':'다음 질문',onContinue:continueMockSession}:undefined}/></>
  if(pendingFollowUp&&mockSession){const question=pendingFollowUp.question??interviewQuestionById.get(mockSession.questionIds[mockSession.currentQuestionIndex]);return <MockInterviewFollowUp message={pendingFollowUp.message} adaptive={pendingFollowUp.adaptive} onSkip={()=>{const pending=pendingFollowUp;setPendingFollowUp(null);advanceMockSession(mockSession,pending.attempt)}} onAnswer={()=>{if(question){setPracticeConfig({question,attemptType:'first',previousAttemptId:pendingFollowUp.attempt.id,targetAirlineId:mockSession.airlineId,followUp:pendingFollowUp.adaptive&&pendingFollowUp.reason&&pendingFollowUp.templateId?{parentAttemptId:pendingFollowUp.attempt.id,reason:pendingFollowUp.reason,templateId:pendingFollowUp.templateId}:undefined})}}}/>}
  if(mockReport&&!practiceConfig)return <MockInterviewReport session={mockReport} attempts={interviewAttempts} onBack={()=>{setMockReport(null);setMockSession(null);setActiveNav('interview')}} onRetake={()=>{setMockReport(null);setMockInterviewOpen(true);setMockSession(null)}} onRetry={(attempt)=>{const question=resolveInterviewQuestion(attempt.questionId,attempt.targetAirlineId);if(question){setMockSession(null);startInterviewQuestion(question,attempt.id,undefined,attempt.targetAirlineId,undefined,{source:'mock_report',mockSessionId:mockReport.id,sourceAttemptId:attempt.id,questionId:question.id})}}} onAction={startMockReportAction}/>
  if(mockInterviewOpen)return <MockInterviewLauncher airlineId={diagnosis?.primaryAirline} onBack={()=>setMockInterviewOpen(false)} onView={(session)=>{setMockInterviewOpen(false);setMockSession(session);setMockReport(session)}} onStart={(session,question)=>{const linked=activeWeeklyTask?{...session,weeklyTaskContext:activeWeeklyTask}:session;saveInterviewSession(linked);setMockSession(linked);setMockInterviewOpen(false);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}}/>

  return (
    <div className="responsive-app flex h-full bg-background">
      <DesktopNavigation active={activeNav} onChange={setActiveNav}/>
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AppHeader />
        {activeNav === 'interview'&&!interviewCategory&&<InterviewPracticeQueuePanel onStartQuestion={startInterviewQuestion} onStartQueued={(question,item)=>startInterviewQuestion(question,undefined,undefined,item.airlineId,item.id)}/>}

        {activeNav === 'interview' ? (interviewCategory?<AirlineInterviewQuestionList category={interviewCategory} targetAirlineId={diagnosis?.primaryAirline} onBack={()=>setInterviewCategory(null)} onStart={startInterviewQuestion}/>:<>{singleInterviewResume&&<section className="px-5 pt-4"><div className="rounded-2xl border border-gold/40 bg-card p-4"><strong className="text-sm text-navy">진행 중인 단일 면접 연습이 있습니다.</strong><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={resumeSingleInterview} className="min-h-11 rounded-xl bg-navy text-sm font-bold text-ivory">이어서 연습</button><button type="button" onClick={()=>singleInterviewResumeRepository.clear()} className="min-h-11 rounded-xl border border-border text-sm font-bold text-navy">연습 종료</button></div>{invalidResume&&<p className="mt-2 text-xs text-coral">이 연습 질문을 더 이상 사용할 수 없습니다. 연습을 종료하고 질문을 다시 선택해 주세요.</p>}</div></section>}<div className="px-5 pt-4"><button onClick={()=>setMockInterviewOpen(true)} className="h-12 w-full rounded-2xl bg-navy text-sm font-bold text-ivory">모의면접 시작</button></div><MockInterviewSessionHistory onStart={()=>setMockInterviewOpen(true)} onResume={(session)=>{const question=interviewQuestionById.get(session.questionIds[session.currentQuestionIndex]);if(question){setMockSession(session);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}}} onView={(session)=>{setMockSession(session);setMockReport(session)}}/><InterviewPracticeHome attempts={singleInterviewHistory} onSelectCategory={setInterviewCategory} onStartQuestion={startInterviewQuestion} onOpenExperience={()=>setTrainingView('experience-library')} onViewAttempt={setSelectedInterviewResult} onRetakeAttempt={retakeSingleInterview}/></>) : activeNav === 'my' ? <main className="space-y-4 px-5 pb-8 pt-6"><AccountSummary onLogin={onLogin}/><section className="rounded-3xl border border-border bg-card p-6"><span className="eyebrow text-muted-foreground">MY PROFILE</span><h2 className="mt-3 text-xl font-bold text-navy">나의 준비 설정</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">목표와 진단 답변을 다시 확인하고 맞춤 루틴을 조정할 수 있어요.</p><button type="button" onClick={onEditDiagnosis} className="mt-6 h-12 w-full rounded-2xl border border-navy font-semibold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">진단 다시 하기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">지원 현황</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">지원 상태, 마감일과 면접 일정을 관리하세요.</p><button type="button" onClick={()=>setTrainingView('application-tracker')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">지원 일정 보기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">주간 리포트</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">실제 학습 기록과 역량 변화, 다음 주 추천 계획을 확인하세요.</p><button type="button" onClick={()=>setTrainingView('weekly-report')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">주간 리포트 보기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">나의 경험 저장소</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">저장한 경험은 여러 면접 질문에서 다시 활용할 수 있어요.</p><button type="button" onClick={()=>setTrainingView('experience-library')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">경험 저장소 열기</button></section></main> : <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 pb-8 pt-6 md:px-8 xl:grid xl:grid-cols-12 xl:items-start xl:gap-5 xl:px-10">
          <section aria-labelledby="daily-plan-heading" className="grid gap-3 xl:col-span-12 xl:grid-cols-12">
            <h1 id="daily-plan-heading" className="sr-only">오늘 할 일</h1>
            <div className="xl:col-span-7"><DailyActionCard action={homePresentation.primary} primary onStart={()=>startDailyAction(homePresentation.primary)}/></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:col-span-5">
              {homePresentation.resume?<div className="sm:col-span-2"><DailyActionCard action={homePresentation.resume} onStart={()=>startDailyAction(homePresentation.resume!)}/></div>:null}
              {homePresentation.secondary.map(action=><DailyActionCard key={action.id} action={action} onStart={()=>startDailyAction(action)}/>)}
            </div>
          </section>
          <section aria-labelledby="weekly-progress-heading" className="grid gap-3 md:grid-cols-2 xl:col-span-12">
            <div className="rounded-2xl border border-border bg-card p-4"><span className="eyebrow text-muted-foreground">THIS WEEK</span><h2 id="weekly-progress-heading" className="mt-1 text-base font-bold text-navy">이번 주 진행</h2>{homePresentation.weeklyProgress?<p className="mt-3 text-sm text-midnight">주간 루틴 <strong>{homePresentation.weeklyProgress.completed}/{homePresentation.weeklyProgress.total}</strong> 완료</p>:<p className="mt-3 text-sm text-muted-foreground">확정된 주간 루틴이 없습니다.</p>}</div>
            <div className="rounded-2xl border border-border bg-card p-4"><span className="eyebrow text-muted-foreground">LEARNING ACTIVITY</span><h2 className="mt-1 text-base font-bold text-navy">학습 활동</h2><p className="mt-3 text-sm text-midnight">이번 주 실제 활동 <strong>{homePresentation.activityCount}회</strong> · 연속 기록 <strong>{homePresentation.streakLabel}</strong></p></div>
          </section>
          {latestWeakness?<section className="rounded-3xl border border-gold/30 bg-card p-5 xl:col-span-8"><span className="eyebrow text-gold">COACH SIGNAL</span><h2 className="mt-2 text-lg font-bold text-navy">최근 약점 · {latestWeakness.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{latestWeakness.explanation}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(latestWeakness.latestObservedAt).toLocaleDateString('ko-KR')} · 실제 연습 분석</p></section>:null}
          {upcomingApplications.length?<section className="rounded-3xl border border-border bg-card p-5 xl:col-span-4">
            <div className="flex items-start justify-between gap-3"><div><span className="eyebrow text-gold">APPLICATIONS</span><h2 className="mt-2 text-lg font-bold text-navy">다가오는 지원 일정</h2></div><button type="button" onClick={()=>setTrainingView('application-tracker')} className="text-sm font-bold text-navy">전체 보기 →</button></div>
            <div className="mt-4 space-y-2">{upcomingApplications.slice(0,1).map(({application,importantDate})=><button type="button" key={application.id} onClick={()=>setTrainingView('application-tracker')} className="flex w-full items-center justify-between rounded-2xl bg-secondary/60 p-3 text-left"><span><strong className="block text-sm text-navy">{application.airlineNameSnapshot}</strong><span className="mt-1 block text-xs text-muted-foreground">{importantDate.kind==='interview'?'면접':'지원 마감'} · {new Date(`${importantDate.date.slice(0,10)}T00:00:00`).toLocaleDateString('ko-KR')}</span></span><strong className="text-base text-navy">{importantDate.dday}</strong></button>)}</div>
            {upcomingApplications.filter(item=>item.importantDate.days<=7).length?<p className="mt-3 text-xs text-muted-foreground">이번 주 지원 일정 {upcomingApplications.filter(item=>item.importantDate.days<=7).length}개</p>:null}
          </section>:null}
          <section className="rounded-3xl border border-border bg-card p-5 xl:col-span-8">
            <span className="eyebrow text-muted-foreground">TODAY'S EXPERIENCE</span>
            <h2 className="mt-2 text-lg font-bold text-navy">오늘의 경험 준비</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {homeExperienceUsage ? describeExperienceUsageConcentration(homeExperienceUsage) : '아직 연결된 사용 이력이 없어요.'}
            </p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">현재 강점</p>
                <strong className="mt-1 block text-sm text-navy">{experienceCoverage.strongAreas[0] ? onboardingKo.experienceLibrary.competencies[experienceCoverage.strongAreas[0].competency] : '아직 없음'}</strong>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-xs text-muted-foreground">다음 준비</p>
                <strong className="mt-1 block text-sm text-navy">{experienceCoverage.missingAreas[0] ? onboardingKo.experienceLibrary.competencies[experienceCoverage.missingAreas[0]] : '균형 준비됨'}</strong>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {homeExperienceUsage ? `활용 ${homeExperienceUsage.totalUsageCount}회 · ${describeExperienceUsageBalance(homeExperienceUsage)}` : '면접 · 지원서 · 자기소개에서 같은 경험을 다시 쓰면 여기에 표시돼요.'}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{experienceCoverage.missingAreas.length ? `다음에 준비하면 좋은 경험: ${experienceCoverage.missingAreas.slice(0, 2).map(tag=>onboardingKo.experienceLibrary.competencies[tag]).join(' · ')}` : '핵심 역량이 균형 있게 준비되어 있어요.'}</p>
            <button type="button" onClick={()=>setTrainingView('experience-library')} className="mt-4 h-11 w-full rounded-xl border border-navy text-sm font-bold text-navy">경험으로 면접 연습</button>
          </section>
          <button type="button" onClick={()=>{setSelfIntroductionChallengeTarget(60);setTrainingView('self-introduction')}} className="-mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left xl:col-span-4 xl:mt-0 xl:min-h-[116px]"><span><strong className="block text-sm text-navy">오늘 60초 자기소개 연습</strong><span className="mt-1 block text-xs text-muted-foreground">시간과 답변 구조를 함께 점검해보세요.</span></span><span className="text-sm font-bold text-gold">시작 →</span></button>

          {recentCompletedSessions.length?<section className="rounded-3xl border border-border bg-card p-5 xl:col-span-12"><div className="flex items-center justify-between"><div><span className="eyebrow text-muted-foreground">RECENT</span><h2 className="mt-2 text-lg font-bold text-navy">최근 모의면접</h2></div><button type="button" onClick={()=>setActiveNav('interview')} className="text-sm font-bold text-navy">전체 보기 →</button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{recentCompletedSessions.map(session=><article key={session.id} className="rounded-2xl bg-secondary/60 p-4"><strong className="text-sm text-navy">{session.mode==='ai_interviewer'?'AI 면접관':'모의면접'}</strong><p className="mt-1 text-xs text-muted-foreground">{session.questionIds.length}문항 · {new Date(session.completedAt??session.startedAt).toLocaleDateString('ko-KR')}</p><p className="mt-3 line-clamp-2 text-sm text-midnight">{session.sessionAnalysis?.improvements[0]??'완료한 답변 리포트를 확인해보세요.'}</p><button type="button" onClick={()=>{setMockSession(session);setMockReport(session)}} className="mt-3 text-sm font-bold text-navy">결과 보기</button></article>)}</div></section>:null}

          {diagnosis ? <div className="xl:col-span-4"><JourneyCard onStartTraining={() => setActiveNav('routine')} target={diagnosis.primaryAirline} score={readinessSnapshot.currentReadinessScore} nextGoal={trainingProgress.routineCompleted?'자기소개와 지원동기 다듬기':diagnosis.priorityAreas[0]?.title} /></div> : null}

          {/* Preparation overview */}
          <section
            aria-labelledby="overview-heading"
            className="rounded-3xl border border-border bg-card p-6 xl:col-span-8"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <span className="eyebrow text-muted-foreground">PREPARATION</span>
                <h2
                  id="overview-heading"
                  className="mt-1.5 text-lg font-bold tracking-tight text-navy"
                >
                  준비 현황
                </h2>
              </div>
            </div>

            {homeRealState.readiness !== undefined && homeRealState.skills ? <><ReadinessGauge value={readinessSnapshot.currentReadinessScore} /><div className="mt-6 border-t border-border pt-6"><SkillProgressList skills={homeRealState.skills.slice(0,3)} /></div></> : <div className="rounded-2xl bg-secondary/60 p-5"><strong className="text-base text-navy">준비도 데이터가 아직 없습니다.</strong><p className="mt-2 text-sm text-muted-foreground">첫 진단을 완료하면 실제 응답을 기준으로 준비 현황이 표시됩니다.</p>{onEditDiagnosis ? <button type="button" onClick={onEditDiagnosis} className="mt-4 text-sm font-bold text-navy">첫 진단 시작 →</button> : null}</div>}

            <div className="mt-5 flex gap-3 rounded-2xl bg-secondary/60 p-4">
              <Lightbulb className="h-[18px] w-[18px] shrink-0 text-gold" strokeWidth={2} />
              <p className="text-sm leading-relaxed text-midnight">
                {homeRealState.recentCoaching?.message ?? '첫 연습을 완료하면 실제 분석을 바탕으로 맞춤 피드백이 표시됩니다.'}
              </p>
            </div>
          </section>

          <div className="xl:col-span-8"><DailyRoutineList
            label="TODAY’S ROUTE"
            title="오늘의 준비 루틴"
            totalTimeLabel={`약 ${tasks.reduce((sum, task) => sum + task.minutes, 0)}분`}
            tasks={tasks}
            onToggle={toggleTask}
            onTaskStart={handleTaskStart}
          /></div>

          <button type="button" onClick={()=>setTrainingView('weekly-report')} className="rounded-2xl border border-border bg-card p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold xl:col-span-4"><span className="eyebrow text-gold">WEEKLY REPORT</span><div className="mt-3 flex items-end justify-between"><div><strong className="text-xl text-navy">{weeklySummary.totalMinutes}분</strong><p className="mt-1 text-sm text-muted-foreground">이번 주 · {weeklySummary.activeDays}일 활동</p></div><span className="text-sm font-bold text-navy">리포트 보기 →</span></div></button>

          {!latestWeakness&&homeRealState.recentCoaching?<div className="xl:col-span-8"><CoachFeedbackCard message={homeRealState.recentCoaching.message} timeLabel={homeRealState.recentCoaching.timeLabel} /></div>:null}
        </main>}
      </div>

      <BottomNavigation active={activeNav} onChange={setActiveNav} />
      </div>
    </div>
  )
}
