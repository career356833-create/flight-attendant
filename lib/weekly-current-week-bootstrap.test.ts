import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDailyActionPlan, weeklyTaskToDailyAction } from './daily-action-plan'
import { learningAnalyticsRepository } from './learning-analytics-repository'
import { buildWeeklyRoutine, generateCurrentWeekRoutine, generateNextWeekRoutine, type TrainingPriority } from './learning-analytics-service'
import { incompleteWeeklyTasks, weeklyCompletionIds, weeklyProgress } from './weekly-task-completion'
import { createConfirmedWeeklyPlan, CURRENT_WEEK_BOOTSTRAP_CTA_CLASS, currentWeekStartKey, findCurrentWeeklyPlan, hasCurrentWeeklyPlan, isCurrentWeekBootstrapEligible } from './weekly-current-week-bootstrap'
import { interviewReturnTargetForSource } from './single-interview-resume'

const monday=new Date(2026,8,7,10)
const wednesday=new Date(2026,8,9,10)
const sunday=new Date(2026,8,13,10)
const priorities:TrainingPriority[]=[
  {key:'p1',title:'면접',relatedCapability:'interview_communication',source:'performance',reason:'반복 연습',priorityScore:90},
  {key:'p2',title:'안전',relatedCapability:'safety_and_role_judgment',source:'performance',reason:'안전 연습',priorityScore:80},
  {key:'p3',title:'지원',relatedCapability:'application_readiness',source:'performance',reason:'지원 연습',priorityScore:70},
]

function memoryStorage(seed?:unknown){const values=new Map<string,string>();if(seed!==undefined)values.set('cabin-learning-analytics',JSON.stringify(seed));return{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key),values}}
function withStorage<T>(run:(storage:ReturnType<typeof memoryStorage>)=>T,seed?:unknown){const storage=memoryStorage(seed),priorWindow=globalThis.window,priorStorage=globalThis.localStorage;Object.assign(globalThis,{window:{dispatchEvent:()=>true},localStorage:storage});try{return run(storage)}finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}}
const currentDays=(today=monday)=>generateCurrentWeekRoutine(priorities,'thirty_minutes',today)
const plan=(today=monday,days=currentDays(today))=>createConfirmedWeeklyPlan(currentWeekStartKey(today),days,'2026-09-07T01:00:00.000Z')

