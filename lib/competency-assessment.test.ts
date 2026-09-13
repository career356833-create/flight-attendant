import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPETENCY_ASSESSMENT_VERSION, buildCompetencyProfiles, buildCompetencyResult, collectCompetencyEvidence,
  competencyAssessmentRepository, competencyQuestionBank, competencyVideoResponse, emptyResponses, hasHiringPrediction, isModuleComplete,
  newCompetencyDraft, priorityQuestions, recordCompetencyResponseTime, requiredModulesComplete, selfReportQuestions, sjtQuestions, videoQuestions,
  type CompetencyAssessmentDraft, type CompetencyResponses,
} from "./competency-assessment";
import type { SelfIntroductionAttempt } from "./self-introduction-data";

const completeResponses=():CompetencyResponses=>({
  selfReport:Object.fromEntries(selfReportQuestions.map(q=>[q.id,4])),
  sjt:Object.fromEntries(sjtQuestions.map(q=>[q.id,"A"])),
  priority:Object.fromEntries(priorityQuestions.map(q=>[q.id,[...q.items].sort((a,b)=>a.priority-b.priority).map(i=>i.id)])),
  video:Object.fromEntries(videoQuestions.map(q=>[q.id,{attemptId:`a-${q.id}`,completedAt:"2026-09-13T00:00:00.000Z",transcript:"상황을 확인하고 안전을 우선한 뒤 팀과 공유하여 명확히 설명했습니다.",actualTranscript:true,nonverbalAvailable:true}])),
});
const completeDraft=():CompetencyAssessmentDraft=>({...newCompetencyDraft(new Date("2026-09-13T00:00:00.000Z")),responses:completeResponses(),moduleCompletion:{self_report:true,sjt:true,priority_task:true,video:true}});

