export type PersistenceStatus=
  | 'local_only'
  | 'sync_pending'
  | 'synced'
  | 'sync_failed'
  | 'remote_unavailable'
  | 'not_supported'
  | 'unknown'
  | 'local_write_failed'

export type PersistenceLocale='ko'|'en'
export type PersistenceSeverity='neutral'|'info'|'success'|'warning'|'error'

export type PersistencePresentation={
  status:PersistenceStatus
  label:string
  description:string
  severity:PersistenceSeverity
}

export type PersistenceEvidence={
  localWrite:'succeeded'|'failed'|'unknown'
  syncSupported:boolean
  syncState?:'pending'|'syncing'|'failed'|'unavailable'|'unknown'
  remoteWriteSucceeded?:boolean
  localVersion?:string
  remoteVersion?:string
  offline?:boolean
}

const copy:Record<PersistenceLocale,Record<PersistenceStatus,Omit<PersistencePresentation,'status'>>>= {
  ko:{
    local_only:{label:'이 기기에 저장됨',description:'현재 기록은 이 기기에서 사용할 수 있습니다.',severity:'neutral'},
    sync_pending:{label:'이 기기에 저장됨 · 계정 동기화 대기 중',description:'현재 기록은 이 기기에 있으며, 지원되는 항목은 계정 동기화를 다시 시도합니다.',severity:'info'},
    synced:{label:'계정에 동기화됨',description:'현재 버전의 원격 저장 작업이 확인됐습니다.',severity:'success'},
    sync_failed:{label:'이 기기에는 저장됨 · 계정 동기화 실패',description:'현재 기록은 이 기기에 남아 있습니다. 계정 동기화만 완료되지 않았습니다.',severity:'warning'},
    remote_unavailable:{label:'이 기기에 저장됨 · 계정 동기화 사용 불가',description:'현재 원격 연결을 사용할 수 없습니다.',severity:'warning'},
    not_supported:{label:'이 기기에만 저장됨',description:'이 항목은 계정 동기화를 지원하지 않습니다.',severity:'neutral'},
    unknown:{label:'저장 상태 확인 필요',description:'현재 저장 결과를 확인하지 못했습니다.',severity:'warning'},
    local_write_failed:{label:'이 기기에 저장되지 않음',description:'로컬 저장에 실패했습니다. 다시 시도해 주세요.',severity:'error'},
  },
  en:{
    local_only:{label:'Saved on this device',description:'This record is available on this device.',severity:'neutral'},
    sync_pending:{label:'Saved on this device · Account sync pending',description:'The current record remains on this device. Supported items will retry account sync.',severity:'info'},
    synced:{label:'Synced to your account',description:'The remote write for the current version was confirmed.',severity:'success'},
    sync_failed:{label:'Saved on this device · Account sync failed',description:'The current record remains on this device. Only account sync is incomplete.',severity:'warning'},
    remote_unavailable:{label:'Saved on this device · Account sync unavailable',description:'The remote connection is currently unavailable.',severity:'warning'},
    not_supported:{label:'Saved on this device only',description:'Account sync is not supported for this item.',severity:'neutral'},
    unknown:{label:'Storage status needs confirmation',description:'The current storage result could not be confirmed.',severity:'warning'},
    local_write_failed:{label:'Not saved on this device',description:'Local storage failed. Please try again.',severity:'error'},
  },
}

export function persistenceCopy(status:PersistenceStatus,locale:PersistenceLocale='ko'):PersistencePresentation{
  return{status,...copy[locale][status]}
}

export function derivePersistencePresentation(evidence:PersistenceEvidence,locale:PersistenceLocale='ko'):PersistencePresentation{
  if(evidence.localWrite==='failed')return persistenceCopy('local_write_failed',locale)
  if(evidence.localWrite==='unknown')return persistenceCopy('unknown',locale)
  if(!evidence.syncSupported)return persistenceCopy('not_supported',locale)
  if(evidence.syncState==='unavailable')return persistenceCopy('remote_unavailable',locale)
  if(evidence.syncState==='failed')return persistenceCopy('sync_failed',locale)
  if(evidence.offline||evidence.syncState==='pending'||evidence.syncState==='syncing')return persistenceCopy('sync_pending',locale)

  const versionsComparable=Boolean(evidence.localVersion&&evidence.remoteVersion)
  const currentVersionConfirmed=!versionsComparable||evidence.localVersion===evidence.remoteVersion
  if(evidence.remoteWriteSucceeded===true&&currentVersionConfirmed)return persistenceCopy('synced',locale)
  if(evidence.remoteWriteSucceeded===true&&!currentVersionConfirmed)return persistenceCopy('sync_pending',locale)
  return persistenceCopy('local_only',locale)
}

export const persistencePolicyCopy={
  ko:{
    accountConnected:'로그인 상태와 데이터 동기화 상태는 별개입니다.',
    overview:'학습 기록은 먼저 이 기기에 저장됩니다. 지원되는 항목은 로그인 상태에서 계정 동기화를 시도하며, 일부 기록과 음성은 이 기기에만 저장됩니다.',
    audioLocalOnly:'원본 음성은 이 기기에만 저장되며 계정에 업로드되지 않습니다.',
    partialExport:'이 내보내기는 화면에 표시된 일부 로컬 학습 데이터를 포함하며 전체 계정 백업이 아닙니다.',
    incompleteRestore:'원격 쓰기 성공은 현재 항목의 동기화 확인이며 전체 기록 복원을 보장하지 않습니다.',
  },
  en:{
    accountConnected:'Sign-in status and data sync status are separate.',
    overview:'Learning records are saved on this device first. Supported items attempt account sync while signed in; some records and audio remain on this device only.',
    audioLocalOnly:'Original audio stays on this device and is not uploaded to your account.',
    partialExport:'This export includes some local learning data shown in the app. It is not a full account backup.',
    incompleteRestore:'A successful remote write confirms sync for that item; it does not guarantee a full record restore.',
  },
} as const
