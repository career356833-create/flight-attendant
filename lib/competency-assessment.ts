import type { SelfIntroductionAttempt } from "@/lib/self-introduction-data";
import { safeLocalStorageWrite } from "@/lib/safe-local-storage";

export const COMPETENCY_ASSESSMENT_VERSION = "cabin-competency-v1" as const;
export const COMPETENCY_PROTOTYPE_WEIGHTS = { sjt: 40, video: 25, priority_task: 20, self_report: 15 } as const;

export type CompetencyKey = "SAFETY_JUDGMENT" | "SERVICE_ORIENTATION" | "COMMUNICATION" | "TEAMWORK_CRM" | "SITUATIONAL_RESPONSE" | "CROSS_CULTURAL" | "SELF_REGULATION" | "PROBLEM_SOLVING";
export type CompetencyModule = "self_report" | "sjt" | "priority_task" | "video";
export type CompetencyEvidenceSource = "self_report" | "sjt" | "priority_task" | "speech_understanding" | "vision_metrics";
export type CompetencyBand = "LOW_EVIDENCE" | "DEVELOPING" | "STABLE" | "STRONG";
export type AssessmentLocale = "ko" | "en";

export const competencyLabels: Record<CompetencyKey, string> = {
  SAFETY_JUDGMENT: "안전 우선 판단", SERVICE_ORIENTATION: "고객 응대", COMMUNICATION: "의사소통", TEAMWORK_CRM: "팀 협업 · CRM",
  SITUATIONAL_RESPONSE: "상황 대응", CROSS_CULTURAL: "다문화 대응", SELF_REGULATION: "자기조절", PROBLEM_SOLVING: "문제 해결",
};
export const bandLabels: Record<CompetencyBand, string> = { LOW_EVIDENCE: "근거 더 필요", DEVELOPING: "연습 필요", STABLE: "안정적", STRONG: "강점" };
export const competencies = Object.keys(competencyLabels) as CompetencyKey[];

type BaseQuestion = { id: string; module: CompetencyModule; competencies: CompetencyKey[]; locale: AssessmentLocale; prompt: string; difficulty: "foundation" | "applied"; active: boolean };
export type SelfReportQuestion = BaseQuestion & { module: "self_report"; reverse?: boolean };
export type SjtOption = { id: string; label: string; score: 0 | 1 | 2 | 3; signals: string[]; rationale: string };
export type SjtQuestion = BaseQuestion & { module: "sjt"; options: SjtOption[] };
export type PriorityItem = { id: string; label: string; priority: number; reason: string };
export type PriorityQuestion = BaseQuestion & { module: "priority_task"; items: PriorityItem[] };
export type VideoQuestion = BaseQuestion & { module: "video"; recommendedSeconds: number };
export type CompetencyQuestion = SelfReportQuestion | SjtQuestion | PriorityQuestion | VideoQuestion;

