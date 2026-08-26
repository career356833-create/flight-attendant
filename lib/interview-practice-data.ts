import { onboardingKo } from '@/lib/onboarding-i18n'
import { analyzeSelfIntroduction, loadSelfIntroductionAttempts, type TimingAnalysis } from '@/lib/self-introduction-data'
import type { AirlineBusinessModel, AirlineRegion } from '@/lib/airline-data'
import type { ExperienceCategory } from '@/lib/experience-repository'
import type { InterviewAudioMetrics } from '@/lib/interview-audio/audio-analysis'
import type { InterviewSpeechMetrics } from '@/lib/interview-audio/speech-analysis'
import type { PronunciationAnalysisResult } from '@/lib/ai/pronunciation-provider'
import type { InterviewContentAnalysis } from '@/lib/interview-content-analysis'

export type InterviewCategory = 'introduction_and_motivation' | 'behavioral_experience' | 'customer_situation' | 'safety_and_role_judgment'
export type CapabilityKey = 'application_readiness' | 'interview_communication' | 'customer_situation_handling' | 'safety_and_role_judgment' | 'recruitment_language' | 'airline_and_role_understanding'
export type InterviewDifficulty = 'beginner' | 'intermediate' | 'advanced'
export type EvaluationRubric = { keys: string[]; guidance: string }

export type InterviewQuestion = {
  id: string
  category: InterviewCategory
  prompt: string
  shortTitle: string
  difficulty: InterviewDifficulty
  targetCapabilities: CapabilityKey[]
  evaluationRubric: EvaluationRubric
  suggestedAnswerRange?: { minSeconds?: number; maxSeconds?: number }
  followUpQuestionIds?: string[]
  airlineTags?: string[]
  businessModelTags?: AirlineBusinessModel[]
  regionTags?: AirlineRegion[]
  localeKey: string
}

export type EvaluationScore = { key:string; score:number; status:'strong'|'adequate'|'needs_improvement'; feedback:string; tip:string }
export type InterviewSpeakingMetrics = { wordsPerMinute:number; speakingPaceLabel:string; longSilenceCount:number; fillerCount:number; repeatedPhraseCount:number }
export type RecommendedRetryMode = 'add_specific_experience'|'clarify_structure'|'shorten_answer'|'strengthen_role_connection'|'improve_safety_reasoning'|'improve_customer_empathy'|'repeat_current_structure'
export type InterviewAnswerAnalysis = { overallScore:number; summary:string; strengths:string[]; improvements:string[]; evaluationScores:EvaluationScore[]; timingAnalysis:TimingAnalysis; speakingMetrics:InterviewSpeakingMetrics; recommendedRetryMode:RecommendedRetryMode; nextQuestionIds:string[] }
export type InterviewAttempt = { id:string; questionId:string; category:InterviewCategory; createdAt:string; transcript:string; durationSeconds:number; audioId?:string; audioPath?:string; audioMetrics?:InterviewAudioMetrics;speechMetrics?:InterviewSpeechMetrics;pronunciationAnalysis?:PronunciationAnalysisResult;contentAnalysis?:InterviewContentAnalysis; analysis:InterviewAnswerAnalysis; targetAirlineId?:string; experienceId?:string; experienceSnapshot?:{title:string;category:ExperienceCategory;shortSummary:string}; attemptNumber:number; previousAttemptId?:string; isFollowUp?:boolean; parentAttemptId?:string; followUpReason?:string; followUpTemplateId?:string; completed:boolean }
export type QuestionProgress = { questionId:string; attemptCount:number; bestScore:number; latestScore:number; completed:boolean; lastPracticedAt?:string; improvementDelta?:number }
export type InterviewPracticeConfig = { question:InterviewQuestion; attemptType:'first'|'retry'; previousAttemptId?:string; targetAirlineId?:string; selectedExperienceId?:string; followUp?:{parentAttemptId:string;reason:string;templateId:string} }
export type InterviewPracticeStep = 'intro'|'microphone_check'|'recording'|'review'|'analyzing'|'result'|'retry'

const categoryMeta:Record<InterviewCategory,{capabilities:CapabilityKey[];rubric:string[];range:{minSeconds:number;maxSeconds:number}}>={
  introduction_and_motivation:{capabilities:['application_readiness','interview_communication'],rubric:['question_fit','core_message','structure','specificity','role_connection','motivation_authenticity','airline_reason'],range:{minSeconds:45,maxSeconds:90}},
  behavioral_experience:{capabilities:['interview_communication'],rubric:['question_fit','structure','specificity','role_connection','situation_clarity','action_specificity','result_learning','star_structure'],range:{minSeconds:50,maxSeconds:100}},
  customer_situation:{capabilities:['customer_situation_handling'],rubric:['question_fit','structure','specificity','role_connection','empathy','situation_assessment','policy_compliance','resolution_process','service_recovery'],range:{minSeconds:60,maxSeconds:120}},
  safety_and_role_judgment:{capabilities:['safety_and_role_judgment'],rubric:['question_fit','structure','specificity','role_connection','safety_priority','immediate_action','reporting','procedure','follow_up'],range:{minSeconds:60,maxSeconds:120}},
}

