import type { AnswerQualityDimension, AnswerQualityFinding, AnswerQualityRubric } from './answer-quality-rubric'
import type { FollowUpReason } from './ai-interviewer'
import { listApplicationAnswers, listAnswerVersions } from './application-answer-repository'
import { loadSelfIntroductionAttempts } from './self-introduction-data'
import { interviewQuestions, loadInterviewAttempts, type CapabilityKey, type InterviewAttempt, type InterviewCategory, type InterviewQuestion } from './interview-practice-data'
import { interviewPracticeQueueRepository, type PracticeQueueReason } from './interview-practice-queue'
import type { RepeatedWeakness, TrainingPriority } from './learning-analytics-service'

export type AdaptiveWeaknessKey = FollowUpReason | 'weak_relevance' | 'weak_specificity' | 'weak_structure' | 'filler' | 'long_pause'
export type WeaknessState = 'observed' | 'emerging' | 'persistent' | 'improving' | 'resolved'
export type WeaknessTrend = 'worsening' | 'stable' | 'improving' | 'resolved'
export type WeaknessConfidence = 'low' | 'medium' | 'high'
export type WeaknessEvidenceSource = 'interview_attempt' | 'self_introduction' | 'application_answer' | 'speech_metric'

export type WeaknessEvidence = {
  key: AdaptiveWeaknessKey
  dimension?: AnswerQualityDimension
  sourceType: WeaknessEvidenceSource
  sourceId: string
  familyId: string
  occurredAt: string
  questionId?: string
  questionType?: InterviewCategory
  signal: 'needs_improvement' | 'improved'
  severity: 'low' | 'medium' | 'high'
  provenance: 'rubric' | 'legacy' | 'speech_metric'
  summary: string
}

export type AdaptiveWeakness = {
  key: AdaptiveWeaknessKey
  title: string
  relatedCapability: CapabilityKey
  state: WeaknessState
  trend: WeaknessTrend
  confidence: WeaknessConfidence
  occurrenceCount: number
  distinctSourceCount: number
  latestObservedAt: string
  priority: number
  evidence: WeaknessEvidence[]
  explanation: string
  recommendedAction: string
}

export type AdaptiveEvidenceInput = {
  sourceType: Exclude<WeaknessEvidenceSource, 'speech_metric'>
  sourceId: string
  familyId?: string
  occurredAt: string
  questionId?: string
  questionType?: InterviewCategory
  rubric?: AnswerQualityRubric
  legacyKeys?: string[]
  fillerCount?: number
  longPauseCount?: number
}

const dimensionKey: Partial<Record<AnswerQualityDimension, AdaptiveWeaknessKey>> = {
  relevance: 'weak_relevance', specificity: 'weak_specificity', action: 'missing_action', result: 'missing_result', evidence: 'weak_evidence', structure: 'weak_structure', safetyJudgment: 'safety_priority_unclear', airlineFit: 'weak_airline_connection',
}
const labels: Record<AdaptiveWeaknessKey, { title: string; capability: CapabilityKey; action: string; basePriority: number }> = {
  safety_priority_unclear:{title:'안전 우선 판단',capability:'safety_and_role_judgment',action:'안전 판단 질문을 다시 연습해 보세요.',basePriority:100},
  weak_relevance:{title:'질문 관련성',capability:'interview_communication',action:'질문의 핵심에 먼저 답하는 연습을 해보세요.',basePriority:90},
  missing_action:{title:'본인 행동',capability:'interview_communication',action:'본인이 직접 한 행동을 동사 중심으로 연습해 보세요.',basePriority:80},
  missing_result:{title:'결과와 배움',capability:'interview_communication',action:'행동 뒤 실제 결과나 배운 점을 덧붙이는 연습을 해보세요.',basePriority:70},
  weak_evidence:{title:'답변 근거',capability:'interview_communication',action:'주장을 뒷받침하는 실제 경험 근거를 연결해 보세요.',basePriority:60},
  weak_structure:{title:'답변 구조',capability:'interview_communication',action:'결론과 근거가 구분되도록 답변 흐름을 연습해 보세요.',basePriority:50},
  filler:{title:'필러 표현',capability:'interview_communication',action:'짧은 문장으로 답하며 불필요한 필러를 줄여 보세요.',basePriority:45},
  long_pause:{title:'긴 쉼',capability:'interview_communication',action:'핵심 키워드를 먼저 정리한 뒤 다시 답해 보세요.',basePriority:45},
  weak_specificity:{title:'경험 구체성',capability:'interview_communication',action:'상황·대상·과정을 한 가지씩 구체화해 보세요.',basePriority:40},
  weak_airline_connection:{title:'항공사 연결',capability:'airline_and_role_understanding',action:'게시된 항공사 문맥과 경험을 연결해 보세요.',basePriority:30},
  generic_claim:{title:'일반적인 표현',capability:'interview_communication',action:'일반론 대신 실제 행동 근거를 연결해 보세요.',basePriority:55},
  missing_competency:{title:'역량 근거',capability:'interview_communication',action:'질문 역량을 보여주는 실제 사례를 보완해 보세요.',basePriority:55},
  unclear_motivation:{title:'지원 동기',capability:'airline_and_role_understanding',action:'지원 이유와 자신의 경험을 연결해 보세요.',basePriority:55},
  conflict_resolution_missing:{title:'갈등 해결 과정',capability:'customer_situation_handling',action:'갈등을 파악하고 조율한 과정을 설명해 보세요.',basePriority:65},
  answer_too_short:{title:'답변 내용',capability:'interview_communication',action:'핵심 근거를 한 문장 더 보완해 보세요.',basePriority:40},
  answer_too_vague:{title:'답변 명확성',capability:'interview_communication',action:'결론과 실제 사례를 더 명확히 연결해 보세요.',basePriority:50},
}

