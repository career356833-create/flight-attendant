import type { AirlineQuestion } from '@/lib/airline-knowledge-repository'
import type { ApplicationAnswerAnalysis, ApplicationDraft, ApplicationPrompt, DraftEvidence, StructureBlock } from '@/lib/application-answer-repository'
import type { CareerExperience, ExperienceCategory, ExperienceCompetency } from '@/lib/experience-repository'
import type { InterviewAnswerAnalysis, InterviewQuestion } from '@/lib/interview-practice-data'
import type { SelfIntroductionAnalysis } from '@/lib/self-introduction-data'

export type AiProviderId='mock'|'server'
export type SttProviderId='mock'|'browser_speech'|'server'
export type AiTaskType='interview_analysis'|'self_introduction_analysis'|'experience_structuring'|'application_draft_generation'|'application_draft_revision'|'application_answer_analysis'|'coach_message_generation'
export type AirlineApplicationContext={airlineId:string;airlineName?:string;servicePhilosophy?:string;coreValues:string[];cabinCrewRoleSummary?:string;lastReviewedAt?:string}
export type AiRequestContext={requestId:string;userId?:string;locale:string;targetAirlineId?:string;targetAirlineContext?:AirlineApplicationContext;consentGranted:boolean;createdAt:string;timeoutMs?:number;metadata?:Record<string,string|number|boolean|null>}
export type AiUsage={providerId:string;taskType:AiTaskType|'transcription';inputCharacters?:number;outputCharacters?:number;inputTokens?:number;outputTokens?:number;audioSeconds?:number;estimatedCost?:number;currency?:string;startedAt:string;completedAt:string;durationMs:number;success:boolean;fallbackUsed:boolean}
export type AiWarning={code:'partial_result'|'low_confidence'|'fallback_used'|'airline_context_missing'|'transcript_incomplete'|'content_truncated'|'mock_result'|'unsafe_output';message:string}
export type AiErrorCode='not_configured'|'consent_required'|'invalid_request'|'timeout'|'network_error'|'rate_limited'|'provider_unavailable'|'unsafe_output'|'invalid_response'|'audio_too_large'|'audio_format_unsupported'|'empty_transcript'|'quota_exceeded'|'cancelled'|'unknown'
export type AiServiceError={code:AiErrorCode;message:string;retryable:boolean;details?:string}
export type AiSuccessResponse<T>={ok:true;requestId:string;providerId:string;data:T;usage:AiUsage;warnings:AiWarning[]}
export type AiFailureResponse={ok:false;requestId:string;providerId?:string;error:AiServiceError;usage?:AiUsage;fallbackAvailable:boolean}
export type AiResponse<T>=AiSuccessResponse<T>|AiFailureResponse
export type AnalyzeInterviewRequest={question:InterviewQuestion;transcript:string;durationSeconds:number;experienceSnapshot?:Partial<CareerExperience>}
export type AnalyzeSelfIntroductionRequest={transcript:string;durationSeconds:number}
export type StructureExperienceRequest={originalText:string;current:Pick<CareerExperience,'situation'|'task'|'action'|'result'|'learning'>;category:ExperienceCategory;userInstruction?:string;doNotInventFacts:true}
export type StructuredExperienceResult={situation:string;task:string;action:string;result:string;learning:string;suggestedCompetencyTags:ExperienceCompetency[];evidenceWarnings:string[]}
export type GenerateApplicationDraftRequest={prompt:ApplicationPrompt;airlineId?:string;experiences:CareerExperience[];coachingAnswers:Record<string,string>;structure:StructureBlock[];coreMessage:string}
export type ReviseApplicationDraftRequest={content:string;mode:'polish'|'specificity'|'concise'|'role_connection'|'airline_connection'|'tone_change';prompt:ApplicationPrompt;evidence:DraftEvidence[];airlineId?:string}
export type ApplicationRevisionResult={content:string;changedSentenceIds:string[];evidence:DraftEvidence[];warnings:string[]}
export type AnalyzeApplicationAnswerRequest={content:string;prompt:ApplicationPrompt;evidence:DraftEvidence[];airlineId?:string}
export type GenerateCoachMessageRequest={scores:Record<string,number>;weaknesses:string[];recentActivityTitles:string[]}
export type CoachMessageResult={message:string;recommendedAction:string;relatedTaskType?:AiTaskType}
export type TranscriptionRequest={audioBlob?:Blob;audioId?:string;mimeType?:string;languageHint?:string;durationSeconds?:number;fallbackTranscript?:string}
export type TranscriptionSegment={startSeconds:number;endSeconds:number;text:string;confidence?:number}
export type TranscriptionResult={transcript:string;detectedLanguage?:string;confidence?:number;segments?:TranscriptionSegment[];fillerWords?:{word:string;count:number}[];silenceSegments?:{startSeconds:number;endSeconds:number}[]}
export interface AiProvider{id:AiProviderId;isAvailable():boolean;analyzeInterviewAnswer(request:AnalyzeInterviewRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<InterviewAnswerAnalysis>>;analyzeSelfIntroduction(request:AnalyzeSelfIntroductionRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<SelfIntroductionAnalysis>>;structureExperience(request:StructureExperienceRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<StructuredExperienceResult>>;generateApplicationDraft(request:GenerateApplicationDraftRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<ApplicationDraft>>;reviseApplicationDraft(request:ReviseApplicationDraftRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<ApplicationRevisionResult>>;analyzeApplicationAnswer(request:AnalyzeApplicationAnswerRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<ApplicationAnswerAnalysis>>;generateCoachMessage(request:GenerateCoachMessageRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<CoachMessageResult>>}
export interface SttProvider{id:SttProviderId;isSupported():boolean;transcribe(request:TranscriptionRequest,context:AiRequestContext,signal?:AbortSignal):Promise<AiResponse<TranscriptionResult>>}
export type AiProviderConfig={defaultAiProvider:AiProviderId;defaultSttProvider:SttProviderId;fallbackAiProvider:AiProviderId;fallbackSttProvider:SttProviderId;taskOverrides?:Partial<Record<AiTaskType,AiProviderId>>;enableFallback:boolean;timeoutMs:number;retryCount:number}
export type AiCacheEntry<T>={key:string;providerId:string;taskType:AiTaskType;inputHash:string;data:T;createdAt:string;expiresAt:string}