const definitions:[InterviewCategory,string,InterviewDifficulty][]=[
  ...Array.from({length:6},(_,i)=>['introduction_and_motivation',`im${i+1}`,i<2?'beginner':i<5?'intermediate':'advanced'] as [InterviewCategory,string,InterviewDifficulty]),
  ...Array.from({length:6},(_,i)=>['behavioral_experience',`be${i+1}`,i<2?'beginner':i<5?'intermediate':'advanced'] as [InterviewCategory,string,InterviewDifficulty]),
  ...Array.from({length:6},(_,i)=>['customer_situation',`cs${i+1}`,i<2?'beginner':i<5?'intermediate':'advanced'] as [InterviewCategory,string,InterviewDifficulty]),
  ...Array.from({length:6},(_,i)=>['safety_and_role_judgment',`sj${i+1}`,i<2?'beginner':i<5?'intermediate':'advanced'] as [InterviewCategory,string,InterviewDifficulty]),
]

export const interviewQuestions:InterviewQuestion[]=definitions.map(([category,id,difficulty],index)=>{
  const locale=(onboardingKo.interviewPractice.questions as Record<string,{prompt:string;shortTitle:string}>)[id]
  const meta=categoryMeta[category]
  return {id,category,prompt:locale?.prompt??id,shortTitle:locale?.shortTitle??id,difficulty,targetCapabilities:meta.capabilities,evaluationRubric:{keys:meta.rubric,guidance:(onboardingKo.interviewPractice.categoryTips as Record<string,string>)[category]},suggestedAnswerRange:meta.range,followUpQuestionIds:[definitions[(index+1)%definitions.length][1]],airlineTags:[],businessModelTags:[],regionTags:[],localeKey:`interviewPractice.questions.${id}`}
})
export const interviewQuestionById=new Map(interviewQuestions.map(q=>[q.id,q]))

const keywordMap:Record<string,RegExp>={
  question_fit:/(강점|지원|경험|승객|안전|고객|상황)/, core_message:/(강점|이유|우선|중요)/, structure:/(먼저|이후|결과|마지막|때문)/, specificity:/(근무|당시|직접|결과|경험)/, role_connection:/(객실승무원|승객|기내|항공사)/,
  motivation_authenticity:/(지원|가치|성장|이유)/,airline_reason:/(항공사|서비스|브랜드)/,situation_clarity:/(상황|당시|문제)/,action_specificity:/(직접|행동|설명|제안|확인)/,result_learning:/(결과|배웠|개선|만족)/,star_structure:/(상황|행동|결과)/,
  empathy:/(공감|불편|죄송|이해)/,situation_assessment:/(확인|파악|질문)/,policy_compliance:/(규정|절차|원칙)/,resolution_process:/(먼저|다음|조치|대안)/,service_recovery:/(확인|만족|후속)/,
  safety_priority:/(안전|우선)/,immediate_action:/(즉시|먼저|중단|조치)/,reporting:/(보고|상급자|사무장)/,procedure:/(절차|규정|매뉴얼)/,follow_up:/(후속|확인|기록)/,
}

export function analyzeInterviewAnswer(question:InterviewQuestion,transcript:string,durationSeconds:number):InterviewAnswerAnalysis{
  const base=analyzeSelfIntroduction(transcript,durationSeconds)
  const scores=question.evaluationRubric.keys.map((key,index)=>{
    const matched=(keywordMap[key]??/.{40}/).test(transcript)
    const score=Math.max(35,Math.min(92,(matched?74:52)+((transcript.length+question.id.length*7+index*11)%15)))
    const status=score>=80?'strong':score>=65?'adequate':'needs_improvement'
    return {key,score,status,feedback:matched?'답변에서 관련 기준이 구체적으로 확인됩니다.':'관련 기준을 보여주는 행동이나 판단을 한 문장 더 추가해 보세요.',tip:getEvaluationTip(key)} as EvaluationScore
  })
  const overallScore=Math.round(scores.reduce((sum,item)=>sum+item.score,0)/scores.length)
  const weak=scores.filter(s=>s.status==='needs_improvement').map(s=>s.key)
  let recommendedRetryMode:RecommendedRetryMode='repeat_current_structure'
  if(base.timing.assessment==='slightly_long')recommendedRetryMode='shorten_answer'
  else if(question.category==='safety_and_role_judgment'&&weak.some(k=>['safety_priority','reporting','procedure'].includes(k)))recommendedRetryMode='improve_safety_reasoning'
  else if(question.category==='customer_situation'&&weak.includes('empathy'))recommendedRetryMode='improve_customer_empathy'
  else if(weak.includes('specificity')||weak.includes('action_specificity'))recommendedRetryMode='add_specific_experience'
  else if(weak.includes('structure')||weak.includes('star_structure'))recommendedRetryMode='clarify_structure'
  else if(weak.includes('role_connection'))recommendedRetryMode='strengthen_role_connection'
  const nextQuestionIds=interviewQuestions.filter(q=>q.id!==question.id&&(q.category===question.category||q.targetCapabilities.some(c=>question.targetCapabilities.includes(c)))).slice(0,3).map(q=>q.id)
  return {overallScore,summary:overallScore>=80?'질문의 핵심에 맞게 구조적으로 답했습니다. 구체적인 행동과 결론을 조금 더 선명하게 다듬어 보세요.':'답변의 방향은 적절합니다. 유형별 핵심 기준과 구체적인 행동 근거를 보강하면 좋아요.',strengths:scores.filter(s=>s.status==='strong').slice(0,2).map(s=>s.key),improvements:weak.slice(0,3),evaluationScores:scores,timingAnalysis:base.timing,speakingMetrics:{...base.metrics,repeatedPhraseCount:base.timing.repeatedPhraseCount},recommendedRetryMode,nextQuestionIds}
}

