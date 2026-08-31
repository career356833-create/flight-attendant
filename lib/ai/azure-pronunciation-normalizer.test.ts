import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeAzurePronunciation } from './azure-pronunciation-normalizer'
import { pronunciationEligibility } from './pronunciation-flow'
import { analyzeAzurePronunciation } from './providers/azure-pronunciation-provider'

const metrics=(voicedDurationMs:number)=>({version:1 as const,durationMs:5000,voicedDurationMs,silenceDurationMs:5000-voicedDurationMs,volume:{averageDbfs:-20,peakDbfs:-3,minDbfs:-40,dynamicRangeDb:37,stability:80,clipping:false},pauses:{count:0,longCount:0,longestMs:0,averageMs:0},speech:{voicedRatio:80,wordsPerMinute:null},quality:{microphoneSignalDetected:true,clippingDetected:false,tooQuietDetected:false,insufficientAudio:false}})
const azure={DisplayText:'Cabin crew safety.',NBest:[{Display:'Cabin crew safety.',PronunciationAssessment:{AccuracyScore:88,FluencyScore:82,CompletenessScore:100,PronScore:86},Words:[{Word:'Cabin',Offset:10_000_000,Duration:5_000_000,PronunciationAssessment:{AccuracyScore:75,ErrorType:'Mispronunciation'},Phonemes:[{Phoneme:'k',Offset:10_000_000,Duration:1_000_000,PronunciationAssessment:{AccuracyScore:70}}]},{Word:'crew',Offset:15_000_000,Duration:4_000_000,PronunciationAssessment:{AccuracyScore:94,ErrorType:'None'},Phonemes:[]}]}]}

test('normalizes nested Azure scores, words, phonemes, and 100ns ticks to ms',()=>{
  const result=normalizeAzurePronunciation(azure)
  assert.equal(result.status,'success')
  assert.deepEqual(result.overall,{pronunciationScore:86,completenessScore:100,fluencyScore:82,prosodyScore:undefined})
  assert.deepEqual(result.words?.[0],{word:'Cabin',startMs:1000,endMs:1500,accuracyScore:75,status:'review',phonemes:[{phoneme:'k',accuracyScore:70,startMs:1000,endMs:1100}]})
  assert.equal(result.words?.[1].status,'clear')
})

test('missing optional prosody remains absent and malformed result fails closed',()=>{
  assert.equal(normalizeAzurePronunciation(azure).overall?.prosodyScore,undefined)
  assert.equal(normalizeAzurePronunciation({NBest:[{}]}).status,'failed')
  assert.equal(normalizeAzurePronunciation({}).status,'failed')
})

test('eligibility requires English, a real blob, and at least three voiced seconds',()=>{
  const blob=new Blob([new Uint8Array([1])],{type:'audio/webm'})
  assert.equal(pronunciationEligibility({blob,language:'en-US',metrics:metrics(3000)}).allowed,true)
  assert.equal(pronunciationEligibility({blob,language:'ko',metrics:metrics(3000),transcript:'English words'}).allowed,false)
  assert.equal(pronunciationEligibility({blob,language:'en',metrics:metrics(2999)}).allowed,false)
  assert.equal(pronunciationEligibility({language:'en-US',metrics:metrics(3000)}).allowed,false)
})

test('same Blob lifecycle shares one pronunciation request and no STT score is synthesized',async()=>{
  const originalWindow=globalThis.window,originalFetch=globalThis.fetch,originalStorage=globalThis.localStorage
  const storage={getItem:()=>JSON.stringify({allowPronunciationProcessing:true}),setItem:()=>{},removeItem:()=>{}}
  Object.defineProperty(globalThis,'window',{value:{},configurable:true})
  Object.defineProperty(globalThis,'localStorage',{value:storage,configurable:true})
  let calls=0
  globalThis.fetch=async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return new Response(JSON.stringify(normalizeAzurePronunciation(azure)),{status:200})}
  try{const blob=new Blob([new Uint8Array([1])],{type:'audio/webm'});const [a,b]=await Promise.all([analyzeAzurePronunciation(blob,{transcript:'Cabin crew safety.',language:'en-US'}),analyzeAzurePronunciation(blob,{transcript:'Cabin crew safety.',language:'en-US'})]);assert.equal(calls,1);assert.equal(a,b);assert.equal(a.overall?.pronunciationScore,86)}finally{globalThis.fetch=originalFetch;Object.defineProperty(globalThis,'window',{value:originalWindow,configurable:true});Object.defineProperty(globalThis,'localStorage',{value:originalStorage,configurable:true})}
})
