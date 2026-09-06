import type { DailyActionCandidate, DailyActionPlan } from './daily-action-plan'

export type HomePresentationModel={
  primary:DailyActionCandidate
  resume?:DailyActionCandidate
  secondary:DailyActionCandidate[]
  weeklyProgress?:{completed:number;total:number}
  activityCount:number
  streakLabel:string
}

const sameAction=(a:DailyActionCandidate,b:DailyActionCandidate)=>a.dedupeKey===b.dedupeKey

export function deriveHomePresentationModel(input:{plan:DailyActionPlan;weeklyCompleted:number;weeklyTotal:number;activityCount:number;streakDays?:number}):HomePresentationModel{
  const actions=[input.plan.primary,...input.plan.secondary]
  const resume=actions.find(action=>action.resume&&!sameAction(action,input.plan.primary))
  const secondary=actions.filter(action=>action!==input.plan.primary&&action!==resume).slice(0,resume?1:2)
  return{primary:input.plan.primary,resume,secondary,weeklyProgress:input.weeklyTotal>0?{completed:Math.min(input.weeklyCompleted,input.weeklyTotal),total:input.weeklyTotal}:undefined,activityCount:Math.max(0,input.activityCount),streakLabel:input.streakDays===undefined?'기록 없음':`${input.streakDays}일`}
}
