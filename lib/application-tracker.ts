import type {AirlineApplication,ApplicationStatus} from './supabase/application-sync-repository'

export type ApplicationTrackerFilter='all'|'preparing'|'applied'|'interview'|'result'
export type ApplicationImportantDate={kind:'interview'|'deadline';date:string;dday:string;days:number}

const dayMs=86_400_000
const dateParts=(value:string)=>{const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(value);if(!match)return null;const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));return Number.isNaN(date.getTime())?null:date}
const startOfDay=(value:Date)=>new Date(value.getFullYear(),value.getMonth(),value.getDate())

export function calculateApplicationDday(targetDate:string,today=new Date()):string{
  const target=dateParts(targetDate)
  if(!target)return '일정 미등록'
  const days=Math.round((target.getTime()-startOfDay(today).getTime())/dayMs)
  return days===0?'D-Day':days>0?`D-${days}`:`D+${Math.abs(days)}`
}

export function applicationDaysUntil(targetDate:string,today=new Date()):number|null{
  const target=dateParts(targetDate)
  return target?Math.round((target.getTime()-startOfDay(today).getTime())/dayMs):null
}

export function getNextImportantDate(application:AirlineApplication,today=new Date()):ApplicationImportantDate|null{
  const interviewDays=application.interviewAt?applicationDaysUntil(application.interviewAt,today):null
  if(interviewDays!==null&&interviewDays>=0)return{kind:'interview',date:application.interviewAt!,days:interviewDays,dday:calculateApplicationDday(application.interviewAt!,today)}
  const deadlineDays=application.deadlineAt?applicationDaysUntil(application.deadlineAt,today):null
  if(deadlineDays!==null&&deadlineDays>=0&&!['submitted','screening','interview','offer','rejected','withdrawn','archived'].includes(application.status))return{kind:'deadline',date:application.deadlineAt!,days:deadlineDays,dday:calculateApplicationDday(application.deadlineAt!,today)}
  return null
}

export function getApplicationDisplayDate(application:AirlineApplication,today=new Date()):ApplicationImportantDate|null{
  const next=getNextImportantDate(application,today)
  if(next)return next
  const candidates=[application.interviewAt?{kind:'interview' as const,date:application.interviewAt}:null,application.deadlineAt?{kind:'deadline' as const,date:application.deadlineAt}:null].filter((item):item is {kind:'interview'|'deadline';date:string}=>Boolean(item)).map(item=>{const days=applicationDaysUntil(item.date,today);return days===null?null:{...item,days,dday:calculateApplicationDday(item.date,today)}}).filter((item):item is ApplicationImportantDate=>Boolean(item))
  return candidates.sort((a,b)=>b.days-a.days)[0]??null
}

export function sortUpcomingApplications(applications:AirlineApplication[],today=new Date(),limit=3){
  return applications.map(application=>({application,importantDate:getNextImportantDate(application,today)})).filter((item):item is {application:AirlineApplication;importantDate:ApplicationImportantDate}=>Boolean(item.importantDate)).sort((a,b)=>a.importantDate.days-b.importantDate.days||a.application.airlineNameSnapshot.localeCompare(b.application.airlineNameSnapshot)).slice(0,limit)
}

export function applicationMatchesFilter(status:ApplicationStatus,filter:ApplicationTrackerFilter){
  if(filter==='all')return true
  if(filter==='preparing')return ['planning','drafting','ready'].includes(status)
  if(filter==='applied')return ['submitted','screening'].includes(status)
  if(filter==='interview')return status==='interview'
  return ['offer','rejected','withdrawn','archived'].includes(status)
}

export function mergeApplicationsByUpdatedAt(local:AirlineApplication[],remote:AirlineApplication[]){
  const merged=new Map<string,AirlineApplication>()
  for(const item of [...local,...remote]){const previous=merged.get(item.id);if(!previous||item.updatedAt>previous.updatedAt)merged.set(item.id,item)}
  return [...merged.values()].filter(item=>!item.deletedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))
}

export function createTrackedApplication(input:{airlineId:string;airlineNameSnapshot:string;status:ApplicationStatus;deadlineAt?:string;interviewAt?:string;memo?:string},now=new Date()):AirlineApplication{
  const timestamp=now.toISOString()
  return{id:crypto.randomUUID(),airlineId:input.airlineId,airlineNameSnapshot:input.airlineNameSnapshot,positionTitle:'객실승무원',status:input.status,deadlineAt:input.deadlineAt||undefined,interviewAt:input.interviewAt||undefined,memo:input.memo?.trim()||undefined,createdAt:timestamp,updatedAt:timestamp}
}
