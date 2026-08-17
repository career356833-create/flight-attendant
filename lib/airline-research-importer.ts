import { airlineMasterById } from './airline-master-data'
import type { AirlineResearchFact, AirlineResearchRecord, ResearchCollectionMethod, ResearchFactCategory } from './airline-research-repository'
import type { SourceGrade } from './airline-knowledge-repository'

export type AirlineResearchImportPayload = {
  airlineId: string
  title: string
  sourceUrl: string
  sourceTitle: string
  sourceDate?: string
  sourceGrade?: SourceGrade
  rawText: string
  collectedBy: ResearchCollectionMethod
  notes?: string
}

export type ResearchFactCandidate = {
  category: 'profile' | 'recruitment' | 'service' | 'safety' | 'interview' | 'application'
  key: string
  value: string
  sourceReference: string
  confidence: 'high' | 'medium' | 'low'
  verified: false
}

const categories: ResearchFactCandidate['category'][] = ['profile', 'recruitment', 'service', 'safety', 'interview', 'application']

export function validateResearchImportPayload(payload: AirlineResearchImportPayload) {
  const errors: string[] = []
  if (!airlineMasterById.has(payload.airlineId)) errors.push('Select a valid AirlineMaster airline.')
  if (!payload.title.trim() || !payload.sourceTitle.trim()) errors.push('Title and source title are required.')
  try { new URL(payload.sourceUrl) } catch { errors.push('A valid source URL is required.') }
  if (!payload.rawText.trim()) errors.push('Research text is required.')
  return errors
}

/** Import is intentionally non-destructive and non-publishing: all records start collected with no verified facts. */
export function createResearchRecordFromImport(payload: AirlineResearchImportPayload, id = `import-${crypto.randomUUID()}`): AirlineResearchRecord {
  const errors = validateResearchImportPayload(payload)
  if (errors.length) throw new Error(errors.join(' '))
  return {
    id,
    airlineId: payload.airlineId,
    sourceTitle: payload.sourceTitle,
    sourceUrl: payload.sourceUrl,
    sourceType: payload.title,
    collectedBy: payload.collectedBy,
    collectedAt: new Date().toISOString(),
    sourceDate: payload.sourceDate,
    sourceGrade: payload.sourceGrade,
    rawSummary: payload.rawText,
    extractedFacts: [],
    confidence: 'low',
    status: 'collected',
    notes: payload.notes,
  }
}

/**
 * A review aid only. Candidates are never written into `extractedFacts`, and
 * always remain `verified: false`. It returns nothing when a source is absent.
 */
export function extractResearchFactCandidates(payload: AirlineResearchImportPayload): ResearchFactCandidate[] {
  if (!payload.sourceUrl) return []
  const lines = payload.rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  let category: ResearchFactCandidate['category'] = 'profile'
  const result: ResearchFactCandidate[] = []
  for (const line of lines) {
    const heading = line.replace(/^#+\s*/, '').toLowerCase()
    const found = categories.find(item => heading === item || heading.startsWith(`${item}:`))
    if (found) { category = found; continue }
    if (line.length < 12 || /^[-*]\s*$/.test(line)) continue
    result.push({ category, key: `candidate_${category}_${result.length + 1}`, value: line.replace(/^[-*]\s*/, ''), sourceReference: payload.sourceUrl, confidence: 'low', verified: false })
  }
  return result.slice(0, 50)
}

/** Converts an editor-approved candidate into a still-unverified fact; the editor must set verified later. */
export function candidateToUnverifiedFact(candidate: ResearchFactCandidate, sourceGrade?: SourceGrade): AirlineResearchFact {
  return { category: candidate.category as ResearchFactCategory, key: candidate.key, value: candidate.value, sourceUrl: candidate.sourceReference, sourceGrade, verified: false }
}