test('no current plan makes bootstrap CTA eligible',()=>assert.equal(isCurrentWeekBootstrapEligible({plans:[],currentWeekTaskCount:0,today:monday}),true))
test('current plan hides bootstrap CTA',()=>assert.equal(isCurrentWeekBootstrapEligible({plans:[plan()],currentWeekTaskCount:14,today:monday}),false))
test('completed current plan still prevents duplicate bootstrap',()=>assert.equal(isCurrentWeekBootstrapEligible({plans:[plan()],currentWeekTaskCount:0,today:monday}),false))
test('current weekStart is Monday',()=>assert.equal(currentWeekStartKey(wednesday),'2026-09-07'))
test('Sunday belongs to the preceding Monday week',()=>assert.equal(currentWeekStartKey(sunday),'2026-09-07'))
test('Monday rollover creates the new week identity',()=>assert.equal(currentWeekStartKey(new Date(2026,8,14,0,1)),'2026-09-14'))
test('mid-week bootstrap excludes past dates',()=>assert.deepEqual(currentDays(wednesday).map(day=>day.date),['2026-09-09','2026-09-10','2026-09-11','2026-09-12','2026-09-13']))
test('generated task count is deterministic',()=>assert.equal(currentDays(wednesday).flatMap(day=>day.tasks).length,10))
test('current plan factory keeps Monday identity when first day is mid-week',()=>assert.equal(plan(wednesday).weekStart,'2026-09-07'))
test('repository confirm creates current confirmed plan',()=>withStorage(()=>{learningAnalyticsRepository.confirmPlan(plan());assert.equal(learningAnalyticsRepository.load().confirmedWeeklyPlans[0].weekStart,'2026-09-07')}))
test('repository confirm is idempotent by weekStart',()=>withStorage(()=>{learningAnalyticsRepository.confirmPlan(plan());learningAnalyticsRepository.confirmPlan(plan());assert.equal(learningAnalyticsRepository.load().confirmedWeeklyPlans.length,1)}))
test('refresh reload does not duplicate the current plan',()=>withStorage(()=>{learningAnalyticsRepository.confirmPlan(plan());assert.equal(learningAnalyticsRepository.load().confirmedWeeklyPlans.filter(item=>item.weekStart==='2026-09-07').length,1)}))
test('confirming current week preserves next-week preview data',()=>withStorage(()=>{const next=plan(new Date(2026,8,14,10));learningAnalyticsRepository.confirmPlan(next);learningAnalyticsRepository.confirmPlan(plan());assert.ok(learningAnalyticsRepository.load().confirmedWeeklyPlans.some(item=>item.weekStart==='2026-09-14'))}))
test('confirming current week preserves an already confirmed next week',()=>withStorage(()=>{const next=plan(new Date(2026,8,14,10));learningAnalyticsRepository.confirmPlan(next);learningAnalyticsRepository.confirmPlan(plan());assert.equal(learningAnalyticsRepository.load().confirmedWeeklyPlans.length,2)}))
test('current and next plan identities differ',()=>assert.notEqual(plan().weekStart,plan(new Date(2026,8,14,10)).weekStart))
test('current task resolves into Daily Plan',()=>{const task=currentDays()[0].tasks[0],daily=buildDailyActionPlan({now:monday,weeklyTasks:[task],validQuestionIds:['im2'],balancedQuestionId:'im2'});assert.equal(daily.primary.source,'weekly_plan')})
test('confirm alone does not mark a weekly task complete',()=>withStorage(()=>{learningAnalyticsRepository.confirmPlan(plan());assert.equal(learningAnalyticsRepository.load().routineCompletions.length,0)}))
test('confirm alone does not create Learning Activity data',()=>withStorage(()=>{learningAnalyticsRepository.confirmPlan(plan());assert.equal(learningAnalyticsRepository.load().routineCompletions.length,0)}))
test('completed task continues to use recordWeeklyTask',()=>withStorage(()=>{const task=currentDays()[0].tasks[0];learningAnalyticsRepository.recordWeeklyTask({id:task.id,name:task.title,minutes:task.estimatedMinutes,weekStart:'2026-09-07'},task.relatedCapability);assert.equal(learningAnalyticsRepository.load().routineCompletions[0].source,'weekly_plan')}))
test('completed weekly task is excluded from Daily Plan input',()=>withStorage(()=>{const task=currentDays()[0].tasks[0];learningAnalyticsRepository.recordWeeklyTask({id:task.id,name:task.title,minutes:task.estimatedMinutes},task.relatedCapability);const completed=weeklyCompletionIds(learningAnalyticsRepository.load().routineCompletions);assert.equal(incompleteWeeklyTasks([task],completed).length,0)}))
test('diagnosis missing still produces fallback current routine',()=>assert.ok(generateCurrentWeekRoutine(priorities,'fifteen_minutes',monday).length>0))
test('adaptive evidence missing still uses supplied fallback priorities',()=>assert.equal(generateCurrentWeekRoutine(priorities,'fifteen_minutes',monday)[0].focusCapability,'interview_communication'))
test('Supabase unavailable does not block local confirm',()=>withStorage(()=>assert.equal(learningAnalyticsRepository.confirmPlan(plan()).confirmedWeeklyPlans.length,1)))
test('legacy current plan with inferred weekStart is safe',()=>withStorage(()=>{const legacy={schemaVersion:1,confirmedWeeklyPlans:[{days:currentDays(wednesday),confirmedAt:'2026-09-09T00:00:00.000Z'}]};localStorage.setItem('cabin-learning-analytics',JSON.stringify(legacy));assert.equal(learningAnalyticsRepository.load().confirmedWeeklyPlans[0].weekStart,'2026-09-07')}))
test('malformed current plan record safely blocks duplicate bootstrap',()=>{const malformed={weekStart:'2026-09-07',days:'broken'};assert.equal(hasCurrentWeeklyPlan([malformed],wednesday),true);assert.equal(isCurrentWeekBootstrapEligible({plans:[malformed],currentWeekTaskCount:0,today:wednesday}),false)})
test('bootstrap CTA keeps a 44px minimum target',()=>assert.equal(CURRENT_WEEK_BOOTSTRAP_CTA_CLASS.split(' ').includes('min-h-11'),true))
test('weekly interview return target regression remains weekly report',()=>assert.equal(interviewReturnTargetForSource('weekly_task'),'weekly-report'))
test('current denominator uses only current confirmed plan tasks',()=>{const current=plan(),next=plan(new Date(2026,8,14,10)),found=findCurrentWeeklyPlan([next,current],monday)!;assert.equal(weeklyProgress(found.days,new Set(next.days.flatMap(day=>day.tasks.map(task=>task.id)))).completed,0);assert.equal(weeklyProgress(found.days,new Set()).total,14)})

test('shared builder retains the existing next-week seven-day shape',()=>assert.equal(buildWeeklyRoutine(new Date(2026,8,14),priorities,'thirty_minutes','next').length,7))
test('next-week generator remains one full week ahead',()=>assert.equal(generateNextWeekRoutine(priorities,'fifteen_minutes',wednesday)[0].date,'2026-09-14'))
test('Sunday bootstrap creates only the remaining Sunday tasks',()=>assert.equal(currentDays(sunday).length,1))
test('planning availability can explicitly disable bootstrap',()=>assert.equal(isCurrentWeekBootstrapEligible({plans:[],currentWeekTaskCount:0,today:monday,canUseWeeklyPlanning:false}),false))
test('CTA does not itself create a confirmed plan',()=>withStorage(()=>{currentDays();assert.equal(learningAnalyticsRepository.load().confirmedWeeklyPlans.length,0)}))
test('current plan detection ignores a next-week-only plan',()=>assert.equal(hasCurrentWeeklyPlan([plan(new Date(2026,8,14,10))],monday),false))
test('weekly task conversion preserves existing completion semantics',()=>assert.equal(weeklyTaskToDailyAction(currentDays()[0].tasks[0],{validQuestionIds:['im2'],balancedQuestionId:'im2'})?.weeklyTaskId,currentDays()[0].tasks[0].id))
