import type { AiTaskType, AiUsage } from './types'
type AiUsageStore={schemaVersion:1;records:AiUsage[];updatedAt:string}
const KEY='cabin-ai-usage-v1',empty=():AiUsageStore=>({schemaVersion:1,records:[],updatedAt:new Date().toISOString()})
function load():AiUsageStore{if(typeof window==='undefined')return empty();try{const raw=JSON.parse(localStorage.getItem(KEY)??'{}');return{schemaVersion:1,records:Array.isArray(raw.records)?raw.records.filter((x:AiUsage)=>x&&typeof x.providerId==='string').slice(0,500):[],updatedAt:raw.updatedAt??new Date().toISOString()}}catch{return empty()}}
export const aiUsageRepository={
  record(record:AiUsage){const store=load();store.records=[record,...store.records].slice(0,500);store.updatedAt=new Date().toISOString();if(typeof window!=='undefined')localStorage.setItem(KEY,JSON.stringify(store))},
  list:()=>load().records,
  byTask:(task:AiTaskType|'transcription')=>load().records.filter(x=>x.taskType===task),
  clear(){if(typeof window!=='undefined')localStorage.removeItem(KEY)},
  summary(){
    const records=load().records,month=new Date().toISOString().slice(0,7),today=new Date().toISOString().slice(0,10)
    return{
      todayRequests:records.filter(x=>x.startedAt.startsWith(today)).length,
      monthRequests:records.filter(x=>x.startedAt.startsWith(month)).length,
      audioSeconds:records.reduce((s,x)=>s+(x.audioSeconds??0),0),
      fallbackRate:records.length?Math.round(records.filter(x=>x.fallbackUsed).length/records.length*100):0,
      failureRate:records.length?Math.round(records.filter(x=>!x.success).length/records.length*100):0,
      estimatedCost:records.reduce((s,x)=>s+(x.estimatedCost??0),0),
      successRate:records.length?Math.round(records.filter(x=>x.success).length/records.length*100):100,
      recentError:records.find(x=>!x.success)?.taskType,
    }
  },
}
