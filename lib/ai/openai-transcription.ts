import type { AiErrorCode, AiResponse, TranscriptionResult } from './types'

export const OPENAI_TRANSCRIPTION_ENDPOINT='https://api.openai.com/v1/audio/transcriptions'
export const DEFAULT_OPENAI_STT_MODEL='gpt-transcribe'

export type EmptyTranscriptDiagnostic='TEXT_MISSING'|'TEXT_NON_STRING'|'TEXT_EMPTY_RAW'|'TEXT_WHITESPACE_ONLY'
export type EmptyTranscriptSegmentDiagnostic='TEXT_EMPTY_WITH_SEGMENTS'|'TEXT_EMPTY_NO_SEGMENTS'
export type SafeTranscriptionResponseMetadata={upstreamStatus?:number;requestIdPresent:boolean;contentType?:string;topLevelKeys:string[];textPresent:boolean;textType:string;textLength:number|null;trimmedTextLength:number|null;segmentsPresent:boolean;segmentsCount:number|null;knownTranscriptContainerKeys:string[]}
export type SafeTranscriptionResponseObservation={metadata:SafeTranscriptionResponseMetadata;diagnostic?:EmptyTranscriptDiagnostic;segmentDiagnostic?:EmptyTranscriptSegmentDiagnostic}

type TranscriptionInput={file:File;requestId:string;language:'ko'|'en';durationSeconds?:number;apiKey?:string;model?:string;signal?:AbortSignal;fetcher?:typeof fetch;onSafeResponseObservation?:(observation:SafeTranscriptionResponseObservation)=>void}
const isRecord=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value)
const hasOwn=(value:Record<string,unknown>,key:string)=>Object.prototype.hasOwnProperty.call(value,key)
const safeKeys=(value:Record<string,unknown>)=>[...new Set(Object.keys(value).map(key=>key.slice(0,64)))].sort().slice(0,32)

export function safeTranscriptionResponseMetadata(response:Response,payload:unknown):SafeTranscriptionResponseMetadata{
  const record=isRecord(payload)?payload:null
  const textPresent=record!==null&&hasOwn(record,'text'),text=textPresent?record.text:undefined
  const segmentsPresent=record!==null&&hasOwn(record,'segments'),segments=segmentsPresent?record.segments:undefined
  return{upstreamStatus:response.status,requestIdPresent:Boolean(response.headers.get('x-request-id')||response.headers.get('openai-request-id')),contentType:response.headers.get('content-type')?.slice(0,128)||undefined,topLevelKeys:record?safeKeys(record):[],textPresent,textType:typeof text,textLength:typeof text==='string'?text.length:null,trimmedTextLength:typeof text==='string'?text.trim().length:null,segmentsPresent,segmentsCount:Array.isArray(segments)?segments.length:null,knownTranscriptContainerKeys:record?['output_text','results','transcript'].filter(key=>hasOwn(record,key)):[]}
}
export function classifyEmptyTranscript(metadata:SafeTranscriptionResponseMetadata):EmptyTranscriptDiagnostic|undefined{
  if(!metadata.textPresent)return'TEXT_MISSING'
  if(metadata.textType!=='string')return'TEXT_NON_STRING'
  if(metadata.textLength===0)return'TEXT_EMPTY_RAW'
  if(metadata.trimmedTextLength===0)return'TEXT_WHITESPACE_ONLY'
}
export function classifyEmptyTranscriptSegments(metadata:SafeTranscriptionResponseMetadata):EmptyTranscriptSegmentDiagnostic|undefined{
  if((metadata.trimmedTextLength??0)>0)return
  return(metadata.segmentsCount??0)>0?'TEXT_EMPTY_WITH_SEGMENTS':'TEXT_EMPTY_NO_SEGMENTS'
}
function observe(input:TranscriptionInput,observation:SafeTranscriptionResponseObservation){try{input.onSafeResponseObservation?.(observation)}catch{/* best-effort diagnostics must not change STT */}}
export function safeTranscriptionFailureDiagnostic(input:{errorCode:AiErrorCode;mime:string;bytes:number;elapsedMs:number;observation?:SafeTranscriptionResponseObservation}){return{provider:'openai',errorCategory:input.errorCode,mime:input.mime||'unknown',bytes:Math.max(0,input.bytes),elapsedMs:Math.max(0,input.elapsedMs),...(input.observation?{...input.observation.metadata,diagnostic:input.observation.diagnostic,segmentDiagnostic:input.observation.segmentDiagnostic}:{})}}
const failed=(requestId:string,code:AiErrorCode,message:string):AiResponse<TranscriptionResult>=>({ok:false,requestId,providerId:'server',error:{code,message,retryable:code==='timeout'||code==='network_error'||code==='provider_unavailable'},fallbackAvailable:false})
const errorCode=(status:number):AiErrorCode=>status===401||status===403?'provider_unavailable':status===429?'rate_limited':status>=500?'provider_unavailable':'invalid_request'

export async function transcribeWithOpenAi(input:TranscriptionInput):Promise<AiResponse<TranscriptionResult>>{
  const startedAt=new Date().toISOString(),started=Date.now(),key=input.apiKey?.trim()
  if(!key)return failed(input.requestId,'not_configured','OpenAI transcription is not configured')
  if(!input.file.size)return failed(input.requestId,'invalid_request','Audio file is empty')
  const form=new FormData()
  form.append('file',input.file)
  form.append('model',input.model?.trim()||DEFAULT_OPENAI_STT_MODEL)
  form.append('language',input.language)
  form.append('response_format','json')
  try{
    const response=await (input.fetcher??fetch)(OPENAI_TRANSCRIPTION_ENDPOINT,{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:input.signal})
    if(!response.ok){observe(input,{metadata:safeTranscriptionResponseMetadata(response,null)});return failed(input.requestId,errorCode(response.status),`Transcription provider returned ${response.status}`)}
    const payload=await response.json().catch(()=>null) as unknown
    const metadata=safeTranscriptionResponseMetadata(response,payload)
    const transcript=isRecord(payload)&&typeof payload.text==='string'?payload.text.trim():''
    if(!transcript){observe(input,{metadata,diagnostic:classifyEmptyTranscript(metadata),segmentDiagnostic:classifyEmptyTranscriptSegments(metadata)});return failed(input.requestId,'empty_transcript','Transcription result was empty')}
    const completedAt=new Date().toISOString()
    return{ok:true,requestId:input.requestId,providerId:'server',data:{transcript,detectedLanguage:input.language,confidence:null,segments:[],transcriptionMode:'actual_audio',isActualTranscription:true},usage:{providerId:'server',taskType:'transcription',audioSeconds:input.durationSeconds,startedAt,completedAt,durationMs:Date.now()-started,success:true,fallbackUsed:false},warnings:[]}
  }catch(error){
    if(input.signal?.aborted||error instanceof DOMException&&error.name==='AbortError')return failed(input.requestId,'timeout','Transcription request timed out')
    return failed(input.requestId,'network_error','Transcription provider request failed')
  }
}
