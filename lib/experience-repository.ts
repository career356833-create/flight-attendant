import { interviewQuestions, type InterviewQuestion } from '@/lib/interview-practice-data'

export type ExperienceCategory='customer_service'|'problem_solving'|'teamwork'|'conflict_resolution'|'safety_judgment'|'responsibility'|'failure_and_growth'|'adaptability'|'leadership'|'multicultural'|'other'
export type ExperienceCompetency='customer_orientation'|'communication'|'teamwork'|'problem_solving'|'conflict_management'|'safety_awareness'|'responsibility'|'adaptability'|'leadership'|'empathy'|'service_recovery'|'cross_cultural_communication'
export type ExperienceStatus='draft'|'basic_complete'|'structured'|'interview_ready'
export type CareerExperience={id:string;title:string;category:ExperienceCategory;organization?:string;role?:string;period?:string;situation:string;task:string;action:string;result:string;learning:string;roleConnection:string;shortSummary:string;competencyTags:ExperienceCompetency[];questionTags:string[];status:ExperienceStatus;createdAt:string;updatedAt:string;usageCount:number;lastUsedAt?:string;source:'manual'|'interview_answer'|'self_introduction'|'imported';originalTranscript?:string;sourceExperienceId?:string}
export type ExperienceStore={schemaVersion:number;experiences:CareerExperience[];updatedAt:string}
export const EXPERIENCE_STORAGE_KEY='cabin-career-experiences';const KEY=EXPERIENCE_STORAGE_KEY;const PROGRESS_KEY='cabin-experience-progress-v1';const VERSION=1
export type ExperienceLocalMutation={operation:'create'|'update'|'delete';entityId:string;value?:CareerExperience}
function emitMutation(detail:ExperienceLocalMutation){if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<ExperienceLocalMutation>('cabin:experience-mutation',{detail}))}
const categories:ExperienceCategory[]=['customer_service','problem_solving','teamwork','conflict_resolution','safety_judgment','responsibility','failure_and_growth','adaptability','leadership','multicultural','other']
const valid=(v:unknown):v is CareerExperience=>{if(!v||typeof v!=='object')return false;const x=v as Partial<CareerExperience>;return typeof x.id==='string'&&typeof x.title==='string'&&categories.includes(x.category as ExperienceCategory)&&typeof x.situation==='string'&&typeof x.action==='string'}
export const experienceRepository={
  load():ExperienceStore{if(typeof window==='undefined')return{schemaVersion:VERSION,experiences:[],updatedAt:new Date(0).toISOString()};try{const raw=JSON.parse(localStorage.getItem(KEY)??'{}');const experiences=Array.isArray(raw.experiences)?raw.experiences.filter(valid).slice(0,100):[];return{schemaVersion:VERSION,experiences,updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:new Date().toISOString()}}catch{return{schemaVersion:VERSION,experiences:[],updatedAt:new Date().toISOString()}}},
  save(experiences:CareerExperience[]){const store={schemaVersion:VERSION,experiences:experiences.filter(valid).slice(0,100),updatedAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify(store));return store},
  upsert(experience:CareerExperience){const store=this.load(),exists=store.experiences.some(x=>x.id===experience.id),saved=this.save([experience,...store.experiences.filter(x=>x.id!==experience.id)]);emitMutation({operation:exists?'update':'create',entityId:experience.id,value:experience});return saved},
  remove(id:string){const store=this.load(),saved=this.save(store.experiences.filter(x=>x.id!==id));emitMutation({operation:'delete',entityId:id});return saved},
  duplicate(id:string){const original=this.load().experiences.find(x=>x.id===id);if(!original)return null;const now=new Date().toISOString();const copy={...original,id:crypto.randomUUID(),title:`${original.title} 복사본`,createdAt:now,updatedAt:now,usageCount:0,lastUsedAt:undefined,sourceExperienceId:original.id};this.upsert(copy);return copy},
  markUsed(id:string){const item=this.load().experiences.find(x=>x.id===id);if(!item)return;this.upsert({...item,usageCount:item.usageCount+1,lastUsedAt:new Date().toISOString()})}
}
export const emptyExperience=(category:ExperienceCategory='customer_service'):CareerExperience=>{const now=new Date().toISOString();return{id:typeof crypto!=='undefined'?crypto.randomUUID():`experience-${Date.now()}`,title:'',category,situation:'',task:'',action:'',result:'',learning:'',roleConnection:'',shortSummary:'',competencyTags:[],questionTags:[],status:'draft',createdAt:now,updatedAt:now,usageCount:0,source:'manual'}}
export function assessExperience(e:CareerExperience){const checks={situation:e.situation.trim().length>=15,role:(e.task||e.role||'').trim().length>=8,action:e.action.trim().length>=15,result:e.result.trim().length>=8,learning:e.learning.trim().length>=8,roleConnection:(e.roleConnection||'').trim().length>=8};const count=Object.values(checks).filter(Boolean).length;const status:ExperienceStatus=!checks.situation||!checks.action?'draft':count<4?'basic_complete':count<6?'structured':'interview_ready';return{checks,score:Math.round(count/6*100),status}}
export function recommendCompetencies(e:CareerExperience):ExperienceCompetency[]{const text=[e.title,e.category,e.situation,e.task,e.action,e.result,e.learning].join(' ');const rules:[RegExp,ExperienceCompetency[]][]=[[/고객|불만|서비스|사과|공감/,['customer_orientation','empathy','service_recovery','communication']],[/팀|협업|갈등|의견/,['teamwork','conflict_management','communication']],[/안전|위험|절차|보고/,['safety_awareness','responsibility','problem_solving']],[/문제|해결|개선/,['problem_solving','responsibility']],[/적응|새로운|다문화|외국/,['adaptability','cross_cultural_communication']],[/리더|주도/,['leadership','communication']]];return Array.from(new Set(rules.filter(([r])=>r.test(text)).flatMap(([,tags])=>tags))).slice(0,5)}
const categoryQuestionPrefixes:Record<ExperienceCategory,string[]>={customer_service:['be1','be6','cs6'],problem_solving:['be3','be6'],teamwork:['be2','be4'],conflict_resolution:['be2','cs2'],safety_judgment:['sj1','sj2','sj3'],responsibility:['be4','sj6'],failure_and_growth:['be3'],adaptability:['be5'],leadership:['be4','be6'],multicultural:['cs5','be5'],other:['im1','be6']}
export function recommendQuestions(e:CareerExperience):InterviewQuestion[]{const ids=[...categoryQuestionPrefixes[e.category],...e.questionTags];return Array.from(new Set(ids)).map(id=>interviewQuestions.find(q=>q.id===id)).filter((q):q is InterviewQuestion=>!!q).slice(0,3)}
export function experienceMatchScore(e:CareerExperience,q:InterviewQuestion){let score=categoryQuestionPrefixes[e.category].includes(q.id)?4:0;if(q.category==='behavioral_experience')score+=2;if(e.competencyTags.some(t=>q.targetCapabilities.some(c=>c.includes(t.split('_')[0]))))score+=2;return score}
export function recommendExperiences(q:InterviewQuestion,items=experienceRepository.load().experiences){return [...items].sort((a,b)=>experienceMatchScore(b,q)-experienceMatchScore(a,q)).filter(e=>experienceMatchScore(e,q)>0).slice(0,3)}
export function extractExperienceCandidate(transcript:string):CareerExperience{const e=emptyExperience('problem_solving');return{...e,title:'면접 답변에서 발견한 경험',situation:transcript.slice(0,Math.min(100,transcript.length)),action:transcript,result:'',shortSummary:transcript.slice(0,80),source:'interview_answer',originalTranscript:transcript,status:'basic_complete',competencyTags:recommendCompetencies({...e,title:'',situation:transcript,action:transcript} as CareerExperience)}}
export function recordExperienceProgress(e:CareerExperience){
  if(typeof window==='undefined')return
  try{
    const p=JSON.parse(localStorage.getItem(PROGRESS_KEY)??'{"experienceGains":{},"dailyGains":{},"capabilityGains":{}}')
    if(!p.experienceGains?.[e.id]){
      const day=new Date().toISOString().slice(0,10),used=Number(p.dailyGains?.[day]??0)
      let gains:string[]=[]
      if(e.status!=='draft')gains.push('application_readiness')
      if(['structured','interview_ready'].includes(e.status))gains.push('interview_communication')
      if(e.category==='safety_judgment'&&e.status==='interview_ready')gains.push('safety_and_role_judgment')
      if(e.category==='customer_service'&&e.status==='interview_ready')gains.push('customer_situation_handling')
      gains=gains.slice(0,Math.max(0,3-used));p.experienceGains={...p.experienceGains,[e.id]:gains};p.dailyGains={...p.dailyGains,[day]:used+gains.length};p.capabilityGains=p.capabilityGains??{};gains.forEach(k=>p.capabilityGains[k]=Number(p.capabilityGains[k]??0)+1);localStorage.setItem(PROGRESS_KEY,JSON.stringify(p))
    }
    window.dispatchEvent(new CustomEvent('cabin:experience-saved',{detail:{experienceId:e.id}}))
  }catch{localStorage.removeItem(PROGRESS_KEY)}
}