const mappedKey = (finding: AnswerQualityFinding) => dimensionKey[finding.dimension]
const isNegative = (finding: AnswerQualityFinding) => finding.status === 'needs_improvement' || finding.status === 'insufficient_evidence'
const isPositive = (finding: AnswerQualityFinding) => finding.status === 'strong' || finding.status === 'adequate'

export function rubricFindingToWeaknessEvidence(finding: AnswerQualityFinding, input: Omit<AdaptiveEvidenceInput, 'rubric' | 'legacyKeys' | 'fillerCount' | 'longPauseCount'>): WeaknessEvidence | null {
  const key=mappedKey(finding)
  if(!key||finding.status==='not_applicable'||(!isNegative(finding)&&!isPositive(finding)))return null
  return{key,dimension:finding.dimension,sourceType:input.sourceType,sourceId:input.sourceId,familyId:input.familyId??input.sourceId,occurredAt:input.occurredAt,questionId:input.questionId,questionType:input.questionType,signal:isNegative(finding)?'needs_improvement':'improved',severity:finding.dimension==='safetyJudgment'?'high':finding.status==='insufficient_evidence'?'medium':'low',provenance:'rubric',summary:finding.feedback}
}

const normalizeLegacyKey=(key:string):AdaptiveWeaknessKey|null=>/safety|안전|보고/i.test(key)?'safety_priority_unclear':/action|행동/i.test(key)?'missing_action':/result|결과|배움/i.test(key)?'missing_result':/evidence|근거/i.test(key)?'weak_evidence':/structure|구조|star|prep/i.test(key)?'weak_structure':/airline|항공사|role|직무/i.test(key)?'weak_airline_connection':/specific|구체/i.test(key)?'weak_specificity':null

export function buildWeaknessEvidence(inputs:AdaptiveEvidenceInput[]):WeaknessEvidence[]{const rows:WeaknessEvidence[]=[];for(const input of inputs){for(const finding of input.rubric?.findings??[]){const evidence=rubricFindingToWeaknessEvidence(finding,input);if(evidence)rows.push(evidence)}if(!input.rubric?.evaluated){for(const legacy of input.legacyKeys??[]){const key=normalizeLegacyKey(legacy);if(key)rows.push({key,sourceType:input.sourceType,sourceId:input.sourceId,familyId:input.familyId??input.sourceId,occurredAt:input.occurredAt,questionId:input.questionId,questionType:input.questionType,signal:'needs_improvement',severity:key==='safety_priority_unclear'?'high':'low',provenance:'legacy',summary:'기존 기록에서 동일한 보완 항목이 확인되었습니다.'})}}if((input.fillerCount??0)>=3)rows.push({key:'filler',sourceType:'speech_metric',sourceId:input.sourceId,familyId:input.familyId??input.sourceId,occurredAt:input.occurredAt,questionId:input.questionId,questionType:input.questionType,signal:'needs_improvement',severity:'low',provenance:'speech_metric',summary:`최근 답변에서 필러 표현이 ${input.fillerCount}회 확인되었습니다.`});if((input.longPauseCount??0)>=2)rows.push({key:'long_pause',sourceType:'speech_metric',sourceId:input.sourceId,familyId:input.familyId??input.sourceId,occurredAt:input.occurredAt,questionId:input.questionId,questionType:input.questionType,signal:'needs_improvement',severity:'low',provenance:'speech_metric',summary:`최근 답변에서 긴 쉼이 ${input.longPauseCount}회 확인되었습니다.`})}return rows.sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt))}