function getEvaluationTip(key:string){const tips:Record<string,string>={structure:'첫 문장에 결론을 제시하고 근거를 이어 보세요.',specificity:'상황·행동·결과 중 빠진 요소를 추가하세요.',role_connection:'마지막 문장을 객실승무원 업무와 연결하세요.',empathy:'승객의 감정을 인정하는 표현을 먼저 사용하세요.',safety_priority:'안전 우선 원칙을 첫 문장에 제시하세요.',reporting:'누구에게 언제 보고할지 명시하세요.'};return tips[key]??'핵심 판단과 행동을 한 문장으로 명확히 표현해 보세요.'}

const ATTEMPTS_KEY='cabin-interview-attempts-v1'; const PROGRESS_KEY='cabin-interview-progress-v1'
export function loadInterviewAttempts():InterviewAttempt[]{if(typeof window==='undefined')return[];try{const value=JSON.parse(localStorage.getItem(ATTEMPTS_KEY)??'[]');return Array.isArray(value)?value:[]}catch{return[]}}
export function saveInterviewAttempt(attempt:InterviewAttempt){const list=loadInterviewAttempts();localStorage.setItem(ATTEMPTS_KEY,JSON.stringify([attempt,...list.filter(a=>a.id!==attempt.id)].slice(0,100)))}
export function getQuestionProgress(questionId:string):QuestionProgress{const list=loadInterviewAttempts().filter(a=>a.questionId===questionId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));const latest=list.at(-1);const previous=list.at(-2);return{questionId,attemptCount:list.length,bestScore:list.length?Math.max(...list.map(a=>a.analysis.overallScore)):0,latestScore:latest?.analysis.overallScore??0,completed:list.length>0,lastPracticedAt:latest?.createdAt,improvementDelta:latest&&previous?latest.analysis.overallScore-previous.analysis.overallScore:undefined}}
export function getCompatibleInterviewHistory():InterviewAttempt[]{const native=loadInterviewAttempts();const legacy=loadSelfIntroductionAttempts().map(a=>({id:a.id,questionId:'im1',category:'introduction_and_motivation' as const,createdAt:a.createdAt,transcript:a.transcript,durationSeconds:a.durationSeconds,audioId:a.audioUrl,analysis:analyzeInterviewAnswer(interviewQuestionById.get('im1')!,a.transcript,a.durationSeconds),targetAirlineId:a.targetAirlineId,attemptNumber:a.attemptNumber,previousAttemptId:a.previousAttemptId,completed:a.completed}));return[...native,...legacy].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
export function recordInterviewProgress(attempt:InterviewAttempt){if(typeof window==='undefined')return;try{const data=JSON.parse(localStorage.getItem(PROGRESS_KEY)??'{"dailyGains":{},"questionGains":{},"capabilityGains":{}}');const day=new Date().toISOString().slice(0,10);const dayGain=Number(data.dailyGains?.[day]??0);const questionGain=Number(data.questionGains?.[attempt.questionId]??0);const previous=attempt.previousAttemptId?loadInterviewAttempts().find(a=>a.id===attempt.previousAttemptId):undefined;const delta=questionGain===0?1:previous&&attempt.analysis.overallScore>=previous.analysis.overallScore+5&&questionGain<2?1:0;const applied=dayGain>=3?0:delta;data.dailyGains={...data.dailyGains,[day]:dayGain+applied};data.questionGains={...data.questionGains,[attempt.questionId]:questionGain+applied};data.capabilityGains=data.capabilityGains??{};for(const key of interviewQuestionById.get(attempt.questionId)?.targetCapabilities??[])data.capabilityGains[key]=Number(data.capabilityGains[key]??0)+applied;localStorage.setItem(PROGRESS_KEY,JSON.stringify(data))}catch{localStorage.removeItem(PROGRESS_KEY)}}
export function loadInterviewCapabilityGains():Record<string,number>{if(typeof window==='undefined')return{};try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)??'{}').capabilityGains??{}}catch{return{}}}
