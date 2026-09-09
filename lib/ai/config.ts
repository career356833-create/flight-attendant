import type { AiProviderConfig } from './types'
import {safeLocalStorageWrite} from '../safe-local-storage'
export const AI_LIMITS={maxTextCharacters:12000,maxAudioSeconds:300,maxAudioBytes:20*1024*1024,supportedAudioMimeTypes:['audio/webm','audio/mp4','audio/mpeg','audio/wav'] as string[],cacheTtlMs:5*60*1000}
export const DEFAULT_AI_CONFIG:AiProviderConfig={defaultAiProvider:'mock',defaultSttProvider:'server',fallbackAiProvider:'mock',fallbackSttProvider:'mock',enableFallback:true,timeoutMs:60000,retryCount:1,taskOverrides:{}}
const KEY='cabin-ai-provider-config-v1'
type StoredAiProviderConfig=Partial<AiProviderConfig>&{actualSttV1?:boolean}
export function normalizeStoredAiConfig(stored:StoredAiProviderConfig,migrateLegacyMock=false):AiProviderConfig{return{...DEFAULT_AI_CONFIG,...stored,defaultSttProvider:migrateLegacyMock&&!stored.actualSttV1?'server':stored.defaultSttProvider??DEFAULT_AI_CONFIG.defaultSttProvider}}
export function loadAiConfig():AiProviderConfig{if(typeof window==='undefined')return DEFAULT_AI_CONFIG;try{const stored=JSON.parse(localStorage.getItem(KEY)??'{}') as StoredAiProviderConfig,migrate=process.env.NODE_ENV==='production'&&!stored.actualSttV1,config=normalizeStoredAiConfig(stored,migrate);if(migrate)safeLocalStorageWrite(KEY,{...config,actualSttV1:true},{category:'settings'});return config}catch{return DEFAULT_AI_CONFIG}}
export function saveAiConfig(config:AiProviderConfig){if(typeof window!=='undefined')safeLocalStorageWrite(KEY,{...config,actualSttV1:true},{category:'settings'});return config}
export function sanitizeTextForAi(text:string){return text.slice(0,AI_LIMITS.maxTextCharacters).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[이메일]').replace(/(?:\+?82[- ]?)?0?1[016789][- ]?\d{3,4}[- ]?\d{4}/g,'[전화번호]').replace(/\b\d{6}[- ]?[1-4]\d{6}\b/g,'[개인식별번호]').replace(/\b[A-Z]{1,2}\d{7,8}\b/g,'[여권번호]').replace(/(?:제 이름은|이름은)\s*[가-힣A-Za-z]{2,20}/g,'이름은 [이름]')}
export function validateText(text:string){if(!text.trim())return'empty_transcript' as const;if(text.length>AI_LIMITS.maxTextCharacters)return'invalid_request' as const;return null}
