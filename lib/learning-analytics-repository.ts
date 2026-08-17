import type { CapabilityKey } from '@/lib/interview-practice-data'
import type { TrainingPriority, WeeklyRoutineDay } from '@/lib/learning-analytics-service'

export type ConfirmedWeeklyPlan={weekStart:string;days:WeeklyRoutineDay[];confirmedAt:string;updatedAt:string}
export type TrainingPrioritySnapshot={weekStart:string;priorities:TrainingPriority[];generatedAt:string;basedOnActivityIds:string[]}
export type RoutineCompletionSnapshot={id:string;taskId:string;title:string;minutes:number;occurredAt:string;relatedCapability:CapabilityKey}
export type PlanEdit={id:string;weekStart:string;action:'delete_task'|'replace_task'|'move_task'|'rest_day'|'focus_day'|'confirm';occurredAt:string;detail:string}
export type LearningAnalyticsStore={schemaVersion:1;confirmedWeeklyPlans:ConfirmedWeeklyPlan[];priorityHistory:TrainingPrioritySnapshot[];reportViewHistory:string[];routineCompletions:RoutineCompletionSnapshot[];planEditHistory:PlanEdit[];updatedAt:string}
const KEY='cabin-learning-analytics',VERSION=1,now=()=>new Date().toISOString()
const empty=():LearningAnalyticsStore=>({schemaVersion:VERSION,confirmedWeeklyPlans:[],priorityHistory:[],reportViewHistory:[],routineCompletions:[],planEditHistory:[],updatedAt:now()})
function read(){if(typeof window==='undefined')return empty();try{const raw=JSON.parse(localStorage.getItem(KEY)??'{}');return{schemaVersion:VERSION,confirmedWeeklyPlans:Array.isArray(raw.confirmedWeeklyPlans)?raw.confirmedWeeklyPlans.slice(0,52):[],priorityHistory:Array.isArray(raw.priorityHistory)?raw.priorityHistory.slice(0,52):[],reportViewHistory:Array.isArray(raw.reportViewHistory)?raw.reportViewHistory.slice(0,200):[],routineCompletions:Array.isArray(raw.routineCompletions)?raw.routineCompletions.filter((x:RoutineCompletionSnapshot)=>x&&typeof x.id==='string'&&typeof x.occurredAt==='string').slice(0,1000):[],planEditHistory:Array.isArray(raw.planEditHistory)?raw.planEditHistory.slice(0,500):[],updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:now()} as LearningAnalyticsStore}catch{return empty()}}
function write(s:LearningAnalyticsStore){const next:LearningAnalyticsStore={...s,schemaVersion:1,updatedAt:now()};if(typeof window!=='undefined'){localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('cabin:learning-local-changed'))}return next}
export const learningAnalyticsRepository={
  load:read,recover(){return write(read())},
  markReportViewed(weekStart:string){const s=read();s.reportViewHistory=Array.from(new Set([`${weekStart}:${now()}`,...s.reportViewHistory])).slice(0,200);return write(s)},
  recordRoutine(task:{id:string;name:string;minutes:number},relatedCapability:CapabilityKey='application_readiness'){const s=read(),date=now(),id=`routine:${task.id}:${date.slice(0,10)}`;if(!s.routineCompletions.some(x=>x.id===id))s.routineCompletions.unshift({id,taskId:task.id,title:task.name,minutes:task.minutes,occurredAt:date,relatedCapability});return write(s)},
  removeRoutine(taskId:string,date=new Date().toISOString().slice(0,10)){const s=read();s.routineCompletions=s.routineCompletions.filter(x=>!(x.taskId===taskId&&x.occurredAt.slice(0,10)===date));return write(s)},
  savePrioritySnapshot(snapshot:TrainingPrioritySnapshot){const s=read();s.priorityHistory=[snapshot,...s.priorityHistory.filter(x=>x.weekStart!==snapshot.weekStart)].slice(0,52);return write(s)},
  confirmPlan(plan:ConfirmedWeeklyPlan){const s=read();s.confirmedWeeklyPlans=[plan,...s.confirmedWeeklyPlans.filter(x=>x.weekStart!==plan.weekStart)].slice(0,52);s.planEditHistory.unshift({id:`edit-${Date.now()}`,weekStart:plan.weekStart,action:'confirm',occurredAt:now(),detail:'사용자가 다음 주 계획을 확정함'});return write(s)},
  recordPlanEdit(edit:Omit<PlanEdit,'id'|'occurredAt'>){const s=read();s.planEditHistory.unshift({...edit,id:`edit-${Date.now()}`,occurredAt:now()});return write(s)}
}
