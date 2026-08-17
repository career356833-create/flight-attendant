export type SyncOperationType='create'|'update'|'delete'|'upload_audio'
export type SyncQueueItem={id:string;userId:string;deviceId:string;entityType:string;entityId:string;operation:SyncOperationType;payload?:unknown;localUpdatedAt:string;retryCount:number;lastError?:string;nextRetryAt?:string;status:'pending'|'syncing'|'failed'|'completed'|'conflict'}
const KEY='cabin-sync-queue-v1',DEVICE_KEY='cabin-device-id-v1'
const uuid=()=>crypto.randomUUID()
export function getDeviceId(){if(typeof window==='undefined')return'server';let id=localStorage.getItem(DEVICE_KEY);if(!id){id=uuid();localStorage.setItem(DEVICE_KEY,id)}return id}
export const syncQueueRepository={
  list():SyncQueueItem[]{if(typeof window==='undefined')return[];try{const v=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(v)?v:[]}catch{return[]}},
  save(items:SyncQueueItem[]){localStorage.setItem(KEY,JSON.stringify(items.slice(-500)));return items},
  enqueue(input:Omit<SyncQueueItem,'id'|'deviceId'|'retryCount'|'status'>){
    const all=this.list()
    const index=all.findIndex(item=>item.userId===input.userId&&item.entityType===input.entityType&&item.entityId===input.entityId&&item.status!=='completed'&&(input.operation==='upload_audio'?item.operation==='upload_audio':item.operation!=='upload_audio'))
    if(index>=0){const prior=all[index];if(prior.operation==='create'&&input.operation==='delete'){all.splice(index,1);return this.save(all)}all[index]={...prior,...input,operation:prior.operation==='create'?'create':input.operation,payload:{...(typeof prior.payload==='object'?prior.payload:{}),...(typeof input.payload==='object'?input.payload:{})},status:'pending'};return this.save(all)}
    all.push({...input,id:uuid(),deviceId:getDeviceId(),retryCount:0,status:'pending'})
    return this.save(all)
  },
  update(id:string,patch:Partial<SyncQueueItem>){return this.save(this.list().map(x=>x.id===id?{...x,...patch}:x))},
  clearCompleted(){return this.save(this.list().filter(x=>x.status!=='completed'))}
}
