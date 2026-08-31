import type { PronunciationAnalysisResult, PronunciationWordResult } from './pronunciation-provider'

type JsonRecord = Record<string, unknown>
const record = (value: unknown): JsonRecord => value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {}
const rows = (value: unknown): JsonRecord[] => Array.isArray(value) ? value.map(record) : []
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const text = (value: unknown) => typeof value === 'string' ? value : ''
const ticksToMs = (value: unknown) => {
  const ticks = number(value)
  return ticks === undefined ? undefined : Math.round(ticks / 10_000)
}
const endMs = (offset: unknown, duration: unknown) => {
  const start = number(offset), length = number(duration)
  return start === undefined || length === undefined ? undefined : ticksToMs(start + length)
}
const status = (value: unknown): PronunciationWordResult['status'] => {
  switch (value) {
    case 'Mispronunciation': return 'review'
    case 'Omission': return 'omitted'
    case 'Insertion': return 'inserted'
    case 'None': return 'clear'
    default: return 'unknown'
  }
}

export function normalizeAzurePronunciation(raw: unknown, language = 'en-US'): PronunciationAnalysisResult {
  const root = record(raw)
  const best = rows(root.NBest)[0]
  if (!best) return {provider:'server',status:'failed',language}
  const overall = record(best.PronunciationAssessment)
  const words = rows(best.Words).map(word => {
    const assessment = record(word.PronunciationAssessment)
    const startMs = ticksToMs(word.Offset)
    const normalized: PronunciationWordResult = {
      word: text(word.Word),
      startMs,
      endMs: endMs(word.Offset, word.Duration),
      accuracyScore: number(assessment.AccuracyScore),
      status: status(assessment.ErrorType),
      phonemes: rows(word.Phonemes).map(phone => {
        const phoneAssessment = record(phone.PronunciationAssessment)
        return {
          phoneme: text(phone.Phoneme),
          accuracyScore: number(phoneAssessment.AccuracyScore),
          startMs: ticksToMs(phone.Offset),
          endMs: endMs(phone.Offset, phone.Duration),
        }
      }).filter(phone => phone.phoneme),
    }
    return normalized
  }).filter(word => word.word)
  const pronunciationScore = number(overall.PronScore)
  const fluencyScore = number(overall.FluencyScore)
  const prosodyScore = number(overall.ProsodyScore)
  const completenessScore = number(overall.CompletenessScore)
  if (pronunciationScore === undefined && fluencyScore === undefined && !words.length) {
    return {provider:'server',status:'failed',language}
  }
  return {
    provider:'server',
    status:'success',
    language,
    overall:{pronunciationScore,completenessScore,fluencyScore,prosodyScore},
    words,
    segments:words.length?[{text:text(best.Display)||text(root.DisplayText),startMs:words[0]?.startMs,endMs:words.at(-1)?.endMs,words}]:[],
    providerMetadata:{model:'azure-speech-pronunciation',version:'rest-v1'},
  }
}
