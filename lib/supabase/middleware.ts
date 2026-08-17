import {createServerClient} from '@supabase/ssr'
import {NextResponse,type NextRequest} from 'next/server'
import {getSupabaseRuntimeConfig} from './config'

export async function refreshSupabaseSession(request:NextRequest){
  const config=getSupabaseRuntimeConfig();let response=NextResponse.next({request})
  if(!config.configured||!config.url||!config.anonKey)return response
  const client=createServerClient(config.url,config.anonKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}})
  await client.auth.getUser();return response
}
