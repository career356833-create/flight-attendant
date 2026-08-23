'use client'

import { useEffect, useState } from 'react'
import { AppHeader } from '@/components/app-header'
import { JourneyCard } from '@/components/journey-card'
import { ReadinessGauge } from '@/components/readiness-gauge'
import { SkillProgressList } from '@/components/skill-progress-list'
import { DailyRoutineList } from '@/components/daily-routine-list'
import { CoachFeedbackCard } from '@/components/coach-feedback-card'
import { SecondaryStats } from '@/components/secondary-stats'
import { BottomNavigation } from '@/components/bottom-navigation'
import { Lightbulb } from 'lucide-react'
import { dailyRoute, readiness, type RoutineTask, type TaskStatus } from '@/lib/mock-data'
import type { DiagnosisResult, OnboardingAnswers } from '@/lib/onboarding-data'
import { SelfIntroductionFlow } from '@/components/self-introduction'
import { loadSelfIntroductionProgress, SELF_INTRO_TASK_ID, type SelfIntroductionAttempt, type SelfIntroductionProgress } from '@/lib/self-introduction-data'
import { InterviewPracticeEngine, InterviewPracticeHome, AirlineInterviewQuestionList } from '@/components/interview-practice'
import { MockInterviewFollowUp, MockInterviewLauncher, MockInterviewProgress, MockInterviewReport, MockInterviewSessionHistory } from '@/components/interview-practice/mock-interview-session'
import { analyzeInterviewSession, completeInterviewSessionAttempt, followUpForAttempt, saveInterviewSession, type InterviewSession } from '@/lib/mock-interview-session'
import { interviewQuestionById, loadInterviewAttempts, loadInterviewCapabilityGains, type InterviewAttempt, type InterviewCategory, type InterviewPracticeConfig, type InterviewQuestion } from '@/lib/interview-practice-data'
import { ExperienceLibrary } from '@/components/experience-library'
import type { CareerExperience } from '@/lib/experience-repository'
import { ApplicationCoach } from '@/components/application-coach'
import { getApplicationCapabilityGains, listApplicationAnswers } from '@/lib/application-answer-repository'
import { WeeklyReportHome } from '@/components/weekly-report'
import { getCurrentReadinessSnapshot, getWeeklyLearningSummary, generateNextWeekPriorities } from '@/lib/learning-analytics-service'
import { learningAnalyticsRepository } from '@/lib/learning-analytics-repository'
import { AccountSummary } from '@/components/account/account-summary'