const selfReportPrompts: Record<Exclude<CompetencyKey, "PROBLEM_SOLVING">, string[]> = {
  SAFETY_JUDGMENT: ["서비스가 지연되더라도 안전 확인을 먼저 한다.", "애매한 안전 상황은 혼자 단정하지 않고 즉시 공유한다.", "승객의 편의 요청이 안전 기준과 충돌하면 이유를 설명하고 안전을 우선한다."],
  SERVICE_ORIENTATION: ["불만의 표현보다 승객이 실제로 필요로 하는 것을 먼저 파악한다.", "해결이 늦어질 때도 현재 상황과 가능한 대안을 안내한다.", "동일한 서비스가 어려우면 현실적인 대안을 찾아 제안한다."],
  COMMUNICATION: ["긴급한 상황에서 핵심 행동을 짧고 분명하게 말한다.", "상대가 이해했는지 질문이나 확인으로 점검한다.", "불편한 내용도 존중하는 표현으로 명확히 전달한다."],
  TEAMWORK_CRM: ["업무가 겹치면 팀에 상황을 공유하고 역할을 조정한다.", "동료의 판단이 걱정될 때 근거를 들어 확인하고 필요한 지원을 요청한다.", "개인 해결보다 팀 전체의 상황 인식을 중요하게 본다."],
  SITUATIONAL_RESPONSE: ["예상치 못한 요청이 동시에 들어오면 우선순위를 정한 뒤 처리한다.", "초기 정보가 부족하면 즉시 가능한 조치와 추가 확인을 병행한다.", "상황이 바뀌면 처음 계획을 고집하지 않고 대응을 조정한다."],
  CROSS_CULTURAL: ["언어가 잘 통하지 않을 때 쉬운 표현과 시각적 안내를 함께 사용한다.", "익숙하지 않은 문화적 행동을 의도적으로 무례하다고 단정하지 않는다.", "상대의 배경을 추측하기보다 필요한 지원을 직접 확인한다."],
  SELF_REGULATION: ["압박을 느껴도 행동하기 전 핵심 위험과 우선순위를 확인한다.", "실수했을 때 숨기기보다 영향과 회복 조치를 먼저 공유한다.", "감정적인 승객에게 개인적으로 반응하지 않고 역할에 맞게 대응한다."],
};

export const selfReportQuestions: SelfReportQuestion[] = (Object.entries(selfReportPrompts) as [Exclude<CompetencyKey,"PROBLEM_SOLVING">, string[]][]).flatMap(([competency, prompts], ci) => prompts.map((prompt, index) => ({ id: `SR-${String(ci * 3 + index + 1).padStart(2,"0")}`, module: "self_report" as const, competencies: [competency], locale: "ko" as const, prompt, difficulty: "foundation" as const, active: true })));

const option = (id: string, label: string, score: 0|1|2|3, signals: string[], rationale: string): SjtOption => ({ id, label, score, signals, rationale });
const sjt = (id: string, competencies: CompetencyKey[], prompt: string, labels: [string,string,string,string]): SjtQuestion => {
  const ranked = [
    option("",labels[0],3,["SAFETY_FIRST","COMMUNICATION","ESCALATION","TEAM_COORDINATION"],"위험을 먼저 낮추고 이유를 설명하며 필요한 팀 지원을 연결합니다."),
    option("",labels[1],2,["CUSTOMER_CARE","COMMUNICATION"],"승객을 배려하지만 위험 확인이나 팀 공유가 더 분명할 수 있습니다."),
    option("",labels[2],1,["IMMEDIATE_RESPONSE"],"즉시 행동하지만 우선순위와 설명이 충분하지 않습니다."),
    option("",labels[3],0,["SERVICE_ONLY"],"편의 또는 회피를 앞세워 안전·절차·팀 대응 근거가 약합니다."),
  ];
  const shift = (Number(id.slice(-2)) - 1) % ranked.length;
  const rotated = [...ranked.slice(shift), ...ranked.slice(0, shift)].map((item,index)=>({...item,id:String.fromCharCode(65+index)}));
  return { id, module:"sjt", competencies, locale:"ko", prompt, difficulty:"applied", active:true, options:rotated };
};