const ageDays=(iso:string,now:Date)=>Math.max(0,(now.getTime()-new Date(iso).getTime())/86400000)
const recencyBonus=(iso:string,now:Date)=>ageDays(iso,now)<=7?15:ageDays(iso,now)<=30?5:0

export function deriveAdaptiveWeaknesses(evidence:WeaknessEvidence[],now=new Date()):AdaptiveWeakness[]{const grouped=Object.groupBy(evidence,item=>item.key);return Object.entries(grouped).flatMap(([raw,items])=>{const key=raw as AdaptiveWeaknessKey,all=[...(items??[])].sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)),negatives=all.filter(item=>item.signal==='needs_improvement'),negativeFamilies=new Map<string,WeaknessEvidence>();negatives.forEach(item=>negativeFamilies.set(item.familyId,item));const clustered=[...negativeFamilies.values()],latestNegative=clustered.at(-1);if(!latestNegative)return[];const positivesAfter=all.filter(item=>item.signal==='improved'&&item.occurredAt>latestNegative.occurredAt),last=all.at(-1)!,count=clustered.length;const state:WeaknessState=last.signal==='improved'?(positivesAfter.length>=2?'resolved':'improving'):count>=3?'persistent':count>=2?'emerging':'observed';const trend:WeaknessTrend=state==='resolved'?'resolved':state==='improving'?'improving':last.signal==='needs_improvement'&&all.some(item=>item.signal==='improved')?'worsening':'stable';const confidence:WeaknessConfidence=count>=3&&ageDays(latestNegative.occurredAt,now)<=30?'high':count>=2?'medium':'low';const meta=labels[key],priority=Math.max(0,meta.basePriority+recencyBonus(latestNegative.occurredAt,now)+(state==='persistent'?15:state==='emerging'?7:0)-(state==='improving'?25:state==='resolved'?100:0));const explanation=state==='improving'?`최근 ${count}개 연습 묶음에서 관찰됐지만 재연습에서는 개선되고 있습니다.`:state==='resolved'?`과거 기록은 유지되며 최근 ${positivesAfter.length}개 답변에서 개선이 확인됐습니다.`:`최근 ${count}개 서로 다른 연습 묶음에서 ${meta.title} 보완 신호가 확인됐습니다.`;return[{key,title:meta.title,relatedCapability:meta.capability,state,trend,confidence,occurrenceCount:count,distinctSourceCount:new Set(clustered.map(item=>item.sourceId)).size,latestObservedAt:latestNegative.occurredAt,priority,evidence:all.slice(-5).reverse(),explanation,recommendedAction:meta.action}] }).sort((a,b)=>b.priority-a.priority||b.latestObservedAt.localeCompare(a.latestObservedAt))}

function attemptFamily(attempt:InterviewAttempt,all:InterviewAttempt[]):string{const seen=new Set<string>();let current=attempt;while((current.previousAttemptId||current.parentAttemptId)&&!seen.has(current.id)){seen.add(current.id);const parentId=current.previousAttemptId??current.parentAttemptId;const parent=all.find(item=>item.id===parentId);if(!parent)break;current=parent}return current.id}

export function collectAdaptiveEvidenceInputs():AdaptiveEvidenceInput[]{const inputs:AdaptiveEvidenceInput[]=[];const attempts=loadInterviewAttempts().filter(item=>item.completed);attempts.forEach(attempt=>inputs.push({sourceType:'interview_attempt',sourceId:attempt.id,familyId:attemptFamily(attempt,attempts),occurredAt:attempt.createdAt,questionId:attempt.questionId,questionType:attempt.category,rubric:attempt.contentAnalysis?.rubric,legacyKeys:attempt.analysis?.evaluationScores?.filter(item=>item.status==='needs_improvement').map(item=>item.key)??[],fillerCount:attempt.speechMetrics?.fillers.totalCount,longPauseCount:attempt.audioMetrics?.pauses.longCount}));loadSelfIntroductionAttempts().filter(item=>item.completed).forEach(item=>inputs.push({sourceType:'self_introduction',sourceId:item.id,familyId:item.previousAttemptId??item.id,occurredAt:item.createdAt,rubric:item.analysis.challenge?.rubric,legacyKeys:item.analysis.metrics.roleConnection==='needs_improvement'?['role_connection']:[],fillerCount:item.speechMetrics?.fillers.totalCount,longPauseCount:item.audioMetrics?.pauses.longCount}));listApplicationAnswers().forEach(answer=>{const version=listAnswerVersions(answer.id).find(item=>item.id===answer.currentVersionId);if(version?.analysis)inputs.push({sourceType:'application_answer',sourceId:version.id,familyId:answer.id,occurredAt:version.createdAt,rubric:version.analysis.rubric,legacyKeys:version.analysis.evaluations.filter(item=>item.status==='needs_improvement').map(item=>item.key)})});return inputs}