export function HomeDashboard({ diagnosis, onboardingAnswers, onEditDiagnosis, onLogin, initialAccountOpen=false }: { diagnosis?: DiagnosisResult | null; onboardingAnswers?: OnboardingAnswers; onEditDiagnosis?: () => void; onLogin:()=>void; initialAccountOpen?:boolean }) {
  const [activeNav, setActiveNav] = useState(initialAccountOpen?'my':'home')
  const [trainingView,setTrainingView]=useState<'dashboard'|'self-introduction'|'experience-library'|'application-coach'|'weekly-report'>('dashboard')
  const [interviewCategory,setInterviewCategory]=useState<InterviewCategory|null>(null)
  const [practiceConfig,setPracticeConfig]=useState<InterviewPracticeConfig|null>(null)
  const [mockInterviewOpen,setMockInterviewOpen]=useState(false)
  const [mockSession,setMockSession]=useState<InterviewSession|null>(null)
  const [mockReport,setMockReport]=useState<InterviewSession|null>(null)
  const [pendingSessionAttempt,setPendingSessionAttempt]=useState<InterviewAttempt|null>(null)
  const [pendingFollowUp,setPendingFollowUp]=useState<{attempt:InterviewAttempt;message:string}|null>(null)
  const [interviewAttempts,setInterviewAttempts]=useState<InterviewAttempt[]>([])
  const [capabilityGains,setCapabilityGains]=useState<Record<string,number>>({})
  const [trainingProgress,setTrainingProgress]=useState<SelfIntroductionProgress>({routineCompleted:false,interviewScoreGain:0,scoreHistory:[]})
  useEffect(()=>{setTrainingProgress(loadSelfIntroductionProgress());setInterviewAttempts(loadInterviewAttempts());setCapabilityGains({...loadInterviewCapabilityGains(),...getApplicationCapabilityGains()})},[])
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

  function startInterviewQuestion(question:InterviewQuestion,previousAttemptId?:string){const latest=interviewAttempts.find(attempt=>attempt.questionId===question.id);const linkedId=previousAttemptId??latest?.id;setPracticeConfig({question,attemptType:linkedId?'retry':'first',previousAttemptId:linkedId,targetAirlineId:diagnosis?.primaryAirline})}
  function handleTaskStart(id:string){ if(id===SELF_INTRO_TASK_ID){setTrainingView('self-introduction');return} if(id==='application-coach-motivation'){setActiveNav('resume');setTrainingView('application-coach');return} if(id.startsWith('interview-question-')){const q=interviewQuestionById.get(id.replace('interview-question-',''));if(q){setActiveNav('interview');startInterviewQuestion(q)}return} toggleTask(id) }
  function handleTrainingComplete(_attempt:SelfIntroductionAttempt){setTrainingProgress(loadSelfIntroductionProgress())}
  function advanceMockSession(session:InterviewSession,attempt:InterviewAttempt){const next=completeInterviewSessionAttempt(session,attempt.id);if(next.status==='completed'){const completed={...next,sessionAnalysis:analyzeInterviewSession(next,loadInterviewAttempts())};saveInterviewSession(completed);setMockSession(completed);setMockReport(completed);setPracticeConfig(null);return}saveInterviewSession(next);setMockSession(next);const question=interviewQuestionById.get(next.questionIds[next.currentQuestionIndex]);if(question)setPracticeConfig({question,attemptType:'first',targetAirlineId:next.airlineId})}
  function handleInterviewComplete(attempt:InterviewAttempt){setInterviewAttempts(loadInterviewAttempts());setCapabilityGains(loadInterviewCapabilityGains());if(!mockSession)return;if(pendingFollowUp){setPendingFollowUp(null);advanceMockSession(mockSession,attempt);return}setPendingSessionAttempt(attempt)}
  function continueMockSession(){if(!mockSession||!pendingSessionAttempt)return;const message=followUpForAttempt(pendingSessionAttempt);if(message){const held=completeInterviewSessionAttempt(mockSession,pendingSessionAttempt.id,false);saveInterviewSession(held);setMockSession(held);setPendingSessionAttempt(null);setPracticeConfig(null);setPendingFollowUp({attempt:pendingSessionAttempt,message});return}const attempt=pendingSessionAttempt;setPendingSessionAttempt(null);advanceMockSession(mockSession,attempt)}

  if(trainingView==='self-introduction')return <SelfIntroductionFlow targetAirlineId={diagnosis?.primaryAirline} onExit={()=>setTrainingView('dashboard')} onComplete={handleTrainingComplete}/>
  if(trainingView==='experience-library')return <ExperienceLibrary onExit={()=>setTrainingView('dashboard')} onPractice={(question,_experience:CareerExperience)=>{setTrainingView('dashboard');setActiveNav('interview');startInterviewQuestion(question)}}/>
  if(trainingView==='application-coach'||activeNav==='resume')return <ApplicationCoach initialAirlineId={onboardingAnswers?.primaryAirline&&!['custom_airline','undecided_airline'].includes(onboardingAnswers.primaryAirline.id)?onboardingAnswers.primaryAirline.id:undefined} onExit={()=>{setTrainingView('dashboard');setActiveNav('home')}} onOpenExperience={()=>setTrainingView('experience-library')} onPractice={(category,_keywords)=>{const question=interviewQuestionById.get(category==='introduction_and_motivation'?'im2':category==='customer_situation'?'cs1':category==='safety_and_role_judgment'?'sj1':'be1');setTrainingView('dashboard');setActiveNav('interview');if(question)startInterviewQuestion(question)}}/>
  if(trainingView==='weekly-report')return <WeeklyReportHome onBack={()=>setTrainingView('dashboard')}/>
  if(practiceConfig)return <>{mockSession&&<MockInterviewProgress session={mockSession} onExit={()=>setPracticeConfig(null)}/>}<InterviewPracticeEngine config={practiceConfig} onExit={()=>setPracticeConfig(null)} onComplete={handleInterviewComplete} onNextQuestion={(question)=>startInterviewQuestion(question)} sessionAction={mockSession&&pendingSessionAttempt?{label:mockSession.currentQuestionIndex>=mockSession.questionIds.length-1?'모의면접 결과 보기':'다음 질문',onContinue:continueMockSession}:undefined}/></>
  if(pendingFollowUp&&mockSession){const question=interviewQuestionById.get(mockSession.questionIds[mockSession.currentQuestionIndex]);return <MockInterviewFollowUp message={pendingFollowUp.message} onSkip={()=>{const pending=pendingFollowUp;setPendingFollowUp(null);advanceMockSession(mockSession,pending.attempt)}} onAnswer={()=>{if(question){setPendingFollowUp(pendingFollowUp);setPracticeConfig({question,attemptType:'retry',previousAttemptId:pendingFollowUp.attempt.id,targetAirlineId:mockSession.airlineId})}}}/>}
  if(mockReport)return <MockInterviewReport session={mockReport} attempts={interviewAttempts} onBack={()=>{setMockReport(null);setMockSession(null);setActiveNav('interview')}} onRetake={()=>{setMockReport(null);setMockInterviewOpen(true);setMockSession(null)}} onRetry={(attempt)=>{const question=interviewQuestionById.get(attempt.questionId);if(question){setMockReport(null);startInterviewQuestion(question,attempt.id)}}}/>
  if(mockInterviewOpen)return <MockInterviewLauncher airlineId={diagnosis?.primaryAirline} onBack={()=>setMockInterviewOpen(false)} onView={(session)=>{setMockInterviewOpen(false);setMockSession(session);setMockReport(session)}} onStart={(session,question)=>{setMockSession(session);setMockInterviewOpen(false);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}}/>

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <AppHeader />

        {activeNav === 'interview' ? (interviewCategory?<AirlineInterviewQuestionList category={interviewCategory} targetAirlineId={diagnosis?.primaryAirline} onBack={()=>setInterviewCategory(null)} onStart={startInterviewQuestion}/>:<><div className="px-5 pt-4"><button onClick={()=>setMockInterviewOpen(true)} className="h-12 w-full rounded-2xl bg-navy text-sm font-bold text-ivory">모의면접 시작</button></div><MockInterviewSessionHistory onStart={()=>setMockInterviewOpen(true)} onResume={(session)=>{const question=interviewQuestionById.get(session.questionIds[session.currentQuestionIndex]);if(question){setMockSession(session);setPracticeConfig({question,attemptType:'first',targetAirlineId:session.airlineId})}}} onView={(session)=>{setMockSession(session);setMockReport(session)}}/><InterviewPracticeHome attempts={interviewAttempts} onSelectCategory={setInterviewCategory} onStartQuestion={startInterviewQuestion} onOpenExperience={()=>setTrainingView('experience-library')}/></>) : activeNav === 'my' ? <main className="space-y-4 px-5 pb-8 pt-6"><AccountSummary onLogin={onLogin}/><section className="rounded-3xl border border-border bg-card p-6"><span className="eyebrow text-muted-foreground">MY PROFILE</span><h2 className="mt-3 text-xl font-bold text-navy">나의 준비 설정</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">목표와 진단 답변을 다시 확인하고 맞춤 루틴을 조정할 수 있어요.</p><button type="button" onClick={onEditDiagnosis} className="mt-6 h-12 w-full rounded-2xl border border-navy font-semibold text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">진단 다시 하기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">주간 리포트</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">실제 학습 기록과 역량 변화, 다음 주 추천 계획을 확인하세요.</p><button type="button" onClick={()=>setTrainingView('weekly-report')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">주간 리포트 보기</button></section><section className="rounded-3xl border border-border bg-card p-6"><h2 className="text-lg font-bold text-navy">나의 경험 저장소</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">저장한 경험은 여러 면접 질문에서 다시 활용할 수 있어요.</p><button type="button" onClick={()=>setTrainingView('experience-library')} className="mt-5 h-11 w-full rounded-xl bg-navy font-bold text-ivory">경험 저장소 열기</button></section></main> : <main className="flex flex-col gap-7 px-5 pb-8 pt-6">
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