export const sjtQuestions: SjtQuestion[] = [
  sjt("SJT-01",["SAFETY_JUDGMENT","COMMUNICATION"],"이륙 준비 중 승객이 안전벨트 착용을 거부하며 연결편 시간이 급하다고 항의합니다.",["안전 요구를 차분히 설명하고 착용을 확인하며 필요 시 책임 승무원에게 공유한다.","불편에 공감하고 착용을 다시 요청한다.","다른 승객부터 확인한 뒤 나중에 돌아온다.","연결편 사정을 고려해 이번에는 넘어간다."]),
  sjt("SJT-02",["SAFETY_JUDGMENT","SITUATIONAL_RESPONSE"],"서비스 중 객실에서 타는 냄새가 난다는 승객의 말을 들었습니다.",["서비스를 멈추고 위치·위험을 확인하며 즉시 팀에 공유한다.","승객에게 안심하라고 말한 뒤 주변을 살핀다.","냄새가 더 강해지는지 잠시 기다린다.","다른 승객이 말하지 않았으므로 서비스를 계속한다."]),
  sjt("SJT-03",["SERVICE_ORIENTATION","COMMUNICATION"],"특수식이 준비되지 않아 승객이 강하게 불만을 제기합니다.",["사과하고 가능한 대안을 확인해 설명하며 해결 범위를 팀과 공유한다.","충분히 공감하고 가능한 일반식을 권한다.","준비 부서의 실수라고 설명한다.","제공할 수 없다고 짧게 말하고 다음 업무로 간다."]),
  sjt("SJT-04",["SERVICE_ORIENTATION","SELF_REGULATION"],"서비스 지연으로 여러 승객이 동시에 호출합니다.",["안전·긴급도를 확인해 순서를 정하고 예상 대기와 대안을 안내한다.","가장 크게 항의하는 승객부터 응대한다.","가까운 좌석부터 빠르게 처리한다.","호출이 줄어들 때까지 잠시 기다린다."]),
  sjt("SJT-05",["COMMUNICATION","CROSS_CULTURAL"],"한국어와 영어가 익숙하지 않은 승객이 좌석 변경 절차를 이해하지 못합니다.",["쉬운 표현과 시각적 안내로 선택지를 설명하고 이해 여부를 확인한다.","같은 문장을 더 크게 반복한다.","주변 승객에게 통역을 맡긴다.","오해를 피하려고 요청을 거절한다."]),
  sjt("SJT-06",["COMMUNICATION","TEAMWORK_CRM"],"동료가 전달한 좌석 정보와 기내 시스템 정보가 다릅니다.",["승객에게 확정 전임을 알리고 동료와 정보를 교차 확인해 한 메시지로 안내한다.","내 화면이 맞다고 보고 바로 안내한다.","동료에게만 다시 확인해 달라고 요청한다.","혼란을 피하려고 답변을 미룬다."]),
  sjt("SJT-07",["TEAMWORK_CRM","SAFETY_JUDGMENT"],"동료가 안전 점검 한 구역을 빠뜨린 것처럼 보입니다.",["사실을 확인하고 즉시 동료와 책임 승무원에게 공유해 점검을 보완한다.","동료 체면을 위해 조용히 대신 점검한다.","비행 후 개인적으로 이야기한다.","내 담당 구역이 아니므로 관여하지 않는다."]),
  sjt("SJT-08",["TEAMWORK_CRM","SELF_REGULATION"],"업무 분담 중 동료와 우선순위 의견이 충돌합니다.",["현재 위험·시간 기준을 함께 확인하고 역할을 재분담하며 합의가 안 되면 상급자에게 조율을 요청한다.","내 판단을 길게 설득한다.","갈등을 피하려고 상대 의견을 따른다.","각자 원하는 방식으로 진행한다."]),
  sjt("SJT-09",["SITUATIONAL_RESPONSE","PROBLEM_SOLVING"],"착륙 직전 아동 승객이 심하게 불안해하며 보호자가 도움을 요청합니다.",["안전 절차를 유지하며 즉시 가능한 안정 안내를 하고 필요한 팀 지원을 요청한다.","보호자에게 달래 달라고 부탁한다.","장난감을 찾아주기 위해 자리에서 오래 머문다.","착륙 후 도와주겠다고 한다."]),
  sjt("SJT-10",["SITUATIONAL_RESPONSE","SAFETY_JUDGMENT"],"승객이 어지럼증을 호소하지만 괜찮다며 도움을 거절합니다.",["상태와 즉시 위험을 확인하고 승객에게 이유를 설명하며 팀에 공유해 관찰·지원한다.","물을 제공하고 쉬도록 한다.","본인이 괜찮다고 하므로 기록만 한다.","다른 승객에게 상태를 봐 달라고 한다."]),
  sjt("SJT-11",["CROSS_CULTURAL","SERVICE_ORIENTATION"],"승객의 문화적 요청이 현재 서비스 방식과 맞지 않습니다.",["요청의 핵심을 확인하고 가능한 범위와 대안을 존중하는 표현으로 설명한다.","규정상 안 된다고 동일하게 말한다.","특별 대우 논란을 피하려고 모두 거절한다.","근거 없이 가능하다고 약속한다."]),
  sjt("SJT-12",["CROSS_CULTURAL","COMMUNICATION"],"다른 문화권 승객의 큰 제스처를 주변 승객이 위협적으로 느낍니다.",["의도를 단정하지 않고 양쪽의 안전·불편을 확인해 차분히 소통하며 필요 시 팀과 좌석 대안을 검토한다.","큰 제스처를 즉시 중단하라고 경고한다.","주변 승객에게 문화 차이라고 참아 달라고 한다.","갈등이 커질 때까지 관찰만 한다."]),
  sjt("SJT-13",["SELF_REGULATION","TEAMWORK_CRM"],"본인의 안내 실수로 승객 이동이 지연되었습니다.",["실수를 즉시 공유하고 승객에게 사실과 회복 조치를 설명하며 팀과 해결한다.","혼자 빠르게 수습한 뒤 필요하면 보고한다.","시스템 오류였다고 설명한다.","다른 승무원의 안내로 정정한다."]),
  sjt("SJT-14",["SELF_REGULATION","SITUATIONAL_RESPONSE"],"연속된 불만 응대로 감정이 흔들리는 중 새 승객이 강하게 항의합니다.",["짧게 호흡을 정돈하고 핵심 요구와 위험을 확인해 응대하며 필요하면 동료에게 지원을 요청한다.","감정을 숨기고 평소보다 빠르게 끝낸다.","승객에게 앞선 상황을 설명해 양해를 구한다.","바로 다른 동료에게 전부 넘긴다."]),
];

