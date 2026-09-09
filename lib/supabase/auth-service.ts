import type {User} from '@supabase/supabase-js'
import {getSupabaseBrowserClient} from './client'

export type AuthResult={ok:boolean;message?:string;verificationPending?:boolean}
const unavailable=():AuthResult=>({ok:false,message:'계정 동기화가 아직 설정되지 않았어요. 현재 기록은 이 기기에 저장됩니다.'})
const safeReturnTo=(value:string|null)=>value?.startsWith('/')&&!value.startsWith('//')?value:'/'
export const authService={
  async currentUser():Promise<User|null>{const c=getSupabaseBrowserClient();if(!c)return null;return (await c.auth.getUser()).data.user},
  async signIn(email:string,password:string):Promise<AuthResult>{const c=getSupabaseBrowserClient();if(!c)return unavailable();const{error}=await c.auth.signInWithPassword({email,password});return error?{ok:false,message:error.message}:{ok:true}},
  async signUp(email:string,password:string):Promise<AuthResult>{const c=getSupabaseBrowserClient();if(!c)return unavailable();const{data,error}=await c.auth.signUp({email,password});return error?{ok:false,message:error.message}:{ok:true,verificationPending:!data.session}},
  async signInWithGoogle():Promise<AuthResult>{
    const c=getSupabaseBrowserClient();if(!c)return unavailable()
    try{
      const stored=sessionStorage.getItem('cabin-auth-return-to')
      const returnTo=safeReturnTo(stored)
      sessionStorage.setItem('cabin-auth-return-to',returnTo)
      const callback=new URL('/auth/callback',window.location.origin)
      callback.searchParams.set('returnTo',returnTo)
      const{error}=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString()}})
      return error?{ok:false,message:error.code??error.message}:{ok:true}
    }catch{return{ok:false,message:'network_error'}}
  },
  async signOut(){const c=getSupabaseBrowserClient();if(c)await c.auth.signOut()},
  async requestPasswordReset(email:string):Promise<AuthResult>{const c=getSupabaseBrowserClient();if(!c)return unavailable();const redirectTo=`${location.origin}/?auth=reset`;const{error}=await c.auth.resetPasswordForEmail(email,{redirectTo});return error?{ok:false,message:error.message}:{ok:true}},
  async updatePassword(password:string):Promise<AuthResult>{const c=getSupabaseBrowserClient();if(!c)return unavailable();const{error}=await c.auth.updateUser({password});return error?{ok:false,message:error.message}:{ok:true}},
  onAuthStateChange(callback:(user:User|null)=>void){const c=getSupabaseBrowserClient();if(!c)return()=>{};const{data}=c.auth.onAuthStateChange((_event,session)=>callback(session?.user??null));return()=>data.subscription.unsubscribe()}
}
