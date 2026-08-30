import type { InterviewContentAnalysis } from '@/lib/interview-content-analysis'
import type { InterviewAttempt, InterviewQuestion } from '@/lib/interview-practice-data'
import type { InterviewSession } from '@/lib/mock-interview-session'

export type FollowUpReason='missing_result'|'missing_action'|'generic_claim'|'weak_evidence'|'missing_competency'|'unclear_motivation'|'weak_airline_connection'|'safety_priority_unclear'|'conflict_resolution_missing'|'answer_too_short'|'answer_too_vague'
export type FollowUpTemplate={id:string;reason:FollowUpReason;questionTypes:InterviewQuestion['category'][];competencyTags?:string[];textKo:string;textEn:string;priority:number;maxUsesPerSession:number}
export type FollowUpDecision={shouldAsk:boolean;reason?:FollowUpReason;templateId?:string;questionText?:string;confidence?:'high'|'medium';source:'deterministic'}

export const followUpTemplateRegistry:FollowUpTemplate[]=[
  {id:'safety-priority',reason:'safety_priority_unclear',questionTypes:['safety_and_role_judgment'],textKo:'서비스와 안전이 충돌한다면 무엇을 우선하겠습니까?',textEn:'If service and safety conflict, what would you prioritize?',priority:100,maxUsesPerSession:1},
  {id:'safety-procedure',reason:'weak_evidence',questionTypes:['safety_and_role_judgment'],textKo:'그 상황에서 어떤 순서로 대응하겠습니까?',textEn:'What order of actions would you take in that situation?',priority:90,maxUsesPerSession:1},
  {id:'star-action',reason:'missing_action',questionTypes:['behavioral_experience','customer_situation','safety_and_role_judgment'],textKo:'그 상황에서 본인이 직접 한 행동은 무엇이었나요?',textEn:'What actions did you personally take in that situation?',priority:90,maxUsesPerSession:2},
  {id:'star-result',reason:'missing_result',questionTypes:['behavioral_experience','customer_situation','introduction_and_motivation'],textKo:'그 행동 이후 결과는 어떻게 되었나요?',textEn:'What was the result after those actions?',priority:80,maxUsesPerSession:2},
  {id:'customer-needs',reason:'weak_evidence',questionTypes:['customer_situation'],textKo:'고객이 가장 불편해했던 점은 무엇이었나요?',textEn:'What was the customer most concerned about?',priority:75,maxUsesPerSession:1},
  {id:'motivation-experience',reason:'unclear_motivation',questionTypes:['introduction_and_motivation'],textKo:'그 이유가 본인의 경험과 어떻게 연결되나요?',textEn:'How does that reason connect with your own experience?',priority:70,maxUsesPerSession:1},
  {id:'airline-role-connection',reason:'weak_airline_connection',questionTypes:['introduction_and_motivation'],textKo:'이 경험이 지원하는 항공사의 객실승무원 역할과 어떻게 연결되나요?',textEn:'How does this experience connect with the cabin crew role at the airline you are applying to?',priority:50,maxUsesPerSession:1},
  {id:'competency-evidence',reason:'missing_competency',questionTypes:['behavioral_experience','customer_situation','introduction_and_motivation'],textKo:'그 강점을 보여주는 구체적인 사례를 하나 더 설명해 주세요.',textEn:'Please share one more specific example that demonstrates that strength.',priority:70,maxUsesPerSession:1},
  {id:'specific-example',reason:'generic_claim',questionTypes:['behavioral_experience','customer_situation','introduction_and_motivation'],textKo:'조금 더 구체적인 사례를 들어 설명해 주세요.',textEn:'Please explain with a more specific example.',priority:60,maxUsesPerSession:2},
]