const priority = (id:string,prompt:string,items:PriorityItem[]):PriorityQuestion=>({id,module:"priority_task",competencies:["SAFETY_JUDGMENT","SITUATIONAL_RESPONSE","PROBLEM_SOLVING"],locale:"ko",prompt,difficulty:"applied",active:true,items});
export const priorityQuestions: PriorityQuestion[] = [
  priority("PRI-01","이륙 준비 중 동시에 발생한 상황의 처리 순서를 정하세요.",[{id:"belt",label:"안전벨트 미착용 승객",priority:1,reason:"즉시 안전 확인"},{id:"bin",label:"열린 수하물 선반",priority:2,reason:"이륙 전 위험 제거"},{id:"child",label:"불안한 아동 승객",priority:3,reason:"안전 확보 뒤 지원"},{id:"drink",label:"음료 추가 요청",priority:4,reason:"지연 가능한 서비스"}]),
  priority("PRI-02","서비스 중 동시에 발생한 상황의 처리 순서를 정하세요.",[{id:"smell",label:"타는 냄새 신고",priority:1,reason:"잠재적 안전 위험"},{id:"dizzy",label:"어지럼증 승객",priority:2,reason:"건강 위험 초기 확인"},{id:"conflict",label:"좌석 갈등",priority:3,reason:"확산 방지"},{id:"meal",label:"식사 누락",priority:4,reason:"대안 안내 가능"}]),
  priority("PRI-03","착륙 전 마무리 상황의 순서를 정하세요.",[{id:"aisle",label:"통로에 놓인 짐",priority:1,reason:"착륙 안전"},{id:"seat",label:"좌석 등받이 미복원",priority:2,reason:"착륙 안전"},{id:"connection",label:"연결편 문의",priority:3,reason:"시간 민감 안내"},{id:"blanket",label:"담요 회수 요청",priority:4,reason:"지연 가능"}]),
  priority("PRI-04","팀 업무가 겹친 상황의 순서를 정하세요.",[{id:"alarm",label:"화장실 경보 확인 요청",priority:1,reason:"안전 위험 확인"},{id:"crew",label:"동료의 긴급 지원 요청",priority:2,reason:"팀 상황 공유"},{id:"language",label:"언어 지원이 필요한 승객",priority:3,reason:"의사소통 지원"},{id:"tray",label:"트레이 회수 지연",priority:4,reason:"서비스 지연 허용"}]),
  priority("PRI-05","도착 후 환승 지원 상황의 순서를 정하세요.",[{id:"medical",label:"상태가 나빠진 승객",priority:1,reason:"건강 안전"},{id:"lostchild",label:"보호자를 찾는 아동",priority:2,reason:"보호 필요"},{id:"tight",label:"촉박한 연결편 승객",priority:3,reason:"시간 민감"},{id:"bag",label:"수하물 위치 문의",priority:4,reason:"안내 가능"}]),
];

