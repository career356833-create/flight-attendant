import {summarizeLocalData} from './local-data-exporter'
const KEY='cabin-cloud-migration-v1'
export type MergeChoice='connect_all'|'review_server'|'local_only'|'later'
export const migrationService={summary:summarizeLocalData,decision(userId:string){try{return JSON.parse(localStorage.getItem(KEY)??'{}')[userId] as MergeChoice|undefined}catch{return undefined}},saveDecision(userId:string,choice:MergeChoice){let all:Record<string,MergeChoice>={};try{all=JSON.parse(localStorage.getItem(KEY)??'{}')}catch{}all[userId]=choice;localStorage.setItem(KEY,JSON.stringify(all))}}
