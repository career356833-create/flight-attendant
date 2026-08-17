import {createServerClient} from '@supabase/ssr'
import {cookies} from 'next/headers'
import {getSupabaseRuntimeConfig} from './config'
import type {Database} from './database.types'

export async function getSupabaseServerClient(){
  const config=getSupabaseRuntimeConfig();if(!config.configured||!config.url||!config.anonKey)return null
  const store=await cookies()
  return createServerClient<Database>(config.url,config.anonKey,{cookies:{getAll:()=>store.getAll(),setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Components cannot set cookies. */}}}})
}
