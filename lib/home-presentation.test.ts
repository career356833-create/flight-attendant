import test from 'node:test'
import assert from 'node:assert/strict'
import type { DailyActionCandidate, DailyActionPlan } from './daily-action-plan'
import { deriveHomePresentationModel } from './home-presentation'

const action=(id:string,options:Partial<DailyActionCandidate>={}):DailyActionCandidate=>({id,dedupeKey:id,type:'practice',title:id,description:id,reason:id,priority:1,target:{kind:'interview_question',questionId:id},source:'balanced_fallback',resume:false,...options})
const plan=(primary=action('primary'),secondary:DailyActionCandidate[]=[]):DailyActionPlan=>({primary,secondary,completedCount:0,totalCount:1+secondary.length,generatedAt:'2026-09-06T00:00:00.000Z'})
const derive=(value:DailyActionPlan,overrides:Partial<Parameters<typeof deriveHomePresentationModel>[0]>={})=>deriveHomePresentationModel({plan:value,weeklyCompleted:0,weeklyTotal:0,activityCount:0,...overrides})

test('new user retains one honest starter primary',()=>assert.equal(derive(plan()).primary.id,'primary'))
test('primary action identity is unchanged',()=>{const primary=action('resume',{resume:true});assert.equal(derive(plan(primary)).primary,primary)})
test('same primary resume is not duplicated',()=>assert.equal(derive(plan(action('resume',{resume:true}))).resume,undefined))
test('distinct resume is exposed',()=>assert.equal(derive(plan(action('primary'),[action('resume',{resume:true})])).resume?.id,'resume'))
test('secondary actions remain at most two',()=>assert.equal(derive(plan(action('p'),[action('a'),action('b'),action('c')])).secondary.length,2))
test('distinct resume keeps total visible actions at three',()=>{const model=derive(plan(action('p'),[action('r',{resume:true}),action('s1'),action('s2')]));assert.equal(1+Number(Boolean(model.resume))+model.secondary.length,3)})
test('weekly task absence has no denominator',()=>assert.equal(derive(plan()).weeklyProgress,undefined))
test('weekly 2 of 4 remains exact',()=>assert.deepEqual(derive(plan(),{weeklyCompleted:2,weeklyTotal:4}).weeklyProgress,{completed:2,total:4}))
test('weekly completed value is clamped to total',()=>assert.equal(derive(plan(),{weeklyCompleted:5,weeklyTotal:4}).weeklyProgress?.completed,4))
test('activity count remains separate from weekly progress',()=>{const model=derive(plan(),{weeklyCompleted:2,weeklyTotal:4,activityCount:9});assert.equal(model.activityCount,9);assert.equal(model.weeklyProgress?.completed,2)})
test('no activity is zero without fake target',()=>assert.equal(derive(plan()).activityCount,0))
test('negative activity is safely clamped',()=>assert.equal(derive(plan(),{activityCount:-1}).activityCount,0))
test('missing streak is record absent',()=>assert.equal(derive(plan()).streakLabel,'기록 없음'))
test('actual streak is preserved',()=>assert.equal(derive(plan(),{streakDays:3}).streakLabel,'3일'))
test('primary and secondary ordering is deterministic',()=>{const value=plan(action('p'),[action('a'),action('b')]);assert.deepEqual(derive(value),derive(value))})
test('presentation does not mutate plan',()=>{const value=plan(action('p'),[action('a')]);derive(value);assert.equal(value.secondary.length,1)})
test('resume detection uses existing resume flag',()=>assert.equal(derive(plan(action('p'),[action('r',{resume:false})])).resume,undefined))
test('dedupe uses existing target identity',()=>{const primary=action('p',{dedupeKey:'question:be1'}),duplicate=action('r',{dedupeKey:'question:be1',resume:true});assert.equal(derive(plan(primary,[duplicate])).resume,undefined)})
test('presentation creates no completion',()=>assert.equal(derive(plan()).primary.resume,false))
test('presentation creates no fake metric fields',()=>assert.equal(JSON.stringify(derive(plan())).includes('passProbability'),false))
test('primary remains first in experienced state',()=>{const model=derive(plan(action('urgent'),[action('resume',{resume:true}),action('weekly')]));assert.equal(model.primary.id,'urgent')})
test('resume remains ahead of lower emphasis secondary',()=>{const model=derive(plan(action('p'),[action('resume',{resume:true}),action('s')]));assert.equal(model.resume?.id,'resume')})
test('invalid excess actions are presentation-limited',()=>assert.equal(derive(plan(action('p'),Array.from({length:5},(_,i)=>action(`s${i}`)))).secondary.length,2))
test('same input keeps stable action identities',()=>{const value=plan(action('p'),[action('r',{resume:true})]);assert.equal(derive(value).resume?.dedupeKey,derive(value).resume?.dedupeKey)})
