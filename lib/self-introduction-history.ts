import type { SelfIntroductionAttempt } from './self-introduction-data'

const createdAtMs=(attempt:SelfIntroductionAttempt)=>{const value=Date.parse(attempt.createdAt);return Number.isFinite(value)?value:0}

export function sortSelfIntroductionHistory(attempts:SelfIntroductionAttempt[]){
  return attempts.map((attempt,index)=>({attempt,index})).sort((a,b)=>createdAtMs(b.attempt)-createdAtMs(a.attempt)||a.index-b.index).map(item=>item.attempt)
}

export function sameConditionRetake(attempt:SelfIntroductionAttempt){
  return{previousAttemptId:attempt.id,targetSeconds:attempt.targetSeconds,practiceLanguage:attempt.practiceLanguage}
}
