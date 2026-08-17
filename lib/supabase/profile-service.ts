import {getSupabaseBrowserClient} from './client'
export type EnsureProfileResult={ok:boolean;created:boolean;profileId?:string;error?:string}
export async function ensureUserProfile():Promise<EnsureProfileResult>{
  const c=getSupabaseBrowserClient();if(!c)return{ok:false,created:false,error:'not_configured'}
  const{data:{user},error:authError}=await c.auth.getUser()
  if(authError||!user)return{ok:false,created:false,error:authError?.message??'not_authenticated'}
  const existing=await c.from('profiles').select('id,display_name,avatar_url').eq('id',user.id).maybeSingle()
  const metadata=user.user_metadata??{}
  const displayName=typeof metadata.display_name==='string'?metadata.display_name:typeof metadata.full_name==='string'?metadata.full_name:typeof metadata.name==='string'?metadata.name:null
  const avatarUrl=typeof metadata.avatar_url==='string'?metadata.avatar_url:null
  if(existing.data){
    const patch:Record<string,string>={last_active_at:new Date().toISOString()}
    if(!existing.data.display_name&&displayName)patch.display_name=displayName
    if(!existing.data.avatar_url&&avatarUrl)patch.avatar_url=avatarUrl
    const{error}=await c.from('profiles').update(patch as never).eq('id',user.id)
    return error?{ok:false,created:false,error:error.message}:{ok:true,created:false,profileId:user.id}
  }
  const{error}=await c.from('profiles').upsert({id:user.id,display_name:displayName,avatar_url:avatarUrl,last_active_at:new Date().toISOString()} as never,{onConflict:'id'})
  return error?{ok:false,created:false,error:error.message}:{ok:true,created:true,profileId:user.id}
}
