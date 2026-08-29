'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { JourneyCard } from '@/components/journey-card'
import { ReadinessGauge } from '@/components/readiness-gauge'
import { SkillProgressList } from '@/components/skill-progress-list'
import { DailyRoutineList } from '@/components/daily-routine-list'
import { CoachFeedbackCard } from '@/components/coach-feedback-card'
import { SecondaryStats } from '@/components/secondary-stats'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Lightbulb } from 'lucide-react'
import { onboardingKo } from '@/lib/onboarding-i18n'
import { dailyRoute, readiness, type RoutineTask, type TaskStatus } from '@/lib/mock-data'
import type { DiagnosisResult, OnboardingAnswers } from '@/lib/onboarding-data'
import { SelfIntroductionFlow } from '@/components/self-introduction'
import { loadSelfIntroductionProgress, SELF_INTRO_TASK_ID, type SelfIntroductionAttempt, type SelfIntroductionProgress } from '@/lib/self-introduction-data'
import { InterviewPracticeEngine, InterviewPracticeHome, InterviewPracticeQueuePanel, AirlineInterviewQuestionList } from '@/components/interview-practice'
import { MockInterviewFollowUp, MockInterviewLauncher, MockInterviewProgress, MockInterviewReport, MockInterviewSessionHistory } from '@/components/interview-practice/mock-interview-session'
import { analyzeInterviewSession, completeInterviewSessionAttempt, createInterviewSession, followUpForAttempt, loadInterviewSessions, saveInterviewSession, type InterviewSession } from '@/lib/mock-interview-session'
import { buildFollowUpQuestion, decideAiInterviewerFollowUp } from '@/lib/ai-interviewer'
import { interviewQuestionById, loadInterviewAttempts, loadInterviewCapabilityGains, saveInterviewAttempt, type InterviewAttempt, type InterviewCategory, type InterviewPracticeConfig, type InterviewQuestion } from '@/lib/interview-practice-data'
import { ExperienceLibrary } from '@/components/experience-library'
import { experienceRepository, type CareerExperience } from '@/lib/experience-repository'
import { ApplicationCoach } from '@/components/application-coach'
import { getApplicationCapabilityGains, listApplicationAnswers } from '@/lib/application-answer-repository'
import { WeeklyReportHome } from '@/components/weekly-report'
import { getCurrentReadinessSnapshot, getWeeklyLearningSummary, generateNextWeekPriorities } from '@/lib/learning-analytics-service'
import { learningAnalyticsRepository } from '@/lib/learning-analytics-repository'
import { AccountSummary } from '@/components/account/account-summary'
import { queueTrainingAttempt } from '@/lib/supabase/training-attempt-repositories'
import { airlineKnowledgeRepository, getAirlineAIContext } from '@/lib/airline-knowledge-repository'
import { buildHomeDrillPlan, buildHomeInterviewRecommendation, buildRecentInterviewGrowth, buildWeeklyInterviewActivity, canUseAirlineContext, findResumableSession, loadHomeInterviewHistory } from '@/lib/home-dashboard-v2'
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
  const [sessionHistoryReady,setSessionHistoryReady]=useState(false)
  const [sessionHistoryAvailable,setSessionHistoryAvailable]=useState(true)
  const [capabilityGains,setCapabilityGains]=useState<Record<string,number>>({})
  const [trainingProgress,setTrainingProgress]=useState<SelfIntroductionProgress>({routineCompleted:false,interviewScoreGain:0,scoreHistory:[]})
  const [usageRevision,setUsageRevision]=useState(0)
  const [experienceRevision,setExperienceRevision]=useState(0)
  useEffect(()=>{setTrainingProgress(loadSelfIntroductionProgress());setCapabilityGains({...loadInterviewCapabilityGains(),...getApplicationCapabilityGains()});const history=loadHomeInterviewHistory({loadSessions:loadInterviewSessions,loadAttempts:loadInterviewAttempts});setInterviewAttempts(history.attempts);setInterviewSessions(history.sessions);setSessionHistoryAvailable(history.available);setSessionHistoryReady(true);const usageChanged=()=>setUsageRevision(v=>v+1);const experienceChanged=()=>setExperienceRevision(v=>v+1);window.addEventListener('cabin:training-sync-changed',usageChanged);window.addEventListener('cabin:application-local-changed',usageChanged);window.addEventListener('cabin:application-sync-changed',usageChanged);window.addEventListener('cabin:experience-sync-changed',experienceChanged);return()=>{window.removeEventListener('cabin:training-sync-changed',usageChanged);window.removeEventListener('cabin:application-local-changed',usageChanged);window.removeEventListener('cabin:application-sync-changed',usageChanged);window.removeEventListener('cabin:experience-sync-changed',experienceChanged)}},[])
  useEffect(()=>{let active=true;const load=()=>void authService.currentUser().then(user=>getAirlineApplicationRepository(user).list()).then(items=>{if(active)setTrackedApplications(items)}).catch(()=>{});load();window.addEventListener('cabin:application-local-changed',load);window.addEventListener('cabin:application-sync-changed',load);return()=>{active=false;window.removeEventListener('cabin:application-local-changed',load);window.removeEventListener('cabin:application-sync-changed',load)}},[])
  const baseTasks: RoutineTask[] = diagnosis ? diagnosis.starterPlan.slice(0, diagnosis.routineTaskCount).map((item, index) => ({ id: `personal-${item.day}`, step: index + 2, name: item.title, minutes: diagnosis.routineMinutesPerTask, status: 'todo' })) : [...dailyRoute.tasks].map((task,index)=>({...task,step:index+2}))
  const interviewRoutineDone=interviewAttempts.some(a=>a.questionId==='im2')
  const applicationRoutineDone=listApplicationAnswers().some(a=>a.status==='reviewed'||a.status==='ready')
  const personalizedTasks: RoutineTask[] = [{id:SELF_INTRO_TASK_ID,step:1,name:'자기소개 실전 진단',description:'평소 면접처럼 자유롭게 답변하고, 내용과 전달 방식을 분석해 보세요.',minutes:10,status:trainingProgress.routineCompleted?'done':'in-progress'},{id:'application-coach-motivation',step:2,name:'지원동기 초안 작성',description:'실제 경험과 검수된 항공사 문맥으로 지원 답변을 정리해 보세요.',minutes:15,status:applicationRoutineDone?'done':'todo'},{id:'interview-question-im2',step:3,name:'지원동기 답변 훈련',description:'지원 이유를 직접 답하고 내용과 전달 방식을 함께 분석해 보세요.',minutes:10,status:interviewRoutineDone?'done':'todo'},...baseTasks.map(task=>({...task,step:task.step+2}))]
  const [tasks, setTasks] = useState<RoutineTask[]>(personalizedTasks)
  useEffect(()=>setTasks(current=>current.map(task=>task.id===SELF_INTRO_TASK_ID?{...task,status:trainingProgress.routineCompleted?'done':'in-progress'}:task.id==='interview-question-im2'?{...task,status:interviewRoutineDone?'done':'todo'}:task)),[trainingProgress.routineCompleted,interviewRoutineDone])
  const interviewGain=(capabilityGains.interview_communication??0);const skillGain=(id:string)=>id==='interview'?trainingProgress.interviewScoreGain+interviewGain:id==='resume'?(capabilityGains.application_readiness??0):id==='situation'?(capabilityGains.customer_situation_handling??0)+(capabilityGains.safety_and_role_judgment??0):0
  const skills = diagnosis ? readiness.skills.map((skill) => ({ ...skill, value: Math.min(100,(diagnosis.skillScores[skill.id] ?? diagnosis.overallReadiness)+skillGain(skill.id)) })) : readiness.skills.map(skill=>({...skill,value:Math.min(100,skill.value+skillGain(skill.id))}))
  const readinessSnapshot=getCurrentReadinessSnapshot(),weeklySummary=getWeeklyLearningSummary(),nextPriority=generateNextWeekPriorities()[0]
  const adjustedReadiness=readinessSnapshot.currentReadinessScore
  const coachMessage=weeklySummary.activityCount>=2?`${nextPriority.title}을 다음 우선순위로 추천해요. ${nextPriority.reason}`:interviewAttempts.length?'면접 훈련 결과를 반영했어요. 가장 낮은 평가 기준을 중심으로 다음 추천 질문을 연습해 보세요.':trainingProgress.routineCompleted?'자기소개 실전 진단을 완료했어요. 다음에는 경험의 행동과 결과를 더 선명하게 말하고, 마지막에 객실승무원 직무와 연결해 보세요.':diagnosis?.coachMessage ?? readiness.coachingMessage
  const targetAirlineId=diagnosis?.primaryAirline
  const airlineProfile=targetAirlineId?airlineKnowledgeRepository.getProfile(targetAirlineId):undefined
  const airlineContext=targetAirlineId?getAirlineAIContext(targetAirlineId):null
  const hasPublishedAirlineContext=sessionHistoryAvailable&&canUseAirlineContext({contextAvailable:Boolean(airlineContext),verified:Boolean(airlineContext?.sourceGrade.some(grade=>['A','B','C'].includes(grade))),reviewStatus:airlineProfile?.reviewStatus,publishStatus:airlineProfile?.publishStatus,aiContextEnabled:Boolean(airlineContext?.publishedRecruitmentRequirements.length)})
  const interviewRecommendation=buildHomeInterviewRecommendation({attempts:interviewAttempts,targetAirlineId,hasPublishedAirlineContext})
  const drillPlan=buildHomeDrillPlan(interviewRecommendation.topic)
  const resumableSession=findResumableSession(interviewSessions)
  const recentCompletedSessions=interviewSessions.filter(item=>item.status==='completed').sort((a,b)=>(b.completedAt??b.startedAt).localeCompare(a.completedAt??a.startedAt)).slice(0,3)
  const recentGrowth=buildRecentInterviewGrowth(interviewSessions,interviewAttempts)
  const weeklyInterviewActivity=buildWeeklyInterviewActivity(interviewSessions,interviewAttempts)
  const experienceCoverage=getExperienceCoverage()
  const experienceUsageById=useMemo(()=>buildExperienceUsageSummary({experiences:experienceRepository.load().experiences,interviewAttempts:loadInterviewAttempts(),applicationAnswers:listApplicationAnswers(),applicationWorkDrafts:listWorkDrafts(),selfIntroductionAttempts:loadSelfIntroductionAttempts()}),[usageRevision,experienceRevision,interviewAttempts.length,interviewSessions.length,trainingProgress.routineCompleted])
  const homeExperienceUsage=Object.values(experienceUsageById).sort((a,b)=>b.totalUsageCount-a.totalUsageCount)[0]
  const upcomingApplications=sortUpcomingApplications(trackedApplications)

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

  function startInterviewQuestion(question:InterviewQuestion,previousAttemptId?:string,selectedExperienceId?:string,targetAirlineOverride?:string,sourceQueueItemId?:string){const latest=interviewAttempts.find(attempt=>attempt.questionId===question.id);const linkedId=previousAttemptId??latest?.id;setPracticeConfig({question,attemptType:linkedId?'retry':'first',previousAttemptId:linkedId,targetAirlineId:targetAirlineOverride??diagnosis?.primaryAirline,selectedExperienceId,sourceQueueItemId})}
  function openSession(session:InterviewSession){const question=interviewQuestionById.get(session.questionIds[session.currentQuestionIndex]);if(!question)return;setMockSession(session);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}
  function startHomeSession(count:3|5){const session=createInterviewSession({mode:'ai_interviewer',airlineId:interviewRecommendation.airlineId,count,questionIds:count===3?drillPlan.selectedQuestionIds:undefined});setInterviewSessions(loadInterviewSessions());openSession(session)}
  function handleTaskStart(id:string){ if(id===SELF_INTRO_TASK_ID){setSelfIntroductionChallengeTarget(undefined);setTrainingView('self-introduction');return} if(id==='application-coach-motivation'){setActiveNav('resume');setTrainingView('application-coach');return} if(id.startsWith('interview-question-')){const q=interviewQuestionById.get(id.replace('interview-question-',''));if(q){setActiveNav('interview');startInterviewQuestion(q)}return} toggleTask(id) }
  function handleTrainingComplete(_attempt:SelfIntroductionAttempt){setTrainingProgress(loadSelfIntroductionProgress())}
  function advanceMockSession(session:InterviewSession,attempt:InterviewAttempt){const next=completeInterviewSessionAttempt(session,attempt.id);if(next.status==='completed'){const completed={...next,sessionAnalysis:analyzeInterviewSession(next,loadInterviewAttempts())};saveInterviewSession(completed);setMockSession(completed);setMockReport(completed);setPracticeConfig(null);return}saveInterviewSession(next);setMockSession(next);const question=interviewQuestionById.get(next.questionIds[next.currentQuestionIndex]);if(question)setPracticeConfig({question,attemptType:'first',targetAirlineId:next.airlineId})}
  function handleInterviewComplete(attempt:InterviewAttempt){if(practiceConfig?.sourceQueueItemId)interviewPracticeQueueRepository.markPracticed(practiceConfig.sourceQueueItemId);setInterviewAttempts(loadInterviewAttempts());setCapabilityGains(loadInterviewCapabilityGains());if(!mockSession)return;if(pendingFollowUp){const enriched=pendingFollowUp.adaptive?{...attempt,isFollowUp:true,parentAttemptId:pendingFollowUp.attempt.id,followUpReason:pendingFollowUp.reason,followUpTemplateId:pendingFollowUp.templateId}:attempt;if(pendingFollowUp.adaptive){saveInterviewAttempt(enriched);queueTrainingAttempt('interview',enriched,Boolean(enriched.audioId));setInterviewAttempts(loadInterviewAttempts())}setPendingFollowUp(null);advanceMockSession(mockSession,enriched);return}setPendingSessionAttempt(attempt)}
  function continueMockSession(){if(!mockSession||!pendingSessionAttempt)return;if(mockSession.mode==='ai_interviewer'){const question=interviewQuestionById.get(mockSession.questionIds[mockSession.currentQuestionIndex]);const prior=loadInterviewAttempts().filter(item=>mockSession.attemptIds.includes(item.id)&&item.isFollowUp);const decision=question?decideAiInterviewerFollowUp({question,attempt:pendingSessionAttempt,session:mockSession,priorFollowUps:prior,language:'ko',hasPublishedAirlineContext:Boolean(mockSession.airlineId&&getAirlineAIContext(mockSession.airlineId))}):{shouldAsk:false as const,source:'deterministic' as const};if(decision.shouldAsk&&question){const held=completeInterviewSessionAttempt(mockSession,pendingSessionAttempt.id,false);saveInterviewSession(held);setMockSession(held);setPendingSessionAttempt(null);setPracticeConfig(null);setPendingFollowUp({attempt:pendingSessionAttempt,message:decision.questionText??'',adaptive:true,question:buildFollowUpQuestion(question,decision),reason:decision.reason,templateId:decision.templateId});return}}const message=followUpForAttempt(pendingSessionAttempt);if(message&&mockSession.mode!=='ai_interviewer'){const held=completeInterviewSessionAttempt(mockSession,pendingSessionAttempt.id,false);saveInterviewSession(held);setMockSession(held);setPendingSessionAttempt(null);setPracticeConfig(null);setPendingFollowUp({attempt:pendingSessionAttempt,message});return}const attempt=pendingSessionAttempt;setPendingSessionAttempt(null);advanceMockSession(mockSession,attempt)}

  if(trainingView==='self-introduction')return <SelfIntroductionFlow targetAirlineId={diagnosis?.primaryAirline} initialChallengeTarget={selfIntroductionChallengeTarget} onExit={()=>setTrainingView('dashboard')} onComplete={handleTrainingComplete}/>
  if(trainingView==='experience-library')return <ExperienceLibrary onExit={()=>setTrainingView('dashboard')} onPractice={(question,experience)=>{setTrainingView('dashboard');setActiveNav('interview');startInterviewQuestion(question,undefined,experience.id)}}/>
  if(trainingView==='application-tracker')return <ApplicationTracker onExit={()=>setTrainingView('dashboard')} onOpenCoach={airlineId=>{setApplicationAirlineId(airlineId);setTrainingView('application-coach')}} onPractice={airlineId=>{const question=interviewQuestionById.get('im2');setTrainingView('dashboard');setActiveNav('interview');if(question)startInterviewQuestion(question,undefined,undefined,airlineId)}} onOpenExperience={()=>setTrainingView('experience-library')}/>
  if(trainingView==='application-coach'||activeNav==='resume')return <ApplicationCoach initialAirlineId={applicationAirlineId??(onboardingAnswers?.primaryAirline&&!['custom_airline','undecided_airline'].includes(onboardingAnswers.primaryAirline.id)?onboardingAnswers.primaryAirline.id:undefined)} onExit={()=>{setApplicationAirlineId(undefined);setTrainingView('dashboard');setActiveNav('home')}} onOpenExperience={()=>setTrainingView('experience-library')} onPractice={(category,_keywords)=>{const question=interviewQuestionById.get(category==='introduction_and_motivation'?'im2':category==='customer_situation'?'cs1':category==='safety_and_role_judgment'?'sj1':'be1');setTrainingView('dashboard');setActiveNav('interview');if(question)startInterviewQuestion(question,undefined,undefined,applicationAirlineId)}}/>
  if(trainingView==='weekly-report')return <WeeklyReportHome onBack={()=>setTrainingView('dashboard')}/>
  if(practiceConfig)return <>{mockSession&&<MockInterviewProgress session={mockSession} onExit={()=>setPracticeConfig(null)}/>}<InterviewPracticeEngine config={practiceConfig} onExit={()=>setPracticeConfig(null)} onComplete={handleInterviewComplete} onNextQuestion={(question)=>startInterviewQuestion(question)} onOpenExperience={selectedExperienceId=>{setPracticeConfig(current=>current?{...current,selectedExperienceId}:current);setTrainingView('experience-library')}} sessionAction={mockSession&&pendingSessionAttempt?{label:mockSession.currentQuestionIndex>=mockSession.questionIds.length-1?'모의면접 결과 보기':'다음 질문',onContinue:continueMockSession}:undefined}/></>
  if(pendingFollowUp&&mockSession){const question=pendingFollowUp.question??interviewQuestionById.get(mockSession.questionIds[mockSession.currentQuestionIndex]);return <MockInterviewFollowUp message={pendingFollowUp.message} adaptive={pendingFollowUp.adaptive} onSkip={()=>{const pending=pendingFollowUp;setPendingFollowUp(null);advanceMockSession(mockSession,pending.attempt)}} onAnswer={()=>{if(question){setPracticeConfig({question,attemptType:'first',previousAttemptId:pendingFollowUp.attempt.id,targetAirlineId:mockSession.airlineId,followUp:pendingFollowUp.adaptive&&pendingFollowUp.reason&&pendingFollowUp.templateId?{parentAttemptId:pendingFollowUp.attempt.id,reason:pendingFollowUp.reason,templateId:pendingFollowUp.templateId}:undefined})}}}/>}
  if(mockReport)return <MockInterviewReport session={mockReport} attempts={interviewAttempts} onBack={()=>{setMockReport(null);setMockSession(null);setActiveNav('interview')}} onRetake={()=>{setMockReport(null);setMockInterviewOpen(true);setMockSession(null)}} onRetry={(attempt)=>{const question=interviewQuestionById.get(attempt.questionId);if(question){setMockReport(null);startInterviewQuestion(question,attempt.id)}}}/>
  if(mockInterviewOpen)return <MockInterviewLauncher airlineId={diagnosis?.primaryAirline} onBack={()=>setMockInterviewOpen(false)} onView={(session)=>{setMockInterviewOpen(false);setMockSession(session);setMockReport(session)}} onStart={(session,question)=>{setMockSession(session);setMockInterviewOpen(false);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}}/>

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AppHeader />
        {activeNav === 'interview'&&!interviewCategory&&<InterviewPracticeQueuePanel onStartQuestion={startInterviewQuestion} onStartQueued={(question,item)=>startInterviewQuestion(question,undefined,undefined,item.airlineId,item.id)}/>}

        {activeNav === 'interview' ? (interviewCategory?<AirlineInterviewQuestionList category={interviewCategory} targetAirlineId={diagnosis?.primaryAirline} onBack={()=>setInterviewCategory(null)} onStart={startInterviewQuestion}/>:<><div className="px-5 pt-4"><button onClick={()=>setMockInterviewOpen(true)} className="h-12 w-full rounded-2xl bg-navy text-sm font-bold text-ivory">모의면접 시작</button></div><MockInterviewSessionHistory onStart={()=>setMockInterviewOpen(true)} onResume={(session)=>{const question=interviewQuestionById.get(session.questionIds[session.currentQuestionIndex]);if(question){setMockSession(session);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}}} onView={(session)=>{setMockSession(session);setMockReport(session)}}/><InterviewPracticeHome attempts={interviewAttempts} onSelectCategory={setInterviewCategory} onStartQuestion={startInterviewQuestion} onOpenExperience={()=>setTrainingView('experience-library')}/></>) : activeNav === 'my' ? <main className="space-y-4 px-5 pb-8 pt-6"><AccountSummary onLogin={onLogin}/><section className="rounded-3xl border border-border bg-card p-6"><span className="eyebrow text-muted-foreground">MY PROFILE</span><h2 className="mt-3 text-xl font-bold text-navy">나의 준비 설정</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">목표와 진단 답변을 다시 확인하고 맞춤 루틴을 조정할 수 있어요.</p><button type="button" onClick={onEditDiagnosis} className="mt-6 h-12 w-full rounded-2xl border border-navy font-semibold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">진단 다시 하기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">지원 현황</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">지원 상태, 마감일과 면접 일정을 관리하세요.</p><button type="button" onClick={()=>setTrainingView('application-tracker')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">지원 일정 보기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">주간 리포트</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">실제 학습 기록과 역량 변화, 다음 주 추천 계획을 확인하세요.</p><button type="button" onClick={()=>setTrainingView('weekly-report')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">주간 리포트 보기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">나의 경험 저장소</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">저장한 경험은 여러 면접 질문에서 다시 활용할 수 있어요.</p><button type="button" onClick={()=>setTrainingView('experience-library')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">경험 저장소 열기</button></section></main> : <main className="flex flex-col gap-7 px-5 pb-8 pt-6">
          <section aria-labelledby="today-interview-heading" className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-3xl bg-navy p-6 text-ivory shadow-sm">
              {resumableSession?<>
                <span className="eyebrow text-gold">RESUME</span>
                <h1 id="today-interview-heading" className="mt-2 text-2xl font-bold">이어할 면접이 있어요</h1>
                <p className="mt-2 text-sm text-ivory/75">{resumableSession.mode==='ai_interviewer'?'AI 면접관':'모의면접'} · {Math.min(resumableSession.currentQuestionIndex+1,resumableSession.questionIds.length)} / {resumableSession.questionIds.length} 진행</p>
                <button type="button" onClick={()=>openSession(resumableSession)} className="mt-5 h-12 w-full rounded-2xl bg-gold font-bold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">이어하기</button>
              </>:<>
                <span className="eyebrow text-gold">TODAY</span>
                <h1 id="today-interview-heading" className="mt-2 text-2xl font-bold">오늘의 AI 면접</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-white/10 px-3 py-1.5">Quick 5</span><span className="rounded-full bg-white/10 px-3 py-1.5">약 8분</span>{targetAirlineId?<span className="rounded-full bg-white/10 px-3 py-1.5">{targetAirlineId} 준비</span>:null}</div>
                <p className="mt-4 text-sm leading-relaxed text-ivory/75">{interviewAttempts.length?interviewRecommendation.reason:'첫 모의면접을 바로 시작해보세요.'}</p>
                <p className="mt-2 text-sm font-semibold text-gold">{interviewRecommendation.focus.slice(0,3).join(' · ')}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2"><button type="button" onClick={()=>startHomeSession(5)} className="h-12 rounded-2xl bg-coral font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">지금 시작</button><button type="button" onClick={()=>setMockInterviewOpen(true)} className="h-12 rounded-2xl border border-white/25 font-bold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">설정하고 시작</button></div>
              </>}
            </div>
            <div className="rounded-3xl border border-border bg-card p-6">
              <span className="eyebrow text-muted-foreground">RECENT CHANGE</span>
              <h2 className="mt-2 text-lg font-bold text-navy">최근 변화</h2>
              {!sessionHistoryReady?<div aria-label="면접 기록 불러오는 중" className="mt-4 h-24 animate-pulse rounded-2xl bg-secondary"/>:recentGrowth.length?<div className="mt-4 space-y-2">{recentGrowth.map(item=><div key={item.label} className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm"><span className="text-midnight">{item.label}</span><strong className="text-navy">{item.before} → {item.after}</strong></div>)}</div>:<p className="mt-4 text-sm leading-relaxed text-muted-foreground">모의면접을 2번 이상 완료하면 최근 변화가 표시됩니다.</p>}
            </div>
          </section>

          {(()=>{const openItems=interviewPracticeQueueRepository.listOpen(),item=openItems[0];if(!item)return null;const question=resolveInterviewQuestion(item.questionId,item.airlineId);return question?<button type="button" onClick={()=>{setActiveNav('interview');startInterviewQuestion(question,undefined,undefined,item.airlineId,item.id)}} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left"><span><strong className="block text-sm text-navy">재연습할 질문 {openItems.length}개</strong><span className="mt-1 block text-xs text-muted-foreground">{question.shortTitle}</span></span><span className="text-sm font-bold text-navy">연습 →</span></button>:null})()}

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-5">
              <span className="eyebrow text-gold">TODAY'S DRILL</span><h2 className="mt-2 text-lg font-bold text-navy">{interviewRecommendation.title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{interviewRecommendation.reason}</p><button type="button" onClick={()=>startHomeSession(3)} className="mt-4 h-11 w-full rounded-xl bg-navy font-bold text-ivory">3문항 연습</button>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5"><span className="eyebrow text-muted-foreground">THIS WEEK</span><h2 className="mt-2 text-lg font-bold text-navy">이번 주 면접 활동</h2><div className="mt-4 grid grid-cols-3 gap-2 text-center">{[['모의면접',weeklyInterviewActivity.sessions],['답변',weeklyInterviewActivity.answers],['재도전',weeklyInterviewActivity.retakes]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-secondary/60 px-2 py-3"><strong className="block text-xl text-navy">{value}</strong><span className="mt-1 block text-xs text-muted-foreground">{label}</span></div>)}</div></div>
          </section>
          <section className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3"><div><span className="eyebrow text-gold">APPLICATIONS</span><h2 className="mt-2 text-lg font-bold text-navy">다가오는 지원 일정</h2></div><button type="button" onClick={()=>setTrainingView('application-tracker')} className="text-sm font-bold text-navy">전체 보기 →</button></div>
            {upcomingApplications.length?<div className="mt-4 space-y-2">{upcomingApplications.map(({application,importantDate})=><button type="button" key={application.id} onClick={()=>setTrainingView('application-tracker')} className="flex w-full items-center justify-between rounded-2xl bg-secondary/60 p-3 text-left"><span><strong className="block text-sm text-navy">{application.airlineNameSnapshot}</strong><span className="mt-1 block text-xs text-muted-foreground">{importantDate.kind==='interview'?'면접':'지원 마감'} · {new Date(`${importantDate.date.slice(0,10)}T00:00:00`).toLocaleDateString('ko-KR')}</span></span><strong className="text-base text-navy">{importantDate.dday}</strong></button>)}</div>:<div className="mt-4 rounded-2xl bg-secondary/60 p-4"><p className="text-sm text-muted-foreground">등록된 다가오는 일정이 없어요.</p><button type="button" onClick={()=>setTrainingView('application-tracker')} className="mt-2 text-sm font-bold text-navy">첫 지원 일정 추가 →</button></div>}
            {upcomingApplications.filter(item=>item.importantDate.days<=7).length?<p className="mt-3 text-xs text-muted-foreground">이번 주 지원 일정 {upcomingApplications.filter(item=>item.importantDate.days<=7).length}개</p>:null}
          </section>
          <section className="rounded-3xl border border-border bg-card p-5">
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
          <button type="button" onClick={()=>{setSelfIntroductionChallengeTarget(60);setTrainingView('self-introduction')}} className="-mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left"><span><strong className="block text-sm text-navy">오늘 60초 자기소개 연습</strong><span className="mt-1 block text-xs text-muted-foreground">시간과 답변 구조를 함께 점검해보세요.</span></span><span className="text-sm font-bold text-gold">시작 →</span></button>

          {recentCompletedSessions.length?<section className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><span className="eyebrow text-muted-foreground">RECENT</span><h2 className="mt-2 text-lg font-bold text-navy">최근 모의면접</h2></div><button type="button" onClick={()=>setActiveNav('interview')} className="text-sm font-bold text-navy">전체 보기 →</button></div><div className="mt-4 grid gap-3 md:grid-cols-3">{recentCompletedSessions.map(session=><article key={session.id} className="rounded-2xl bg-secondary/60 p-4"><strong className="text-sm text-navy">{session.mode==='ai_interviewer'?'AI 면접관':'모의면접'}</strong><p className="mt-1 text-xs text-muted-foreground">{session.questionIds.length}문항 · {new Date(session.completedAt??session.startedAt).toLocaleDateString('ko-KR')}</p><p className="mt-3 line-clamp-2 text-sm text-midnight">{session.sessionAnalysis?.improvements[0]??'완료한 답변 리포트를 확인해보세요.'}</p><button type="button" onClick={()=>{setMockSession(session);setMockReport(session)}} className="mt-3 text-sm font-bold text-navy">결과 보기</button></article>)}</div></section>:null}

          <JourneyCard onStartTraining={() => setActiveNav('routine')} target={diagnosis?.primaryAirline} score={adjustedReadiness} nextGoal={trainingProgress.routineCompleted?'자기소개와 지원동기 다듬기':diagnosis?.priorityAreas[0]?.title} />

          {/* Preparation overview */}
          <section
            aria-labelledby="overview-heading"
            className="rounded-3xl border border-border bg-card p-6"
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

            <ReadinessGauge value={adjustedReadiness} />

            <div className="mt-6 border-t border-border pt-6">
              <SkillProgressList skills={skills} />
            </div>

            <div className="mt-5 flex gap-3 rounded-2xl bg-secondary/60 p-4">
              <Lightbulb className="h-[18px] w-[18px] shrink-0 text-gold" strokeWidth={2} />
              <p className="text-sm leading-relaxed text-midnight">
                {coachMessage}
              </p>
            </div>
          </section>

          <DailyRoutineList
            label={dailyRoute.label}
            title={dailyRoute.title}
            totalTimeLabel={diagnosis ? `약 ${tasks.reduce((sum, task) => sum + task.minutes, 0)}분` : dailyRoute.totalTimeLabel}
            tasks={tasks}
            onToggle={toggleTask}
            onTaskStart={handleTaskStart}
          />

          <SecondaryStats />

          <button type="button" onClick={()=>setTrainingView('weekly-report')} className="rounded-2xl border border-border bg-card p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"><span className="eyebrow text-gold">WEEKLY REPORT</span><div className="mt-3 flex items-end justify-between"><div><strong className="text-xl text-navy">{weeklySummary.totalMinutes}분</strong><p className="mt-1 text-sm text-muted-foreground">이번 주 · {weeklySummary.activeDays}일 활동</p></div><span className="text-sm font-bold text-navy">리포트 보기 →</span></div></button>

          <CoachFeedbackCard message={coachMessage} />
        </main>}
      </div>

      <BottomNavigation active={activeNav} onChange={setActiveNav} />
    </div>
  )
}
