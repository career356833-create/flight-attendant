import {createBrowserClient} from '@supabase/ssr'
import type {SupabaseClient} from '@supabase/supabase-js'
import {getSupabaseRuntimeConfig} from './config'
import type {Database} from './database.types'

let browserClient:SupabaseClient<Database>|null=null
export function getSupabaseBrowserClient(){
  const config=getSupabaseRuntimeConfig()
  if(!config.configured||!config.url||!config.anonKey)return null
  browserClient??=createBrowserClient<Database>(config.url,config.anonKey)
  return browserClient
}
