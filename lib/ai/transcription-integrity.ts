import type { AiResponse, TranscriptionMode, TranscriptionResult } from './types'
import type { InterviewAnswerAnalysis, InterviewQuestion, TranscriptIntegrity } from '@/lib/interview-practice-data'
import type { SelfIntroductionAnalysis } from '@/lib/self-introduction-data'

export function transcriptionIntegrity(response:AiResponse<TranscriptionResult>):TranscriptIntegrity{
  if(!response.ok)return{providerId:response.providerId,mode:'unavailable',isActualTranscription:false}
  const mode=response.data.transcriptionMode??'unknown'
  return{providerId:response.providerId,mode,isActualTranscription:mode==='actual_audio'&&response.data.isActualTranscription===true}
}

export function actualTranscript(response:AiResponse<TranscriptionResult>){
  return response.ok&&response.data.transcriptionMode==='actual_audio'&&response.data.isActualTranscription===true&&response.data.transcript.trim()?response.data.transcript.trim():''
}

export function unavailableInterviewAnalysis(question:InterviewQuestion,durationSeconds:number):InterviewAnswerAnalysis{
  return{overallScore:0,summary:'음성 전사 기능이 현재 연결되지 않아 답변 텍스트 분석을 제공할 수 없습니다.',strengths:[],improvements:[],evaluationScores:[],timingAnalysis:{durationSeconds,firstKeyMessageAtSeconds:null,silenceSeconds:0,repeatedPhraseCount:0,assessment:'well_balanced',feedback:'녹음 시간과 오디오 기반 지표만 확인할 수 있습니다.'},speakingMetrics:{wordsPerMinute:0,speakingPaceLabel:'측정 불가',longSilenceCount:0,fillerCount:0,repeatedPhraseCount:0},recommendedRetryMode:'repeat_current_structure',nextQuestionIds:question.followUpQuestionIds??[]}
}

export function unavailableSelfIntroductionAnalysis(durationSeconds:number):SelfIntroductionAnalysis{
  return{timing:{durationSeconds,firstKeyMessageAtSeconds:null,silenceSeconds:0,repeatedPhraseCount:0,assessment:'well_balanced',feedback:'실제 녹음 시간을 기준으로 확인했습니다.'},overall:'음성 전사 기능이 현재 연결되지 않아 자기소개 내용 분석을 제공할 수 없습니다.',bestPoint:'녹음을 완료했습니다.',firstImprovement:'전사 기능 연결 후 내용 피드백을 확인할 수 있습니다.',details:[],metrics:{wordsPerMinute:0,speakingPaceLabel:'측정 불가',longSilenceCount:0,fillerCount:0,roleConnection:'needs_improvement'},guide:{keep:'녹음 연습을 이어가세요.',reduce:'측정 불가',add:'전사 기능 연결 후 확인'},retryRecommendation:'repeat_current'}
}

export function isActualAttempt(value:{transcriptIntegrity?:TranscriptIntegrity}){
  return value.transcriptIntegrity?.mode==='actual_audio'&&value.transcriptIntegrity.isActualTranscription===true
}

export type { TranscriptionMode }
