import {getSupabaseBrowserClient} from './client'
import {getProfileCompletionStatus} from './profile-completion-service'
import {syncQueueRepository} from './sync-queue-repository'
import {localTrainingMergeSummary,trainingSyncMeta} from './training-attempt-repositories'

export type DiagnosticLevel='PASS'|'FAIL'|'WARNING'|'SKIPPED'
export type SyncDiagnostic={label:string;level:DiagnosticLevel;detail?:string}
export type SyncDiagnosticsResult={items:SyncDiagnostic[]}
const skipped=(label:string):SyncDiagnostic=>({label,level:'SKIPPED'})

export async function runTrainingSyncDiagnostics():Promise<SyncDiagnosticsResult>{
  const client=getSupabaseBrowserClient()
  if(!client)return{items:[{label:'로그인 세션',level:'FAIL'}]}
  const{data:{user}}=await client.auth.getUser()
  if(!user)return{items:[{label:'로그인 세션',level:'FAIL'}]}
  const result:SyncDiagnostic[]=[{label:'로그인 세션',level:'PASS'}]
  const profile=await getProfileCompletionStatus()
  result.push({label:'프로필 완료',level:profile.completed?'PASS':'WARNING'})
  const [interviews,selfIntroductions,local]=await Promise.all([
    client.from('interview_attempts').select('id,audio_path',{count:'exact'}).eq('user_id',user.id).is('deleted_at',null),
    client.from('self_introduction_attempts').select('id,audio_path',{count:'exact'}).eq('user_id',user.id).is('deleted_at',null),
    localTrainingMergeSummary(),
  ])
  const interviewRows=(interviews.data??[]) as {id:string;audio_path:string|null}[],selfRows=(selfIntroductions.data??[]) as {id:string;audio_path:string|null}[]
  result.push({label:'면접 DB 저장',level:interviews.error?'FAIL':(interviews.count??0)>0?'PASS':'SKIPPED',detail:interviews.error?undefined:`${interviews.count??0}건`})
  result.push({label:'자기소개 DB 저장',level:selfIntroductions.error?'FAIL':(selfIntroductions.count??0)>0?'PASS':'SKIPPED',detail:selfIntroductions.error?undefined:`${selfIntroductions.count??0}건`})
  result.push({label:'면접 audio_path',level:interviewRows.some(row=>Boolean(row.audio_path))?'PASS':'SKIPPED',detail:`${interviewRows.filter(row=>row.audio_path).length}건`})
  result.push({label:'자기소개 audio_path',level:selfRows.some(row=>Boolean(row.audio_path))?'PASS':'SKIPPED',detail:`${selfRows.filter(row=>row.audio_path).length}건`})
  const queue=syncQueueRepository.list().filter(item=>item.userId===user.id&&['interview_attempts','self_introduction_attempts'].includes(item.entityType))
  const pending=queue.filter(item=>['pending','syncing'].includes(item.status)).length,failed=queue.filter(item=>item.status==='failed').length
  result.push({label:'로컬 대기 큐',level:pending?'WARNING':'PASS',detail:`${pending}건`})
  result.push({label:'동기화 실패',level:failed?'WARNING':'PASS',detail:`${failed}건`})
  result.push({label:'IndexedDB 로컬 오디오',level:local.audio?'PASS':'SKIPPED',detail:`${local.audio}건`})
  const localIds=[...local.interviews,...local.selfIntroductions].map(item=>item.id),meta=localIds.map(id=>trainingSyncMeta.get(id)),synced=meta.filter(item=>item.status==='synced'||item.audioStatus==='synced').length
  result.push({label:'최근 동기화 성공',level:synced?'PASS':'SKIPPED',detail:`${synced}건`})
  const candidate=[...interviewRows,...selfRows].find(row=>row.audio_path)?.audio_path
  if(!candidate){result.push(skipped('Storage 파일 존재'));result.push(skipped('signed URL 생성'))}
  else{
    const prefix=candidate.split('/').slice(0,-1).join('/'),name=candidate.split('/').at(-1)!
    const exists=await client.storage.from('cabin-training-audio').list(prefix,{search:name})
    result.push({label:'Storage 파일 존재',level:exists.error?'FAIL':exists.data?.some(item=>item.name===name)?'PASS':'FAIL'})
    const signed=await client.storage.from('cabin-training-audio').createSignedUrl(candidate,60)
    result.push({label:'signed URL 생성',level:signed.error?'FAIL':'PASS'})
  }
  return{items:result}
}
