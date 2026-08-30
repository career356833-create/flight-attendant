import assert from 'node:assert/strict'
import test from 'node:test'
import { mockSttProvider } from './providers/mock-stt-provider'
import { browserSpeechProvider } from './providers/browser-speech-provider'
import { actualTranscript, transcriptionIntegrity, unavailableInterviewAnalysis, unavailableSelfIntroductionAnalysis } from './transcription-integrity'
import { analyzeInterviewAudio } from '@/lib/interview-audio/audio-analysis'
import { buildInterviewSpeechMetrics } from '@/lib/interview-audio/speech-analysis'
import { interviewQuestions, normalizeInterviewAttempt, type InterviewAttempt } from '@/lib/interview-practice-data'
import { executeTrainingQueueOperation, hasExplicitRemoteAudioStorageConsent, isRemoteAudioUploadBlocked } from '@/lib/supabase/training-attempt-repositories'

const context={requestId:'test',locale:'ko',consentGranted:true,createdAt:'2026-01-01T00:00:00.000Z'}

test('mock transcript is marked non-actual and cannot become measured speech',async()=>{
  const result=await mockSttProvider.transcribe({fallbackTranscript:'um demo answer',durationSeconds:20,languageHint:'en'},context)
  assert.equal(result.ok&&result.data.isActualTranscription,false)
  assert.equal(result.ok&&result.data.confidence,null)
  assert.equal(actualTranscript(result),'')
  const audio=analyzeInterviewAudio([{atMs:0,rms:.2,peak:.2},{atMs:20000,rms:.2,peak:.2}],20000)
  const metrics=buildInterviewSpeechMetrics({transcription:result.ok?result.data:undefined,audioMetrics:audio,providerId:'mock'})
  assert.equal(metrics.transcriptAvailable,false)
  assert.equal(metrics.speechRate.estimatedWpm,null)
  assert.equal(metrics.fillers.totalCount,0)
  assert.equal(metrics.clarity.overallScore,null)
  assert.equal(metrics.pronunciation.status,'not_available')
})

test('browser fallback and unavailable server responses fail closed',async()=>{
  const originalWindow=globalThis.window
  Object.defineProperty(globalThis,'window',{value:{SpeechRecognition:function(){}},configurable:true})
  const fallback=await browserSpeechProvider.transcribe({fallbackTranscript:'sample',durationSeconds:10},context)
  assert.equal(fallback.ok&&fallback.data.transcriptionMode,'fallback')
  assert.equal(actualTranscript(fallback),'')
  Object.defineProperty(globalThis,'window',{value:originalWindow,configurable:true})
  const unavailable={ok:false as const,requestId:'test',providerId:'server',error:{code:'not_configured' as const,message:'not configured',retryable:false},fallbackAvailable:true}
  assert.deepEqual(transcriptionIntegrity(unavailable),{providerId:'server',mode:'unavailable',isActualTranscription:false})
  assert.equal(actualTranscript(unavailable),'')
})

test('unavailable transcript preserves audio-only analysis without content claims',()=>{
  const interview=unavailableInterviewAnalysis(interviewQuestions[0],30)
  assert.equal(interview.evaluationScores.length,0)
  assert.equal(interview.speakingMetrics.wordsPerMinute,0)
  const selfIntro=unavailableSelfIntroductionAnalysis(60)
  assert.equal(selfIntro.details.length,0)
  assert.equal(selfIntro.metrics.fillerCount,0)
})

test('remote raw audio upload remains fail-closed without dedicated storage consent',()=>{
  assert.equal(hasExplicitRemoteAudioStorageConsent(),false)
  assert.equal(isRemoteAudioUploadBlocked({operation:'upload_audio'}),true)
  assert.equal(isRemoteAudioUploadBlocked({operation:'create'}),false)
})

test('legacy pending audio makes no network call while text operation still executes',async()=>{
  let networkCalls=0
  assert.equal(await executeTrainingQueueOperation({operation:'upload_audio'},async()=>{networkCalls++}),'blocked')
  assert.equal(networkCalls,0)
  assert.equal(await executeTrainingQueueOperation({operation:'create'},async()=>{networkCalls++}),'executed')
  assert.equal(networkCalls,1)
})

test('provider id or actual flag alone never proves an actual-audio transcript',()=>{
  const forged={ok:true as const,requestId:'test',providerId:'server',usage:{providerId:'server',taskType:'transcription' as const,startedAt:context.createdAt,completedAt:context.createdAt,durationMs:0,success:true,fallbackUsed:false},warnings:[],data:{transcript:'not proven',detectedLanguage:'en',confidence:.9,segments:[],isActualTranscription:true}}
  assert.equal(transcriptionIntegrity(forged).isActualTranscription,false)
  assert.equal(actualTranscript(forged),'')
})

test('legacy attempt without provenance normalizes to unknown and stays non-actual',()=>{
  const legacy={id:'legacy',questionId:'im1',category:'introduction_and_motivation',createdAt:'2026-01-01T00:00:00.000Z',transcript:'old text',durationSeconds:30,analysis:unavailableInterviewAnalysis(interviewQuestions[0],30),attemptNumber:1,completed:true} as InterviewAttempt
  const normalized=normalizeInterviewAttempt(legacy)
  assert.deepEqual(normalized.transcriptIntegrity,{mode:'unknown',isActualTranscription:false})
})
