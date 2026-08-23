import { interviewQuestions, type CapabilityKey, type InterviewAttempt, type InterviewCategory, type InterviewQuestion } from '@/lib/interview-practice-data'
import type { InterviewSession } from '@/lib/mock-interview-session'

export type HomeInterviewTopic='result'|'action'|'safety'|'customer_service'|'teamwork'|'filler'|'long_pause'|'motivation'|'english'
export type HomeInterviewRecommendation={mode:'ai_interviewer';count:5;airlineId?:string;topic:HomeInterviewTopic;title:string;reason:string;focus:string[]}
export type HomeInterviewGrowth={label:string;before:string;after:string}
export type AirlineContextGate={contextAvailable:boolean;verified:boolean;reviewStatus?:string;publishStatus?:string;aiContextEnabled:boolean}
export type HomeInterviewHistory={sessions:InterviewSession[];attempts:InterviewAttempt[];available:boolean}
export type HomeDrillCriteria={preferredCategories:InterviewCategory[];preferredCapabilities:CapabilityKey[]}
export type HomeDrillPlan={reason:HomeInterviewTopic;criteria:HomeDrillCriteria;selectedQuestionIds:string[]}

const topicCopy:Record<HomeInterviewTopic,{title:string;reason:string;focus:string[]}>= {
  result:{title:'STAR Result 강화',reason:'최근 답변에서 결과 설명을 조금 더 보완하면 좋아요.',focus:['결과 표현','팀워크','안전']},
  action:{title:'Action 구체화',reason:'최근 답변에서 내가 한 행동을 더 선명하게 말해보세요.',focus:['행동 구체화','고객서비스','팀워크']},
  safety:{title:'안전 판단 연습',reason:'안전 판단과 절차 준수 근거를 차분히 연결해보세요.',focus:['안전','판단 근거','절차 준수']},
  customer_service:{title:'고객서비스 연습',reason:'고객 상황에서 행동과 회복 과정을 구체화해보세요.',focus:['고객서비스','문제 해결','결과']},
  teamwork:{title:'팀워크 연습',reason:'협업 상황에서 내 역할과 기여를 선명하게 말해보세요.',focus:['팀워크','역할','결과']},
  filler:{title:'간결하게 말하기',reason:'최근 답변의 불필요한 추임새를 줄이는 연습을 추천해요.',focus:['유창성','핵심 전달','호흡']},
  long_pause:{title:'답변 흐름 연습',reason:'긴 쉼을 줄이고 핵심 순서대로 이어 말해보세요.',focus:['답변 흐름','호흡','구조']},
  motivation:{title:'지원동기 연습',reason:'지원 이유를 경험과 직무 가치에 연결해보세요.',focus:['지원동기','경험 연결','직무 이해']},
  english:{title:'영어 답변 연습',reason:'짧고 명확한 영어 답변 흐름을 연습해보세요.',focus:['영어','명료도','핵심 전달']},
}

function attemptTopic(attempt:InterviewAttempt):HomeInterviewTopic|undefined{
  const missing=attempt.contentAnalysis?.structure.missingParts??[]
  if(missing.includes('Result'))return'result'
  if(missing.includes('Action'))return'action'
  const competencies=(attempt.contentAnalysis?.competencies??[]).filter(item=>item.strength!=='strong').map(item=>item.competency.toLowerCase()).join(' ')
  if(competencies.includes('safety'))return'safety'
  if(competencies.includes('customer')||attempt.category==='customer_situation')return'customer_service'
  if(competencies.includes('team'))return'teamwork'
  if((attempt.speechMetrics?.fillers?.totalCount??0)>=3)return'filler'
  if((attempt.audioMetrics?.pauses?.longCount??0)>=2)return'long_pause'
  if(attempt.category==='introduction_and_motivation')return'motivation'
}

export function findRepeatedInterviewWeakness(attempts:InterviewAttempt[]):HomeInterviewTopic|undefined{
  const counts=new Map<HomeInterviewTopic,number>()
  attempts.filter(item=>item.completed).slice(0,12).forEach(item=>{const topic=attemptTopic(item);if(topic)counts.set(topic,(counts.get(topic)??0)+1)})
  return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]
}

export function buildHomeInterviewRecommendation(input:{attempts:InterviewAttempt[];targetAirlineId?:string;hasPublishedAirlineContext:boolean}):HomeInterviewRecommendation{
  const topic=findRepeatedInterviewWeakness(input.attempts)??'customer_service'
  const copy=topicCopy[topic]
  return{mode:'ai_interviewer',count:5,airlineId:input.hasPublishedAirlineContext?input.targetAirlineId:undefined,topic,title:copy.title,reason:copy.reason,focus:copy.focus}
}

