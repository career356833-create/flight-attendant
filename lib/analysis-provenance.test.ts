import assert from 'node:assert/strict'
import test from 'node:test'
import {
  analysisProvenanceFromProvider,
  analysisProvenancePresentation,
  canUseActualAiLabel,
  deterministicAnalysisProvenance,
  readinessPresentation,
  transcriptAnalysisProvenance,
} from './analysis-provenance'

test('actual server AI response permits the AI label', () => {
  const value = analysisProvenanceFromProvider({ ok: true, providerId: 'server' })
  assert.equal(value.kind, 'actual_ai')
  assert.equal(canUseActualAiLabel(value), true)
})

test('deterministic analysis does not permit the AI label', () => assert.equal(canUseActualAiLabel(deterministicAnalysisProvenance()), false))
test('mock provider is never actual AI', () => assert.equal(analysisProvenanceFromProvider({ ok: true, providerId: 'mock' }).kind, 'mock'))
test('fallback warning is classified as mock even with server provider', () => assert.equal(analysisProvenanceFromProvider({ ok: true, providerId: 'server', warnings: [{ code: 'fallback_used' }] }).kind, 'mock'))
test('mock warning is classified as mock', () => assert.equal(analysisProvenanceFromProvider({ ok: true, providerId: 'server', warnings: [{ code: 'mock_result' }] }).kind, 'mock'))
test('unknown provider uses honest fallback', () => assert.equal(analysisProvenanceFromProvider({ ok: true, providerId: 'other' }).kind, 'unknown'))
test('failed provider response is not presented as actual AI', () => assert.equal(analysisProvenanceFromProvider({ ok: false, providerId: 'server' }).kind, 'unknown'))
test('audio-only result receives audio metrics provenance', () => assert.equal(transcriptAnalysisProvenance({ isActualTranscription: false, hasTranscript: false }).kind, 'audio_metrics'))
test('actual transcript receives STT-derived provenance', () => assert.equal(transcriptAnalysisProvenance({ isActualTranscription: true, hasTranscript: true }).kind, 'stt_derived'))
test('empty transcript cannot receive STT-derived provenance', () => assert.equal(transcriptAnalysisProvenance({ isActualTranscription: true, hasTranscript: false }).kind, 'audio_metrics'))
test('rubric uses deterministic label', () => assert.equal(analysisProvenancePresentation('deterministic', 'ko').label, '규칙 기반 분석'))
test('Korean mock label explicitly avoids actual AI claim', () => assert.match(analysisProvenancePresentation('mock', 'ko').description, /실제 AI 서비스 결과가 아닙니다/))
test('English mock label explicitly avoids actual AI claim', () => assert.match(analysisProvenancePresentation('mock', 'en').description, /not a result from an actual AI service/))
test('Korean and English actual transcript labels preserve meaning', () => {
  assert.match(analysisProvenancePresentation('stt_derived', 'ko').label, /실제 음성 전사/)
  assert.match(analysisProvenancePresentation('stt_derived', 'en').label, /Actual speech transcript/)
})
test('experience matcher can use deterministic presentation', () => assert.equal(deterministicAnalysisProvenance().kind, 'deterministic'))
test('application deterministic path cannot use actual AI label', () => assert.equal(canUseActualAiLabel(deterministicAnalysisProvenance()), false))
test('readiness is described as a self-check rather than hiring probability', () => assert.match(readinessPresentation('ko').description, /합격 가능성이 아닙니다/))
test('English readiness is not described as hiring probability', () => assert.match(readinessPresentation('en').description, /not a hiring probability/))
test('provenance helpers do not introduce aggregate or hiring scores', () => assert.doesNotMatch(JSON.stringify({ deterministicAnalysisProvenance, presentation: analysisProvenancePresentation('deterministic') }), /overallScore|passProbability|hireProbability/))
test('legacy unknown provenance stays safe', () => assert.equal(canUseActualAiLabel({ kind: 'unknown', isActual: false }), false))
