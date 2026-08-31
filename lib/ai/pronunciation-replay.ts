export function safeWordReplayBounds(input:{startMs?:number;endMs?:number},durationSeconds:number,paddingMs=120){
  if(!Number.isFinite(input.startMs)||!Number.isFinite(input.endMs)||input.endMs!<=input.startMs!||durationSeconds<=0)return null
  const durationMs=durationSeconds*1000
  const startMs=Math.max(0,Math.min(durationMs,input.startMs!-paddingMs))
  const endMs=Math.max(startMs,Math.min(durationMs,input.endMs!+paddingMs))
  return endMs>startMs?{startSeconds:startMs/1000,endSeconds:endMs/1000}:null
}
