import type { AiErrorCode, AiResponse, TranscriptionResult } from './types'

export const OPENAI_TRANSCRIPTION_ENDPOINT='https://api.openai.com/v1/audio/transcriptions'
export const DEFAULT_OPENAI_STT_MODEL='gpt-transcribe'

type TranscriptionInput={file:File;requestId:string;language:'ko'|'en';durationSeconds?:number;apiKey?:string;model?:string;signal?:AbortSignal;fetcher?:typeof fetch}
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
    if(!response.ok)return failed(input.requestId,errorCode(response.status),`Transcription provider returned ${response.status}`)
    const payload=await response.json().catch(()=>null) as {text?:unknown}|null
    const transcript=typeof payload?.text==='string'?payload.text.trim():''
    if(!transcript)return failed(input.requestId,'empty_transcript','Transcription result was empty')
    const completedAt=new Date().toISOString()
    return{ok:true,requestId:input.requestId,providerId:'server',data:{transcript,detectedLanguage:input.language,confidence:null,segments:[],transcriptionMode:'actual_audio',isActualTranscription:true},usage:{providerId:'server',taskType:'transcription',audioSeconds:input.durationSeconds,startedAt,completedAt,durationMs:Date.now()-started,success:true,fallbackUsed:false},warnings:[]}
  }catch(error){
    if(input.signal?.aborted||error instanceof DOMException&&error.name==='AbortError')return failed(input.requestId,'timeout','Transcription request timed out')
    return failed(input.requestId,'network_error','Transcription provider request failed')
  }
}
