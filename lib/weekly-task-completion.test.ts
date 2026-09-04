import assert from 'node:assert/strict'
import test from 'node:test'
import { learningAnalyticsRepository, type RoutineCompletionSnapshot } from './learning-analytics-repository'
import type { WeeklyRoutineDay, WeeklyRoutineTask } from './learning-analytics-service'
import { acceptsWeeklyCompletion, createWeeklyTaskContext, incompleteWeeklyTasks, nextIncompleteWeeklyTask, weeklyCompletionIds, weeklyProgress } from './weekly-task-completion'

const task=(type:WeeklyRoutineTask['type']='interview_question',id='week-2026-09-07-1'):WeeklyRoutineTask=>({id,type,title:'계획 과제',estimatedMinutes:10,relatedCapability:'interview_communication',reason:'계획'})
const context=(type:WeeklyRoutineTask['type']='interview_question',kind?:Parameters<typeof createWeeklyTaskContext>[2])=>createWeeklyTaskContext(task(type),'2026-09-07',kind)!
const event=(type:Parameters<typeof acceptsWeeklyCompletion>[1]['type'],patch:Partial<Parameters<typeof acceptsWeeklyCompletion>[1]>={})=>({type,entityId:'entity-1',completed:true,...patch})
const days=(tasks:WeeklyRoutineTask[]):WeeklyRoutineDay[]=>[{date:'2026-09-07',dayIndex:0,focusCapability:'interview_communication',targetMinutes:20,tasks,isReviewDay:false}]
const completion=(taskId:string):RoutineCompletionSnapshot=>({id:`weekly:${taskId}`,taskId,title:'완료',minutes:10,occurredAt:'2026-09-07T10:00:00.000Z',relatedCapability:'interview_communication',source:'weekly_plan',weekStart:'2026-09-07'})

test('interview completed attempt completes interview task',()=>assert.equal(acceptsWeeklyCompletion(context(),event('interview_attempt')),true))
test('page entry cannot complete a task',()=>assert.equal(acceptsWeeklyCompletion(context(),event('interview_attempt',{completed:false})),false))
test('mock partial session stays incomplete',()=>assert.equal(acceptsWeeklyCompletion(context('interview_question','mock'),event('mock_session',{completed:false})),false))
test('mock completed session completes mock task',()=>assert.equal(acceptsWeeklyCompletion(context('interview_question','mock'),event('mock_session')),true))
test('mock attempt alone cannot complete mock task',()=>assert.equal(acceptsWeeklyCompletion(context('interview_question','mock'),event('interview_attempt')),false))
test('self introduction attempt completes its task',()=>assert.equal(acceptsWeeklyCompletion(context('self_introduction'),event('self_introduction')),true))
test('application page entry cannot complete',()=>assert.equal(acceptsWeeklyCompletion(context('application_work'),event('application_answer',{completed:false})),false))
test('application answer save completes application task',()=>assert.equal(acceptsWeeklyCompletion(context('application_work'),event('application_answer')),true))
test('experience save completes experience task',()=>assert.equal(acceptsWeeklyCompletion(context('experience_work'),event('experience_saved')),true))
test('retake review requires a parent attempt',()=>assert.equal(acceptsWeeklyCompletion(context('review'),event('interview_attempt')),false))
test('completed linked retake completes review task',()=>assert.equal(acceptsWeeklyCompletion(context('review'),event('interview_attempt',{previousAttemptId:'parent'})),true))
test('practiced queue item completes queue task',()=>assert.equal(acceptsWeeklyCompletion(context('review','queue'),event('queue_practiced')),true))
test('queue page entry cannot complete queue task',()=>assert.equal(acceptsWeeklyCompletion(context('review','queue'),event('queue_practiced',{completed:false})),false))
test('unknown completion type does not cross task boundaries',()=>assert.equal(acceptsWeeklyCompletion(context('self_introduction'),event('application_answer')),false))
test('legacy task without id creates no context',()=>assert.equal(createWeeklyTaskContext({...task(),id:''}),null))
test('completion ids include only weekly plan records',()=>{const manual={...completion('manual'),id:'routine:manual:2026-09-07',source:undefined};assert.deepEqual([...weeklyCompletionIds([manual,completion('weekly')])],['weekly'])})
test('completed tasks are excluded from daily candidates',()=>assert.deepEqual(incompleteWeeklyTasks([task(),task('self_introduction','second')],new Set([task().id])).map(item=>item.id),['second']))
test('next incomplete task follows existing order',()=>assert.equal(nextIncompleteWeeklyTask(days([task(),task('self_introduction','second')]),new Set([task().id]))?.id,'second'))
test('weekly progress uses actual tasks without fake denominator',()=>assert.deepEqual(weeklyProgress(days([task(),task('self_introduction','second')]),new Set([task().id])),{completed:1,total:2}))
test('empty weekly plan reports zero over zero',()=>assert.deepEqual(weeklyProgress([],new Set()),{completed:0,total:0}))
test('cross-week task ids remain distinct',()=>assert.equal(new Set([task().id,'week-2026-09-14-1']).size,2))
test('weekly context contains only minimal lineage metadata',()=>assert.deepEqual(Object.keys(context()).sort(),['estimatedMinutes','relatedCapability','source','taskType','title','weeklyTaskId','weekStart'].sort()))
test('completion policy has no Azure dependency',()=>assert.equal(JSON.stringify(context()).toLowerCase().includes('azure'),false))
test('repository stores one completion for duplicate weekly events',()=>{const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key)};const priorWindow=globalThis.window;const priorStorage=globalThis.localStorage;Object.assign(globalThis,{window:{dispatchEvent:()=>true},localStorage:storage});try{learningAnalyticsRepository.recordWeeklyTask({id:'same-task',name:'과제',minutes:10,sourceCompletionId:'attempt-1'});learningAnalyticsRepository.recordWeeklyTask({id:'same-task',name:'과제',minutes:10,sourceCompletionId:'attempt-2'});assert.equal(learningAnalyticsRepository.load().routineCompletions.length,1)}finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}})
test('repository keeps different cross-week task ids separate',()=>{const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key)};const priorWindow=globalThis.window;const priorStorage=globalThis.localStorage;Object.assign(globalThis,{window:{dispatchEvent:()=>true},localStorage:storage});try{learningAnalyticsRepository.recordWeeklyTask({id:'week-1-task',name:'첫 주',minutes:10,weekStart:'2026-09-07'});learningAnalyticsRepository.recordWeeklyTask({id:'week-2-task',name:'둘째 주',minutes:10,weekStart:'2026-09-14'});assert.equal(learningAnalyticsRepository.load().routineCompletions.length,2)}finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}})
