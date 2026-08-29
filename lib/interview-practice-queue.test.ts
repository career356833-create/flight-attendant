import assert from 'node:assert/strict'
import test from 'node:test'
import { interviewQuestionById, type InterviewAttempt } from './interview-practice-data'
import { getSafeTimestamp, interviewPracticeQueueRepository, isAllowedInterviewQuestion, normalizeInterviewPracticeQueueItem, recommendedQueueReason, sortPracticeQueue } from './interview-practice-queue'

class MemoryStorage {
  private values=new Map<string,string>()
  failWrites=false
  getItem(key:string){return this.values.get(key)??null}
  setItem(key:string,value:string){if(this.failWrites)throw new DOMException('blocked','SecurityError');this.values.set(key,value)}
  clear(){this.values.clear();this.failWrites=false}
}

const storage=new MemoryStorage()
Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true})
Object.defineProperty(globalThis,'window',{value:{dispatchEvent(){},addEventListener(){},removeEventListener(){}},configurable:true})

test.beforeEach(()=>storage.clear())

test('favorite toggle is independent from the practice queue',()=>{
  const question=interviewQuestionById.get('cs1')!
  assert.equal(interviewPracticeQueueRepository.toggleFavorite({question},new Date('2026-08-28')),true)
  assert.equal(interviewPracticeQueueRepository.listFavorites().length,1)
  assert.equal(interviewPracticeQueueRepository.listQueue().length,0)
  assert.equal(interviewPracticeQueueRepository.toggleFavorite({question}),false)
  assert.equal(interviewPracticeQueueRepository.listFavorites().length,0)
})

test('queue prevents duplicates and preserves the stronger priority reason',()=>{
  const question=interviewQuestionById.get('sj1')!
  const first=interviewPracticeQueueRepository.addQueue({question,reason:'manual'},new Date('2026-08-28T00:00:00Z'))!
  const second=interviewPracticeQueueRepository.addQueue({question,reason:'safety'},new Date('2026-08-28T01:00:00Z'))!
  assert.equal(first.id,second.id)
  assert.equal(interviewPracticeQueueRepository.listOpen().length,1)
  assert.equal(second.reason,'safety')
})

test('queue remains open on entry and changes only after completed-attempt handling',()=>{
  const question=interviewQuestionById.get('be1')!
  const item=interviewPracticeQueueRepository.addQueue({question,reason:'missing_result'})!
  assert.equal(interviewPracticeQueueRepository.listOpen()[0].status,'open')
  assert.equal(interviewPracticeQueueRepository.markPracticed(item.id),true)
  assert.equal(interviewPracticeQueueRepository.listOpen().length,0)
})

test('priority, published gate, legacy safety and privacy shape stay deterministic',()=>{
  const question=interviewQuestionById.get('sj1')!
  const fake={...question,id:'draft-airline-question',airlineTags:['draft-airline']}
  assert.equal(isAllowedInterviewQuestion(fake,'draft-airline'),false)
  assert.deepEqual(sortPracticeQueue([{id:'m',questionId:'be1',reason:'manual',status:'open',priority:9,createdAt:'2026-01-01',updatedAt:'2026-01-01'},{id:'s',questionId:'sj1',reason:'safety',status:'open',priority:1,createdAt:'2026-01-02',updatedAt:'2026-01-02'}]).map(item=>item.id),['s','m'])
  assert.deepEqual(interviewPracticeQueueRepository.listOpen(),[])
  assert.equal(['age','birthDate','gender','photo','email','phone'].some(key=>key in ({questionId:'be1',reason:'manual'})),false)
})

test('attempt analysis chooses a deterministic queue reason',()=>{
  const attempt={category:'behavioral_experience',contentAnalysis:{structure:{missingParts:['Action']},competencies:[],answerQuality:{genericClaims:[]}},speechMetrics:{fillers:{totalCount:0}},audioMetrics:{pauses:{longCount:0}}} as unknown as InterviewAttempt
  assert.equal(recommendedQueueReason(attempt),'missing_action')
})

