export type SyncStatus='local_only'|'synced'|'syncing'|'pending'|'offline'|'error'|'conflict'
export const syncStatusLabels:Record<SyncStatus,string>={local_only:'이 기기에 저장됨',synced:'현재 처리된 항목이 계정에 동기화됨',syncing:'계정 동기화 중 · 최신 기록은 이 기기에 저장됨',pending:'이 기기에 저장됨 · 계정 동기화 대기 중',offline:'오프라인 · 이 기기에 저장됨',error:'이 기기에는 저장됨 · 일부 계정 동기화 실패',conflict:'계정 기록 비교가 필요해요'}