test("question bank contains 43 active V1 questions",()=>{assert.equal(competencyQuestionBank.length,43);assert.equal(competencyQuestionBank.every(q=>q.active),true)});
test("self-report contains 21 questions",()=>assert.equal(selfReportQuestions.length,21));
test("SJT contains 14 questions with four options",()=>{assert.equal(sjtQuestions.length,14);assert.equal(sjtQuestions.every(q=>q.options.length===4),true)});
test("priority module contains five task sets",()=>assert.equal(priorityQuestions.length,5));
test("video module contains three questions",()=>assert.equal(videoQuestions.length,3));
test("safety-first SJT is highest evidence",()=>{const r=emptyResponses();r.sjt["SJT-01"]="A";const e=collectCompetencyEvidence(r).find(x=>x.competency==="SAFETY_JUDGMENT");assert.equal(e?.points,3);assert.match(e?.evidence??"",/SAFETY_FIRST/)});
test("service-only unsafe option scores lowest",()=>{const r=emptyResponses();r.sjt["SJT-01"]="D";assert.equal(collectCompetencyEvidence(r)[0]?.points,0)});
test("teamwork escalation is represented",()=>{const q=sjtQuestions.find(x=>x.id==="SJT-08")!;assert.ok(q.options.find(item=>item.score===3)?.signals.includes("ESCALATION"));assert.ok(q.competencies.includes("TEAMWORK_CRM"))});
test("communication clarity is represented",()=>assert.ok(sjtQuestions.find(q=>q.id==="SJT-05")?.competencies.includes("COMMUNICATION")));
test("cross-cultural response is respectful and non-assumptive",()=>assert.match(sjtQuestions.find(q=>q.id==="SJT-12")!.options.find(item=>item.score===3)!.label,/단정하지 않고/));
test("self-report single item cannot create stable evidence",()=>{const r=emptyResponses();r.selfReport[selfReportQuestions[0].id]=5;const p=buildCompetencyProfiles(r).find(x=>x.competency==="SAFETY_JUDGMENT");assert.equal(p?.band,"LOW_EVIDENCE")});
test("video without actual transcript creates no competency evidence",()=>{const r=emptyResponses();r.video["VID-01"]={attemptId:"x",completedAt:"x",transcript:"example",actualTranscript:false,nonverbalAvailable:true};assert.equal(collectCompetencyEvidence(r).some(e=>e.source==="speech_understanding"),false)});
test("actual video transcript creates speech evidence",()=>{const r=emptyResponses();r.video["VID-01"]={attemptId:"x",completedAt:"x",transcript:"고객의 요구를 확인하고 대안을 설명했습니다.",actualTranscript:true,nonverbalAvailable:false};assert.equal(collectCompetencyEvidence(r).filter(e=>e.source==="speech_understanding").length,3)});
test("vision metrics are excluded from competency evidence",()=>assert.equal(collectCompetencyEvidence(completeResponses()).some(e=>e.source==="vision_metrics"),false));
test("incomplete self-report module remains incomplete",()=>assert.equal(isModuleComplete("self_report",emptyResponses()),false));
test("all submitted modules complete assessment",()=>{const r=completeResponses();assert.equal(isModuleComplete("self_report",r),true);assert.equal(isModuleComplete("sjt",r),true);assert.equal(isModuleComplete("priority_task",r),true);assert.equal(isModuleComplete("video",r),true)});
test("assessment completion requires every module",()=>assert.equal(requiredModulesComplete({self_report:true,sjt:true,priority_task:true,video:false}),false));
test("result rejects incomplete draft",()=>assert.throws(()=>buildCompetencyResult(newCompetencyDraft()),/assessment_incomplete/));
test("completed result keeps version for retest comparison",()=>assert.equal(buildCompetencyResult(completeDraft()).version,COMPETENCY_ASSESSMENT_VERSION));
test("separate retests retain unique ids",()=>assert.notEqual(newCompetencyDraft(new Date(1)).id,newCompetencyDraft(new Date(2)).id));
test("result exposes no hiring or pass score",()=>assert.equal(hasHiringPrediction(buildCompetencyResult(completeDraft())),false));
test("question model contains no sensitive attribute input",()=>{const text=JSON.stringify(competencyQuestionBank).toLowerCase();for(const term of ["birthdate","gender","photo","religion","race","health","political"])assert.equal(text.includes(term),false)});
test("face signal cannot change competency band",()=>{const a=completeResponses(),b=completeResponses();for(const q of videoQuestions)b.video[q.id].nonverbalAvailable=false;assert.deepEqual(buildCompetencyProfiles(a).map(p=>p.band),buildCompetencyProfiles(b).map(p=>p.band))});
test("priority score ignores response time",()=>{const r=completeResponses();const evidence=collectCompetencyEvidence(r).filter(e=>e.source==="priority_task");assert.equal(evidence.every(e=>!e.reason.includes("속도" )||e.reason.includes("아닌")),true)});
test("short response time is only a low-engagement flag",()=>{const draft=completeDraft();const before=buildCompetencyProfiles(draft.responses);const timed=recordCompetencyResponseTime(draft,"SJT-01",100);assert.ok(timed.lowEngagementQuestionIds.includes("SJT-01"));assert.deepEqual(buildCompetencyProfiles(timed.responses),before)});
test("strengths and improvements are limited to three",()=>{const result=buildCompetencyResult(completeDraft());assert.ok(result.strengths.length<=3);assert.ok(result.improvements.length<=3)});
test("adaptive handoff is evidence-only and cannot overwrite profile",()=>{const result=buildCompetencyResult(completeDraft());assert.ok(result.adaptiveEvidence.length>0);assert.equal(result.adaptiveEvidence.every(item=>item.overwriteProfile===false),true)});
test("video response preserves actual provenance and only notes nonverbal availability",()=>{const attempt={id:"a",createdAt:"2026-09-13T00:00:00.000Z",transcript:"실제 답변",durationSeconds:30,attemptNumber:1,completed:true,analysis:{} as SelfIntroductionAttempt["analysis"],transcriptIntegrity:{mode:"actual_audio",isActualTranscription:true,provider:"server"}} as SelfIntroductionAttempt;const r=competencyVideoResponse("VID-01",attempt);assert.equal(r.actualTranscript,true);assert.equal(r.nonverbalAvailable,false)});
test("assessment repository persists readable draft, history, and clear state",()=>{const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)},clear:()=>values.clear(),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size}};const previousWindow=globalThis.window,previousStorage=globalThis.localStorage;Object.defineProperty(globalThis,"window",{configurable:true,value:{}});Object.defineProperty(globalThis,"localStorage",{configurable:true,value:storage});try{const draft=newCompetencyDraft(new Date("2026-09-13T00:00:00.000Z"));assert.equal(competencyAssessmentRepository.saveDraft(draft).ok,true);assert.equal(competencyAssessmentRepository.load().draft?.id,draft.id);const result=buildCompetencyResult(completeDraft());assert.equal(competencyAssessmentRepository.complete(result).ok,true);assert.equal(competencyAssessmentRepository.load().history[0]?.id,result.id);assert.equal(competencyAssessmentRepository.saveDraft(draft).ok,true);assert.equal(competencyAssessmentRepository.clearDraft().ok,true);assert.equal(competencyAssessmentRepository.load().draft,undefined)}finally{Object.defineProperty(globalThis,"window",{configurable:true,value:previousWindow});Object.defineProperty(globalThis,"localStorage",{configurable:true,value:previousStorage})}});