export const videoQuestions: VideoQuestion[] = [
  {id:"VID-01",module:"video",competencies:["SERVICE_ORIENTATION","COMMUNICATION","PROBLEM_SOLVING"],locale:"ko",prompt:"불만이 큰 고객의 핵심 요구를 파악하고 해결한 경험을 말해 주세요.",difficulty:"applied",active:true,recommendedSeconds:90},
  {id:"VID-02",module:"video",competencies:["TEAMWORK_CRM","COMMUNICATION","SELF_REGULATION"],locale:"ko",prompt:"팀 내 의견 충돌을 조정하고 공동 목표를 달성한 경험을 말해 주세요.",difficulty:"applied",active:true,recommendedSeconds:90},
  {id:"VID-03",module:"video",competencies:["SAFETY_JUDGMENT","SITUATIONAL_RESPONSE","PROBLEM_SOLVING"],locale:"ko",prompt:"안전과 고객 편의가 충돌하는 상황에서 어떻게 판단하고 행동할지 말해 주세요.",difficulty:"applied",active:true,recommendedSeconds:90},
];
export const competencyQuestionBank: CompetencyQuestion[] = [...selfReportQuestions,...sjtQuestions,...priorityQuestions,...videoQuestions];

export type CompetencyResponses = { selfReport: Record<string,number>; sjt: Record<string,string>; priority: Record<string,string[]>; video: Record<string,CompetencyVideoResponse> };
export type CompetencyVideoResponse = { attemptId:string; completedAt:string; transcript:string; actualTranscript:boolean; understanding?: SelfIntroductionAttempt["speechUnderstanding"]; nonverbalAvailable:boolean };
export type CompetencyEvidence = { source:CompetencyEvidenceSource; questionId:string; response:string; evidence:string; reason:string; competency:CompetencyKey; points:number; maxPoints:number };
export type CompetencyProfile = { competency:CompetencyKey; band:CompetencyBand; label:string; evidence:CompetencyEvidence[]; evidenceSourceCount:number };
export type CompetencyModuleCompletion = Record<CompetencyModule,boolean>;
export type CompetencyAssessmentDraft = { id:string; version:string; locale:AssessmentLocale; startedAt:string; updatedAt:string; responses:CompetencyResponses; moduleCompletion:CompetencyModuleCompletion; responseTimesMs:Record<string,number>; lowEngagementQuestionIds:string[] };
export type AdaptiveCompetencyEvidence = { source:"competency_assessment"; assessmentId:string; competency:CompetencyKey; band:CompetencyBand; observedAt:string; evidenceCount:number; overwriteProfile:false };
export type CompetencyAssessmentResult = { id:string; version:string; startedAt:string; completedAt:string; moduleCompletion:CompetencyModuleCompletion; profiles:CompetencyProfile[]; strengths:CompetencyKey[]; improvements:CompetencyKey[]; recommendations:PracticeRecommendation[]; adaptiveEvidence:AdaptiveCompetencyEvidence[]; responseConsistency:"not_measured"|"review_suggested"|"consistent"; prototypeWeighting:typeof COMPETENCY_PROTOTYPE_WEIGHTS; hiringScore?:never };
export type PracticeRecommendation = { competency:CompetencyKey; title:string; description:string; destination:"interview"|"self_introduction"|"weekly_report" };

