'use client'
import {useState} from 'react'
import {diagnoseSupabaseConnection,type SupabaseConnectionDiagnostic} from '@/lib/supabase/connection-diagnostic'
import {runHybridExperienceSimulation} from '@/lib/supabase/experience-sync-repository'
import {ApplicationSyncPanel} from './application-sync-panel'

export function SupabaseDiagnostic(){
 const[result,setResult]=useState<SupabaseConnectionDiagnostic>(),[simulation,setSimulation]=useState<Record<string,boolean>>(),[busy,setBusy]=useState(false)
 async function check(){setBusy(true);setResult(await diagnoseSupabaseConnection());setBusy(false)}
 if(process.env.NODE_ENV!=='development')return <ApplicationSyncPanel/>
 const rows=result?[['환경변수',result.configured],['서버 연결',result.reachable],['Auth',result.authReachable],['profiles·경험 DB',result.databaseReachable],['Storage',result.storageReachable],['migration',result.migrationCompatible]]:[]
 return <><ApplicationSyncPanel/><section className="rounded-3xl border border-dashed border-border bg-card p-5"><span className="eyebrow text-muted-foreground">DEVELOPMENT DIAGNOSTIC</span><h2 className="mt-2 font-bold text-navy">Supabase 연결 진단</h2>{result&&<div className="mt-4 space-y-2">{rows.map(([label,ok])=><div key={String(label)} className="flex justify-between text-xs"><span>{label}</span><strong>{ok?'정상':'확인 필요'}</strong></div>)}{result.errors.map((e,i)=><p key={i} className="text-[11px] text-coral">{e.area} · {e.message}</p>)}</div>}<button onClick={()=>void check()} disabled={busy} className="mt-4 h-10 w-full rounded-xl border border-navy text-xs font-bold text-navy">{busy?'확인 중…':'연결 상태 다시 확인'}</button><button onClick={()=>setSimulation(runHybridExperienceSimulation())} className="mt-2 h-10 w-full rounded-xl border border-border text-xs font-bold text-navy">Hybrid 로컬 시뮬레이션</button>{simulation&&<p className="mt-3 text-[11px] text-muted-foreground">{Object.entries(simulation).every(([,ok])=>ok)?'9개 시나리오 정상':'확인이 필요한 시나리오가 있습니다.'}</p>}</section></>
}
