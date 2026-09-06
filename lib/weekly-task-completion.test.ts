import assert from 'node:assert/strict'
import test from 'node:test'
import { learningAnalyticsRepository, type RoutineCompletionSnapshot } from './learning-analytics-repository'
import type { WeeklyRoutineDay, WeeklyRoutineTask } from './learning-analytics-service'
import { acceptsWeeklyCompletion, completeWeeklyInterviewAttempt, completeWeeklyTaskContext, createWeeklyTaskContext, incompleteWeeklyTasks, nextIncompleteWeeklyTask, weeklyCompletionIds, weeklyProgress, type WeeklyCompletionEvent, type WeeklyTaskContext } from './weekly-task-completion'
import { WEEKLY_TASK_CTA_CLASS } from '../components/weekly-report/weekly-report'

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
test('mobile weekly task CTA keeps a 44px minimum target',()=>assert.equal(WEEKLY_TASK_CTA_CLASS.split(' ').includes('min-h-11'),true))
test('desktop weekly task CTA keeps compact card alignment',()=>{const classes=WEEKLY_TASK_CTA_CLASS.split(' ');assert.equal(classes.includes('shrink-0'),true);assert.equal(classes.includes('w-full'),false)})

test('completed current task attempt preserves lineage and advances exactly once',()=>{
  const values=new Map<string,string>(),events:string[]=[]
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key)}
  const priorWindow=globalThis.window,priorStorage=globalThis.localStorage
  Object.assign(globalThis,{window:{dispatchEvent:(value:Event)=>{events.push(value.type);return true}},localStorage:storage})
  try{
    const current=task('interview_question','current-2026-09-07-0'),next=task('review','current-2026-09-07-1')
    const weeklyTaskContext=createWeeklyTaskContext(current,'2026-09-07','interview')!
    const attempt={id:'attempt-current-1',completed:true,weeklyTaskContext}
    assert.equal(completeWeeklyInterviewAttempt(attempt),true)
    const stored=learningAnalyticsRepository.load().routineCompletions
    assert.equal(stored.length,1)
    assert.equal(stored[0].taskId,current.id)
    assert.equal(stored[0].sourceCompletionId,attempt.id)
    assert.match(stored[0].occurredAt,/^\d{4}-\d{2}-\d{2}T/)
    const completed=weeklyCompletionIds(stored)
    assert.deepEqual(weeklyProgress(days([current,next]),completed),{completed:1,total:2})
    assert.equal(nextIncompleteWeeklyTask(days([current,next]),completed)?.id,next.id)
    assert.deepEqual(incompleteWeeklyTasks([current,next],completed).map(item=>item.id),[next.id])
    assert.equal(completeWeeklyInterviewAttempt(attempt),false)
    assert.equal(completeWeeklyInterviewAttempt({...attempt,id:'attempt-current-retake',previousAttemptId:attempt.id}),false)
    assert.equal(learningAnalyticsRepository.load().routineCompletions.length,1)
    assert.equal(events.filter(value=>value==='cabin:learning-local-changed').length,1)
  }finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}
})

test('unfinished and direct attempts cannot mutate weekly completion',()=>{
  const values=new Map<string,string>()
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key)}
  const priorWindow=globalThis.window,priorStorage=globalThis.localStorage
  Object.assign(globalThis,{window:{dispatchEvent:()=>true},localStorage:storage})
  try{
    const weeklyTaskContext=createWeeklyTaskContext(task('interview_question','current-2026-09-07-0'),'2026-09-07','interview')!
    assert.equal(completeWeeklyInterviewAttempt({id:'unfinished',completed:false,weeklyTaskContext}),false)
    assert.equal(completeWeeklyInterviewAttempt({id:'direct',completed:true}),false)
    assert.equal(learningAnalyticsRepository.load().routineCompletions.length,0)
  }finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}
})

test('every executable kind records its real completion exactly once',()=>{
  const values=new Map<string,string>(),events:string[]=[]
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key)}
  const priorWindow=globalThis.window,priorStorage=globalThis.localStorage
  Object.assign(globalThis,{window:{dispatchEvent:(value:Event)=>{events.push(value.type);return true}},localStorage:storage})
  try{
    const matrix:Array<{kind:NonNullable<WeeklyTaskContext['targetKind']>;taskType:WeeklyRoutineTask['type'];event:WeeklyCompletionEvent}>=[
      {kind:'interview',taskType:'interview_question',event:{type:'interview_attempt',entityId:'attempt-1',completed:true}},
      {kind:'mock',taskType:'interview_question',event:{type:'mock_session',entityId:'session-1',completed:true}},
      {kind:'self_introduction',taskType:'self_introduction',event:{type:'self_introduction',entityId:'self-1',completed:true}},
      {kind:'application',taskType:'application_work',event:{type:'application_answer',entityId:'answer-1',completed:true}},
      {kind:'experience',taskType:'experience_work',event:{type:'experience_saved',entityId:'experience-1',completed:true}},
      {kind:'queue',taskType:'review',event:{type:'queue_practiced',entityId:'queue-1',completed:true}},
    ]
    matrix.forEach(({kind,taskType,event},index)=>{
      const item=context(taskType,kind)!
      item.weeklyTaskId=`matrix-${index}`
      assert.equal(completeWeeklyTaskContext(item,event),true)
      assert.equal(completeWeeklyTaskContext(item,{...event,entityId:`${event.entityId}-revisit`}),false)
    })
    const stored=learningAnalyticsRepository.load().routineCompletions
    assert.equal(stored.length,matrix.length)
    assert.deepEqual(new Set(stored.map(item=>item.sourceCompletionId)),new Set(matrix.map(item=>item.event.entityId)))
    assert.equal(events.filter(value=>value==='cabin:learning-local-changed').length,matrix.length)
  }finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}
})