export function detectAdaptiveWeaknesses(now=new Date()){return deriveAdaptiveWeaknesses(buildWeaknessEvidence(collectAdaptiveEvidenceInputs()),now)}

const categoryForWeakness=(key:AdaptiveWeaknessKey):InterviewCategory=>key==='safety_priority_unclear'?'safety_and_role_judgment':key==='weak_airline_connection'||key==='unclear_motivation'?'introduction_and_motivation':key==='conflict_resolution_missing'?'customer_situation':'behavioral_experience'
const queueReasonFor=(key:AdaptiveWeaknessKey):PracticeQueueReason=>key==='safety_priority_unclear'?'safety':key==='missing_action'?'missing_action':key==='missing_result'?'missing_result':key==='weak_evidence'||key==='weak_structure'?'weak_evidence':key==='weak_specificity'||key==='generic_claim'?'generic_answer':key==='filler'?'filler':key==='long_pause'?'long_pause':'retake_requested'

export function recommendQuestionForWeakness(weakness:AdaptiveWeakness,options?:{questions?:InterviewQuestion[];recentQuestionIds?:string[];openQuestionIds?:string[]}):{question:InterviewQuestion;reason:PracticeQueueReason;explanation:string}|null{const questions=options?.questions??interviewQuestions,recent=new Set(options?.recentQuestionIds??[]),open=new Set(options?.openQuestionIds??[]),category=categoryForWeakness(weakness.key),eligible=questions.filter(item=>item.category===category),fresh=eligible.find(item=>!recent.has(item.id)&&!open.has(item.id))??eligible.find(item=>!open.has(item.id))??eligible[0];return fresh?{question:fresh,reason:queueReasonFor(weakness.key),explanation:weakness.explanation}:null}

export function getAdaptivePracticeRecommendation(now=new Date()){const weakness=detectAdaptiveWeaknesses(now).find(item=>item.state!=='resolved');if(!weakness)return null;const attempts=loadInterviewAttempts().filter(item=>item.completed).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),open=interviewPracticeQueueRepository.listOpen(),recommendation=recommendQuestionForWeakness(weakness,{recentQuestionIds:attempts.slice(0,5).map(item=>item.questionId),openQuestionIds:open.map(item=>item.questionId)});return recommendation?{weakness,...recommendation}:null}

export function adaptiveWeaknessesAsRepeated(items=detectAdaptiveWeaknesses()):RepeatedWeakness[]{return items.filter(item=>item.state!=='resolved').slice(0,3).map(item=>({key:item.key,title:item.title,relatedCapability:item.relatedCapability,occurrenceCount:item.occurrenceCount,sourceTypes:[...new Set(item.evidence.map(value=>value.sourceType))],latestObservedAt:item.latestObservedAt,severity:item.priority>=100?'high':item.priority>=70?'medium':'low',evidence:item.evidence.filter(value=>value.signal==='needs_improvement').slice(0,3).map(value=>({sourceEntityType:value.sourceType,sourceEntityId:value.sourceId,summary:item.explanation})),recommendedAction:item.recommendedAction,adaptivePriority:item.priority}))}

export function mergeAdaptiveTrainingPriorities(fallback:TrainingPriority[],weaknesses=detectAdaptiveWeaknesses()):TrainingPriority[]{const adaptive=weaknesses.filter(item=>item.state!=='resolved').map(item=>({key:`adaptive-${item.key}`,title:item.title,relatedCapability:item.relatedCapability,source:'performance' as const,reason:item.explanation,priorityScore:item.priority}));const merged=[...adaptive,...fallback].sort((a,b)=>b.priorityScore-a.priorityScore),seen=new Set<string>();return merged.filter(item=>{const identity=item.key.startsWith('adaptive-')?item.key:item.relatedCapability;if(seen.has(identity))return false;seen.add(identity);return true}).slice(0,3)}
