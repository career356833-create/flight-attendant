import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { loadInterviewAttempts } from './interview-practice-data'
import { loadInterviewSessions } from './mock-interview-session'
import { loadSelfIntroductionAttempts } from './self-introduction-data'
import { experienceRepository } from './experience-repository'
import { interviewPracticeQueueRepository } from './interview-practice-queue'
import { learningAnalyticsRepository } from './learning-analytics-repository'
import { LocalAirlineApplicationRepository } from './supabase/application-sync-repository'
import { buildHomeRealState } from './home-real-state'
import { normalizeStoredAiConfig } from './ai/config'
import { isRuntimeProviderAllowed } from './ai/provider-registry'
import { deterministicAiProvider } from './ai/providers/deterministic-ai-provider'
import { actualTranscript, transcriptionIntegrity } from './ai/transcription-integrity'
import { isAirlineKnowledgeEligibleForAiContext } from './airline-ai-context-gate'
import type { AiResponse, TranscriptionResult } from './ai/types'

const memoryStorage=()=>{const values=new Map<string,string>();return{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key),clear:()=>values.clear(),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size}}}

test('fresh browser repositories contain no seeded user records',async()=>{const priorWindow=globalThis.window,priorStorage=globalThis.localStorage,storage=memoryStorage();Object.assign(globalThis,{window:{dispatchEvent:()=>true},localStorage:storage});try{assert.equal(loadInterviewAttempts().length,0);assert.equal(loadInterviewSessions().length,0);assert.equal(loadSelfIntroductionAttempts().length,0);assert.equal(experienceRepository.load().experiences.length,0);assert.equal(interviewPracticeQueueRepository.listQueue().length,0);assert.equal(interviewPracticeQueueRepository.listFavorites().length,0);assert.equal(learningAnalyticsRepository.load().routineCompletions.length,0);assert.equal((await new LocalAirlineApplicationRepository().list()).length,0);const home=buildHomeRealState({activities:[],weeklyPracticeCount:0});assert.equal(home.streakDays,undefined);assert.equal(home.weeklyPracticeCount,0)}finally{Object.assign(globalThis,{window:priorWindow,localStorage:priorStorage})}})

test('legacy production mock settings normalize to truthful providers',()=>{const config=normalizeStoredAiConfig({defaultAiProvider:'mock',fallbackAiProvider:'mock',defaultSttProvider:'mock',fallbackSttProvider:'mock',taskOverrides:{interview_analysis:'mock'},actualSttV1:true},false,true);assert.equal(config.defaultAiProvider,'deterministic');assert.equal(config.fallbackAiProvider,'deterministic');assert.equal(config.defaultSttProvider,'server');assert.equal(config.fallbackSttProvider,'server');assert.equal(config.taskOverrides?.interview_analysis,'deterministic')})

test('mock AI and STT providers cannot be selected in production',()=>{assert.equal(isRuntimeProviderAllowed('ai','mock','production'),false);assert.equal(isRuntimeProviderAllowed('stt','mock','production'),false);assert.equal(isRuntimeProviderAllowed('ai','deterministic','production'),true);assert.equal(isRuntimeProviderAllowed('stt','server','production'),true)})

test('deterministic analysis remains available with explicit provenance',async()=>{const result=await deterministicAiProvider.generateCoachMessage({scores:{structure:40},weaknesses:['답변 구조'],recentActivityTitles:[]},{requestId:'deterministic',locale:'ko',consentGranted:true,createdAt:'2026-09-13T00:00:00.000Z'});assert.equal(result.ok,true);assert.equal(result.providerId,'deterministic');assert.equal(result.ok&&result.warnings.some(item=>item.code==='mock_result'),false)})

test('STT failure exposes no transcript and remains AUDIO ONLY',()=>{const failure={ok:false,requestId:'failure',providerId:'server',error:{code:'empty_transcript',message:'unavailable',retryable:false},fallbackAvailable:false} satisfies AiResponse<TranscriptionResult>;assert.equal(actualTranscript(failure),'');assert.deepEqual(transcriptionIntegrity(failure),{providerId:'server',mode:'unavailable',isActualTranscription:false})})

test('unverified airline examples remain blocked from runtime AI context',()=>assert.equal(isAirlineKnowledgeEligibleForAiContext({verified:false,published:true,aiContextEnabled:true,sourceReferences:['https://example.com']}),false))

test('production landing imports product copy and no fabricated data module remains',()=>{assert.equal(existsSync('lib/mock-data.ts'),false);const landing=readFileSync('components/video-landing.tsx','utf8');assert.match(landing,/landing-content/);assert.doesNotMatch(landing,/mock-data/);const copy=readFileSync('lib/landing-content.ts','utf8');for(const fabricated of ['notifications: 2','score: 68','streakDays: 12','completedThisWeek: 9'])assert.equal(copy.includes(fabricated),false)})

test('UI placeholders remain presentation-only and are not persisted as defaults',()=>{const source=readFileSync('components/experience-library/experience-library.tsx','utf8');assert.match(source,/placeholder=/);assert.doesNotMatch(readFileSync('lib/experience-repository.ts','utf8'),/불만 고객을 응대해 문제를 해결한 경험|카페 아르바이트/)})

test('development diagnostics stay behind an explicit development-only guard',()=>{const source=readFileSync('components/account/supabase-diagnostic.tsx','utf8');assert.match(source,/NODE_ENV\s*!==\s*['"]development['"]/);assert.match(source,/return <ApplicationSyncPanel\/>/)})
