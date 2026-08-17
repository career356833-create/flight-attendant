export type SyncStatus='local_only'|'synced'|'syncing'|'pending'|'offline'|'error'|'conflict'
export const syncStatusLabels:Record<SyncStatus,string>={local_only:'이 기기에만 저장 중',synced:'계정에 안전하게 저장됨',syncing:'동기화 중',pending:'인터넷 연결 후 동기화 예정',offline:'오프라인 · 이 기기에 저장 중',error:'동기화하지 못한 항목이 있어요',conflict:'확인이 필요한 충돌이 있어요'}