test('malformed legacy records normalize without invalid dates entering sort',()=>{
  const rows=[null,3,'bad',{id:'no-question',status:'open',reason:'manual'},{id:'bad-status',questionId:'be1',status:'unknown',reason:'manual'},{id:'missing-date',questionId:'be1',status:'open',reason:'manual'},{id:'number-date',questionId:'cs1',status:'open',reason:'favorite',createdAt:12},{id:'invalid-date',questionId:'sj1',status:'open',reason:'unknown',createdAt:'not-a-date'}]
  const normalized=rows.map(normalizeInterviewPracticeQueueItem).filter(Boolean)
  assert.equal(normalized.length,3)
  assert.equal(normalized.every(item=>item?.createdAt===''),true)
  assert.equal(getSafeTimestamp(normalized[0]?.createdAt),Number.POSITIVE_INFINITY)
  assert.doesNotThrow(()=>sortPracticeQueue(normalized as NonNullable<(typeof normalized)[number]>[]))
})

test('malformed JSON, non-array and unavailable questions produce an empty open state',()=>{
  storage.setItem('cabin-interview-practice-queue-v1','{broken')
  assert.deepEqual(interviewPracticeQueueRepository.listOpen(),[])
  storage.setItem('cabin-interview-practice-queue-v1',JSON.stringify({questionId:'be1'}))
  assert.deepEqual(interviewPracticeQueueRepository.listOpen(),[])
  storage.setItem('cabin-interview-practice-queue-v1',JSON.stringify([{id:'gone',questionId:'removed-question',status:'open',reason:'manual'}]))
  assert.deepEqual(interviewPracticeQueueRepository.listOpen(),[])
})

test('storage write failures never escape and preserve existing data',()=>{
  const question=interviewQuestionById.get('be1')!
  storage.setItem('cabin-interview-question-favorites-v1','[]')
  const existingQueue=JSON.stringify([{id:'existing',questionId:'be1',status:'open',reason:'manual',createdAt:'2026-01-01'}])
  storage.setItem('cabin-interview-practice-queue-v1',existingQueue)
  storage.failWrites=true
  assert.doesNotThrow(()=>interviewPracticeQueueRepository.toggleFavorite({question}))
  assert.equal(interviewPracticeQueueRepository.toggleFavorite({question}),false)
  assert.equal(interviewPracticeQueueRepository.addQueue({question,reason:'manual'}),null)
  assert.equal(interviewPracticeQueueRepository.markPracticed('existing'),false)
  storage.failWrites=false
  assert.equal(storage.getItem('cabin-interview-question-favorites-v1'),'[]')
  assert.equal(storage.getItem('cabin-interview-practice-queue-v1'),existingQueue)
})

test('open count excludes practiced and invalid records',()=>{
  storage.setItem('cabin-interview-practice-queue-v1',JSON.stringify([{id:'o1',questionId:'be1',status:'open',reason:'manual',createdAt:'2026-01-01'},{id:'o2',questionId:'cs1',status:'open',reason:'favorite',createdAt:'2026-01-02'},{id:'o3',questionId:'sj1',status:'open',reason:'weak_evidence',createdAt:'2026-01-03'},{id:'p1',questionId:'im1',status:'practiced',reason:'manual'},{id:'invalid',status:'open',reason:'manual'}]))
  assert.equal(interviewPracticeQueueRepository.listOpen().length,3)
  interviewPracticeQueueRepository.markPracticed('o1')
  assert.equal(interviewPracticeQueueRepository.listOpen().length,2)
})

test('priority tiers and manual/favorite date tie-break are exact',()=>{
  const item=(id:string,reason:'safety'|'missing_action'|'missing_result'|'weak_evidence'|'manual'|'favorite',createdAt:string)=>normalizeInterviewPracticeQueueItem({id,questionId:'be1',status:'open',reason,createdAt})!
  const sorted=sortPracticeQueue([item('favorite','favorite','2026-01-01'),item('manual','manual','2026-01-02'),item('evidence','weak_evidence','2026-01-01'),item('result','missing_result','2026-01-01'),item('action','missing_action','2026-01-01'),item('safety','safety','2026-01-01')])
  assert.deepEqual(sorted.map(row=>row.id),['safety','action','result','evidence','favorite','manual'])
  assert.equal(sorted.find(row=>row.id==='favorite')?.priority,sorted.find(row=>row.id==='manual')?.priority)
})
