import assert from 'node:assert/strict'
import test from 'node:test'
import type { SelfIntroductionAttempt } from './self-introduction-data'
import { sameConditionRetake, sortSelfIntroductionHistory } from './self-introduction-history'

const attempt=(id:string,createdAt:string,patch:Partial<SelfIntroductionAttempt>={}):SelfIntroductionAttempt=>({id,createdAt,transcript:'실제 답변',durationSeconds:60,analysis:{timing:{durationSeconds:60,firstKeyMessageAtSeconds:5,silenceSeconds:0,repeatedPhraseCount:0,assessment:'well_balanced',feedback:''},overall:'',bestPoint:'',firstImprovement:'',details:[],metrics:{wordsPerMinute:100,speakingPaceLabel:'적절',longSilenceCount:0,fillerCount:0,roleConnection:'connected'},guide:{keep:'',reduce:'',add:''},retryRecommendation:'repeat_current'},attemptNumber:1,completed:true,...patch})

test('history is recent first and equal timestamps keep stable input order',()=>{const rows=sortSelfIntroductionHistory([attempt('old','2026-01-01T00:00:00Z'),attempt('same-a','2026-02-01T00:00:00Z'),attempt('same-b','2026-02-01T00:00:00Z')]);assert.deepEqual(rows.map(item=>item.id),['same-a','same-b','old'])})
test('invalid legacy timestamp is handled without a crash',()=>assert.deepEqual(sortSelfIntroductionHistory([attempt('invalid','unknown'),attempt('valid','2026-01-01T00:00:00Z')]).map(item=>item.id),['valid','invalid']))
test('60 second Korean retake preserves conditions and parent',()=>assert.deepEqual(sameConditionRetake(attempt('ko','2026-01-01',{targetSeconds:60,practiceLanguage:'ko'})),{previousAttemptId:'ko',targetSeconds:60,practiceLanguage:'ko'}))
test('30 second English retake preserves conditions and parent',()=>assert.deepEqual(sameConditionRetake(attempt('en','2026-01-01',{targetSeconds:30,practiceLanguage:'en'})),{previousAttemptId:'en',targetSeconds:30,practiceLanguage:'en'}))
test('legacy language stays unknown instead of being inferred',()=>assert.equal(sameConditionRetake(attempt('legacy','2026-01-01')).practiceLanguage,undefined))
test('history revisit helper does not mutate attempts',()=>{const rows=[attempt('a','2026-01-01')];const before=JSON.stringify(rows);sortSelfIntroductionHistory(rows);assert.equal(JSON.stringify(rows),before)})
