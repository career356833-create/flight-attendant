import assert from 'node:assert/strict'
import test from 'node:test'
import {applicationDaysUntil,calculateApplicationDday,createTrackedApplication,getNextImportantDate,mergeApplicationsByUpdatedAt,sortUpcomingApplications} from './application-tracker'
import {LocalAirlineApplicationRepository,type AirlineApplication} from './supabase/application-sync-repository'

const today=new Date(2026,7,28)
const application=(patch:Partial<AirlineApplication>={}):AirlineApplication=>({id:'a1',airlineId:'emirates',airlineNameSnapshot:'Emirates',positionTitle:'객실승무원',status:'planning',createdAt:'2026-08-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z',...patch})

test('D-day는 local date 기준으로 미래, 당일, 과거를 표현한다',()=>{
  assert.equal(calculateApplicationDday('2026-09-02',today),'D-5')
  assert.equal(calculateApplicationDday('2026-08-28',today),'D-Day')
  assert.equal(calculateApplicationDday('2026-08-25',today),'D+3')
  assert.equal(applicationDaysUntil('invalid',today),null)
})

test('면접일을 마감일보다 우선하고 제출 완료된 과거 마감은 제외한다',()=>{
  assert.equal(getNextImportantDate(application({deadlineAt:'2026-08-29',interviewAt:'2026-09-01'}),today)?.kind,'interview')
  assert.equal(getNextImportantDate(application({status:'submitted',deadlineAt:'2026-09-01'}),today),null)
  assert.equal(getNextImportantDate(application(),today),null)
})

test('다가오는 일정은 가까운 순으로 최대 3개만 반환한다',()=>{
  const items=[5,1,9,3].map((days,index)=>application({id:`a${index}`,airlineNameSnapshot:`A${index}`,deadlineAt:`2026-09-${String(days+1).padStart(2,'0')}`}))
  const sorted=sortUpcomingApplications(items,new Date(2026,7,31))
  assert.deepEqual(sorted.map(item=>item.importantDate.days),[2,4,6])
})

test('동일 id 충돌은 newer updatedAt이 이긴다',()=>{
  const old=application(),newer=application({status:'interview',updatedAt:'2026-08-02T00:00:00.000Z'})
  assert.equal(mergeApplicationsByUpdatedAt([old],[newer])[0].status,'interview')
})

test('생성 데이터는 민감 프로필 필드를 포함하지 않는다',()=>{
  const value=createTrackedApplication({airlineId:'emirates',airlineNameSnapshot:'Emirates',status:'planning'},new Date('2026-08-28T00:00:00Z'))
  for(const key of ['age','birthDate','gender','photo','phone','email'])assert.equal(key in value,false)
})

test('local repository는 save/list/delete를 실제 수행하며 tracker만 제거한다',async()=>{
  const values=new Map<string,string>()
  Object.assign(globalThis,{localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)},window:{dispatchEvent:()=>true},Event:class{constructor(readonly type:string){}}})
  const repository=new LocalAirlineApplicationRepository(),value=application()
  await repository.save(value)
  assert.equal((await repository.list()).length,1)
  await repository.softDelete(value.id)
  assert.equal((await repository.list()).length,0)
})