export const emptyResponses = ():CompetencyResponses=>({selfReport:{},sjt:{},priority:{},video:{}});
export const newCompetencyDraft = (now=new Date()):CompetencyAssessmentDraft=>({id:`competency-${now.getTime()}`,version:COMPETENCY_ASSESSMENT_VERSION,locale:"ko",startedAt:now.toISOString(),updatedAt:now.toISOString(),responses:emptyResponses(),moduleCompletion:{self_report:false,sjt:false,priority_task:false,video:false},responseTimesMs:{},lowEngagementQuestionIds:[]});
export function recordCompetencyResponseTime(draft:CompetencyAssessmentDraft,questionId:string,elapsedMs:number){const safe=Math.max(0,Math.round(elapsedMs));const low=safe<800;return{...draft,responseTimesMs:{...draft.responseTimesMs,[questionId]:safe},lowEngagementQuestionIds:low?[...new Set([...draft.lowEngagementQuestionIds,questionId])]:draft.lowEngagementQuestionIds.filter(id=>id!==questionId)}}

export function isModuleComplete(module:CompetencyModule,responses:CompetencyResponses){
  if(module==="self_report")return selfReportQuestions.every(q=>responses.selfReport[q.id]>=1&&responses.selfReport[q.id]<=5);
  if(module==="sjt")return sjtQuestions.every(q=>q.options.some(o=>o.id===responses.sjt[q.id]));
  if(module==="priority_task")return priorityQuestions.every(q=>responses.priority[q.id]?.length===q.items.length&&new Set(responses.priority[q.id]).size===q.items.length);
  return videoQuestions.every(q=>Boolean(responses.video[q.id]?.attemptId));
}
export const requiredModulesComplete=(completion:CompetencyModuleCompletion)=>Object.values(completion).every(Boolean);

function selfReportEvidence(responses:CompetencyResponses):CompetencyEvidence[]{return selfReportQuestions.flatMap(q=>{const raw=responses.selfReport[q.id];if(!raw)return[];const points=Math.max(0,Math.min(4,raw-1));return q.competencies.map(competency=>({source:"self_report" as const,questionId:q.id,response:String(raw),evidence:`5점 척도 응답 ${raw}`,reason:"자기인식 응답이며 다른 행동 근거와 함께 해석합니다.",competency,points,maxPoints:4}))})}
function sjtEvidence(responses:CompetencyResponses):CompetencyEvidence[]{return sjtQuestions.flatMap(q=>{const chosen=q.options.find(o=>o.id===responses.sjt[q.id]);if(!chosen)return[];return q.competencies.map(competency=>({source:"sjt" as const,questionId:q.id,response:chosen.label,evidence:chosen.signals.join(" · "),reason:chosen.rationale,competency,points:chosen.score,maxPoints:3}))})}
function priorityEvidence(responses:CompetencyResponses):CompetencyEvidence[]{return priorityQuestions.flatMap(q=>{const order=responses.priority[q.id];if(!order?.length)return[];const distance=q.items.reduce((sum,item,index)=>sum+Math.abs(index-order.indexOf(item.id)),0);const max=Math.max(1,q.items.length*q.items.length/2);const points=Math.max(0,max-distance);return q.competencies.map(competency=>({source:"priority_task" as const,questionId:q.id,response:order.join(" > "),evidence:"안전·시간 민감도에 따른 처리 순서",reason:"클릭 속도가 아닌 선택 순서만 사용합니다.",competency,points,maxPoints:max}))})}
function videoEvidence(responses:CompetencyResponses):CompetencyEvidence[]{return videoQuestions.flatMap(q=>{const video=responses.video[q.id];if(!video?.actualTranscript||!video.transcript.trim())return[];const understanding=video.understanding;const points=understanding?.questionAddressed==="addressed"?3:understanding?.questionAddressed==="partially_addressed"?2:1;const evidence=understanding?.evidence[0]??understanding?.mainPoint??video.transcript.slice(0,180);return q.competencies.map(competency=>({source:"speech_understanding" as const,questionId:q.id,response:video.transcript.slice(0,180),evidence:evidence.slice(0,180),reason:"실제 전사 답변의 질문 정합성과 핵심 근거를 사용합니다.",competency,points,maxPoints:3}))})}
export const collectCompetencyEvidence=(responses:CompetencyResponses)=>[...selfReportEvidence(responses),...sjtEvidence(responses),...priorityEvidence(responses),...videoEvidence(responses)];

