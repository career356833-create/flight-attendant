import {NextResponse} from 'next/server'
import {AI_LIMITS} from '@/lib/ai/config'
import {safeTranscriptionFailureDiagnostic,transcribeWithOpenAi,type SafeTranscriptionResponseObservation} from '@/lib/ai/openai-transcription'

export const runtime='nodejs'
export const maxDuration=60

const responseStatus=(code?:string)=>code==='not_configured'?503:code==='consent_required'?403:code==='audio_too_large'?413:code==='audio_format_unsupported'||code==='invalid_request'?400:code==='rate_limited'?429:code==='timeout'?504:code==='provider_unavailable'?502:422
const warnSafely=(value:unknown)=>{try{console.warn(JSON.stringify(value))}catch{/* logging must not change the route response */}}

export async function POST(request:Request){
  let requestId='unknown'
  try{
    const form=await request.formData()
    requestId=String(form.get('requestId')||'unknown').slice(0,128)
    if(form.get('consentGranted')!=='true')return NextResponse.json({ok:false,requestId,providerId:'server',error:{code:'consent_required',message:'Audio processing consent required',retryable:false},fallbackAvailable:false},{status:403})
    const file=form.get('file')
    if(!(file instanceof File))return NextResponse.json({ok:false,requestId,providerId:'server',error:{code:'invalid_request',message:'Audio file is required',retryable:false},fallbackAvailable:false},{status:400})
    if(file.size>AI_LIMITS.maxAudioBytes)return NextResponse.json({ok:false,requestId,providerId:'server',error:{code:'audio_too_large',message:'Audio file is too large',retryable:false},fallbackAvailable:false},{status:413})
    if(!AI_LIMITS.supportedAudioMimeTypes.some(type=>file.type.startsWith(type)))return NextResponse.json({ok:false,requestId,providerId:'server',error:{code:'audio_format_unsupported',message:'Unsupported audio format',retryable:false},fallbackAvailable:false},{status:415})
    const durationSeconds=Number(form.get('durationSeconds')||0)
    if(durationSeconds>AI_LIMITS.maxAudioSeconds)return NextResponse.json({ok:false,requestId,providerId:'server',error:{code:'audio_too_large',message:'Audio is too long',retryable:false},fallbackAvailable:false},{status:413})
    const language=form.get('languageHint')==='en'?'en':'ko'
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55_000)
    try{
      const started=Date.now();let observation:SafeTranscriptionResponseObservation|undefined
      const result=await transcribeWithOpenAi({file,requestId,language,durationSeconds,apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_STT_MODEL||'gpt-transcribe',signal:controller.signal,onSafeResponseObservation:value=>{observation=value}})
      if(!result.ok)warnSafely({event:result.error.code==='empty_transcript'?'stt_empty_transcript':'stt_transcription_failed',...safeTranscriptionFailureDiagnostic({errorCode:result.error.code,mime:file.type,bytes:file.size,elapsedMs:Date.now()-started,observation})})
      return NextResponse.json(result,{status:result.ok?200:responseStatus(result.error.code)})
    }finally{clearTimeout(timer)}
  }catch{return NextResponse.json({ok:false,requestId,providerId:'server',error:{code:'invalid_request',message:'Invalid multipart transcription request',retryable:false},fallbackAvailable:false},{status:400})}
}
