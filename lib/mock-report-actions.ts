import type { AnswerQualityDimension } from './answer-quality-rubric'
import type { InterviewAttempt, InterviewQuestion } from './interview-practice-data'
import type { InterviewPracticeQueueItem, InterviewQuestionFavorite } from './interview-practice-queue'
import type { InterviewSession } from './mock-interview-session'

export type MockReportActionKind='PRACTICE_WEAK_ANSWER'|'RETAKE_QUESTION'|'PRACTICE_QUEUE_ITEM'|'REVIEW_FAVORITE'
export type MockReportAction={id:string;kind:MockReportActionKind;questionId:string;questionTitle:string;reason:string;priority:number;mockSessionId:string;sourceAttemptId?:string;queueItemId?:string;airlineId?:string}

const dimensionPriority:Partial<Record<AnswerQualityDimension,number>>={safetyJudgment:1,relevance:2,evidence:3,specificity:4,action:5,result:6,structure:7,airlineFit:8}
const reasonFor=(dimension:AnswerQualityDimension)=>({safetyJudgment:'안전 우선순위가 불분명했어요.',relevance:'질문의 핵심과 연결을 보완해 보세요.',evidence:'답변 근거가 부족했어요.',specificity:'경험을 더 구체적으로 설명해 보세요.',action:'본인이 한 행동을 더 분명히 말해 보세요.',result:'결과나 배운 점을 보완해 보세요.',structure:'답변 흐름을 다시 정리해 보세요.',airlineFit:'항공사와의 연결 근거를 보완해 보세요.'}[dimension])
const negative=(status:string)=>status==='needs_improvement'||status==='insufficient_evidence'

export function resolveMockReportActions(input:{session:InterviewSession;attempts:InterviewAttempt[];questions:InterviewQuestion[];queue?:InterviewPracticeQueueItem[];favorites?:InterviewQuestionFavorite[]}):MockReportAction[]{
  const questions=new Map(input.questions.map(question=>[question.id,question])),sessionQuestionIds=new Set(input.session.questionIds),rows=input.attempts.filter(attempt=>input.session.attemptIds.includes(attempt.id)&&!attempt.isFollowUp&&sessionQuestionIds.has(attempt.questionId)),completedIds=new Set(rows.filter(row=>row.completed).map(row=>row.questionId)),actions:MockReportAction[]=[]
  const add=(action:MockReportAction)=>{if(questions.has(action.questionId)&&!actions.some(item=>item.questionId===action.questionId))actions.push(action)}
  for(const attempt of rows){
    const question=questions.get(attempt.questionId),findings=attempt.contentAnalysis?.rubric?.evaluated?attempt.contentAnalysis.rubric.findings.filter(item=>negative(item.status)&&dimensionPriority[item.dimension]!==undefined).sort((a,b)=>(dimensionPriority[a.dimension]??99)-(dimensionPriority[b.dimension]??99)):[]
    const finding=findings[0]
    if(question&&finding)add({id:`weak:${attempt.id}`,kind:'PRACTICE_WEAK_ANSWER',questionId:question.id,questionTitle:question.shortTitle,reason:reasonFor(finding.dimension),priority:dimensionPriority[finding.dimension]??9,mockSessionId:input.session.id,sourceAttemptId:attempt.id,airlineId:input.session.airlineId})
  }
  for(const questionId of input.session.questionIds){const question=questions.get(questionId);if(question&&!completedIds.has(questionId))add({id:`incomplete:${questionId}`,kind:'RETAKE_QUESTION',questionId,questionTitle:question.shortTitle,reason:'이 질문의 완료된 답변이 없어요.',priority:10,mockSessionId:input.session.id,airlineId:input.session.airlineId})}
  const legacyIds=new Set(rows.filter(row=>!row.contentAnalysis?.rubric?.evaluated).map(row=>row.questionId))
  for(const item of input.queue??[]){const question=questions.get(item.questionId);if(item.status==='open'&&question&&sessionQuestionIds.has(item.questionId)&&legacyIds.has(item.questionId))add({id:`queue:${item.id}`,kind:'PRACTICE_QUEUE_ITEM',questionId:item.questionId,questionTitle:question.shortTitle,reason:'이미 재연습 큐에 있는 질문이에요.',priority:20,mockSessionId:input.session.id,sourceAttemptId:item.sourceAttemptId,queueItemId:item.id,airlineId:item.airlineId??input.session.airlineId})}
  for(const item of input.favorites??[]){const question=questions.get(item.questionId);if(question&&sessionQuestionIds.has(item.questionId)&&legacyIds.has(item.questionId))add({id:`favorite:${item.questionId}`,kind:'REVIEW_FAVORITE',questionId:item.questionId,questionTitle:question.shortTitle,reason:'즐겨찾기한 질문을 다시 확인해 보세요.',priority:30,mockSessionId:input.session.id,airlineId:item.airlineId??input.session.airlineId})}
  return actions.sort((a,b)=>a.priority-b.priority||input.session.questionIds.indexOf(a.questionId)-input.session.questionIds.indexOf(b.questionId)||a.id.localeCompare(b.id)).slice(0,3)
}
