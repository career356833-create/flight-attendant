export type SupabaseRuntimeConfig={enabled:boolean;url?:string;anonKey?:string;configured:boolean}

export function getSupabaseRuntimeConfig():SupabaseRuntimeConfig{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const enabled=process.env.NEXT_PUBLIC_SUPABASE_ENABLED==='true'
  let validUrl=false;try{validUrl=Boolean(url&&new URL(url).protocol==='https:')}catch{}
  return{enabled,url:url||undefined,anonKey:anonKey||undefined,configured:Boolean(enabled&&validUrl&&anonKey)}
}
