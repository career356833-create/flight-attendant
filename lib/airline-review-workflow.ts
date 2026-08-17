import type { SourceGrade, KnowledgePublishStatus } from './airline-knowledge-repository'

export type ReviewStatus = 'draft' | 'reviewing' | 'needs_revision' | 'approved' | 'rejected'
export type ReviewEntityType = 'profile' | 'recruitment' | 'faq' | 'interview' | 'coaching' | 'source'
export type ReviewState = { status: ReviewStatus; publishStatus: KnowledgePublishStatus; deprecated?: boolean; updatedAt: string }
export type ReviewEntity = { id: string; airlineId: string; type: ReviewEntityType; title: string; sourceReferences: string[]; sourceGrades: SourceGrade[]; confidence?: 'high' | 'medium' | 'low'; createdAt: string }

const KEY = 'cabin-airline-review-workflow-v1'
const now = () => new Date().toISOString()
const allowed: SourceGrade[] = ['A', 'B', 'C']

export function canApprove(entity: ReviewEntity) {
  if (!entity.sourceReferences.length || !entity.sourceGrades.length || entity.sourceGrades.some(grade => !allowed.includes(grade))) return false
  return entity.type !== 'recruitment' || entity.sourceReferences.length === entity.sourceGrades.length
}
export function canPublish(entity: ReviewEntity, state: ReviewState) { return state.status === 'approved' && canApprove(entity) }
function load(): Record<string, ReviewState> { if (typeof window === 'undefined') return {}; try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
function save(value: Record<string, ReviewState>) { if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify(value)); return value }
export const airlineReviewWorkflow = {
  get(id: string): ReviewState { return load()[id] ?? { status: id === 'emirates-profile-review' ? 'approved' : 'draft', publishStatus: 'unpublished', updatedAt: now() } },
  setStatus(id: string, status: ReviewStatus) { const value = load(); value[id] = { ...this.get(id), status, updatedAt: now() }; save(value); return value[id] },
  publish(id: string, entity: ReviewEntity) { if (!canPublish(entity, this.get(id))) return false; const value = load(); value[id] = { ...this.get(id), publishStatus: 'published', updatedAt: now() }; save(value); return true },
  unpublish(id: string) { const value = load(); value[id] = { ...this.get(id), publishStatus: 'unpublished', updatedAt: now() }; save(value); return value[id] },
  deprecate(id: string) { const value = load(); value[id] = { ...this.get(id), deprecated: true, publishStatus: 'unpublished', updatedAt: now() }; save(value); return value[id] },
}