const maxForCount:Record<number,number>={5:3,8:4,12:6}
const contentOf=(attempt:InterviewAttempt):InterviewContentAnalysis|undefined=>attempt.contentAnalysis
const reasonCandidates=(question:InterviewQuestion,attempt:InterviewAttempt,hasPublishedAirlineContext=false):FollowUpReason[]=>{
  const content=contentOf(attempt),missing=content?.structure.missingParts??[],generic=content?.answerQuality.genericClaims.length??0
  const reasons:FollowUpReason[]=[]
  if(content?.rubric?.evaluated)reasons.push(...content.rubric.followUpCandidates)
  if(question.category==='safety_and_role_judgment'&&(missing.includes('Judgment')||missing.includes('Communication')))reasons.push('safety_priority_unclear')
  if(missing.includes('Action'))reasons.push('missing_action')
  if(missing.includes('Result')||missing.includes('Closing'))reasons.push('missing_result')
  if(question.category==='introduction_and_motivation'&&(!attempt.transcript.trim()||missing.includes('Reason')||missing.includes('Example')))reasons.push('unclear_motivation')
  if(question.category==='introduction_and_motivation'&&hasPublishedAirlineContext&&!attempt.transcript.trim().toLowerCase().includes('airline'))reasons.push('weak_airline_connection')
  if(generic>0)reasons.push('generic_claim')
  if(content?.competencies.some(item=>item.strength==='missing'))reasons.push('missing_competency')
  if(attempt.transcript.trim()&&attempt.durationSeconds>=3&&attempt.durationSeconds<12)reasons.push('answer_too_short')
  return [...new Set(reasons)]
}

export function decideAiInterviewerFollowUp(input:{question:InterviewQuestion;attempt:InterviewAttempt;session:InterviewSession;priorFollowUps:InterviewAttempt[];language?:'ko'|'en';hasPublishedAirlineContext?:boolean}):FollowUpDecision{
  const max=maxForCount[input.session.questionIds.length]??3
  if(input.priorFollowUps.length>=max)return{shouldAsk:false,source:'deterministic'}
  const candidates=reasonCandidates(input.question,input.attempt,input.hasPublishedAirlineContext)
  if(!candidates.length)return{shouldAsk:false,source:'deterministic'}
  const used=new Map<string,number>();input.priorFollowUps.forEach(a=>{if(a.followUpTemplateId)used.set(a.followUpTemplateId,(used.get(a.followUpTemplateId)??0)+1)})
  const previousReason=input.priorFollowUps.at(-1)?.followUpReason
  const template=followUpTemplateRegistry.filter(t=>candidates.includes(t.reason)&&t.questionTypes.includes(input.question.category)&& (used.get(t.id)??0)<t.maxUsesPerSession && t.reason!==previousReason).sort((a,b)=>b.priority-a.priority)[0]
  if(!template)return{shouldAsk:false,source:'deterministic'}
  return{shouldAsk:true,reason:template.reason,templateId:template.id,questionText:input.language==='en'?template.textEn:template.textKo,confidence:template.priority>=80?'high':'medium',source:'deterministic'}
}

/** Optional provider hook. V1 deliberately keeps the verified template when no safe paraphraser is supplied. */
export async function phraseFollowUp(template:FollowUpTemplate,input:{language:'ko'|'en';paraphrase?:((value:string)=>Promise<string>)}):Promise<string>{
  const fallback=input.language==='en'?template.textEn:template.textKo
  if(!input.paraphrase)return fallback
  try{const result=(await input.paraphrase(fallback)).trim();return result||fallback}catch{return fallback}
}

export function buildFollowUpQuestion(parent:InterviewQuestion,decision:FollowUpDecision):InterviewQuestion{
  return{id:`${parent.id}--${decision.templateId??'follow-up'}`,category:parent.category,prompt:decision.questionText??'조금 더 구체적으로 설명해 주세요.',shortTitle:'추가 질문',difficulty:parent.difficulty,targetCapabilities:parent.targetCapabilities,evaluationRubric:{...parent.evaluationRubric,guidance:'추가 질문입니다. 사용자가 답한 내용 안에서 구체적인 행동·결과·판단 근거를 설명해 보세요.'},suggestedAnswerRange:{minSeconds:20,maxSeconds:60},localeKey:`${parent.localeKey}.follow-up`}
}
