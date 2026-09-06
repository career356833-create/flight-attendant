import type { ConfirmedWeeklyPlan } from '@/lib/learning-analytics-repository'
import type { WeeklyRoutineDay } from '@/lib/learning-analytics-service'
import { localDateKey, startOfLocalWeek } from '@/lib/local-date-utils'

const datePattern=/^\d{4}-\d{2}-\d{2}$/
const asRecord=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'?value as Record<string,unknown>:null

export const CURRENT_WEEK_BOOTSTRAP_CTA_CLASS='min-h-11 w-full rounded-xl bg-navy px-4 py-3 text-sm font-bold text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'

export function currentWeekStartKey(today=new Date()){return localDateKey(startOfLocalWeek(today))}

export function hasCurrentWeeklyPlan(plans:unknown[],today=new Date()){const weekStart=currentWeekStartKey(today),weekEnd=new Date(startOfLocalWeek(today));weekEnd.setDate(weekEnd.getDate()+6);const weekEndKey=localDateKey(weekEnd);return plans.some(value=>{const plan=asRecord(value);if(!plan)return false;if(plan.weekStart===weekStart)return true;if(!Array.isArray(plan.days))return false;return plan.days.some(value=>{const day=asRecord(value),date=day?.date;return typeof date==='string'&&datePattern.test(date)&&date>=weekStart&&date<=weekEndKey})})}

export function findCurrentWeeklyPlan(plans:ConfirmedWeeklyPlan[],today=new Date()){const weekStart=currentWeekStartKey(today);return plans.find(plan=>plan.weekStart===weekStart&&Array.isArray(plan.days))}

export function isCurrentWeekBootstrapEligible(input:{plans:unknown[];currentWeekTaskCount:number;today?:Date;canUseWeeklyPlanning?:boolean}){return(input.canUseWeeklyPlanning??true)&&input.currentWeekTaskCount===0&&!hasCurrentWeeklyPlan(input.plans,input.today)}

export function createConfirmedWeeklyPlan(weekStart:string,days:WeeklyRoutineDay[],confirmedAt=new Date().toISOString()):ConfirmedWeeklyPlan{return{weekStart,days,confirmedAt,updatedAt:confirmedAt}}