const sourceModule=(source:CompetencyEvidenceSource):keyof typeof COMPETENCY_PROTOTYPE_WEIGHTS=>source==="speech_understanding"?"video":source==="priority_task"?"priority_task":source==="sjt"?"sjt":"self_report";
export function buildCompetencyProfiles(responses:CompetencyResponses):CompetencyProfile[]{const all=collectCompetencyEvidence(responses);return competencies.map(competency=>{const evidence=all.filter(item=>item.competency===competency);const modules=[...new Set(evidence.map(item=>sourceModule(item.source)))];const weighted=modules.reduce((sum,module)=>{const group=evidence.filter(item=>sourceModule(item.source)===module);const ratio=group.reduce((s,item)=>s+item.points,0)/Math.max(1,group.reduce((s,item)=>s+item.maxPoints,0));return sum+ratio*COMPETENCY_PROTOTYPE_WEIGHTS[module]},0);const availableWeight=modules.reduce((sum,module)=>sum+COMPETENCY_PROTOTYPE_WEIGHTS[module],0);const normalized=availableWeight?weighted/availableWeight:0;const band:CompetencyBand=modules.length<2?"LOW_EVIDENCE":normalized>=.78?"STRONG":normalized>=.58?"STABLE":"DEVELOPING";return{competency,band,label:bandLabels[band],evidence,evidenceSourceCount:modules.length}})}

const recommendationFor=(competency:CompetencyKey):PracticeRecommendation=>({competency,title:{SAFETY_JUDGMENT:"안전 상황면접 연습",SERVICE_ORIENTATION:"고객응대 질문 연습",COMMUNICATION:"단일 면접 답변 연습",TEAMWORK_CRM:"팀 갈등 경험 연습",SITUATIONAL_RESPONSE:"돌발 상황 질문 연습",CROSS_CULTURAL:"다문화 상황 연습",SELF_REGULATION:"압박 상황 자기소개 연습",PROBLEM_SOLVING:"우선순위 판단 연습"}[competency],description:`최근 ${competencyLabels[competency]} 근거를 보완할 수 있는 기존 연습으로 이동합니다.`,destination:competency==="SELF_REGULATION"?"self_introduction":competency==="PROBLEM_SOLVING"?"weekly_report":"interview"});
export function buildCompetencyResult(draft:CompetencyAssessmentDraft,now=new Date()):CompetencyAssessmentResult{if(!requiredModulesComplete(draft.moduleCompletion))throw new Error("assessment_incomplete");const profiles=buildCompetencyProfiles(draft.responses);const completedAt=now.toISOString();const ranked=[...profiles].sort((a,b)=>({STRONG:3,STABLE:2,DEVELOPING:1,LOW_EVIDENCE:0}[b.band]-{STRONG:3,STABLE:2,DEVELOPING:1,LOW_EVIDENCE:0}[a.band]));const strengths=ranked.filter(p=>p.band==="STRONG"||p.band==="STABLE").slice(0,3).map(p=>p.competency);const improvements=[...ranked].reverse().filter(p=>p.band!=="STRONG").slice(0,3).map(p=>p.competency);return{id:draft.id,version:draft.version,startedAt:draft.startedAt,completedAt,moduleCompletion:draft.moduleCompletion,profiles,strengths,improvements,recommendations:improvements.map(recommendationFor),adaptiveEvidence:profiles.filter(p=>p.evidence.length>0).map(p=>({source:"competency_assessment",assessmentId:draft.id,competency:p.competency,band:p.band,observedAt:completedAt,evidenceCount:p.evidence.length,overwriteProfile:false})),responseConsistency:assessResponseConsistency(draft.responses),prototypeWeighting:COMPETENCY_PROTOTYPE_WEIGHTS}}
export function assessResponseConsistency(responses:CompetencyResponses):CompetencyAssessmentResult["responseConsistency"]{const values=Object.values(responses.selfReport);if(values.length<selfReportQuestions.length)return"not_measured";let extremes=0;for(let i=0;i<values.length;i+=3)if(Math.max(...values.slice(i,i+3))-Math.min(...values.slice(i,i+3))>=4)extremes++;return extremes>=2?"review_suggested":"consistent"}

