import type { InterviewAttempt, InterviewPracticeConfig } from './interview-practice-data'
import type { WeeklyTaskContext } from './weekly-task-completion'

export const SINGLE_INTERVIEW_RESUME_KEY='cabin-single-interview-resume-v1'

export type SingleInterviewResumeSource='direct'|'daily_plan'|'weekly_task'|'queue'|'favorite'|'application_drill'|'mock_report'
export type InterviewPracticeReturnTarget='interview'|'weekly-report'
export const interviewReturnTargetForSource=(source?:SingleInterviewResumeSource):InterviewPracticeReturnTarget=>source==='weekly_task'?'weekly-report':'interview'
export type SingleInterviewResume={
  questionId:string
  practiceLanguage:'ko'|'en'
  targetAirlineId?:string
  selectedExperienceId?:string
  source:SingleInterviewResumeSource
  sourceQueueItemId?:string
  sourceContext?:InterviewPracticeConfig['sourceContext']
  weeklyTaskContext?:WeeklyTaskContext
  startedAt:string
}

const isLanguage=(value:unknown):value is 'ko'|'en'=>value==='ko'||value==='en'
export function normalizeSingleInterviewResume(value:unknown):SingleInterviewResume|null{
  if(!value||typeof value!=='object')return null
  const row=value as Partial<SingleInterviewResume>
  if(typeof row.questionId!=='string'||!row.questionId||typeof row.startedAt!=='string'||Number.isNaN(Date.parse(row.startedAt)))return null
  return{questionId:row.questionId,practiceLanguage:isLanguage(row.practiceLanguage)?row.practiceLanguage:'ko',source:row.source??'direct',startedAt:row.startedAt,
    ...(typeof row.targetAirlineId==='string'?{targetAirlineId:row.targetAirlineId}:{}),
    ...(typeof row.selectedExperienceId==='string'?{selectedExperienceId:row.selectedExperienceId}:{}),
    ...(typeof row.sourceQueueItemId==='string'?{sourceQueueItemId:row.sourceQueueItemId}:{}),
    ...(row.sourceContext?{sourceContext:row.sourceContext}:{}),...(row.weeklyTaskContext?{weeklyTaskContext:row.weeklyTaskContext}:{})}
}
export function resumeFromConfig(config:InterviewPracticeConfig,source:SingleInterviewResumeSource='direct',startedAt=new Date().toISOString()):SingleInterviewResume{
  return{questionId:config.question.id,practiceLanguage:config.languageHint??'ko',source,startedAt,
    ...(config.targetAirlineId?{targetAirlineId:config.targetAirlineId}:{}),...(config.selectedExperienceId?{selectedExperienceId:config.selectedExperienceId}:{}),
    ...(config.sourceQueueItemId?{sourceQueueItemId:config.sourceQueueItemId}:{}),...(config.sourceContext?{sourceContext:config.sourceContext}:{}),
    ...(config.weeklyTaskContext?{weeklyTaskContext:config.weeklyTaskContext}:{})}
}
export function restoreSingleInterviewConfig(resume:SingleInterviewResume,options:{questionExists:(id:string)=>boolean;airlineContextAllowed?:(id:string)=>boolean;experienceExists?:(id:string)=>boolean}):Omit<InterviewPracticeConfig,'question'>|null{
  if(!options.questionExists(resume.questionId))return null
  const targetAirlineId=resume.targetAirlineId&&options.airlineContextAllowed?.(resume.targetAirlineId)?resume.targetAirlineId:undefined
  const selectedExperienceId=resume.selectedExperienceId&&options.experienceExists?.(resume.selectedExperienceId)?resume.selectedExperienceId:undefined
  return{attemptType:'first',languageHint:resume.practiceLanguage,...(targetAirlineId?{targetAirlineId}:{}),...(selectedExperienceId?{selectedExperienceId}:{}),
    ...(resume.sourceQueueItemId?{sourceQueueItemId:resume.sourceQueueItemId}:{}),...(resume.sourceContext?{sourceContext:resume.sourceContext}:{}),
    ...(resume.weeklyTaskContext?{weeklyTaskContext:resume.weeklyTaskContext}:{})}
}
export function sortSingleInterviewHistory(attempts:InterviewAttempt[]){return attempts.filter(item=>item.completed).map((item,index)=>({item,index,time:Date.parse(item.createdAt)})).sort((a,b)=>(Number.isFinite(b.time)?b.time:-Infinity)-(Number.isFinite(a.time)?a.time:-Infinity)||a.index-b.index).map(row=>row.item)}
export function canCompareInterviewRetake(current:InterviewAttempt,previous?:InterviewAttempt){return Boolean(previous&&current.previousAttemptId===previous.id&&current.transcriptIntegrity?.mode==='actual_audio'&&current.transcriptIntegrity.isActualTranscription&&previous.transcriptIntegrity?.mode==='actual_audio'&&previous.transcriptIntegrity.isActualTranscription)}

export const singleInterviewResumeRepository={
  load():SingleInterviewResume|null{if(typeof window==='undefined')return null;try{return normalizeSingleInterviewResume(JSON.parse(localStorage.getItem(SINGLE_INTERVIEW_RESUME_KEY)??'null'))}catch{return null}},
  save(value:SingleInterviewResume){if(typeof window==='undefined')return;try{localStorage.setItem(SINGLE_INTERVIEW_RESUME_KEY,JSON.stringify(value));window.dispatchEvent(new Event('cabin:single-interview-resume-changed'))}catch{/* Local resume is optional. */}},
  clear(){if(typeof window==='undefined')return;try{localStorage.removeItem(SINGLE_INTERVIEW_RESUME_KEY);window.dispatchEvent(new Event('cabin:single-interview-resume-changed'))}catch{/* Local resume is optional. */}},
}
