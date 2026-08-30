import assert from 'node:assert/strict'
import test from 'node:test'
import {deduplicateTranscription} from './ai-service'
import {transcribeWithOpenAi} from './openai-transcription'
import {resolveAudioProcessingConsent,serverSttProvider} from './providers/server-stt-provider'
import {normalizeStoredAiConfig} from './config'
import type {AiResponse,TranscriptionResult} from './types'

const file=()=>new File([new Uint8Array([1,2,3])],'answer.webm',{type:'audio/webm'})
const response=(status:number,payload:unknown)=>async()=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json'}})

test('valid Korean and English OpenAI results satisfy explicit actual-audio provenance',async()=>{
  for(const language of ['ko','en'] as const){
    const result=await transcribeWithOpenAi({file:file(),requestId:language,language,apiKey:'test-key',fetcher:response(200,{text:language==='ko'?'안전과 서비스를 우선하겠습니다.':'I prioritize safety and customer service.'})})
    assert.equal(result.ok,true)
    if(result.ok){assert.equal(result.data.detectedLanguage,language);assert.equal(result.data.transcriptionMode,'actual_audio');assert.equal(result.data.isActualTranscription,true);assert.equal(result.data.confidence,null)}
  }
})

test('missing key and empty transcript fail closed without mock fallback',async()=>{
  const missing=await transcribeWithOpenAi({file:file(),requestId:'missing',language:'ko'})
  assert.equal(!missing.ok&&missing.error.code,'not_configured');assert.equal(!missing.ok&&missing.fallbackAvailable,false)
  const empty=await transcribeWithOpenAi({file:file(),requestId:'empty',language:'ko',apiKey:'test-key',fetcher:response(200,{text:'   '})})
  assert.equal(!empty.ok&&empty.error.code,'empty_transcript');assert.equal(!empty.ok&&empty.fallbackAvailable,false)
})

test('provider HTTP failures map to safe unavailable categories',async()=>{
  for(const [status,code] of [[401,'provider_unavailable'],[403,'provider_unavailable'],[429,'rate_limited'],[500,'provider_unavailable']] as const){const result=await transcribeWithOpenAi({file:file(),requestId:String(status),language:'en',apiKey:'test-key',fetcher:response(status,{error:'hidden'})});assert.equal(!result.ok&&result.error.code,code);assert.equal(!result.ok&&result.fallbackAvailable,false)}
})

test('aborted provider request maps to timeout',async()=>{
  const controller=new AbortController();controller.abort();const result=await transcribeWithOpenAi({file:file(),requestId:'timeout',language:'en',apiKey:'test-key',signal:controller.signal,fetcher:async()=>{throw new DOMException('aborted','AbortError')}});assert.equal(!result.ok&&result.error.code,'timeout')
})

test('same Blob lifecycle shares one transcription request',async()=>{
  const blob=new Blob([new Uint8Array([1])],{type:'audio/webm'});let calls=0
  const action=async()=>{calls++;await Promise.resolve();return{ok:false,requestId:'dedupe',providerId:'server',error:{code:'not_configured',message:'missing',retryable:false},fallbackAvailable:false} as AiResponse<TranscriptionResult>}
  const [a,b]=await Promise.all([deduplicateTranscription(blob,action),deduplicateTranscription(blob,action)]);assert.equal(calls,1);assert.equal(a,b)
})

test('audio processing consent blocks the browser-to-server request',async()=>{
  let calls=0;const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{calls++;return new Response('{}')}
  try{const result=await serverSttProvider.transcribe({audioBlob:new Blob([new Uint8Array([1])],{type:'audio/webm'}),mimeType:'audio/webm'},{requestId:'consent',locale:'ko',consentGranted:false,createdAt:new Date().toISOString()});assert.equal(!result.ok&&result.error.code,'consent_required');assert.equal(calls,0)}finally{globalThis.fetch=originalFetch}
})

test('legacy provider settings migrate mock STT only once in production',()=>{
  assert.equal(normalizeStoredAiConfig({defaultSttProvider:'mock'},true).defaultSttProvider,'server')
  assert.equal(normalizeStoredAiConfig({defaultSttProvider:'mock',actualSttV1:true},true).defaultSttProvider,'mock')
  assert.equal(normalizeStoredAiConfig({defaultSttProvider:'mock'},false).defaultSttProvider,'mock')
  assert.equal(normalizeStoredAiConfig({defaultSttProvider:'server',actualSttV1:true},true).defaultSttProvider,'server')
})

test('approved consent sends exactly one server request and preserves actual provenance',async()=>{
  let calls=0;const originalFetch=globalThis.fetch;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({ok:true,requestId:'approved',providerId:'server',data:{transcript:'안전과 서비스를 우선하겠습니다.',detectedLanguage:'ko',confidence:null,segments:[],transcriptionMode:'actual_audio',isActualTranscription:true},usage:{providerId:'server',taskType:'transcription',startedAt:'2026-01-01T00:00:00.000Z',completedAt:'2026-01-01T00:00:01.000Z',durationMs:1000,success:true,fallbackUsed:false},warnings:[]}),{status:200,headers:{'content-type':'application/json'}})}
  try{const result=await serverSttProvider.transcribe({audioBlob:new Blob([new Uint8Array([1])],{type:'audio/webm'}),mimeType:'audio/webm',languageHint:'ko'},{requestId:'approved',locale:'ko',consentGranted:true,createdAt:new Date().toISOString()});assert.equal(calls,1);assert.equal(result.ok&&result.data.transcriptionMode,'actual_audio');assert.equal(result.ok&&result.data.isActualTranscription,true)}finally{globalThis.fetch=originalFetch}
})

test('consent prompt denial does not persist while approval persists once',()=>{
  let persisted=0
  assert.equal(resolveAudioProcessingConsent(false,()=>false,()=>{persisted++}),false)
  assert.equal(persisted,0)
  assert.equal(resolveAudioProcessingConsent(false,()=>true,()=>{persisted++}),true)
  assert.equal(persisted,1)
  assert.equal(resolveAudioProcessingConsent(true,()=>{throw new Error('prompt repeated')},()=>{persisted++}),true)
  assert.equal(persisted,1)
})
