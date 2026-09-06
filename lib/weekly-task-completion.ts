import { learningAnalyticsRepository, type RoutineCompletionSnapshot } from './learning-analytics-repository'
import type { WeeklyRoutineDay, WeeklyRoutineTask } from './learning-analytics-service'

export type WeeklyTaskContext={weeklyTaskId:string;weekStart?:string;taskType:WeeklyRoutineTask['type'];title:string;estimatedMinutes:number;relatedCapability:WeeklyRoutineTask['relatedCapability'];source:'weekly_plan';targetKind?:'interview'|'mock'|'self_introduction'|'application'|'experience'|'queue'}
export type WeeklyCompletionEvent={type:'interview_attempt'|'mock_session'|'self_introduction'|'application_answer'|'experience_saved'|'queue_practiced';entityId:string;completed:boolean;previousAttemptId?:string}
export type WeeklyAttemptCompletion={id:string;completed:boolean;previousAttemptId?:string;weeklyTaskContext?:WeeklyTaskContext}

export function createWeeklyTaskContext(task:WeeklyRoutineTask,weekStart?:string,targetKind?:WeeklyTaskContext['targetKind']):WeeklyTaskContext|null{
  if(!task.id)return null
  return{weeklyTaskId:task.id,weekStart,taskType:task.type,title:task.title,estimatedMinutes:task.estimatedMinutes,relatedCapability:task.relatedCapability,source:'weekly_plan',...(targetKind?{targetKind}:{})}
}
export function acceptsWeeklyCompletion(context:WeeklyTaskContext|undefined,event:WeeklyCompletionEvent){
  if(!context||!event.completed||!event.entityId)return false
  if(context.targetKind==='mock')return event.type==='mock_session'
  if(context.targetKind==='queue')return event.type==='queue_practiced'
  if(context.targetKind==='interview')return event.type==='interview_attempt'
  if(context.targetKind==='self_introduction')return event.type==='self_introduction'
  if(context.targetKind==='application')return event.type==='application_answer'
  if(context.targetKind==='experience')return event.type==='experience_saved'
  if(context.taskType==='interview_question')return event.type==='interview_attempt'
  if(context.taskType==='self_introduction')return event.type==='self_introduction'
  if(context.taskType==='application_work')return event.type==='application_answer'
  if(context.taskType==='experience_work')return event.type==='experience_saved'
  if(context.taskType==='review')return event.type==='queue_practiced'||event.type==='interview_attempt'&&Boolean(event.previousAttemptId)
  return false
}
export function completeWeeklyInterviewAttempt(attempt:WeeklyAttemptCompletion){
  const context=attempt.weeklyTaskContext
  const event:WeeklyCompletionEvent={type:'interview_attempt',entityId:attempt.id,completed:attempt.completed,previousAttemptId:attempt.previousAttemptId}
  if(!context||!acceptsWeeklyCompletion(context,event)||learningAnalyticsRepository.isWeeklyTaskCompleted(context.weeklyTaskId))return false
  learningAnalyticsRepository.recordWeeklyTask({id:context.weeklyTaskId,name:context.title,minutes:context.estimatedMinutes,weekStart:context.weekStart,sourceCompletionId:attempt.id},context.relatedCapability)
  return true
}
export const weeklyCompletionIds=(items:RoutineCompletionSnapshot[]=[])=>{const source=items.length?items:learningAnalyticsRepository.load().routineCompletions;if(!items.length&&source.length)items.push(...source);return new Set(source.filter(item=>item.source==='weekly_plan').map(item=>item.taskId))}
export const weeklyProgress=(days:WeeklyRoutineDay[],completed:Set<string>)=>{const tasks=days.flatMap(day=>day.tasks);return{completed:tasks.filter(task=>completed.has(task.id)).length,total:tasks.length}}
export const nextIncompleteWeeklyTask=(days:WeeklyRoutineDay[],completed:Set<string>)=>days.flatMap(day=>day.tasks).find(task=>!completed.has(task.id))
export const incompleteWeeklyTasks=(tasks:WeeklyRoutineTask[],completed:Set<string>)=>tasks.filter(task=>task.id&&!completed.has(task.id))