type StoredAssessment={draft?:CompetencyAssessmentDraft;history:CompetencyAssessmentResult[]};
const STORAGE_KEY="cabin-competency-assessment-v1";
const safeStored=(value:unknown):StoredAssessment=>{if(!value||typeof value!=="object")return{history:[]};const item=value as Partial<StoredAssessment>;return{draft:item.draft&&typeof item.draft.id==="string"?item.draft:undefined,history:Array.isArray(item.history)?item.history.filter(r=>r&&typeof r.id==="string"):[]}};
export const competencyAssessmentRepository={
  load():StoredAssessment{if(typeof window==="undefined")return{history:[]};try{return safeStored(JSON.parse(localStorage.getItem(STORAGE_KEY)??"null"))}catch{return{history:[]}}},
  saveDraft(draft:CompetencyAssessmentDraft){const state=this.load();return safeLocalStorageWrite(STORAGE_KEY,{...state,draft:{...draft,updatedAt:new Date().toISOString()}})},
  complete(result:CompetencyAssessmentResult){const state=this.load();return safeLocalStorageWrite(STORAGE_KEY,{history:[result,...state.history.filter(item=>item.id!==result.id)],draft:undefined})},
  clearDraft(){const state=this.load();return safeLocalStorageWrite(STORAGE_KEY,{...state,draft:undefined})},
};

export function competencyVideoResponse(questionId:string,attempt:SelfIntroductionAttempt):CompetencyVideoResponse{return{attemptId:attempt.id,completedAt:attempt.createdAt,transcript:attempt.transcript.slice(0,1000),actualTranscript:attempt.transcriptIntegrity?.mode==="actual_audio"&&attempt.transcriptIntegrity.isActualTranscription===true,understanding:attempt.speechUnderstanding,nonverbalAvailable:Boolean(attempt.nonverbalSignal)}}
export function attachCompetencyVideoAttempt(questionId:string,attempt:SelfIntroductionAttempt){const state=competencyAssessmentRepository.load();if(!state.draft||!videoQuestions.some(q=>q.id===questionId))return false;const responses={...state.draft.responses,video:{...state.draft.responses.video,[questionId]:competencyVideoResponse(questionId,attempt)}};return competencyAssessmentRepository.saveDraft({...state.draft,responses,moduleCompletion:{...state.draft.moduleCompletion,video:isModuleComplete("video",responses)}})}
export const hasHiringPrediction=(result:CompetencyAssessmentResult)=>"hiringScore" in result||"passProbability" in (result as unknown as Record<string,unknown>);