export function canUseAirlineContext(gate:AirlineContextGate){return gate.contextAvailable&&gate.verified&&['approved','verified'].includes(gate.reviewStatus??'')&&gate.publishStatus==='published'&&gate.aiContextEnabled}

export function loadHomeInterviewHistory(input:{loadSessions:()=>InterviewSession[];loadAttempts:()=>InterviewAttempt[]}):HomeInterviewHistory{
  try{return{sessions:input.loadSessions(),attempts:input.loadAttempts(),available:true}}catch{return{sessions:[],attempts:[],available:false}}
}

export function mapWeaknessToDrillCriteria(reason:HomeInterviewTopic|'unknown'):HomeDrillCriteria{
  if(reason==='result'||reason==='action'||reason==='teamwork')return{preferredCategories:['behavioral_experience'],preferredCapabilities:['interview_communication']}
  if(reason==='safety')return{preferredCategories:['safety_and_role_judgment'],preferredCapabilities:['safety_and_role_judgment']}
  if(reason==='customer_service')return{preferredCategories:['customer_situation'],preferredCapabilities:['customer_situation_handling']}
  if(reason==='motivation')return{preferredCategories:['introduction_and_motivation'],preferredCapabilities:['application_readiness','airline_and_role_understanding']}
  if(reason==='english')return{preferredCategories:[],preferredCapabilities:['recruitment_language']}
  return{preferredCategories:[],preferredCapabilities:[]}
}

export function buildHomeDrillPlan(reason:HomeInterviewTopic|'unknown',pool:InterviewQuestion[]=interviewQuestions,count=3):HomeDrillPlan{
  const criteria=mapWeaknessToDrillCriteria(reason),selected:InterviewQuestion[]=[]
  const append=(rows:InterviewQuestion[])=>rows.forEach(question=>{if(selected.length<count&&!selected.some(item=>item.id===question.id))selected.push(question)})
  append(pool.filter(question=>criteria.preferredCategories.includes(question.category)))
  append(pool.filter(question=>question.targetCapabilities.some(capability=>criteria.preferredCapabilities.includes(capability))))
  append(pool.filter(question=>!question.airlineTags?.length))
  append(pool)
  return{reason:reason==='unknown'?'customer_service':reason,criteria,selectedQuestionIds:selected.slice(0,count).map(question=>question.id)}
}

export function findResumableSession(sessions:InterviewSession[]){return sessions.filter(item=>item.status==='in_progress').sort((a,b)=>b.startedAt.localeCompare(a.startedAt))[0]}

function sessionMetrics(session:InterviewSession,attempts:InterviewAttempt[]){
  const rows=attempts.filter(item=>session.attemptIds.includes(item.id)&&!item.isFollowUp)
  return{fillers:rows.reduce((sum,item)=>sum+(item.speechMetrics?.fillers?.totalCount??0),0),pauses:rows.reduce((sum,item)=>sum+(item.audioMetrics?.pauses?.longCount??0),0),missingResult:rows.filter(item=>item.contentAnalysis?.structure.missingParts.includes('Result')).length}
}

export function buildRecentInterviewGrowth(sessions:InterviewSession[],attempts:InterviewAttempt[]):HomeInterviewGrowth[]{
  const completed=sessions.filter(item=>item.status==='completed').sort((a,b)=>(b.completedAt??b.startedAt).localeCompare(a.completedAt??a.startedAt)).slice(0,2)
  if(completed.length<2)return[]
  const current=sessionMetrics(completed[0],attempts),previous=sessionMetrics(completed[1],attempts)
  return[
    {label:'긴 쉼',before:`${previous.pauses}회`,after:`${current.pauses}회`},
    {label:'Filler',before:`${previous.fillers}회`,after:`${current.fillers}회`},
    {label:'Result 표현',before:previous.missingResult?'보완 필요':'안정',after:current.missingResult?'보완 필요':'좋아짐'},
  ]
}

export function buildWeeklyInterviewActivity(sessions:InterviewSession[],attempts:InterviewAttempt[],now=new Date()){
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7))
  const inWeek=(value:string)=>new Date(value)>=start&&new Date(value)<=now
  const weeklySessions=sessions.filter(item=>item.status==='completed'&&inWeek(item.completedAt??item.startedAt))
  const sessionAttemptIds=new Set(weeklySessions.flatMap(item=>item.attemptIds))
  const weeklyAttempts=attempts.filter(item=>item.completed&&inWeek(item.createdAt)&&sessionAttemptIds.has(item.id))
  return{sessions:weeklySessions.length,answers:weeklyAttempts.filter(item=>!item.isFollowUp).length,retakes:weeklyAttempts.filter(item=>Boolean(item.previousAttemptId)).length}
}
